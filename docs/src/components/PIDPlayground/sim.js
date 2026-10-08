/**
 * Simulation core for PIDPlayground. Pure functions, no React or DOM, so the
 * physics and the scoring can be reasoned about (and tested) on their own.
 *
 * The plant is a 1 m vertical carriage (think: a small elevator):
 *   mass * accel = output - friction * velocity - gravity - stiction
 * and the motor's real output lags the commanded output slightly, which is what
 * makes very high gains ring or go unstable, just like on a real mechanism.
 * Output is in volts (clamped to +/-12 V), position in meters (0..1, hard stops).
 */

export const MAX_VOLTS = 12;
export const CONTROL_DT = 0.005; // controller runs at 200 Hz
const PHYSICS_STEPS = 5; // physics runs at 1 kHz

/** Small seedable RNG so a mechanism can be recreated from its number. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (lo, hi, t) => lo + (hi - lo) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const level = (t, names) => names[Math.min(names.length - 1, Math.floor(t * names.length))];

/** A random mechanism. Every one needs different gains. */
export function randomPlant(seed) {
  const rng = makeRng(seed);
  const m = rng(), f = rng(), g = rng(), n = rng(), l = rng();
  return {
    seed,
    mass: lerp(0.05, 0.32, m),
    friction: lerp(0.3, 1.4, f),
    gravity: lerp(0.0, 1.1, g),
    stiction: lerp(0.03, 0.14, rng()),
    noise: lerp(0.0002, 0.0008, n),
    lag: lerp(0.01, 0.03, l), // seconds for the motor to respond to a new output
    traits: {
      mass: level(m, ['light', 'medium', 'heavy']),
      friction: level(f, ['low', 'medium', 'high']),
      gravity: level(g, ['very little', 'moderate', 'strong']),
      lag: level(l, ['snappy', 'average', 'sluggish']),
    },
  };
}

export function createSim(startPos = 0.2) {
  return { t: 0, pos: startPos, vel: 0, integ: 0, prevMeas: startPos, dFilt: 0, applied: 0 };
}

/**
 * Advance one controller period. `push` is an outside force (a bump), in volts-equivalent.
 * Returns the three PID contributions and the clamped output that was applied.
 */
export function stepSim(sim, plant, gains, target, push, rng) {
  const meas = sim.pos + (rng() - 0.5) * 2 * plant.noise;
  const error = target - meas;

  const p = gains.kP * error;

  sim.integ += error * CONTROL_DT;
  if (gains.kI > 0) {
    // keep the I term from winding up past what the motor can deliver
    const lim = MAX_VOLTS / gains.kI;
    sim.integ = clamp(sim.integ, -lim, lim);
  } else {
    sim.integ = 0;
  }
  const i = gains.kI * sim.integ;

  // D acts on how fast the measurement moves (same as d(error)/dt while the target is still)
  const rawRate = (meas - sim.prevMeas) / CONTROL_DT;
  sim.dFilt += 0.5 * (rawRate - sim.dFilt);
  sim.prevMeas = meas;
  const d = -gains.kD * sim.dFilt;

  const u = clamp(p + i + d, -MAX_VOLTS, MAX_VOLTS);

  applyOutput(sim, plant, u, push);
  return { p, i, d, u };
}

/** Run the physics for one controller period with `u` volts commanded. */
export function applyOutput(sim, plant, u, push) {
  const h = CONTROL_DT / PHYSICS_STEPS;
  for (let k = 0; k < PHYSICS_STEPS; k++) {
    // the motor does not respond instantly: its real output chases the command
    sim.applied += (u - sim.applied) * (h / plant.lag);
    let force = sim.applied + push - plant.gravity - plant.friction * sim.vel;
    if (Math.abs(sim.vel) < 1e-3) {
      // static friction: small pushes cannot start it moving
      if (Math.abs(force) <= plant.stiction) { force = 0; sim.vel = 0; }
      else force -= Math.sign(force) * plant.stiction;
    } else {
      force -= Math.sign(sim.vel) * plant.stiction;
    }
    sim.vel += (force / plant.mass) * h;
    sim.pos += sim.vel * h;
    if (sim.pos <= 0) { sim.pos = 0; if (sim.vel < 0) sim.vel = 0; }
    if (sim.pos >= 1) { sim.pos = 1; if (sim.vel > 0) sim.vel = 0; }
  }
  sim.t += CONTROL_DT;
}

/* ── Scoring one move to a new target ─────────────────────────────────── */

const SCORE_WINDOW = 3.0; // seconds we watch a move before judging it
const HOLD_TIME = 0.4; // must stay inside the band this long to count as settled

export function createScore(startPos, target) {
  const step = target - startPos;
  return {
    target, step, dir: Math.sign(step) || 1,
    band: Math.max(0.03 * Math.abs(step), 0.006),
    elapsed: 0, peak: 0, crossings: 0, lastSide: 0,
    enteredAt: null, recent: [], done: false, result: null,
  };
}

/** Feed one sample. Returns the result object once, when the move has been judged. */
export function updateScore(sc, pos) {
  if (sc.done) return null;
  sc.elapsed += CONTROL_DT;
  const off = pos - sc.target;

  sc.peak = Math.max(sc.peak, sc.dir * off);
  const side = off > 0.002 ? 1 : off < -0.002 ? -1 : 0;
  if (side !== 0) {
    if (sc.lastSide !== 0 && side !== sc.lastSide) sc.crossings++;
    sc.lastSide = side;
  }

  if (Math.abs(off) <= sc.band) {
    if (sc.enteredAt === null) sc.enteredAt = sc.elapsed;
  } else {
    sc.enteredAt = null;
  }

  sc.recent.push(pos);
  if (sc.recent.length > 100) sc.recent.shift(); // last 0.5 s

  const overshootPct = (Math.max(0, sc.peak) / Math.abs(sc.step)) * 100;
  const settled = sc.enteredAt !== null && sc.elapsed - sc.enteredAt >= HOLD_TIME;

  if (settled) {
    const settleTime = sc.enteredAt;
    let verdict;
    if (overshootPct > 8 || sc.crossings >= 3) verdict = 'underdamped';
    else if (settleTime > 1.0) verdict = 'overdamped';
    else verdict = 'critical';
    return finish(sc, { verdict, overshootPct, settleTime, crossings: sc.crossings, errorCm: off * 100 });
  }

  if (sc.elapsed >= SCORE_WINDOW) {
    const moving = Math.max(...sc.recent) - Math.min(...sc.recent) > 0.004;
    return finish(sc, {
      verdict: moving ? 'ringing' : 'steadyState',
      overshootPct, settleTime: null, crossings: sc.crossings, errorCm: off * 100,
    });
  }
  return null;
}

function finish(sc, result) {
  sc.done = true;
  sc.result = result;
  return result;
}

/**
 * Simulation core for FeedforwardPlayground. Pure functions, no React or DOM.
 *
 * Same 1 m carriage as the PID playground (physics in ../PIDPlayground/sim.js),
 * but here it follows a trapezoidal motion profile and the output is
 *   kG  +  kS * sgn(velocity setpoint)  +  kV * velocity setpoint  +  feedback
 *
 * The plant's real constants are what the student is trying to find:
 *   gravity  -> kG (volts to hold it up)
 *   stiction -> kS (volts to overcome friction)
 *   friction -> kV (volts per m/s)
 */
import {
  CONTROL_DT, MAX_VOLTS, makeRng, lerp, clamp, level, applyOutput,
} from '../PIDPlayground/sim';

export { CONTROL_DT, MAX_VOLTS, makeRng };

export const SLOW = 0.3; // m/s cruise speed of a slow move
export const FAST = 0.7; // m/s cruise speed of a fast move
const ACCEL = 3.0; // m/s^2

export function randomPlant(seed) {
  const rng = makeRng(seed);
  const m = rng(), f = rng(), g = rng(), s = rng();
  return {
    seed,
    mass: lerp(0.1, 0.4, m),
    friction: lerp(1.0, 5.0, f),
    gravity: lerp(0.4, 2.5, g),
    stiction: lerp(0.15, 0.6, s),
    noise: lerp(0.0002, 0.0006, rng()),
    lag: lerp(0.008, 0.02, rng()),
    traits: {
      gravity: level(g, ['light', 'medium', 'heavy']),
      stiction: level(s, ['smooth', 'a bit sticky', 'sticky']),
      friction: level(f, ['low', 'medium', 'high']),
    },
  };
}

export function createSim(startPos = 0.2) {
  return { t: 0, pos: startPos, vel: 0, applied: 0, prevMeas: startPos, velFilt: 0 };
}

/** A trapezoidal move from `from` to `to`. sample(t) gives the setpoint at time t since the start. */
export function createProfile(from, to, cruise) {
  const dist = Math.abs(to - from), dir = Math.sign(to - from) || 1;
  let vMax = cruise, tAcc = vMax / ACCEL;
  if (ACCEL * tAcc * tAcc > dist) { tAcc = Math.sqrt(dist / ACCEL); vMax = ACCEL * tAcc; } // too short to reach cruise
  const dAcc = 0.5 * ACCEL * tAcc * tAcc;
  const tCruise = (dist - 2 * dAcc) / vMax;
  const total = 2 * tAcc + tCruise;
  return {
    from, to, dir, cruise, total,
    sample(t) {
      if (t >= total) return { pos: to, vel: 0, phase: 'hold', since: t - total };
      if (t < tAcc) return { pos: from + dir * 0.5 * ACCEL * t * t, vel: dir * ACCEL * t, phase: 'accel', since: t };
      if (t < tAcc + tCruise) {
        return { pos: from + dir * (dAcc + vMax * (t - tAcc)), vel: dir * vMax, phase: 'cruise', since: t - tAcc };
      }
      const left = total - t;
      return { pos: to - dir * 0.5 * ACCEL * left * left, vel: dir * ACCEL * left, phase: 'decel', since: t - tAcc - tCruise };
    },
  };
}

/**
 * Advance one controller period following setpoint `sp` ({pos, vel}).
 * Returns each feedforward term, the feedback term, and the clamped output.
 */
export function stepSim(sim, plant, gains, sp, push, rng) {
  const meas = sim.pos + (rng() - 0.5) * 2 * plant.noise;
  const rawVel = (meas - sim.prevMeas) / CONTROL_DT;
  sim.velFilt += 0.5 * (rawVel - sim.velFilt);
  sim.prevMeas = meas;

  const g = gains.kG;
  const s = gains.kS * Math.sign(sp.vel);
  const v = gains.kV * sp.vel;

  // Feedback is a plain P loop plus a pre-tuned damping term, so that the only
  // things left to tune here are the feedforward constants.
  const kD = Math.max(0, 2 * Math.sqrt(gains.kP * plant.mass) - plant.friction);
  const fb = gains.kP * (sp.pos - meas) + kD * (sp.vel - sim.velFilt);

  const u = clamp(g + s + v + fb, -MAX_VOLTS, MAX_VOLTS);
  applyOutput(sim, plant, u, push);
  return { g, s, v, fb, u, err: sp.pos - sim.pos };
}

/* ── Scoring one move ──────────────────────────────────────────────────── */

export const HOLD_TIME = 1.2; // seconds we watch it hold after the move ends

export function createScore(profile) {
  return {
    profile, cruiseFb: 0, cruiseN: 0, holdFb: 0, holdN: 0,
    errSum: 0, errN: 0, holdErr: 0, done: false,
  };
}

/** Feed one sample (the setpoint it was taken at, plus stepSim's output). Returns a result once. */
export function updateScore(sc, sp, out) {
  if (sc.done) return null;
  if (sp.phase === 'cruise' && sp.since > 0.25) { sc.cruiseFb += out.fb; sc.cruiseN++; }
  if (sp.phase !== 'hold') { sc.errSum += Math.abs(out.err); sc.errN++; }
  if (sp.phase === 'hold' && sp.since > 0.5) { sc.holdFb += out.fb; sc.holdErr += out.err; sc.holdN++; }
  if (sp.phase === 'hold' && sp.since >= HOLD_TIME) {
    sc.done = true;
    const dir = sc.profile.dir;
    return {
      dir, fast: sc.profile.cruise === FAST,
      // volts of feedback pushing in the direction of travel while cruising
      cruiseFb: sc.cruiseN ? (dir * sc.cruiseFb) / sc.cruiseN : 0,
      holdFb: sc.holdN ? sc.holdFb / sc.holdN : 0,
      trackCm: sc.errN ? (sc.errSum / sc.errN) * 100 : 0,
      holdCm: sc.holdN ? Math.abs(sc.holdErr / sc.holdN) * 100 : 0,
    };
  }
  return null;
}

/**
 * Which constant to change next: 'kG+' means raise kG, 'kV-' means lower kV, null means leave it.
 * Gravity first (it affects every move), then whichever friction term is further off.
 * null also means the move counts as well tuned: what feedback still adds is the part
 * these three constants cannot predict (acceleration, and sticking at the stop).
 */
export function nextHint(plant, gains) {
  const dG = plant.gravity - gains.kG;
  const dS = plant.stiction - gains.kS;
  const dV = plant.friction - gains.kV;
  if (Math.abs(dG) > 0.15) return dG > 0 ? 'kG+' : 'kG-';
  const sVolts = Math.abs(dS), vVolts = Math.abs(dV) * FAST; // compare both in volts
  if (sVolts <= 0.08 && vVolts <= 0.15) return null;
  if (vVolts >= sVolts) return dV > 0 ? 'kV+' : 'kV-';
  return dS > 0 ? 'kS+' : 'kS-';
}

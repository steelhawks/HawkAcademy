import React, { useEffect, useRef, useState, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
// Same panel look as the PID playground, so the two read as one family.
import styles from '../PIDPlayground/styles.module.css';
import { WINDOW_S, INK, PALETTE, PAD, fmt, fit, axes, line, endLabel, tooltip } from '../PIDPlayground/chart';
import {
  CONTROL_DT, MAX_VOLTS, SLOW, FAST, HOLD_TIME, makeRng, randomPlant, createSim, createProfile,
  stepSim, createScore, updateScore, nextHint,
} from './sim';

/**
 * FeedforwardPlayground — tune kG, kS and kV on a simulated 1 m carriage.
 *
 * The carriage follows a motion profile up and down the rail, alternating slow
 * and fast moves. The lower chart splits the motor output into the three
 * feedforward terms and the feedback term, so the goal is visible: get the
 * feedback line to sit near zero. Each mechanism has random constants to find.
 * The physics and scoring live in ./sim.js.
 */

const ZERO_GAINS = { kG: 0, kS: 0, kV: 0, kP: 20 };
const SERIES = { g: PALETTE[0], s: PALETTE[1], v: PALETTE[2] };
// up slow, down slow, up fast, down fast
const CYCLE = [[1, SLOW], [-1, SLOW], [1, FAST], [-1, FAST]];

const HINTS = {
  'kG+': 'It sags below the setpoint, and feedback has to hold it up. Raise kG until it holds its height with feedback near zero.',
  'kG-': 'kG is too high: it floats above the setpoint and feedback has to pull it back down. Lower kG.',
  'kV+': 'It falls behind while moving, and more on fast moves than on slow ones. That is the push that grows with speed: raise kV.',
  'kV-': 'It runs ahead of the setpoint on fast moves and feedback has to hold it back. Lower kV.',
  'kS+': 'Slow and fast moves fall behind by about the same amount. That is the fixed friction kS covers: raise kS.',
  'kS-': 'It jumps ahead as soon as a move starts, even a slow one. Lower kS.',
};
const DONE_HINT =
  'Feedforward is predicting almost all of the output. What feedback still adds is the part these three constants cannot predict: the extra push to speed up and slow down (that is kA) and sticking when it stops. Press "New mechanism" and find its constants.';

const signed = (v, digits = 2) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), digits)}`;

function Playground() {
  const [gains, setGains] = useState(ZERO_GAINS);
  const [paused, setPaused] = useState(false);
  const [plant, setPlant] = useState(() => randomPlant(1000 + Math.floor(Math.random() * 9000)));
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);

  // Everything the animation loop touches lives in refs so the loop never restarts.
  const live = useRef(null);
  if (live.current === null) {
    live.current = {
      sim: createSim(0.2), rng: makeRng(Date.now() & 0xffffffff),
      hist: { t: [], pos: [], sp: [], g: [], s: [], v: [], fb: [] },
      marks: [], move: 0, profile: null, startedAt: 0, score: null,
      push: 0, pushUntil: 0, hoverT: null, last: { g: 0, s: 0, v: 0, fb: 0, err: 0 }, spPos: 0.2,
    };
  }
  const gainsRef = useRef(gains); gainsRef.current = gains;
  const plantRef = useRef(plant); plantRef.current = plant;
  const pausedRef = useRef(paused); pausedRef.current = paused;

  const posCanvas = useRef(null);
  const outCanvas = useRef(null);
  const carriageEl = useRef(null);
  const markerEl = useRef(null);
  const readoutEl = useRef(null);

  const mark = (L, label) => {
    L.marks.push({ t: L.sim.t, label });
    if (L.marks.length > 24) L.marks.shift();
  };

  const bump = useCallback(() => {
    const L = live.current;
    L.push = (L.rng() < 0.5 ? -1 : 1) * 4;
    L.pushUntil = L.sim.t + 0.12;
    mark(L, 'bump');
    L.score = null; // a bump mid-move would make the numbers unfair
  }, []);

  const newMechanism = useCallback(() => {
    setPlant(randomPlant(1000 + Math.floor(Math.random() * 9000)));
    live.current.score = null;
    setResult(null);
    setStreak(0);
  }, []);

  /* ── simulation + drawing loop ───────────────────────────────────────── */
  useEffect(() => {
    const L = live.current;
    let raf = 0, lastWall = performance.now(), acc = 0, lastReadout = 0;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPaused(true);

    const startMove = () => {
      const [dir, speed] = CYCLE[L.move % CYCLE.length];
      L.move++;
      const to = dir > 0 ? 0.7 + L.rng() * 0.15 : 0.15 + L.rng() * 0.15;
      L.profile = createProfile(L.spPos, to, speed);
      L.startedAt = L.sim.t;
      L.score = createScore(L.profile);
      mark(L, speed === FAST ? 'fast' : 'slow');
    };

    const tick = () => {
      const H = L.hist, pl = plantRef.current, g = gainsRef.current;
      if (!L.profile || L.sim.t - L.startedAt >= L.profile.total + HOLD_TIME + 0.3) startMove();
      const sp = L.profile.sample(L.sim.t - L.startedAt);
      L.spPos = sp.pos;
      const out = stepSim(L.sim, pl, g, sp, L.sim.t < L.pushUntil ? L.push : 0, L.rng);
      L.last = out;
      H.t.push(L.sim.t); H.pos.push(L.sim.pos); H.sp.push(sp.pos);
      H.g.push(out.g); H.s.push(out.s); H.v.push(out.v); H.fb.push(out.fb);
      if (H.t.length > 2400) for (const k in H) H[k].splice(0, 600);

      if (L.score) {
        const res = updateScore(L.score, sp, out);
        if (res) {
          const hint = nextHint(pl, g);
          setResult({ ...res, hint });
          setStreak((n) => (hint === null ? n + 1 : 0));
        }
      }
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - lastWall) / 1000);
      lastWall = now;
      if (!pausedRef.current) {
        acc += dt;
        while (acc >= CONTROL_DT) { tick(); acc -= CONTROL_DT; }
      }
      draw(L, posCanvas.current, outCanvas.current);
      if (carriageEl.current) carriageEl.current.style.bottom = `${L.sim.pos * 100}%`;
      if (markerEl.current) markerEl.current.style.bottom = `${L.spPos * 100}%`;
      if (readoutEl.current && now - lastReadout > 100) {
        lastReadout = now;
        const o = L.last, ff = o.g + o.s + o.v;
        const sat = Math.abs(ff + o.fb) >= MAX_VOLTS ? ' (maxed out)' : '';
        readoutEl.current.textContent =
          `Tracking error ${fmt(o.err * 100)} cm   Feedforward ${fmt(ff, 2)} V   Feedback ${fmt(o.fb, 2)} V${sat}`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left - PAD.l) / (rect.width - PAD.l - PAD.r);
    live.current.hoverT = frac >= 0 && frac <= 1 ? frac : null;
  };
  const offHover = () => { live.current.hoverT = null; };

  const slider = (key, label, max, step, digits, unit, help) => (
    <label className={styles.slider}>
      <span className={styles.sliderHead}>
        <span className={styles.sliderName}>{label}</span>
        <span className={styles.sliderValue}>{fmt(gains[key], digits)}{unit}</span>
      </span>
      <input
        type="range" min="0" max={max} step={step} value={gains[key]}
        onChange={(e) => setGains((g) => ({ ...g, [key]: Number(e.target.value) }))}
      />
      <span className={styles.sliderHelp}>{help}</span>
    </label>
  );

  const tr = plant.traits;
  const good = result && result.hint === null;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.mech}>
          <strong>Mechanism #{plant.seed}</strong>
          {` — ${tr.gravity} carriage · ${tr.stiction} · ${tr.friction} drag at speed`}
        </span>
        <button className={styles.btnPrimary} onClick={newMechanism}>New mechanism</button>
      </div>

      <div className={styles.stage}>
        <div className={styles.rail} aria-hidden="true">
          <div className={styles.track} />
          <div className={styles.marker} ref={markerEl} />
          <div className={styles.carriage} ref={carriageEl} />
        </div>
        <div className={styles.charts}>
          <div className={styles.chartTitle}>Position (cm)</div>
          <canvas
            ref={posCanvas} className={styles.posCanvas} onMouseMove={onHover} onMouseLeave={offHover}
            role="img" aria-label="Live chart of the mechanism's position against its moving setpoint over the last 8 seconds"
          />
          <div className={styles.chartTitle}>
            Motor output (V)
            <span className={styles.legend}>
              <span><i style={{ background: SERIES.g }} />kG</span>
              <span><i style={{ background: SERIES.s }} />kS</span>
              <span><i style={{ background: SERIES.v }} />kV</span>
              <span><i style={{ background: INK.primary, height: 5 }} />Feedback (aim for zero)</span>
            </span>
          </div>
          <canvas
            ref={outCanvas} className={styles.outCanvas} onMouseMove={onHover} onMouseLeave={offHover}
            role="img" aria-label="Live chart of the kG, kS and kV feedforward terms and the feedback term, in volts"
          />
        </div>
      </div>

      <div className={styles.readout} ref={readoutEl}>&nbsp;</div>

      <div className={styles.controls}>
        {slider('kG', 'kG', 3, 0.05, 2, ' V', 'constant push to hold it up against gravity')}
        {slider('kS', 'kS', 1, 0.01, 2, ' V', 'fixed push to beat friction, in the direction of travel')}
        {slider('kV', 'kV', 6, 0.05, 2, ' V per m/s', 'extra push for every bit of speed')}
        {slider('kP', 'Feedback (kP)', 40, 1, 0, '', 'how hard feedback corrects what is left; 0 turns it off')}
      </div>

      <div className={styles.buttons}>
        <button className={styles.btn} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
        <button className={styles.btn} onClick={bump}>Bump it</button>
        <button className={styles.btn} onClick={() => setGains(ZERO_GAINS)}>Reset constants</button>
      </div>

      <div className={`${styles.score} ${result ? (good ? styles.good : styles.warn) : ''}`} aria-live="polite">
        {result ? (
          <>
            <div className={styles.scoreTitle}>
              Last move ({result.fast ? 'fast' : 'slow'}, {result.dir > 0 ? 'up' : 'down'}):{' '}
              {good ? 'feedforward is doing the work' : 'feedback is still doing the work'}
              {streak >= 2 && <span className={styles.streak}>{streak} good moves in a row</span>}
            </div>
            <div className={styles.stats}>
              <span>Feedback while moving <b>{signed(result.cruiseFb)} V</b></span>
              <span>Feedback while holding <b>{signed(result.holdFb)} V</b></span>
              <span>Average tracking error <b>{fmt(result.trackCm)} cm</b></span>
            </div>
            <div className={styles.hint}>{good ? DONE_HINT : HINTS[result.hint]}</div>
          </>
        ) : (
          <div className={styles.hint}>
            Every move gets measured here. All three constants start at zero, so right now feedback is doing everything.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── drawing (shared canvas helpers live in ../PIDPlayground/chart.js) ── */

function draw(L, posCanvas, outCanvas) {
  if (!posCanvas || !outCanvas) return;
  const H = L.hist, now = L.sim.t;
  let start = 0;
  while (start < H.t.length && H.t[start] < now - WINDOW_S) start++;

  // which sample is under the cursor (shared by both charts)
  let hover = -1;
  if (L.hoverT !== null && H.t.length) {
    const want = now - WINDOW_S + L.hoverT * WINDOW_S;
    hover = Math.min(H.t.length - 1, Math.max(start, start + Math.round((want - H.t[start]) / CONTROL_DT)));
  }
  const crosshair = (ctx, x, h) => {
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, h - PAD.b); ctx.stroke();
  };

  /* position chart */
  {
    const { ctx, w, h } = fit(posCanvas);
    const yOf = (m) => PAD.t + (1 - m) * (h - PAD.t - PAD.b);
    const xOf = axes(ctx, w, h, [0, 25, 50, 75, 100], (cm) => yOf(cm / 100), now);
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, 0, w - PAD.l - PAD.r, h - PAD.b); ctx.clip();
    ctx.fillStyle = INK.secondary; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const m of L.marks) {
      if (m.t < now - WINDOW_S) continue;
      const x = xOf(m.t);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, PAD.t + 12); ctx.lineTo(x, h - PAD.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText(m.label, x, PAD.t);
    }
    line(ctx, H.t, H.sp, xOf, yOf, start, INK.secondary, 1.5, [5, 4]);
    line(ctx, H.t, H.pos, xOf, yOf, start, INK.primary, 2);
    ctx.restore();
    if (H.t.length) {
      const yp = yOf(L.sim.pos), ys = yOf(H.sp[H.sp.length - 1]);
      const apart = Math.abs(yp - ys) >= 12;
      endLabel(ctx, 'position', w - PAD.r, apart ? yp : ys + (yp >= ys ? 7 : -7));
      endLabel(ctx, 'setpoint', w - PAD.r, apart ? ys : ys + (yp >= ys ? -7 : 7));
    }
    if (hover >= 0) {
      const x = xOf(H.t[hover]);
      crosshair(ctx, x, h);
      tooltip(ctx, x, PAD.t + 2, [
        { text: `${fmt(now - H.t[hover])} s ago` },
        { text: `position ${fmt(H.pos[hover] * 100)} cm` },
        { text: `setpoint ${fmt(H.sp[hover] * 100)} cm` },
      ]);
    }
  }

  /* output chart */
  {
    const { ctx, w, h } = fit(outCanvas);
    const span = 7; // volts shown each side of zero; these mechanisms never need more
    const yOf = (volts) => PAD.t + (1 - (Math.max(-span, Math.min(span, volts)) + span) / (2 * span)) * (h - PAD.t - PAD.b);
    const xOf = axes(ctx, w, h, [-6, -3, 0, 3, 6], yOf, now);
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, 0, w - PAD.l - PAD.r, h - PAD.b); ctx.clip();
    // feedback goes underneath and wider, so the feedforward terms stay readable on top of it
    line(ctx, H.t, H.fb, xOf, yOf, start, INK.primary, 4);
    line(ctx, H.t, H.g, xOf, yOf, start, SERIES.g, 2);
    line(ctx, H.t, H.v, xOf, yOf, start, SERIES.v, 2);
    line(ctx, H.t, H.s, xOf, yOf, start, SERIES.s, 2);
    ctx.restore();
    if (hover >= 0) {
      const x = xOf(H.t[hover]);
      crosshair(ctx, x, h);
      tooltip(ctx, x, PAD.t + 2, [
        { color: SERIES.g, text: `kG ${fmt(H.g[hover], 2)} V` },
        { color: SERIES.s, text: `kS ${fmt(H.s[hover], 2)} V` },
        { color: SERIES.v, text: `kV ${fmt(H.v[hover], 2)} V` },
        { color: INK.primary, text: `Feedback ${fmt(H.fb[hover], 2)} V` },
      ]);
    }
  }
}

export default function FeedforwardPlayground() {
  return (
    <BrowserOnly fallback={<div className={styles.root}><div className={styles.hint}>Loading the feedforward playground…</div></div>}>
      {() => <Playground />}
    </BrowserOnly>
  );
}

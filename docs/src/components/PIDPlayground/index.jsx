import React, { useEffect, useRef, useState, useCallback } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';
import {
  CONTROL_DT, MAX_VOLTS, makeRng, randomPlant, createSim, stepSim, createScore, updateScore,
} from './sim';
import { WINDOW_S, INK, PALETTE, PAD, fmt, fit, axes, line, endLabel, tooltip } from './chart';

/**
 * PIDPlayground — a live, tunable PID loop driving a simulated 1 m carriage.
 *
 * Every mechanism is randomly generated (mass, friction, gravity, motor lag),
 * so gains that work on one will not work on the next. Each move to a new
 * target is scored: overshoot, settling time, and a damping verdict.
 * The physics and scoring live in ./sim.js.
 */

const DEFAULT_GAINS = { kP: 20, kI: 0, kD: 0 };

// P / I / D take the three validated categorical slots.
const SERIES = { p: PALETTE[0], i: PALETTE[1], d: PALETTE[2] };

const VERDICTS = {
  critical: {
    title: 'Close to critically damped',
    tone: 'good',
    hint: 'Fast, with little or no overshoot. This is the goal. Now press "New mechanism" and see whether the same gains still work.',
  },
  underdamped: {
    title: 'Underdamped',
    tone: 'warn',
    hint: 'It overshot or rang before settling. Add some kD, or lower kP.',
  },
  overdamped: {
    title: 'Overdamped (slow)',
    tone: 'warn',
    hint: 'No real overshoot, but it took its time. Raise kP, or back off kD.',
  },
  ringing: {
    title: 'Still oscillating after 3 seconds',
    tone: 'bad',
    hint: 'The loop is ringing or unstable. Lower kP or add kD. On a sluggish motor, too much kD causes this as well.',
  },
  steadyState: {
    title: 'Steady-state error',
    tone: 'warn',
    hint: 'It stopped away from the target and stayed there: P has run out of push. A little kI closes the gap. The next page shows the better fix, feedforward.',
  },
};


function Playground() {
  const [gains, setGains] = useState(DEFAULT_GAINS);
  const [target, setTarget] = useState(0.7);
  const [paused, setPaused] = useState(false);
  const [autoTargets, setAutoTargets] = useState(true);
  const [autoBumps, setAutoBumps] = useState(true);
  const [plant, setPlant] = useState(() => randomPlant(1000 + Math.floor(Math.random() * 9000)));
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);

  // Everything the animation loop touches lives in refs so the loop never restarts.
  const live = useRef(null);
  if (live.current === null) {
    live.current = {
      sim: createSim(0.2), rng: makeRng(Date.now() & 0xffffffff),
      hist: { t: [], pos: [], tgt: [], p: [], i: [], d: [], u: [] },
      bumps: [], score: createScore(0.2, 0.7), push: 0, pushUntil: 0,
      nextTargetAt: 6, nextBumpAt: 9, hoverT: null, last: { p: 0, i: 0, d: 0, u: 0 },
    };
  }
  const gainsRef = useRef(gains); gainsRef.current = gains;
  const targetRef = useRef(target); targetRef.current = target;
  const plantRef = useRef(plant); plantRef.current = plant;
  const flags = useRef({}); flags.current = { paused, autoTargets, autoBumps };

  const posCanvas = useRef(null);
  const outCanvas = useRef(null);
  const carriageEl = useRef(null);
  const markerEl = useRef(null);
  const readoutEl = useRef(null);

  const moveTo = useCallback((value) => {
    const L = live.current;
    const v = Math.min(0.95, Math.max(0.05, value));
    targetRef.current = v;
    setTarget(v);
    L.score = Math.abs(v - L.sim.pos) >= 0.08 ? createScore(L.sim.pos, v) : null;
    L.nextTargetAt = L.sim.t + 6 + L.rng() * 2;
  }, []);

  const bump = useCallback((manual) => {
    const L = live.current;
    const dir = L.rng() < 0.5 ? -1 : 1;
    L.push = dir * (manual ? 4.5 : 2.5 + L.rng() * 2.5);
    L.pushUntil = L.sim.t + 0.12;
    L.bumps.push(L.sim.t);
    if (L.bumps.length > 20) L.bumps.shift();
    if (L.score && !L.score.done) L.score = null; // a bump mid-move would make the score unfair
    L.nextBumpAt = L.sim.t + 4 + L.rng() * 4;
  }, []);

  const newMechanism = useCallback(() => {
    const L = live.current;
    setPlant(randomPlant(1000 + Math.floor(Math.random() * 9000)));
    const t = L.sim.t; // keep the clock running so the chart history stays continuous
    L.sim = createSim(L.sim.pos);
    L.sim.t = t;
    L.score = null;
    L.nextTargetAt = t + 1; // give the new mechanism a move to be judged on right away
    setResult(null);
    setStreak(0);
  }, []);

  /* ── simulation + drawing loop ───────────────────────────────────────── */
  useEffect(() => {
    const L = live.current;
    let raf = 0, lastWall = performance.now(), acc = 0, lastReadout = 0;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true); setAutoTargets(false); setAutoBumps(false);
    }

    const tick = () => {
      const F = flags.current, pl = plantRef.current, H = L.hist;
      const tgt = targetRef.current;
      const out = stepSim(L.sim, pl, gainsRef.current, tgt, L.sim.t < L.pushUntil ? L.push : 0, L.rng);
      L.last = out;
      H.t.push(L.sim.t); H.pos.push(L.sim.pos); H.tgt.push(tgt);
      H.p.push(out.p); H.i.push(out.i); H.d.push(out.d); H.u.push(out.u);
      if (H.t.length > 2400) for (const k in H) H[k].splice(0, 600);

      if (L.score && !L.score.done) {
        const res = updateScore(L.score, L.sim.pos);
        if (res) {
          setResult(res);
          setStreak((s) => (res.verdict === 'critical' ? s + 1 : 0));
          L.nextBumpAt = Math.max(L.nextBumpAt, L.sim.t + 1);
        }
      }
      const scoring = L.score && !L.score.done;
      if (F.autoBumps && !scoring && L.sim.t >= L.nextBumpAt) bump(false);
      if (F.autoTargets && L.sim.t >= L.nextTargetAt) {
        let next;
        do { next = 0.12 + L.rng() * 0.76; } while (Math.abs(next - tgt) < 0.25);
        moveTo(next);
      }
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - lastWall) / 1000);
      lastWall = now;
      if (!flags.current.paused) {
        acc += dt;
        while (acc >= CONTROL_DT) { tick(); acc -= CONTROL_DT; }
      }
      draw(L, posCanvas.current, outCanvas.current);
      if (carriageEl.current) carriageEl.current.style.bottom = `${L.sim.pos * 100}%`;
      if (markerEl.current) markerEl.current.style.bottom = `${targetRef.current * 100}%`;
      if (readoutEl.current && now - lastReadout > 100) {
        lastReadout = now;
        const err = (targetRef.current - L.sim.pos) * 100;
        const sat = Math.abs(L.last.u) >= MAX_VOLTS - 1e-6 ? ' (maxed out)' : '';
        readoutEl.current.textContent =
          `Position ${fmt(L.sim.pos * 100)} cm   Error ${fmt(err)} cm   Output ${fmt(L.last.u)} V${sat}`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bump, moveTo]);

  const onHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left - PAD.l) / (rect.width - PAD.l - PAD.r);
    live.current.hoverT = frac >= 0 && frac <= 1 ? frac : null;
  };
  const offHover = () => { live.current.hoverT = null; };

  const slider = (key, label, max, step, help) => (
    <label className={styles.slider}>
      <span className={styles.sliderHead}>
        <span className={styles.sliderName}>{label}</span>
        <span className={styles.sliderValue}>{fmt(gains[key], step < 1 ? 1 : 0)}</span>
      </span>
      <input
        type="range" min="0" max={max} step={step} value={gains[key]}
        onChange={(e) => setGains((g) => ({ ...g, [key]: Number(e.target.value) }))}
      />
      <span className={styles.sliderHelp}>{help}</span>
    </label>
  );

  const v = result && VERDICTS[result.verdict];
  const tr = plant.traits;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.mech}>
          <strong>Mechanism #{plant.seed}</strong>
          {` — ${tr.mass} mass · ${tr.friction} friction · ${tr.gravity} gravity · ${tr.lag} motor`}
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
            role="img" aria-label="Live chart of the mechanism's position against its target over the last 8 seconds"
          />
          <div className={styles.chartTitle}>
            Motor output (V)
            <span className={styles.legend}>
              <span><i style={{ background: SERIES.p }} />P</span>
              <span><i style={{ background: SERIES.i }} />I</span>
              <span><i style={{ background: SERIES.d }} />D</span>
              <span><i style={{ background: INK.primary, height: 5 }} />Output (sum, max ±12)</span>
            </span>
          </div>
          <canvas
            ref={outCanvas} className={styles.outCanvas} onMouseMove={onHover} onMouseLeave={offHover}
            role="img" aria-label="Live chart of the P, I and D contributions and the total motor output in volts"
          />
        </div>
      </div>

      <div className={styles.readout} ref={readoutEl}>&nbsp;</div>

      <div className={styles.controls}>
        {slider('kP', 'kP', 200, 1, 'push harder the farther off you are')}
        {slider('kI', 'kI', 300, 1, 'push harder the longer you stay off')}
        {slider('kD', 'kD', 12, 0.1, 'brake when closing in fast')}
        <label className={styles.slider}>
          <span className={styles.sliderHead}>
            <span className={styles.sliderName}>Target</span>
            <span className={styles.sliderValue}>{fmt(target * 100, 0)} cm</span>
          </span>
          <input
            type="range" min="5" max="95" step="1" value={Math.round(target * 100)}
            onChange={(e) => moveTo(Number(e.target.value) / 100)}
          />
          <span className={styles.sliderHelp}>where the carriage should go</span>
        </label>
      </div>

      <div className={styles.buttons}>
        <button className={styles.btn} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
        <button className={styles.btn} onClick={() => moveTo(target > 0.5 ? 0.25 : 0.75)}>New target</button>
        <button className={styles.btn} onClick={() => bump(true)}>Bump it</button>
        <button className={styles.btn} onClick={() => setGains(DEFAULT_GAINS)}>Reset gains</button>
        <label className={styles.check}>
          <input type="checkbox" checked={autoTargets} onChange={(e) => setAutoTargets(e.target.checked)} />
          Auto targets
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={autoBumps} onChange={(e) => setAutoBumps(e.target.checked)} />
          Random bumps
        </label>
      </div>

      <div className={`${styles.score} ${v ? styles[v.tone] : ''}`} aria-live="polite">
        {v ? (
          <>
            <div className={styles.scoreTitle}>
              Last move: {v.title}
              {streak >= 2 && <span className={styles.streak}>{streak} good moves in a row</span>}
            </div>
            <div className={styles.stats}>
              <span>Overshoot <b>{fmt(result.overshootPct, 0)}%</b></span>
              <span>Settled in <b>{result.settleTime === null ? 'never' : `${fmt(result.settleTime, 2)} s`}</b></span>
              <span>Final error <b>{fmt(Math.abs(result.errorCm))} cm</b></span>
            </div>
            <div className={styles.hint}>{v.hint}</div>
          </>
        ) : (
          <div className={styles.hint}>
            Every move to a new target gets scored here. Watch one move, then start adjusting the gains.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── drawing (shared canvas helpers live in ./chart.js) ───────────────── */

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

  /* position chart */
  {
    const { ctx, w, h } = fit(posCanvas);
    const yOf = (m) => PAD.t + (1 - m) * (h - PAD.t - PAD.b);
    const xOf = axes(ctx, w, h, [0, 25, 50, 75, 100], (cm) => yOf(cm / 100), now);
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, 0, w - PAD.l - PAD.r, h - PAD.b); ctx.clip();
    ctx.fillStyle = INK.secondary; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const t of L.bumps) {
      if (t < now - WINDOW_S) continue;
      const x = xOf(t);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, PAD.t + 12); ctx.lineTo(x, h - PAD.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText('bump', x, PAD.t);
    }
    line(ctx, H.t, H.tgt, xOf, yOf, start, INK.secondary, 1.5, [5, 4]);
    line(ctx, H.t, H.pos, xOf, yOf, start, INK.primary, 2);
    ctx.restore();
    if (H.t.length) {
      const yp = yOf(L.sim.pos), yt = yOf(H.tgt[H.tgt.length - 1]);
      const apart = Math.abs(yp - yt) >= 12;
      endLabel(ctx, 'position', w - PAD.r, apart ? yp : yt + (yp >= yt ? 7 : -7));
      endLabel(ctx, 'target', w - PAD.r, apart ? yt : yt + (yp >= yt ? -7 : 7));
    }
    if (hover >= 0) {
      const x = xOf(H.t[hover]);
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, h - PAD.b); ctx.stroke();
      tooltip(ctx, x, PAD.t + 2, [
        { text: `${fmt(now - H.t[hover])} s ago` },
        { text: `position ${fmt(H.pos[hover] * 100)} cm` },
        { text: `target ${fmt(H.tgt[hover] * 100)} cm` },
      ]);
    }
  }

  /* output chart */
  {
    const { ctx, w, h } = fit(outCanvas);
    const span = MAX_VOLTS * 1.25;
    const yOf = (volts) => PAD.t + (1 - (Math.max(-span, Math.min(span, volts)) + span) / (2 * span)) * (h - PAD.t - PAD.b);
    const xOf = axes(ctx, w, h, [-12, -6, 0, 6, 12], yOf, now);
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD.l, 0, w - PAD.l - PAD.r, h - PAD.b); ctx.clip();
    // output goes underneath and wider, so a term that equals it (often P) still shows on top
    line(ctx, H.t, H.u, xOf, yOf, start, INK.primary, 4.5);
    line(ctx, H.t, H.i, xOf, yOf, start, SERIES.i, 2);
    line(ctx, H.t, H.d, xOf, yOf, start, SERIES.d, 2);
    line(ctx, H.t, H.p, xOf, yOf, start, SERIES.p, 2);
    ctx.restore();
    if (hover >= 0) {
      const x = xOf(H.t[hover]);
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, h - PAD.b); ctx.stroke();
      tooltip(ctx, x, PAD.t + 2, [
        { color: SERIES.p, text: `P ${fmt(H.p[hover])} V` },
        { color: SERIES.i, text: `I ${fmt(H.i[hover])} V` },
        { color: SERIES.d, text: `D ${fmt(H.d[hover])} V` },
        { color: INK.primary, text: `Output ${fmt(H.u[hover])} V` },
      ]);
    }
  }
}

export default function PIDPlayground() {
  return (
    <BrowserOnly fallback={<div className={styles.root}><div className={styles.hint}>Loading the PID playground…</div></div>}>
      {() => <Playground />}
    </BrowserOnly>
  );
}

/**
 * Canvas helpers shared by the control-theory playgrounds (PIDPlayground,
 * FeedforwardPlayground): a scrolling time chart with gridlines, 2px lines,
 * end labels and a hover tooltip.
 */

export const WINDOW_S = 8; // seconds of history shown

// Chart ink. The panels are always dark (like JavaRunner), so these are fixed.
export const INK = { primary: '#f0f0f0', secondary: '#9ca3af', grid: '#2f2f2f', surface: '#1e1e1e' };
// First three slots of a colorblind-validated categorical palette (dark surface).
export const PALETTE = ['#3987e5', '#d95926', '#199e70'];

export const fmt = (v, digits = 1) => (Object.is(v, -0) ? 0 : v).toFixed(digits);

export const PAD = { l: 34, r: 58, t: 8, b: 18 };

export function fit(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function axes(ctx, w, h, ticks, yOf, now) {
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  for (const tick of ticks) {
    const y = Math.round(yOf(tick)) + 0.5;
    ctx.strokeStyle = INK.grid;
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(w - PAD.r, y); ctx.stroke();
    ctx.fillStyle = INK.secondary; ctx.textAlign = 'right';
    ctx.fillText(String(tick), PAD.l - 6, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let s = 0; s <= WINDOW_S; s += 2) {
    const x = PAD.l + ((WINDOW_S - s) / WINDOW_S) * (w - PAD.l - PAD.r);
    ctx.fillText(s === 0 ? 'now' : `-${s}s`, x, h - 4);
  }
  return (t) => PAD.l + ((t - (now - WINDOW_S)) / WINDOW_S) * (w - PAD.l - PAD.r);
}

export function line(ctx, ts, ys, xOf, yOf, start, color, width, dash) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  for (let k = start; k < ts.length; k++) {
    const x = xOf(ts[k]), y = yOf(ys[k]);
    if (k === start) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export function endLabel(ctx, text, x, y) {
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = INK.secondary; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y);
}

export function tooltip(ctx, x, top, rows) {
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  const width = Math.max(...rows.map((r) => ctx.measureText(r.text).width)) + 28;
  const height = rows.length * 16 + 8;
  const left = x + width + 12 > ctx.canvas.clientWidth - PAD.r ? x - width - 8 : x + 8;
  ctx.fillStyle = '#0d0d0d'; ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(left, top, width, height, 4); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  rows.forEach((r, k) => {
    const y = top + 12 + k * 16;
    if (r.color) { ctx.fillStyle = r.color; ctx.fillRect(left + 8, y - 4, 8, 8); }
    ctx.fillStyle = INK.primary;
    ctx.fillText(r.text, left + (r.color ? 22 : 8), y);
  });
}

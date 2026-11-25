// Marks layer: anchored labels, dimension lines drawn on the furniture, subtitles, title card.
// Every label hangs on a 3D point projected each frame; every number on screen is in FACTS.md (counts are the model's own).
import * as THREE from 'three';
import { seg, ss, eo } from '/core/lib.js';
import * as TL from './timeline.js';

const { T, LBL, VO } = TL;
const cv = document.getElementById('ov'), g = cv.getContext('2d');
const SANS = '"Inter", sans-serif', MONO = '"JBMono", monospace';
const INK = '#f1efe9', DIM = 'rgba(241,239,233,.62)', ACC = '#ff6b3d', LINE = 'rgba(241,239,233,.75)';
const SUB = { font: `400 34px ${SANS}`, safe: 1500, y: 1012 };

let CUES = null, texts = [];
export async function initOverlay() {
  try { CUES = await (await fetch('cues.json')).json(); }
  catch { CUES = VO.map((v, i) => ({ id: v.id, t0: v.t - .05, t1: Math.min(v.t + 2.8, VO[i + 1] ? VO[i + 1].t - .1 : T.end), en: v.en })); }
}
export const overlayTexts = () => texts;
export function subcheck() {
  g.font = SUB.font; let ok = true;
  const cues = VO.map(v => { const w = Math.round(g.measureText(v.en).width); ok = ok && w <= SUB.safe; return { id: v.id, en: v.en, w }; });
  return { safe: SUB.safe, ok, cues };
}

const v3 = new THREE.Vector3();
let CAM, Wd, Hd;
const proj = v => { v3.copy(v).project(CAM); return [(v3.x + 1) / 2 * Wd, (1 - v3.y) / 2 * Hd, v3.z]; };
const fade = (t, a, d = .3) => ss(seg(t, a, a + d));

// one label: anchor dot + leader (diagonal then horizontal) + index / name / spec
function label(t, o) {
  const { t0, t1, a, lx, ly, idx, name, spec, id, align = 'left' } = o;
  const dl = eo(seg(t, t0, t0 + .38)), tx = fade(t, t0 + .18, .32), out = 1 - fade(t, t1 - .3, .3);
  if (dl <= 0 || out <= 0) return;
  const [ax, ay] = a, dir = align === 'left' ? 1 : -1, ex = lx - dir * 34;
  g.globalAlpha = out;
  g.fillStyle = INK; g.beginPath(); g.arc(ax, ay, 3.4, 0, 7); g.fill();
  g.strokeStyle = 'rgba(241,239,233,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(ax, ay, 3.4 + 6 * dl, 0, 7); g.stroke();
  const s1 = Math.hypot(ex - ax, ly - ay), s2 = Math.abs(lx - dir * 14 - ex), len = (s1 + s2) * dl;
  g.strokeStyle = LINE; g.lineWidth = 1.3; g.beginPath(); g.moveTo(ax, ay);
  if (len <= s1) g.lineTo(ax + (ex - ax) * len / s1, ay + (ly - ay) * len / s1);
  else { g.lineTo(ex, ly); g.lineTo(ex + dir * (len - s1), ly); }
  g.stroke();
  if (tx <= 0) return;
  g.globalAlpha = out * tx; const dx = (1 - tx) * 10 * dir;
  g.textAlign = align; g.textBaseline = 'alphabetic';
  g.font = `500 30px ${SANS}`; const nw = g.measureText(name).width;
  g.font = `400 18px ${MONO}`; const sw = spec ? g.measureText(spec).width : 0;
  const nx = align === 'left' ? lx + (idx ? 40 : 0) : lx;
  // a soft dark backing so labels never sit on a bright part
  const bw = Math.max(nw, sw) + (idx ? 40 : 0) + 24, bx = align === 'left' ? lx - 12 : lx - bw + 12;
  g.fillStyle = 'rgba(12,13,15,.42)'; g.fillRect(bx + dx, ly - 32, bw, spec ? 72 : 46);
  if (idx) { g.fillStyle = ACC; g.font = `500 16px ${MONO}`; g.textAlign = 'left'; g.fillText(idx, (align === 'left' ? lx : lx - Math.max(nw, sw) - 40) + dx, ly - 4); g.textAlign = align; }
  g.fillStyle = INK; g.font = `500 30px ${SANS}`; g.fillText(name, nx + dx, ly + 4);
  if (spec) { g.fillStyle = DIM; g.font = `400 18px ${MONO}`; g.fillText(spec, nx + dx, ly + 31); }
  g.textAlign = 'left';
  if (tx > .99 && out > .99) texts.push({ id, text: (idx ? idx + ' ' : '') + name + (spec ? ' ' + spec : ''), x0: Math.max(0, bx), y0: ly - 32, x1: Math.min(Wd, bx + bw), y1: ly + (spec ? 40 : 14) });
}

// dimension line between two 3D points; ext = [[from, to], …] extension lines
function dimension(t, o) {
  const { t0, t1, A, B, ext = [], text, id, sub } = o;
  const k = eo(seg(t, t0, t0 + .55)), out = 1 - fade(t, t1 - .3, .3);
  if (k <= 0 || out <= 0) return;
  const a = proj(A), b = proj(B), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  g.globalAlpha = out; g.strokeStyle = ACC; g.lineWidth = 1.6;
  for (const [p, q] of ext) { const p1 = proj(p), q1 = proj(q); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p1[0] + (q1[0] - p1[0]) * k, p1[1] + (q1[1] - p1[1]) * k); g.stroke(); }
  g.beginPath(); g.moveTo(mx + (a[0] - mx) * k, my + (a[1] - my) * k); g.lineTo(mx + (b[0] - mx) * k, my + (b[1] - my) * k); g.stroke();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (const p of [a, b]) { g.save(); g.translate(p[0], p[1]); g.rotate(ang - Math.PI / 4); g.beginPath(); g.moveTo(-7 * k, 0); g.lineTo(7 * k, 0); g.stroke(); g.restore(); }
  const tA = fade(t, t0 + .35, .3); if (tA <= 0) return;
  let ra = ang; if (ra > Math.PI / 2) ra -= Math.PI; if (ra < -Math.PI / 2) ra += Math.PI;
  g.save(); g.translate(mx, my); g.rotate(ra); g.globalAlpha = out * tA; g.textAlign = 'center';
  g.font = `500 22px ${MONO}`; const w = g.measureText(text).width;
  g.fillStyle = 'rgba(14,15,17,.78)'; g.fillRect(-w / 2 - 9, -35, w + 18, 31);
  g.fillStyle = INK; g.fillText(text, 0, -12);
  let sw = 0;
  if (sub) { g.font = `400 17px ${SANS}`; sw = g.measureText(sub).width; g.fillStyle = 'rgba(14,15,17,.6)'; g.fillRect(-sw / 2 - 7, -62, sw + 14, 24); g.fillStyle = DIM; g.fillText(sub, 0, -44); }
  g.restore(); g.textAlign = 'left';
  const hw = Math.max(w, sw) / 2 + 12, R = Math.abs(Math.sin(ra)) * 60;
  if (tA > .99 && out > .99) texts.push({ id, text: (sub ? sub + ' ' : '') + text, x0: mx - hw - R, y0: my - 66 - R, x1: mx + hw + R, y1: my + 8 + R });
}

const LAYER_LABELS = [
  { id: 'carpet', k: 'carpet', a: [-4.4, .012, 3.3], name: 'Carpet tiles', spec: '×384 · laid in a wave' },
  { id: 'desk', k: 'desk', a: [-4.8, .74, .78], name: 'Sit-stand desks', spec: '×8 · oak tops' },
  { id: 'chair', k: 'chair', a: [0, .78, 1.5], name: 'Task chairs', spec: '×12 · mesh backs' },
  { id: 'acc', k: 'acc', a: [5.05, 2.25, -2.7], name: 'Screens, booth, lounge', spec: '×8 screens · ×5 planters' },
  { id: 'people', k: 'people', a: [-1.6, 1.72, 1.1], name: 'People', spec: '×7' },
  { id: 'ceil', k: 'ceil', a: [-.8, 2.43, .9], name: 'Light and ceiling', spec: '×4 linear pendants' },
];

export function drawOverlay(t, cam, ctx) {
  CAM = cam; Wd = ctx.W; Hd = ctx.H; texts = [];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const { at, heroH } = ctx;
  // 1 · the six layers of the stack, right-hand column
  const LL = LBL.layers;
  if (t > LL.t0 - .05 && t < LL.t1 + .1) {
    const pts = LAYER_LABELS.map(o => proj(at(o.k, ...o.a, t)));
    const ys = pts.map(p => p[1]).reverse();          // top layer first
    for (let it = 0; it < 6; it++) for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] < 96) { const m = (ys[i] + ys[i - 1]) / 2; ys[i - 1] = m - 48; ys[i] = m + 48; }
    const yr = ys.reverse();
    LAYER_LABELS.forEach((o, i) => label(t, { id: o.id, t0: LL.t0 + i * LL.step, t1: LL.t1, a: pts[i], lx: 1430, ly: Math.min(900, yr[i]), idx: String(i + 1).padStart(2, '0'), name: o.name, spec: o.spec }));
  }
  // 2 · the desk stop: the hero desk rises with its range drawn on it
  if (t > LBL.desk[0] - .05 && t < LBL.desk[1] + .1) {
    const h = heroH(t), x0 = -1.6 + .8, zf = .4 + .4;
    const a = proj(at(null, -1.6 + .35, h, zf - .05, t));
    label(t, { id: 'desk', t0: LBL.desk[0], t1: LBL.desk[1], a, lx: 1290, ly: 250, idx: '02', name: 'Sit-stand desk', spec: 'knee clearance ≥ 508 mm' });
    const X = x0 + .14;
    dimension(t, { id: 'deskDim', t0: LBL.deskDim[0], t1: LBL.deskDim[1], A: at(null, X, 0, zf, t), B: at(null, X, h, zf, t),
      ext: [[at(null, x0 - .02, h, zf, t), at(null, X + .05, h, zf, t)], [at(null, x0 - .02, .002, zf, t), at(null, X + .05, .002, zf, t)]], text: '559–1,275 mm', sub: 'seated to standing' });
  }
  // 3 · the chair stop
  if (t > LBL.chair[0] - .05 && t < LBL.chair[1] + .1) {
    const c = ctx.STAR.position;
    const a = proj(at(null, c.x - .12, .72, c.z - .2, t));
    label(t, { id: 'chair', t0: LBL.chair[0], t1: LBL.chair[1], a, lx: 1240, ly: 230, idx: '03', name: 'Task chair', spec: 'seat depth 356–470 mm' });
    const X = c.x + .36, Z = c.z;
    dimension(t, { id: 'chairDim', t0: LBL.chairDim[0], t1: LBL.chairDim[1], A: at(null, X, 0, Z, t), B: at(null, X, .5, Z, t),
      ext: [[at(null, c.x + .2, .5, Z, t), at(null, X + .05, .5, Z, t)]], text: '376–512 mm', sub: 'seat height' });
  }
  // 4 · dimensions on the closed office
  if (t > LBL.dimKnee[0] - .05) {
    const c = ctx.STAR.position, X = c.x - .38;
    dimension(t, { id: 'dimSeat', t0: LBL.dimSeat[0], t1: LBL.dimSeat[1], A: at(null, X, 0, c.z + .1, t), B: at(null, X, .5, c.z + .1, t),
      ext: [[at(null, c.x - .2, .5, c.z + .1, t), at(null, X - .05, .5, c.z + .1, t)]], text: '376–512 mm', sub: 'seat height' });
    const dx = -3.2, zf = .82, y = .5;
    dimension(t, { id: 'dimKnee', t0: LBL.dimKnee[0], t1: LBL.dimKnee[1], A: at(null, dx - .66, y, zf, t), B: at(null, dx + .66, y, zf, t),
      ext: [[at(null, dx - .66, .05, zf, t), at(null, dx - .66, y + .06, zf, t)], [at(null, dx + .66, .05, zf, t), at(null, dx + .66, y + .06, zf, t)]], text: '≥ 508 mm', sub: 'knee clearance' });
  }
  // 5 · subtitles: one centred line, soft shadow, no box
  const NOSUB = new URLSearchParams(location.search).has('nosub');
  for (const c of NOSUB ? [] : CUES) {
    if (t < c.t0 || t > c.t1) continue;
    const k = Math.min(fade(t, c.t0, .12), 1 - fade(t, c.t1 - .12, .12));
    g.globalAlpha = k; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 16;
    g.fillStyle = INK; g.font = SUB.font; g.fillText(c.en, Wd / 2, SUB.y);
    g.shadowBlur = 0; g.textAlign = 'left';
  }
  // 6 · title card
  const k0 = T.title;
  if (t > k0) {
    const items = [
      { id: 'cardT', font: `500 104px ${SANS}`, col: INK, text: 'Fitted', y: 470, d: .1 },
      { id: 'cardE', font: `300 34px ${SANS}`, col: INK, text: 'An office floor, from shell to work', y: 530, d: .3 },
      { id: 'cardS', font: `400 17px ${MONO}`, col: DIM, text: 'EXPLODED TEARDOWN · A MODEL', y: 604, d: .5 },
      { id: 'cardC', font: `400 16px ${MONO}`, col: DIM, text: 'Ergonomic ranges: ANSI/BIFMA G1-2013', y: 636, d: .6 },
    ];
    // a dark screen-space falloff on the left so the card never sits on a bright part
    const sh = g.createLinearGradient(0, 0, 980, 0); sh.addColorStop(0, 'rgba(10,11,13,.82)'); sh.addColorStop(.55, 'rgba(10,11,13,.55)'); sh.addColorStop(1, 'rgba(10,11,13,0)');
    g.globalAlpha = fade(t, k0 - .3, .8); g.fillStyle = sh; g.fillRect(0, 0, 980, Hd);
    g.globalAlpha = fade(t, k0, .5); g.fillStyle = ACC; g.fillRect(150, 366, 52 * eo(seg(t, k0, k0 + .6)), 4);
    for (const it of items) {
      const a = fade(t, k0 + it.d, .45); if (a <= 0) continue;
      g.globalAlpha = a; g.font = it.font; g.fillStyle = it.col; g.fillText(it.text, 150, it.y + (1 - a) * 10);
      if (a > .99) texts.push({ id: it.id, text: it.text, x0: 150, y0: it.y - 90, x1: 150 + g.measureText(it.text).width, y1: it.y + 14 });
    }
  }
  g.globalAlpha = 1;
}

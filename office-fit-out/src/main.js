// Fitted: an empty office floor receives its fit-out in exploded layers. render(t) draws one frame; everything is a function of t.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, track, hash } from '/core/lib.js';
import * as P from './parts.js';
import { initOverlay, drawOverlay, overlayTexts, subcheck } from './overlay.js';
import * as TL from './timeline.js';

const { T, DUR, LAND, DROP, GAP, WAVE, CAM } = TL;
const W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const SSAA = +(Q.get('ssaa') || 1.5);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, .3, 400);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: Q.get('ao') === '1', aoRadius: .5, aoThickness: .6, aoScale: 1.4, aoAmt: .6 });
post.bloom.strength = .32; post.bloom.radius = .5; post.bloom.threshold = 1.5;
post.vig.uniforms.amt.value = .32; post.vig.uniforms.contrast.value = .08; post.vig.uniforms.warm.value = .1;
{
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const g = c.getContext('2d');
  const gr = g.createRadialGradient(900, 470, 60, 960, 540, 1250);
  gr.addColorStop(0, '#34363a'); gr.addColorStop(.45, '#232528'); gr.addColorStop(1, '#0d0e10');
  g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr');
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
scene.environmentIntensity = .34; scene.environmentRotation = new THREE.Euler(0, 1.2, 0);
RectAreaLightUniformsLib.init();
const key = new THREE.DirectionalLight('#fff0dc', 1.7);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 80 });
key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4; key.shadow.blurSamples = 12;
scene.add(key, key.target);
const rim = new THREE.RectAreaLight('#dfe9ff', 3.2, 16, 4); scene.add(rim);
const top = new THREE.RectAreaLight('#ffffff', .5, 16, 12); scene.add(top);
const lampA = new THREE.RectAreaLight('#ffd9a8', 0, 3.0, .3), lampB = new THREE.RectAreaLight('#ffd9a8', 0, 3.0, .3); scene.add(lampA, lampB);
scene.add(new THREE.HemisphereLight('#c9d3e0', '#1a1712', .2));
const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#000000', opacity: .4 }));
shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = -.3; shadowFloor.receiveShadow = true; scene.add(shadowFloor);

// ---------- the model (metres; x right, z towards the front, y up; the floor slab's top is y = 0) ----------
const M = P.materials();
scene.add(P.shell(M));
const L = {}; for (const k of TL.LAYERS) { L[k] = new THREE.Group(); scene.add(L[k]); }
const items = { acc: [] };      // repeated parts that land in a wave: { o, rank }

// carpet: 0.5 m tiles, instanced; each tile lands at its own time, ordered by distance from the back-left corner
const TILE = .5, tiles = [];
const tileM = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE - .006, .012, TILE - .006), M.carpetA, 24 * 16);
tileM.castShadow = false; tileM.receiveShadow = true; tileM.frustumCulled = false;
{
  const col = new THREE.Color(); let i = 0;
  for (let ix = 0; ix < 24; ix++) for (let iz = 0; iz < 16; iz++) {
    const x = -6 + TILE / 2 + ix * TILE, z = -4 + TILE / 2 + iz * TILE;
    const v = .92 + .12 * hash(ix * 31 + iz * 7) + ((ix + iz) % 2) * .04;
    col.setRGB(v, v, v); tileM.setColorAt(i, col);
    tiles.push({ x, z, rank: Math.hypot(x + 6, z + 4) / Math.hypot(12, 8), rot: ((ix + iz) % 2) * Math.PI / 2 }); i++;
  }
  L.carpet.add(tileM);
}
const tileObj = new THREE.Object3D();

// desks: two facing rows of four. Row A users sit at z = −1.25 facing +z; row B users at z = +1.25 facing −z
const XS = [-4.8, -3.2, -1.6, 0.0], DESKS = [];
for (const [row, dz, rot] of [['A', -.4, Math.PI], ['B', .4, 0]]) for (const x of XS) {
  const d = P.desk(M); d.position.set(x, 0, dz); d.rotation.y = rot; L.desk.add(d); DESKS.push({ d, row, x });
}
const HERO = DESKS.find(o => o.row === 'B' && o.x === -1.6);      // the desk that rises
// chairs: one per desk, four round the meeting table
const CHAIRS = [];
const addChair = (x, z, ry, tag) => { const c = P.chair(M); c.position.set(x, 0, z); c.rotation.y = ry; L.chair.add(c); CHAIRS.push({ c, tag }); return c; };
for (const o of DESKS) {
  if (o === HERO) addChair(-1.22, 1.78, Math.PI - .6, 'hero');       // pushed back: its user stands
  else addChair(o.x, o.row === 'A' ? -1.25 : 1.25, o.row === 'A' ? 0 : Math.PI, o.row + o.x);
}
const MEET = [3.4, -1.7];
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; addChair(MEET[0] + Math.sin(a) * .95, MEET[1] + Math.cos(a) * .95, a + Math.PI, 'meet' + i); }
const STAR = CHAIRS.find(c => c.tag === 'B0').c;                  // the chair the camera visits

// accessories: screens and desk kit, planters, booth, lounge, meeting table, storage; each lands in a wave
const accAdd = (o, x, z) => { L.acc.add(o); items.acc.push({ o, rank: clamp(Math.hypot(x + 6, z - 4) / 14) }); return o; };
DESKS.forEach((o, i) => {
  const w = P.workstation(M, 11 + i);
  w.position.set(o.x, 0, o.row === 'A' ? -.4 : .4); w.rotation.y = o.row === 'A' ? Math.PI : 0;
  w.position.y = .74; w.userData.desk = o; accAdd(w, o.x, o.row === 'A' ? -.4 : .4);
});
for (const [x, z, s, h] of [[-5.45, 3.45, 3, 1.5], [5.4, 3.35, 4, 1.25], [1.4, -3.45, 5, 1.6], [5.45, -.9, 6, 1.35], [-5.45, -3.45, 7, 1.2]]) { const p = P.plant(M, s, h); p.position.set(x, 0, z); accAdd(p, x, z); }
{ const b = P.booth(M); b.position.set(5.05, 0, -3.2); b.rotation.y = -.25; accAdd(b, 5.05, -3.2); }
{ const r = new THREE.Mesh(new RoundedBoxGeometryLite(3.2, .014, 2.3), M.rug); r.receiveShadow = true; r.position.set(3.3, .007, 2.35); accAdd(r, 3.3, 2.35); }
{ const s = P.sofa(M); s.position.set(3.3, 0, 1.75); accAdd(s, 3.3, 1.75); }
{ const t = P.roundTable(M, .42, .42); t.position.set(3.3, 0, 2.9); accAdd(t, 3.3, 2.9);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .045, .1, 20), M.ceramic); m.position.set(3.15, .47, 2.85); m.castShadow = true; t.add(m); m.position.set(-.15, .47, -.05); }
{ const t = P.roundTable(M, .62, .74); t.position.set(MEET[0], 0, MEET[1]); accAdd(t, MEET[0], MEET[1]); }
{ const c = P.credenza(M, 4.2); c.position.set(-3.2, 0, -3.62); accAdd(c, -3.2, -3.62);
  const p1 = P.plant(M, 9, .55, .1); p1.position.set(-4.6, .71, -3.62); p1.scale.setScalar(.7); accAdd(p1, -4.6, -3.62);
  const p2 = P.plant(M, 10, .5, .1); p2.position.set(-2.0, .71, -3.62); p2.scale.setScalar(.65); accAdd(p2, -2.0, -3.62); }
function RoundedBoxGeometryLite(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

// people: five at desks, one standing at the risen desk, one on the sofa
const PEOPLE = [];
const seatAt = (tag, i) => { const c = CHAIRS.find(o => o.tag === tag).c; const p = P.person(i, 'sit'); p.position.copy(c.position); p.rotation.y = c.rotation.y; L.people.add(p); PEOPLE.push(p); };
['A-4.8', 'A-1.6', 'A0', 'B-4.8', 'B-3.2'].forEach(seatAt);
{ const p = P.person(5, 'stand'); p.position.set(-1.6, 0, 1.12); p.rotation.y = Math.PI; L.people.add(p); PEOPLE.push(p); }
{ const p = P.person(6, 'lounge'); p.position.set(2.75, 0, 1.78); L.people.add(p); PEOPLE.push(p); }

// ceiling layer: a steel grid with linear pendants over the desk rows and felt baffles over the lounge
const PEND = [];
{
  const g = L.ceil, Y = 3.1;
  for (let z = -3.2; z <= 3.21; z += 1.6) g.add(P.shadowy(P.place(new THREE.Mesh(new THREE.BoxGeometry(11.6, .04, .04), M.steel), new THREE.Vector3(0, Y, z))));
  for (const x of [-4, 0, 4]) g.add(P.shadowy(P.place(new THREE.Mesh(new THREE.BoxGeometry(.04, .04, 7.6), M.steel), new THREE.Vector3(x, Y + .04, 0))));
  for (const [x, z] of [[-4.0, -.9], [-0.8, -.9], [-4.0, .9], [-0.8, .9]]) { const p = P.pendant(M, 3.0, .65); p.position.set(x, Y - .65, z); g.add(p); PEND.push(p); }
  for (let i = 0; i < 9; i++) { const b = P.shadowy(new THREE.Mesh(new THREE.BoxGeometry(.04, .32, 2.6), M.felt)); b.position.set(1.8 + i * .45, Y - .2, 1.2); g.add(b); }
}

// ---------- motion ----------
const ORDER = TL.LAYERS;
const landE = (k, t, d = 0) => eio(seg(t, LAND[k] - DROP + d, LAND[k] + d));   // 0 held apart → 1 landed
const ENTRY = 42;
const entryE = (i, t) => 1 - Math.pow(1 - ss(seg(t, T.stackIn + i * .1, T.stackIn + i * .1 + 1.5)), 2.2);
const holdAmt = t => 1 - seg(t, 12.6, 13.4) * (1 - seg(t, 26.4, 27.2));         // no float during the two close stops
function stackY(k, t, d = 0) {
  const i = ORDER.indexOf(k);
  let below = 0; for (let j = 0; j < i; j++) below += 1 - landE(ORDER[j], t);
  const e = landE(k, t, d), held = GAP * (1 + below);
  const fl = .035 * Math.sin(t * 2.1 + i * 1.3) * clamp(holdAmt(t)) * (1 - e);
  return (held + fl) * (1 - e) + ENTRY * (1 - entryE(i, t));
}
const heroH = t => .74 + .41 * eio(seg(t, T.rise, T.riseEnd));
const ACCW = WAVE.acc;

// ---------- camera ----------
const keys = CAM.map(([t, az, el, dist, tg, fov, shift]) => {
  const A = az * Math.PI / 180, E = el * Math.PI / 180;
  const eye = [tg[0] + dist * Math.cos(E) * Math.sin(A), tg[1] + dist * Math.sin(E), tg[2] + dist * Math.cos(E) * Math.cos(A)];
  return [t, [...eye, ...tg, fov, shift]];
});
const camAt = track(keys);
function setCamera(t) {
  const [ex, ey, ez, tx, ty, tz, fov, shift] = camAt(t);
  camera.position.set(ex, ey, ez); camera.fov = fov; camera.lookAt(tx, ty, tz);
  camera.setViewOffset(W, H, shift, 0, W, H); camera.updateProjectionMatrix();
  const dist = Math.hypot(ex - tx, ey - ty, ez - tz);
  post.dof.focus = dist; post.dof.aper = 46; post.dof.maxCoc = 10;
  const A = Math.atan2(ex - tx, ez - tz), la = A - .85;
  key.position.set(-14 * Math.cos(la) + 4, 26, 14 * Math.sin(la) + 10); key.target.position.set(0, 0, 0);
  rim.position.set(16 * Math.sin(A + 2.7), 9, 16 * Math.cos(A + 2.7)); rim.lookAt(0, 2, 0);
  top.position.set(0, 24, 0); top.lookAt(0, 0, 0);
}

// ---------- events for the mixer (window.EV) ----------
const EV = [];
EV.push({ t: T.sil1, type: 'suck' }, { t: T.stackIn, type: 'stackIn' });
ORDER.forEach((k, i) => EV.push({ t: +(T.stackIn + i * .1 + .1).toFixed(3), type: 'launch', layer: k }));
for (let r = 0; r < 12; r++) EV.push({ t: +(LAND.carpet - WAVE.carpet + (r + .5) / 12 * WAVE.carpet).toFixed(3), type: 'tile', pan: -.8 + 1.6 * r / 11 });
for (const k of ['desk', 'chair', 'people', 'ceil']) EV.push({ t: LAND[k], type: 'land', layer: k });
for (const k of ORDER.slice(1)) EV.push({ t: +(LAND[k] - DROP).toFixed(3), type: 'drop', layer: k });
items.acc.forEach(a => EV.push({ t: +(LAND.acc + a.rank * ACCW).toFixed(3), type: 'accLand', kind: a.o.userData.desk ? 'screen' : 'thing', pan: clamp((a.o.position.x) / 6, -1, 1) }));
EV.push({ t: T.rise, type: 'rise' }, { t: T.lights, type: 'lights' }, { t: T.sil2, type: 'sil2' }, { t: T.ceil + .1, type: 'pull' }, { t: T.title, type: 'title' });
for (const [id, v] of Object.entries(TL.LBL)) if (Array.isArray(v)) EV.push({ t: v[0], type: /dim|Dim/.test(id) ? 'dim' : 'label', id });
for (let i = 0; i < 6; i++) EV.push({ t: +(TL.LBL.layers.t0 + i * TL.LBL.layers.step).toFixed(3), type: 'label', id: 'layer' + i });
EV.sort((a, b) => a.t - b.t);
window.EV = EV; window.DUR = DUR;

// ---------- frame ----------
await initOverlay();
const at = (k, x, y, z, t) => new THREE.Vector3(x, y + (k ? stackY(k, t) : 0), z);
window.render = t => {
  // carpet tiles
  for (let i = 0; i < tiles.length; i++) {
    const c = tiles[i], d = -WAVE.carpet + c.rank * WAVE.carpet;
    tileObj.position.set(c.x, .006 + stackY('carpet', t, d), c.z); tileObj.rotation.set(0, c.rot, 0); tileObj.updateMatrix(); tileM.setMatrixAt(i, tileObj.matrix);
  }
  tileM.instanceMatrix.needsUpdate = true;
  for (const k of ['desk', 'chair', 'people', 'ceil']) L[k].position.y = stackY(k, t);
  ORDER.forEach((k, i) => { L[k].visible = entryE(i, t) > .02; });   // nothing waits overhead (or casts a shadow) before the stack arrives
  // the hero desk rises, and its screen and kit ride with it
  HERO.d.set(heroH(t));
  for (const a of items.acc) if (a.o.userData.desk) a.o.userData.base = a.o.userData.desk === HERO ? heroH(t) : .74;
  for (const a of items.acc) { const base = a.o.userData.base ?? (a.o.userData.base = a.o.position.y); a.o.position.y = base + stackY('acc', t, a.rank * ACCW); }
  // lights on inside: pendants, booth lamp, screens
  const on = ss(seg(t, T.lights, T.lights + .5));
  M.lamp.emissiveIntensity = 3.2 * on;
  M.screenFace.emissiveIntensity = .55 * ss(seg(t, T.lights + .15, T.lights + .9));
  const cy = stackY('ceil', t) + 3.1 - .65 - .03;
  for (const [l, p] of [[lampA, PEND[0]], [lampB, PEND[2]]]) { l.intensity = 6 * on; l.width = 6.2; l.position.set(-2.4, cy, p.position.z); l.lookAt(-2.4, -5, p.position.z); }
  setCamera(t);
  post.composer.render();
  drawOverlay(t, camera, { at, stackY, heroH, HERO, STAR, W, H });
};
window.TEXTS = () => overlayTexts();
window.DBG = t => ({ cam: camAt(t).map(v => +v.toFixed(2)), desk: +stackY('desk', t).toFixed(2), chair: +stackY('chair', t).toFixed(2), acc: +stackY('acc', t).toFixed(2), ceil: +stackY('ceil', t).toFixed(2) });
await document.fonts.ready;
window.SUBCHECK = subcheck();
window.render(Number(Q.get('t') || 0));
window.READY = true;

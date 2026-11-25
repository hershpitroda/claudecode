// Fitted: furniture, people and shell built in code. Units: metres. Every builder returns a THREE.Group whose origin
// sits on the floor; furniture faces +z (the user sits or stands on the +z side, looking towards −z) unless noted.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry } from '/core/lib.js';

export const place = (m, v) => { m.position.copy(v); return m; };
export const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = shadowy(new THREE.Mesh(g, m)); o.position.set(x, y, z); return o; };
const rbox = (w, h, d, r = .01, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));

export function materials() {
  return {
    concrete: new THREE.MeshPhysicalMaterial({ color: '#8b8b89', roughness: .9, specularIntensity: .15 }),
    column: new THREE.MeshPhysicalMaterial({ color: '#97968f', roughness: .85, specularIntensity: .3 }),
    mullion: new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: .42, metalness: .7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#b9d1dc', roughness: .04, metalness: 0, transparent: true, opacity: .11, depthWrite: false, envMapIntensity: 1.6 }),
    carpetA: new THREE.MeshPhysicalMaterial({ color: '#4b5159', roughness: .97, sheen: .4, sheenRoughness: .9, sheenColor: '#8a93a0' }),
    oak: new THREE.MeshPhysicalMaterial({ color: '#c29a6d', roughness: .52, clearcoat: .25, clearcoatRoughness: .5 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#e4e2dd', roughness: .45, clearcoat: .15 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c8cbd0', roughness: .22, metalness: 1 }),
    nylon: new THREE.MeshPhysicalMaterial({ color: '#2f3135', roughness: .6 }),
    mesh: new THREE.MeshPhysicalMaterial({ color: '#41454c', roughness: .78, sheen: .5, sheenRoughness: .8, sheenColor: '#7c838d' }),
    seat: new THREE.MeshPhysicalMaterial({ color: '#3a3e45', roughness: .86, sheen: .6, sheenRoughness: .8, sheenColor: '#7f8690' }),
    accent: new THREE.MeshPhysicalMaterial({ color: '#ff6b3d', roughness: .5, clearcoat: .2 }),
    screen: new THREE.MeshPhysicalMaterial({ color: '#16181b', roughness: .35, clearcoat: .6 }),
    screenFace: new THREE.MeshStandardMaterial({ color: '#0d1116', emissive: '#7fa6cf', emissiveIntensity: 0, roughness: .15 }),
    felt: new THREE.MeshPhysicalMaterial({ color: '#8d9f86', roughness: .95, sheen: .6, sheenRoughness: .9, sheenColor: '#c4d2bd' }),
    fabric: new THREE.MeshPhysicalMaterial({ color: '#cdbfa8', roughness: .92, sheen: .7, sheenRoughness: .8, sheenColor: '#f1e6d2' }),
    rug: new THREE.MeshPhysicalMaterial({ color: '#a8775a', roughness: .98, sheen: .5, sheenRoughness: .9, sheenColor: '#d8a988' }),
    pot: new THREE.MeshPhysicalMaterial({ color: '#e9e5de', roughness: .6 }),
    terracotta: new THREE.MeshPhysicalMaterial({ color: '#b5684a', roughness: .8 }),
    leaf: new THREE.MeshPhysicalMaterial({ color: '#4d7a46', roughness: .72, sheen: .3, sheenColor: '#9bc58c' }),
    leaf2: new THREE.MeshPhysicalMaterial({ color: '#3d6a43', roughness: .72, sheen: .3, sheenColor: '#8fbf86' }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f2efe8', roughness: .3, clearcoat: .5 }),
    keyb: new THREE.MeshPhysicalMaterial({ color: '#d6d4cf', roughness: .55 }),
    housing: new THREE.MeshStandardMaterial({ color: '#25272b', roughness: .45, metalness: .6 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffd9a8', emissiveIntensity: 0, roughness: .4 }),
    steel: new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: .4, metalness: .9 }),
    cable: new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: .6 }),
    book: [new THREE.MeshPhysicalMaterial({ color: '#2f4a5e', roughness: .8 }), new THREE.MeshPhysicalMaterial({ color: '#c8b48a', roughness: .8 })],
  };
}

// ---------------- shell ----------------
export function shell(M) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(12.4, .3, 8.4), M.concrete, 0, -.15, 0));
  const colG = new THREE.BoxGeometry(.45, 3.2, .45); colG.translate(0, 1.6, 0);
  const cols = [];
  for (const x of [-6, -2, 2, 6]) cols.push([x, -4]);
  for (const z of [0, 4]) cols.push([-6, z]);
  for (const x of [-2, 2, 6]) cols.push([x, 4]);
  cols.push([6, 0]);
  for (const [x, z] of cols) g.add(mesh(colG, M.column, x - Math.sign(x) * .225 * (Math.abs(x) === 6), 0, z - Math.sign(z) * .225 * (Math.abs(z) === 4)));
  // glazing on the back (z = −4) and left (x = −6) edges: mullions every 1.5 m, head and sill, one pane each bay
  const mulG = new THREE.BoxGeometry(.05, 3.0, .08); mulG.translate(0, 1.5 + .1, 0);
  for (let x = -6; x <= 6.01; x += 1.5) g.add(mesh(mulG, M.mullion, x, 0, -3.96));
  for (let z = -4; z <= 4.01; z += 1.6) { const m = mesh(mulG, M.mullion, -5.96, 0, z); m.rotation.y = Math.PI / 2; g.add(m); }
  for (const y of [.1, 3.12]) {
    g.add(mesh(new THREE.BoxGeometry(12, .06, .1), M.mullion, 0, y, -3.96));
    g.add(mesh(new THREE.BoxGeometry(.1, .06, 8), M.mullion, -5.96, y, 0));
  }
  const gb = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.0), M.glass); gb.position.set(0, 1.61, -3.96); g.add(gb);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.0), M.glass); gl.position.set(-5.96, 1.61, 0); gl.rotation.y = Math.PI / 2; g.add(gl);
  return g;
}

// ---------------- desk: sit-stand, 1.6 × 0.8 m top; set(h) moves the top and telescopes the columns ----------------
export function desk(M) {
  const g = new THREE.Group(), top = new THREE.Group(); g.add(top);
  top.add(mesh(rbox(1.6, .025, .8, .006), M.oak, 0, -.0125, 0));
  for (const x of [-.7, .7]) top.add(mesh(new THREE.BoxGeometry(.06, .035, .68), M.white, x, -.043, 0));
  top.add(mesh(new THREE.BoxGeometry(1.34, .05, .05), M.white, 0, -.05, -.18));
  const outer = [], inner = [];
  const colG = new THREE.BoxGeometry(.075, 1, .065); colG.translate(0, .5, 0);
  const inG = new THREE.BoxGeometry(.062, 1, .052); inG.translate(0, .5, 0);
  for (const x of [-.7, .7]) {
    g.add(mesh(new THREE.BoxGeometry(.075, .035, .7), M.white, x, .0175, 0));
    const o = mesh(colG, M.white, x, .035, -.02); o.scale.y = .42; g.add(o); outer.push(o);
    const i = mesh(inG, M.white, x, .035, -.02); g.add(i); inner.push(i);
  }
  g.set = h => {
    top.position.y = h;
    for (const i of inner) i.scale.y = h - .06 - .035;
  };
  g.set(.74);
  return g;
}

// ---------------- task chair: five-star base, gas lift, mesh back; the seat-adjust paddle is the film's accent ----------------
export function chair(M) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 + .3, s = new THREE.Group(); s.rotation.y = a;
    s.add(mesh(new THREE.BoxGeometry(.04, .03, .3), M.nylon, 0, .075, .15));
    s.add(mesh(new THREE.SphereGeometry(.028, 12, 8), M.nylon, 0, .03, .3));
    g.add(s);
  }
  g.add(mesh(new THREE.CylinderGeometry(.05, .05, .07, 16), M.nylon, 0, .1, 0));
  g.add(mesh(new THREE.CylinderGeometry(.022, .022, .3, 12), M.chrome, 0, .27, 0));
  g.add(mesh(rbox(.2, .04, .22, .01), M.nylon, 0, .42, 0));
  g.add(mesh(rbox(.5, .07, .48, .03), M.seat, 0, .465, .02));
  g.add(mesh(new THREE.BoxGeometry(.06, .012, .03), M.accent, .2, .415, .14));            // seat-height paddle
  const back = new THREE.Group(); back.position.set(0, .52, -.24); back.rotation.x = -.13; g.add(back);
  back.add(mesh(new THREE.BoxGeometry(.06, .3, .03), M.nylon, 0, .12, -.01));
  back.add(mesh(rbox(.47, .56, .045, .02), M.mesh, 0, .42, 0));
  back.add(mesh(rbox(.42, .07, .055, .02), M.nylon, 0, .27, .01));
  for (const x of [-.255, .255]) {
    g.add(mesh(new THREE.BoxGeometry(.03, .2, .04), M.nylon, x, .58, -.02));
    g.add(mesh(rbox(.07, .03, .24, .012), M.nylon, x, .69, .02));
  }
  return g;
}

// ---------------- monitor on a stand (faces +z), keyboard, mug, small plant ----------------
export function workstation(M, seed) {
  const g = new THREE.Group(), r = mulberry(seed);
  g.add(mesh(rbox(.22, .012, .16, .004), M.housing, 0, .006, -.27));
  g.add(mesh(new THREE.BoxGeometry(.03, .3, .02), M.housing, 0, .16, -.3));
  const scr = new THREE.Group(); scr.position.set(0, .37, -.28); scr.rotation.x = -.06; g.add(scr);
  scr.add(mesh(rbox(.62, .37, .025, .006), M.screen));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.6, .35), M.screenFace); face.position.z = .0131; scr.add(face);
  g.add(mesh(rbox(.44, .015, .14, .004), M.keyb, 0, .0075, .06));
  g.add(mesh(rbox(.06, .015, .1, .006), M.keyb, .3, .0075, .07));
  if (r() < .6) { const m = mesh(new THREE.CylinderGeometry(.042, .038, .1, 20), M.ceramic, -.48 + r() * .1, .05, .1); g.add(m); }
  if (r() < .5) {
    const p = new THREE.Group(); p.position.set(.58, 0, -.22); g.add(p);
    p.add(mesh(new THREE.CylinderGeometry(.06, .05, .11, 20), M.terracotta, 0, .055, 0));
    for (let i = 0; i < 5; i++) { const l = mesh(new THREE.IcosahedronGeometry(.06 + r() * .03, 1), r() < .5 ? M.leaf : M.leaf2, (r() - .5) * .08, .16 + r() * .08, (r() - .5) * .08); l.scale.y = .8; p.add(l); }
  }
  if (r() < .4) for (let i = 0; i < 2; i++) g.add(mesh(new THREE.BoxGeometry(.21, .02, .28), M.book[i], -.52, .01 + i * .02, -.18 + i * .01));
  return g;
}

export function plant(M, seed, h = 1.4, big = .24) {
  const g = new THREE.Group(), r = mulberry(seed);
  g.add(mesh(new THREE.CylinderGeometry(big, big * .85, .5, 28), M.pot, 0, .25, 0));
  const n = 14;
  for (let i = 0; i < n; i++) {
    const u = i / n, a = r() * Math.PI * 2, rad = .08 + .16 * Math.sin(Math.PI * Math.min(1, u * 1.2));
    const l = mesh(new THREE.IcosahedronGeometry(.14 + r() * .1, 1), r() < .5 ? M.leaf : M.leaf2, Math.cos(a) * rad, .55 + u * (h - .65), Math.sin(a) * rad);
    l.scale.set(1, .75, 1); l.rotation.set(r() * 3, r() * 3, r() * 3); g.add(l);
  }
  return g;
}

// acoustic phone booth, 1.05 × 2.25 × 1.05 m, glass front faces +z
export function booth(M) {
  const g = new THREE.Group(), W = 1.05, H = 2.25, D = 1.05, t = .06;
  g.add(mesh(rbox(W, .08, D, .02), M.felt, 0, .04, 0));
  g.add(mesh(rbox(W, .1, D, .03), M.felt, 0, H - .05, 0));
  g.add(mesh(rbox(W, H - .18, t, .02), M.felt, 0, H / 2, -D / 2 + t / 2));
  for (const x of [-W / 2 + t / 2, W / 2 - t / 2]) g.add(mesh(rbox(t, H - .18, D, .02), M.felt, x, H / 2, 0));
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - .12, H - .2), M.glass); gl.position.set(0, H / 2, D / 2 - .01); g.add(gl);
  for (const x of [-W / 2 + .07, W / 2 - .07]) g.add(mesh(new THREE.BoxGeometry(.025, H - .18, .03), M.mullion, x, H / 2, D / 2 - .01));
  g.add(mesh(new THREE.BoxGeometry(.02, .5, .03), M.chrome, W / 2 - .16, 1.05, D / 2 + .02));
  g.add(mesh(rbox(.7, .03, .32, .01), M.oak, 0, 1.0, -D / 2 + .22));
  g.add(mesh(new THREE.CylinderGeometry(.17, .17, .06, 24), M.fabric, 0, .62, .05));
  g.add(mesh(new THREE.CylinderGeometry(.025, .025, .55, 12), M.chrome, 0, .33, .05));
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), M.lamp); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, H - .105, 0); g.add(lamp);
  return g;
}

export function sofa(M) {   // three-seat sofa, faces +z
  const g = new THREE.Group();
  g.add(mesh(rbox(2.1, .22, .9, .05), M.fabric, 0, .2, 0));
  for (let i = 0; i < 3; i++) g.add(mesh(rbox(.64, .14, .66, .06), M.fabric, -.66 + i * .66, .38, .08));
  g.add(mesh(rbox(2.1, .42, .2, .07), M.fabric, 0, .56, -.35));
  for (const x of [-.98, .98]) g.add(mesh(rbox(.16, .34, .86, .06), M.fabric, x, .4, 0));
  for (const [x, z] of [[-.95, -.38], [.95, -.38], [-.95, .38], [.95, .38]]) g.add(mesh(new THREE.CylinderGeometry(.018, .014, .09, 10), M.oak, x, .045, z));
  return g;
}

export function roundTable(M, r, h) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, .03, 48), M.oak, 0, h - .015, 0));
  g.add(mesh(new THREE.CylinderGeometry(.04, .04, h - .03, 16), M.white, 0, (h - .03) / 2, 0));
  g.add(mesh(new THREE.CylinderGeometry(r * .5, r * .55, .02, 40), M.white, 0, .01, 0));
  return g;
}

export function credenza(M, w) {
  const g = new THREE.Group();
  g.add(mesh(rbox(w, .64, .45, .01), M.white, 0, .36, 0));
  g.add(mesh(rbox(w + .02, .03, .47, .006), M.oak, 0, .695, 0));
  for (let x = -w / 2 + .5; x < w / 2 - .1; x += 1) g.add(mesh(new THREE.BoxGeometry(.004, .6, .004), M.steel, x, .36, .226));
  for (let x = -w / 2 + .25; x < w / 2; x += .5) g.add(mesh(new THREE.BoxGeometry(.12, .012, .012), M.steel, x, .6, .232));
  for (const x of [-w / 2 + .05, w / 2 - .05]) g.add(mesh(new THREE.BoxGeometry(.04, .04, .4), M.steel, x, .02, 0));
  return g;
}

// linear pendant (3.0 m), hung from the ceiling grid; returns the emissive face for "lights on"
export function pendant(M, len = 3.0, drop = .65) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(len, .045, .09), M.housing, 0, 0, 0));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(len - .04, .07), M.lamp); f.rotation.x = Math.PI / 2; f.position.y = -.0235; g.add(f);
  const u = new THREE.Mesh(new THREE.PlaneGeometry(len - .1, .05), M.lamp); u.rotation.x = -Math.PI / 2; u.position.y = .0235; g.add(u);   // indirect uplight
  for (const x of [-len / 2 + .2, len / 2 - .2]) g.add(mesh(new THREE.CylinderGeometry(.003, .003, drop, 6), M.cable, x, drop / 2, 0));
  return g;
}

// ---------------- people: plain matte mannequins, no faces ----------------
const SKIN = ['#e2c6ab', '#b88565', '#8a5d43', '#d6ad8f', '#c69b7c', '#6f4a36', '#e8d2bc'];
const SHIRT = ['#3e5266', '#a65b3f', '#6e7a55', '#d8d2c6', '#2f3a45', '#8a6d8c', '#c79a5b'];
const TROUSER = ['#2a2d33', '#4a4f57', '#3b3328', '#5c6470', '#26282c', '#6b5c4b', '#383c44'];
const HAIR = ['#2a1f19', '#1a1512', '#5a3d2a', '#8b6b4a', '#1f1a17', '#3a2a20', '#c8c2b8'];
export function person(i, pose = 'sit') {
  const g = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: SKIN[i % 7], roughness: .62, sheen: .3, sheenColor: '#ffffff' });
  const shirt = new THREE.MeshPhysicalMaterial({ color: SHIRT[i % 7], roughness: .9, sheen: .5, sheenRoughness: .8, sheenColor: '#ffffff' });
  const trou = new THREE.MeshPhysicalMaterial({ color: TROUSER[i % 7], roughness: .88, sheen: .3 });
  const hair = new THREE.MeshPhysicalMaterial({ color: HAIR[i % 7], roughness: .7 });
  const shoe = new THREE.MeshPhysicalMaterial({ color: '#1d1e21', roughness: .5 });
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);
  const limb = (a, b, r, m) => {       // capsule between two points
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const o = shadowy(new THREE.Mesh(cap(r, Math.max(.01, L - 2 * r * .2)), m)); o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(o); return o;
  };
  const sit = pose === 'sit', lounge = pose === 'lounge';
  const hipY = sit ? .55 : lounge ? .47 : .95, hipZ = sit ? -.02 : lounge ? -.06 : .0;
  const sh = [hipY + .5, hipZ - .02];     // shoulder height, z
  const lean = sit ? .02 : 0;
  // torso and head
  const torso = shadowy(new THREE.Mesh(cap(.155, .3), shirt)); torso.position.set(0, hipY + .26, hipZ - .02 + lean); torso.scale.set(1.12, 1, .78); g.add(torso);
  g.add(shadowy(place(new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .08, 12), skin), new THREE.Vector3(0, sh[0] + .07, sh[1] + .01))));
  const head = shadowy(new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 16), skin)); head.position.set(0, sh[0] + .21, sh[1] + .03); head.scale.set(.9, 1.05, .98); g.add(head);
  const hc = shadowy(new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 12, 0, Math.PI * 2, 0, Math.PI * .55), hair)); hc.position.copy(head.position).add(new THREE.Vector3(0, .012, -.012)); hc.rotation.x = -.35; hc.scale.set(.92, 1.05, 1); g.add(hc);
  // legs
  for (const s of [-1, 1]) {
    const x = s * .095;
    if (sit || lounge) {
      const kz = hipZ + .44, ky = hipY + .02, fz = kz + (lounge ? .12 : .04);
      limb([x, hipY, hipZ + .02], [x, ky, kz], .078, trou);
      limb([x, ky, kz], [x, .08, fz], .062, trou);
      g.add(shadowy(place(new THREE.Mesh(new THREE.BoxGeometry(.095, .07, .24), shoe), new THREE.Vector3(x, .035, fz + .06))));
    } else {
      limb([x, hipY, hipZ], [x, .5, hipZ + .02], .078, trou);
      limb([x, .5, hipZ + .02], [x, .08, hipZ], .062, trou);
      g.add(shadowy(place(new THREE.Mesh(new THREE.BoxGeometry(.095, .07, .24), shoe), new THREE.Vector3(x, .035, hipZ + .06))));
    }
  }
  // arms: forward to a desk (sit, stand) or resting on the lap (lounge)
  for (const s of [-1, 1]) {
    const S = [s * .2, sh[0] - .03, sh[1]];
    const E = lounge ? [s * .23, sh[0] - .3, sh[1] + .08] : [s * .22, sh[0] - .3, sh[1] + .12];
    const Hn = lounge ? [s * .14, hipY + .06, hipZ + .32] : [s * .16, sh[0] - .34, sh[1] + .45];
    limb(S, E, .052, shirt); limb(E, Hn, .045, shirt);
    g.add(shadowy(place(new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), skin), new THREE.Vector3(Hn[0], Hn[1], Hn[2] + .03))));
  }
  return g;
}

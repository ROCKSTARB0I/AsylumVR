// Carcass: the people of Mount Harrow. Each body is one skinned mesh grown
// from elliptical rings around a skeleton (torso, limbs, hands), with a
// sculpted head, painted skin (mottling, bruises, sores, dirt, blood),
// clothing painted and inflated over it (gowns, straitjackets, scrubs,
// trousers) and a face damaged in one of several ways. Procedural poses
// drive the bones: walking, running, stalking, rocking, eating, reaching.
import * as THREE from '../vendor/three.module.js';
import { rng, fbm } from './surfaces.js?v=6';
import { EYE_LAYER } from './camcorder.js?v=6';
import { buildVisage, headMaterial } from './visage.js?v=6';

const V = THREE.Vector3;
export const BODY_LIGHT = { up: { value: new V(0, 1, 0) } };
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'Lclav', 'Lupper', 'Lfore', 'Lhand', 'Rclav', 'Rupper', 'Rfore', 'Rhand', 'Lthigh', 'Lshin', 'Lfoot', 'Rthigh', 'Rshin', 'Rfoot'];
const PARENT = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head', Lclav: 'chest', Lupper: 'Lclav', Lfore: 'Lupper', Lhand: 'Lfore', Rclav: 'chest', Rupper: 'Rclav', Rfore: 'Rupper', Rhand: 'Rfore', Lthigh: 'hips', Lshin: 'Lthigh', Lfoot: 'Lshin', Rthigh: 'hips', Rshin: 'Rthigh', Rfoot: 'Rshin' };
const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));

// ---------------------------------------------------------------- recipes
// height, girth (fat/muscle), lean (emaciation), outfit, face damage
export const RECIPES = {
  brute: { h: 2.16, girth: 1.6, muscle: 1, lean: 0, outfit: 'trousers', face: 'noseless', smile: true, skin: [0.55, 0.42, 0.36], bald: true, scars: 1, blood: 1.0, dirt: 0.8, shackles: true, stare: true },
  surgeon: { h: 1.9, girth: 0.95, muscle: 0.2, lean: 0.3, outfit: 'surgeon', face: 'masked', skin: [0.62, 0.5, 0.43], bald: false, scars: 0.2, blood: 0.95, dirt: 0.3, glasses: true, stare: true },
  gown: { h: 1.74, girth: 0.78, muscle: 0, lean: 0.9, outfit: 'gown', face: 'random', skin: [0.6, 0.48, 0.41], bald: 'random', scars: 0.7, blood: 0.4, dirt: 0.9 },
  jacket: { h: 1.78, girth: 0.82, muscle: 0, lean: 0.7, outfit: 'straitjacket', face: 'random', skin: [0.58, 0.46, 0.39], bald: 'random', scars: 0.6, blood: 0.3, dirt: 0.8 },
  corpse: { h: 1.75, girth: 0.85, muscle: 0, lean: 0.6, outfit: 'gown', face: 'dead', skin: [0.55, 0.53, 0.48], bald: 'random', scars: 0.5, blood: 1, dirt: 0.9, dead: true },
  naked: { h: 1.72, girth: 0.72, muscle: 0, lean: 1, outfit: 'rags', face: 'random', skin: [0.56, 0.45, 0.39], bald: true, scars: 1, blood: 0.6, dirt: 1 },
};

export function makeBody(kind, seed = 1, opts = {}) {
  const r = { ...RECIPES[kind], ...opts }; const R = rng(seed * 977 + 13);
  if (r.face === 'random') r.face = ['sewn', 'gouged', 'smile', 'bandaged', 'lobotomy', 'burned', 'gaunt'][Math.floor(R() * 7)];
  if (r.bald === 'random') r.bald = R() > 0.4;
  const s = r.h / 1.78, g = r.girth;
  // ---- skeleton in bind pose (feet at origin, facing +Z)
  const P = {
    hips: [0, 0.95, 0], spine: [0, 1.08, -0.01], chest: [0, 1.27, -0.01], neck: [0, 1.5, -0.01], head: [0, 1.6, 0.0], jaw: [0, 1.6, 0.03],
    Lclav: [0.03, 1.44, 0], Lupper: [0.19 * (0.85 + g * 0.15), 1.43, -0.01], Lfore: [0.2 * (0.85 + g * 0.15) + 0.03, 1.13, -0.01], Lhand: [0.22 * (0.85 + g * 0.15) + 0.04, 0.87, 0.01],
    Lthigh: [0.095 * (0.8 + g * 0.2), 0.92, 0], Lshin: [0.1 * (0.8 + g * 0.2), 0.5, 0.01], Lfoot: [0.1 * (0.8 + g * 0.2), 0.08, -0.01],
  };
  for (const k of Object.keys(P)) if (k[0] === 'L') { const p = P[k]; P['R' + k.slice(1)] = [-p[0], p[1], p[2]]; }
  for (const k of Object.keys(P)) { P[k] = new V(P[k][0] * s, P[k][1] * s, P[k][2] * s); }
  const bones = BONES.map((n) => { const b = new THREE.Bone(); b.name = n; return b; });
  for (const n of BONES) { const b = bones[BI[n]]; if (PARENT[n]) { bones[BI[PARENT[n]]].add(b); b.position.copy(P[n]).sub(P[PARENT[n]]); } else b.position.copy(P[n]); }

  // ---- geometry buffers
  const pos = [], nor = [], col = [], si = [], sw = [], idx = []; let vcount = 0;
  const skinCol = new THREE.Color(...r.skin);
  const vert = (p, n, c, b0, b1 = b0, w1 = 0) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); const lc = c.clone().convertSRGBToLinear(); col.push(lc.r, lc.g, lc.b); si.push(b0, b1, 0, 0); sw.push(1 - w1, w1, 0, 0); return vcount++; };
  // a lofted tube: rings from a to b, radius fn(t, angle) -> [rx, rz], bone fn(t) -> [b0, b1, w]
  const tube = (a, b, rings, segs, radius, boneOf, paint, capA = true, capB = true) => {
    const d = new V().subVectors(b, a); const len = d.length(); d.normalize();
    const ref = Math.abs(d.y) > 0.9 ? new V(1, 0, 0) : new V(0, 1, 0);
    const ux = new V().crossVectors(ref, d).normalize(); const uz = new V().crossVectors(d, ux).normalize();
    // keep "x" pointing sideways and "z" pointing forward for vertical parts
    if (Math.abs(d.y) > 0.9) { ux.set(1, 0, 0); uz.set(0, 0, d.y > 0 ? -1 : 1); if (d.y < 0) { ux.set(1, 0, 0); uz.set(0, 0, 1); } else { ux.set(1, 0, 0); uz.set(0, 0, -1); } }
    const start = vcount;
    for (let i = 0; i <= rings; i++) {
      const t = i / rings; const c = new V().copy(a).addScaledVector(d, len * t);
      const [b0, b1, w] = boneOf(t);
      for (let j = 0; j < segs; j++) {
        const ang = j / segs * Math.PI * 2; const ca = Math.cos(ang), sa = Math.sin(ang);
        let [rx, rz] = radius(t, ang);
        if ((capA && i === 0) || (capB && i === rings)) { rx *= 0.55; rz *= 0.55; }
        const n = new V().addScaledVector(ux, ca / Math.max(rx, 1e-3)).addScaledVector(uz, sa / Math.max(rz, 1e-3)).normalize();
        const p = c.clone().addScaledVector(ux, ca * rx).addScaledVector(uz, sa * rz);
        vert(p, n, paint(p, n, t, ang), b0, b1, w);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a0 = start + i * segs + j, a1 = start + i * segs + (j + 1) % segs, b0 = a0 + segs, b1 = a1 + segs;
      idx.push(a0, a1, b0, a1, b1, b0);
    }
    // close the ends with a fan
    const cap = (ring, flip, at) => { const ci = vert(at, new V().copy(d).multiplyScalar(flip ? 1 : -1), paint(at, d, ring ? 1 : 0, 0), ...boneOf(ring ? 1 : 0)); for (let j = 0; j < segs; j++) { const q0 = start + ring * segs + j, q1 = start + ring * segs + (j + 1) % segs; if (flip) idx.push(ci, q0, q1); else idx.push(ci, q1, q0); } };
    if (capA) cap(0, false, a.clone()); if (capB) cap(rings, true, b.clone());
  };

  // ---- skin paint
  const dirtC = new THREE.Color(0.24, 0.19, 0.12), bloodC = new THREE.Color(0.32, 0.02, 0.015), bruiseC = new THREE.Color(0.32, 0.22, 0.3), soreC = new THREE.Color(0.55, 0.18, 0.12), veinC = new THREE.Color(0.38, 0.42, 0.5);
  const sd = seed * 13.7;
  const skin = (p, n) => {
    const c = skinCol.clone();
    const m = fbm(p.x * 6 + sd, p.y * 6 + p.z * 4, 3 + seed, 4, 64), m2 = fbm(p.x * 40 + sd, p.y * 40 + p.z * 30, 5 + seed, 3, 64);
    c.multiplyScalar(0.78 + m * 0.3 + (m2 - 0.5) * 0.12); c.r *= 1 + (m - 0.5) * 0.12;
    const br = fbm(p.x * 3 + 5 + sd, p.y * 3 - p.z * 2, 9 + seed, 3, 64); if (br > 0.6) c.lerp(bruiseC, Math.min(0.7, (br - 0.6) * 3));
    const so = fbm(p.x * 14 + sd, p.y * 14 + p.z * 9, 11 + seed, 3, 64); if (so > 0.72 * (2 - r.scars)) c.lerp(soreC, 0.6);
    const ve = fbm(p.x * 30, p.y * 8 + p.z * 30, 15 + seed, 3, 64); if (r.lean > 0.5 && ve > 0.62 && ve < 0.65) c.lerp(veinC, 0.35);
    const di = fbm(p.x * 4 - sd, p.y * 2 + p.z * 4, 21 + seed, 4, 64); if (di > 0.5) c.lerp(dirtC, Math.min(0.75, (di - 0.5) * 2 * r.dirt));
    const lowDirt = Math.max(0, 0.6 - p.y / s) * r.dirt; c.lerp(dirtC, Math.min(0.6, lowDirt));
    return c;
  };
  // blood runs downward from wounds, soaks fronts and hands
  const bloodAt = (p, n, base = 0) => { const b = fbm(p.x * 5 + sd, p.y * 1.5 + p.z * 5, 31 + seed, 4, 64) + base; return Math.max(0, (b - (1.05 - r.blood * 0.45))) * 3; };
  const withBlood = (c, p, n, extra = 0) => { const k = Math.min(0.92, bloodAt(p, n, extra)); return k > 0 ? c.lerp(bloodC.clone().multiplyScalar(0.7 + 0.6 * fbm(p.x * 20, p.y * 20, 3, 2, 64)), k) : c; };

  // ---- clothes
  const cloth = {
    gown: new THREE.Color(0.4, 0.45, 0.45), jacket: new THREE.Color(0.52, 0.5, 0.42), trousers: new THREE.Color(0.2, 0.2, 0.19), scrub: new THREE.Color(0.25, 0.33, 0.3), apron: new THREE.Color(0.52, 0.5, 0.44), strap: new THREE.Color(0.18, 0.13, 0.08), rag: new THREE.Color(0.45, 0.42, 0.35),
  };
  const clothPaint = (base, p, n, stains = 1) => {
    const c = base.clone(); const w = fbm(p.x * 9 + sd, p.y * 9 + p.z * 9, 41 + seed, 4, 64); c.multiplyScalar(0.8 + w * 0.3);
    const yel = fbm(p.x * 3 + sd, p.y * 3 + p.z * 3, 43 + seed, 4, 64); if (yel > 0.55) c.lerp(new THREE.Color(0.45, 0.36, 0.16), Math.min(0.6, (yel - 0.55) * 2.5 * stains));
    const di = fbm(p.x * 5, p.y * 5 - sd, 47 + seed, 4, 64); if (di > 0.55) c.lerp(dirtC, Math.min(0.7, (di - 0.55) * 3 * r.dirt));
    return withBlood(c, p, n, 0.05 * stains);
  };
  const O = r.outfit;
  const torsoCloth = O === 'gown' ? cloth.gown : O === 'straitjacket' ? cloth.jacket : O === 'surgeon' ? cloth.scrub : O === 'rags' ? null : null;
  const legCloth = O === 'trousers' ? cloth.trousers : O === 'surgeon' ? cloth.scrub : O === 'straitjacket' ? cloth.gown : null;

  // ---- torso: crotch to neck base, elliptical, ribs when starved, pecs and traps when huge
  const torsoR = (t, ang) => {
    const y = t; // 0 crotch .. 1 neck base
    const prof = [[0, 0.12, 0.1], [0.12, 0.165, 0.115], [0.3, 0.14, 0.1], [0.5, 0.155, 0.11], [0.7, 0.17, 0.12], [0.88, 0.195, 0.11], [0.96, 0.15, 0.09], [1, 0.07, 0.07]];
    let i = 0; while (i < prof.length - 2 && prof[i + 1][0] < y) i++;
    const a = prof[i], b = prof[i + 1]; const k = (y - a[0]) / (b[0] - a[0]); const sk = k * k * (3 - 2 * k);
    let rx = (a[1] + (b[1] - a[1]) * sk) * s, rz = (a[2] + (b[2] - a[2]) * sk) * s;
    const gx = y > 0.92 ? 1 : y > 0.72 ? 0.72 + 0.28 * g : g; rx *= gx * (r.muscle && y > 0.6 && y < 0.92 ? 1.08 : 1); rz *= (y > 0.92 ? 1 : g * (1 + r.muscle * 0.1));
    if (r.lean > 0.5 && y > 0.25 && y < 0.45) rz *= 0.82;     // sunken belly
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // front (+z, sa < 0 because uz points -z for upward tubes) — pecs / ribs
    const front = Math.max(0, -sa);
    if (r.muscle && y > 0.62 && y < 0.86) rz *= 1 + front * 0.18 * Math.sin((y - 0.62) / 0.24 * Math.PI) * (Math.abs(ca) > 0.15 ? 1 : 0.6);
    if (r.lean > 0.5 && y > 0.45 && y < 0.85) { const rib = Math.sin((y - 0.45) * 52) ; rx *= 1 + rib * 0.018 * r.lean * (0.4 + Math.abs(ca)); rz *= 1 + rib * 0.012 * r.lean; }
    if (y > 0.86 && y < 0.95 && r.muscle) rx *= 1.06;
    // clothing stands off the skin a little
    if (torsoCloth && y < 0.93) { rx *= 1.07; rz *= 1.09; }
    return [rx, rz];
  };
  const torsoBone = (t) => t < 0.2 ? [BI.hips, BI.hips, 0] : t < 0.42 ? [BI.hips, BI.spine, (t - 0.2) / 0.22] : t < 0.62 ? [BI.spine, BI.chest, (t - 0.42) / 0.2] : t < 0.95 ? [BI.chest, BI.chest, 0] : [BI.chest, BI.neck, (t - 0.95) / 0.05 * 0.6];
  tube(new V(0, 0.83 * s, -0.01 * s), new V(0, 1.5 * s, -0.01 * s), 26, 24, torsoR, torsoBone, (p, n, t, ang) => {
    if (torsoCloth && t < 0.93) {
      let c = clothPaint(torsoCloth, p, n);
      if (O === 'straitjacket') { const band = [0.3, 0.55, 0.78].some((b) => Math.abs(t - b) < 0.025); if (band) c = cloth.strap.clone().multiplyScalar(0.8 + 0.4 * fbm(p.x * 20, p.y * 20, 5, 2, 64)); }
      if (O === 'surgeon' && -Math.sin(ang) > 0.1 && t < 0.86) { c = clothPaint(cloth.apron, p, n, 0.3); c = withBlood(c, p, n, 0.3 + (1 - t) * 0.3); }
      if (O === 'gown' && t > 0.86) c = skin(p, n);      // collar opening
      return c;
    }
    let c = skin(p, n);
    if (O === 'trousers' && t < 0.3) c = clothPaint(cloth.trousers, p, n);
    if (O === 'rags' && t < 0.25) c = clothPaint(cloth.rag, p, n);
    // scars across the chest and belly: surgical lines, stitched
    if (r.scars > 0.5) { const sc = Math.abs(p.x - Math.sin(p.y * 9 + seed) * 0.04 * s); if (sc < 0.006 * s && t > 0.3 && t < 0.85 && -Math.sin(ang) > 0.3) c.lerp(new THREE.Color(0.45, 0.2, 0.18), 0.8); }
    return withBlood(c, p, n, r.muscle ? 0.15 : 0);
  }, true, false);

  // gown skirt / apron / straitjacket hang below the hips
  if (O === 'gown' || O === 'surgeon' || O === 'straitjacket') {
    const len = O === 'gown' ? 0.42 : O === 'surgeon' ? 0.55 : 0.18;
    tube(new V(0, 0.9 * s, -0.01 * s), new V(0, (0.9 - len) * s, 0), 8, 22, (t, ang) => { const wide = (0.17 + t * 0.05) * s * g * 1.05; const sa = Math.sin(ang); return [wide, (0.13 + t * 0.03) * s * g * (O === 'surgeon' && sa > 0 ? 0.6 : 1)]; },
      (t) => [BI.hips, BI.hips, 0], (p, n, t, ang) => O === 'surgeon' ? (Math.sin(ang) > -0.1 ? clothPaint(cloth.scrub, p, n) : withBlood(clothPaint(cloth.apron, p, n, 0.3), p, n, 0.4)) : clothPaint(torsoCloth, p, n), false, false);
  }

  // ---- limbs
  const limb = (a0, b, r0, r1, b0, bParent, paintFn, blend = 0.18, flat = 1, caps = [false, true]) => { const a = a0.clone().addScaledVector(new V().subVectors(a0, b).normalize(), Math.min(r0, 0.06) * 0.6); return tube(a, b, 10, 12, (t, ang) => {
    let rr = r0 + (r1 - r0) * t; const bulge = r.muscle ? Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.22 : 0; rr *= 1 + bulge;
    if (r.lean > 0.5) rr *= 0.9 + 0.1 * Math.abs(Math.cos(t * Math.PI * 2));   // knobbly joints on a starved body
    return [rr, rr * flat];
  }, (t) => t < blend ? [bParent, b0, 0.5 + 0.5 * t / blend] : [b0, b0, 0], paintFn, caps[0], caps[1]); };
  const armR = (n0) => 0.05 * s * (0.7 + g * 0.3);
  for (const side of ['L', 'R']) {
    const S = side === 'L' ? 1 : -1;
    const sleeve = O === 'gown' ? 0.4 : O === 'straitjacket' ? 1.1 : O === 'surgeon' ? 0.45 : 0;
    const armPaint = (seg) => (p, n, t) => {
      const along = seg === 'u' ? t : 1 + t;
      if (along < sleeve * 2) return clothPaint(O === 'straitjacket' ? cloth.jacket : O === 'surgeon' ? cloth.scrub : cloth.gown, p, n);
      let c = skin(p, n);
      if (r.scars > 0.6 && seg === 'f' && t > 0.6) { const cut = Math.sin(p.x * 400 + p.z * 300) > 0.92; if (cut) c.lerp(new THREE.Color(0.5, 0.15, 0.12), 0.8); }    // self-harm on the wrists
      if (r.shackles && seg === 'f' && t > 0.85) c.setRGB(0.18, 0.17, 0.16);
      return withBlood(c, p, n, seg === 'f' ? 0.12 : 0);
    };
    const ar = armR() * (sleeve > 0.4 ? 1.12 : 1);
    limb(P[side + 'upper'], P[side + 'fore'], ar * (1 + r.muscle * 0.35) * (O === 'straitjacket' ? 1.25 : 1), ar * 0.82 * (1 + r.muscle * 0.3), BI[side + 'upper'], BI[side + 'clav'], armPaint('u'), 0.18, 1, [false, false]);
    limb(P[side + 'fore'], P[side + 'hand'], ar * 0.8 * (1 + r.muscle * 0.35), ar * 0.55 * (1 + r.muscle * 0.2), BI[side + 'fore'], BI[side + 'upper'], armPaint('f'));
    // shoulder cap
    limb(P[side + 'clav'].clone().add(new V(0, -0.01 * s, 0)), P[side + 'upper'].clone().add(new V(S * 0.02 * s, -0.02 * s, 0)), 0.075 * s * (0.8 + 0.2 * g), ar * 1.15 * (1 + r.muscle * 0.4), BI[side + 'clav'], BI.chest, (p, n) => O === 'straitjacket' || O === 'surgeon' || O === 'gown' ? clothPaint(O === 'straitjacket' ? cloth.jacket : O === 'surgeon' ? cloth.scrub : cloth.gown, p, n) : withBlood(skin(p, n), p, n), 0.4, 0.8);
    // hand: palm + fingers, long and thin on starved bodies; gloves on the surgeon
    const hb = BI[side + 'hand']; const h0 = P[side + 'hand']; const hs = s * (r.muscle ? 1.25 : 1);
    const handPaint = (p, n) => O === 'surgeon' ? withBlood(new THREE.Color(0.55, 0.5, 0.42), p, n, 0.5) : O === 'straitjacket' ? clothPaint(cloth.jacket, p, n) : withBlood(skin(p, n), p, n, 0.25);
    limb(h0, h0.clone().add(new V(S * 0.005, -0.09 * hs, 0.005)), 0.03 * hs, 0.034 * hs, hb, BI[side + 'fore'], handPaint, 0.3, 0.45);
    if (O !== 'straitjacket') {
      for (let f = 0; f < 4; f++) { const fx = S * (0.0 + (f - 1.5) * 0.002) * hs, fz = (-0.022 + f * 0.015) * hs; const base = h0.clone().add(new V(fx, -0.09 * hs, fz)); const L = [0.075, 0.085, 0.08, 0.065][f] * hs * (r.lean > 0.5 ? 1.12 : 1); limb(base, base.clone().add(new V(S * 0.004, -L, 0.01)), 0.0085 * hs, 0.0065 * hs, hb, hb, handPaint, 0.01); }
      const tb = h0.clone().add(new V(S * -0.005, -0.04 * hs, 0.028 * hs)); limb(tb, tb.clone().add(new V(S * -0.01, -0.05 * hs, 0.03 * hs)), 0.011 * hs, 0.008 * hs, hb, hb, handPaint, 0.01);
    }
    // legs
    const legPaint = (p, n, t) => { if (legCloth) return clothPaint(legCloth, p, n); return withBlood(skin(p, n), p, n); };
    const lr = 0.075 * s * (0.65 + g * 0.35);
    limb(P[side + 'thigh'], P[side + 'shin'], lr * (1 + r.muscle * 0.2) * (legCloth ? 1.12 : 1), lr * 0.68 * (legCloth ? 1.12 : 1), BI[side + 'thigh'], BI.hips, legPaint, 0.2, 1, [false, false]);
    limb(P[side + 'shin'], P[side + 'foot'], lr * 0.66 * (legCloth ? 1.1 : 1), lr * 0.42 * (legCloth ? 1.1 : 1), BI[side + 'shin'], BI[side + 'thigh'], legPaint, 0.15);
    // feet: bare and filthy, or shoes for the surgeon and the brute
    const shod = O === 'surgeon' || O === 'trousers';
    const fp = (p, n) => shod ? new THREE.Color(0.08, 0.07, 0.06) : skin(p, n).lerp(dirtC, 0.55);
    const f0 = P[side + 'foot'].clone().add(new V(0, -0.02 * s, -0.03 * s)); limb(f0, f0.clone().add(new V(0, -0.03 * s, 0.22 * s)), 0.042 * s, 0.038 * s, BI[side + 'foot'], BI[side + 'foot'], fp, 0.01, 0.55);
  }

  // ---- head (built by visage.js), neck here
  const bald = r.bald || r.face === 'lobotomy';
  const c0 = P.head.clone().add(new V(0, 0.065 * s, 0.012 * s)); const HS = s * 1.05 * (r.muscle ? 1.04 : 1);
  const headSkin = (p, n, x, y, z, ph) => {
    let c = skin(p, n);
    if (!bald && (y > 0.28 || (z < 0.1 && y > -0.25))) { const hn = fbm(x * 40, y * 40 + z * 30, seed, 3, 64); c = new THREE.Color(0.09, 0.075, 0.06).multiplyScalar(0.7 + hn * 0.6); if (fbm(x * 6, y * 6 + z * 5, seed + 4, 3, 64) > 0.62) c = skin(p, n).lerp(soreC, 0.3); }   // patchy, torn-out hair
    else if (bald && y > 0.1) { const st = fbm(x * 60, y * 60 + z * 40, seed + 7, 2, 64); c.lerp(new THREE.Color(0.2, 0.17, 0.15), st * 0.25); }
    if (r.face === 'lobotomy' && Math.abs(y - 0.72) < 0.035) c = (Math.floor(ph * 30) % 2) ? new THREE.Color(0.1, 0.05, 0.04) : new THREE.Color(0.5, 0.15, 0.12);
    if (r.face === 'masked' && y > 0.3) c = clothPaint(cloth.scrub, p, n, 0.5);
    if (r.face === 'bandaged' && y > 0.0) c = new THREE.Color(0.62, 0.58, 0.48).multiplyScalar(0.8 + 0.25 * fbm(x * 30, y * 30, 3, 2, 64));
    if (r.dead) c.lerp(new THREE.Color(0.42, 0.45, 0.4), 0.35);
    if (r.scars > 0.6 && Math.abs(x + 0.3 - y * 0.5) < 0.02 && y > 0.3 && z > -0.2) c.lerp(new THREE.Color(0.55, 0.32, 0.3), 0.7);   // an old scalp scar
    return withBlood(c, p, n, r.face === 'smile' || r.face === 'gouged' ? 0.1 : 0);
  };
  const visage = buildVisage({ r, seed, c0, HS, skinFn: headSkin, BIhead: BI.head, BIjaw: BI.jaw, bald });
  const headEyes = visage.eyes;
  tube(P.neck.clone().add(new V(0, -0.06 * s, 0)), c0.clone().add(new V(0, -0.02 * s, -0.012 * s)), 5, 14, (t) => [0.056 * s * (r.muscle ? 1.45 : g < 0.85 ? 0.9 : 1), 0.06 * s * (r.muscle ? 1.35 : 1)], (t) => t < 0.4 ? [BI.neck, BI.neck, 0] : [BI.neck, BI.head, (t - 0.4) / 0.6], (p, n) => {
    let c = withBlood(skin(p, n), p, n, 0.08); if (r.lean > 0.6) { const tend = Math.abs(Math.abs(p.x) - 0.022 * s) < 0.004 * s; if (tend) c.multiplyScalar(1.12); } return c; }, false, false);

  // ---- assemble
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = bodyMaterial(r);
  const mesh = new THREE.SkinnedMesh(geo, mat);
  const root = new THREE.Group(); root.add(bones[0]); root.add(mesh);
  root.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones); mesh.bind(skel);
  // eyes, lids, teeth and the dark of the mouth all join the head mesh (one draw call)
  const B = Object.fromEntries(BONES.map((n) => [n, bones[BI[n]]]));
  const parts = [];
  const part = (geo, m4, colorFn, bone, w = 0, bone2 = bone) => parts.push({ geo, m4, colorFn, bone, bone2, w });
  const lidC = new THREE.Color(...r.skin).multiplyScalar(0.86);
  const irisC = r.dead ? new THREE.Color(0.17, 0.17, 0.14) : [new THREE.Color(0.24, 0.15, 0.08), new THREE.Color(0.2, 0.26, 0.3), new THREE.Color(0.22, 0.22, 0.14)][seed % 3];
  const sclera = new THREE.Color(r.dead ? 0.42 : 0.6, r.dead ? 0.42 : 0.5, r.dead ? 0.36 : 0.38);
  const eyeAt = [];
  for (let i = 0; i < 2; i++) {
    if (r.face === 'gouged' && i === 1) continue; if (r.face === 'bandaged' && i === 0) continue;
    const er = 0.0116 * HS; const c = headEyes[i].clone().add(new V(0, 0, -0.0065 * s)); eyeAt.push(c);
    part(new THREE.SphereGeometry(er, 22, 16).rotateX(Math.PI / 2), new THREE.Matrix4().makeTranslation(c.x, c.y, c.z), (p, n) => {
      const cz2 = n.z; if (cz2 > 0.972) return new THREE.Color(0.01, 0.01, 0.01); if (cz2 > 0.86) return irisC.clone().multiplyScalar(0.8 + (cz2 - 0.86) * 2);
      const vein = Math.sin(n.x * 60 + n.y * 40) * Math.sin(n.y * 50) > 0.6; const rim = cz2 < 0.5 ? 0.5 : 0; return vein ? new THREE.Color(0.55, 0.1, 0.08) : sclera.clone().lerp(new THREE.Color(0.55, 0.15, 0.12), rim); }, BI.head);
    const open = r.dead ? 0.35 : r.stare ? 0.75 : 0.5;
    for (const top of [true, false]) {
      const cover = top ? (1 - open) * 1.25 + 0.15 : (1 - open) * 0.7 + 0.12;
      const g = new THREE.SphereGeometry(er * 1.05, 16, 6, 0, Math.PI * 2, 0, cover);
      part(g, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeRotationX(top ? 0.55 : Math.PI - 0.15)), (p, n) => lidC.clone().multiplyScalar(0.85 + 0.15 * Math.abs(n.y)), BI.head);
    }
  }
  const toothC = new THREE.Color(0.55, 0.48, 0.3);
  for (const [bone, yo] of [['head', -0.047], ['jaw', -0.06]]) for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.28; const tp = visage.mouth.clone().add(new V(Math.sin(a) * 0.024 * s, (yo + 0.053) * s + (bone === 'jaw' ? -0.006 * s : 0.006 * s), (Math.cos(a) - 1) * 0.024 * s - 0.006 * s));
    const m4 = new THREE.Matrix4().makeTranslation(tp.x, tp.y, tp.z).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, a, (Math.random() - 0.5) * 0.4)));
    part(new THREE.BoxGeometry(0.006 * s, 0.009 * s, 0.004 * s), m4, () => toothC.clone().multiplyScalar(0.7 + Math.random() * 0.4), BI[bone]);
  }
  { const m = visage.mouth.clone().add(new V(0, 0, -0.025 * s)); part(new THREE.SphereGeometry(0.03 * s, 8, 6), new THREE.Matrix4().makeTranslation(m.x, m.y, m.z).multiply(new THREE.Matrix4().makeScale(1.3, 0.8, 0.8)), () => new THREE.Color(0.03, 0.005, 0.005), BI.head); }
  const hg = mergeParts(visage.geo, parts);
  hg.boundingSphere = new THREE.Sphere(new V(0, 1.0 * s, 0), 1.4 * s);
  const headMesh = new THREE.SkinnedMesh(hg, headMaterial(visage.tex, mat.userData.uAmb, BODY_LIGHT.up)); root.add(headMesh); headMesh.bind(skel, mesh.bindMatrix);
  geo.boundingSphere = new THREE.Sphere(new V(0, 1.0 * s, 0), 1.4 * s); mesh.frustumCulled = true;
  // eye-shine, seen only by the camcorder
  const eyes = [];
  if (!r.dead) { const shine = new THREE.SpriteMaterial({ map: glintTex(), color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }); for (const c of eyeAt) { const sp = new THREE.Sprite(shine); sp.scale.setScalar(0.022 * s); sp.position.copy(c).sub(P.head).add(new V(0, 0, 0.02 * s)); sp.layers.set(EYE_LAYER); B.head.add(sp); eyes.push(sp); } }
  const body = { root, mesh, headMesh, bones: B, recipe: r, s, mat, eyes, kind, seed, rest: Object.fromEntries(BONES.map((n) => [n, B[n].position.clone()])) };
  if (r.shackles) for (const side of ['L', 'R']) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.012 * s, 6, 14), new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.8, roughness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.2 * s, 0); B[side + 'fore'].add(ring); }
  if (r.glasses) { const gl = new THREE.Mesh(new THREE.TorusGeometry(0.019 * s, 0.002 * s, 4, 16), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })); for (const e of headEyes) { const g2 = gl.clone(); g2.position.copy(e).sub(P.head).add(new V(0, 0, 0.016 * s)); B.head.add(g2); } }
  return body;
}

// a vertex-coloured standard material lit by the world's baked light (uAmb) plus the camcorder lamp
function bodyMaterial(r) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  const uAmb = { value: new THREE.Color(0.01, 0.01, 0.01) }; m.userData.uAmb = uAmb;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAmb = uAmb; sh.uniforms.uUp = BODY_LIGHT.up;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAmb; uniform vec3 uUp;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float top = dot(normal, uUp);
        totalEmissiveRadiance += diffuseColor.rgb * uAmb * (0.5 + 0.5 * top) * 1.3;
        // sweat and grease: a sheen toward the light above
        totalEmissiveRadiance += uAmb * pow(clamp(top, 0.0, 1.0), 6.0) * 0.25;`);
  };
  return m;
}

// ---------------------------------------------------------------- props carried
export function cleaver(s = 1) {
  const g = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: 0x6a6660, metalness: 0.85, roughness: 0.35 }); const wood = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.11, 0.2), steel); blade.position.set(0, -0.04, 0.16); g.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a0806, roughness: 0.3 })); edge.position.set(0, -0.1, 0.16); g.add(edge);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 8), wood); handle.rotation.x = Math.PI / 2; handle.position.z = 0.02; g.add(handle);
  g.scale.setScalar(s); return g;
}
export function bonesaw(s = 1) {
  const g = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: 0x7a7a74, metalness: 0.9, roughness: 0.3 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 16, Math.PI), steel); frame.rotation.y = Math.PI / 2; frame.position.z = 0.13; g.add(frame);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0x5a2a20, metalness: 0.6, roughness: 0.4 })); blade.position.set(0, -0.0, 0.13); g.add(blade);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.11, 8), new THREE.MeshStandardMaterial({ color: 0x111111 })); handle.rotation.x = Math.PI / 2; g.add(handle);
  g.scale.setScalar(s); return g;
}

// ---------------------------------------------------------------- poses
// Rotations are local Euler XYZ. Limbs hang down -Y; character faces +Z.
// thigh/upper .x < 0 swings forward; shin .x > 0 bends the knee; fore .x < 0 bends the elbow.
const E = (b, x = 0, y = 0, z = 0) => b.rotation.set(x, y, z);
export function pose(body, st, t, p = {}) {
  const B = body.bones; const s = body.s;
  for (const n of Object.keys(B)) { B[n].rotation.set(0, 0, 0); B[n].position.copy(body.rest[n]); }
  const sp = p.speed ?? 0;      // m/s
  const ph = p.phase ?? 0;      // gait phase (radians)
  const twK = p.twitch ?? 0.4;
  const tw = (k) => Math.sin(t * 23 + k) * Math.sin(t * 7.1 + k * 3) > 0.92 - twK * 0.15 ? (Math.sin(t * 61 + k) * (0.25 + twK * 0.35)) : 0;   // twitches; hunters jerk harder
  if (st === 'walk' || st === 'run' || st === 'stalk' || st === 'shamble' || st === 'brute') {
    const run = st === 'run'; const amp = run ? 0.85 : st === 'stalk' ? 0.35 : st === 'brute' ? 0.45 : 0.42;
    const sw = Math.sin(ph), cw = Math.cos(ph);
    const lean = run ? 0.28 : st === 'stalk' ? 0.35 : st === 'shamble' ? 0.18 : 0.08;
    const limp = st === 'shamble' ? 0.5 : 0;
    E(B.hips, 0, sw * 0.1, cw * 0.04 * (st === 'brute' ? 2.5 : 1)); B.hips.position.y = body.rest.hips.y - Math.abs(cw) * 0.03 * s * (run ? 2 : 1) - (st === 'stalk' ? 0.08 * s : 0);
    E(B.spine, lean * 0.5, -sw * 0.12, 0); E(B.chest, lean * 0.5, -sw * 0.1, -cw * 0.03);
    E(B.neck, -lean * 0.6 + (st === 'shamble' ? 0.2 : 0), 0, st === 'shamble' ? 0.3 : 0); E(B.head, -lean * 0.3 + tw(1) * 0.5, tw(2), tw(3));
    // legs
    const leg = (side, ph2, k) => {
      const a = Math.sin(ph2) * amp * k; const knee = Math.max(0, Math.cos(ph2)) * amp * 1.4 + (run ? 0.35 : 0.12) + (st === 'stalk' ? 0.4 : 0);
      E(B[side + 'thigh'], -a - (st === 'stalk' ? 0.35 : 0), 0, 0); E(B[side + 'shin'], knee, 0, 0); E(B[side + 'foot'], -knee * 0.4 + a * 0.3, 0, 0);
    };
    leg('L', ph, 1); leg('R', ph + Math.PI, 1 - limp);
    // arms
    if (body.recipe.outfit === 'straitjacket') armsBound(B);
    else if (p.reach) { for (const S of ['L', 'R']) { E(B[S + 'upper'], -1.35 + Math.sin(t * 9 + (S === 'L' ? 0 : 2)) * 0.15, 0, (S === 'L' ? 1 : -1) * 0.15); E(B[S + 'fore'], -0.25, 0, 0); E(B[S + 'hand'], 0.2, 0, 0); } }
    else {
      const aa = run ? 0.9 : st === 'stalk' ? 0.12 : 0.35;
      for (const [S, k] of [['L', -1], ['R', 1]]) {
        const out = st === 'brute' ? 0.25 : st === 'stalk' ? 0.12 : 0.08;
        E(B[S + 'upper'], k * Math.sin(ph) * aa + (st === 'stalk' ? -0.35 : 0), 0, (S === 'L' ? 1 : -1) * out);
        E(B[S + 'fore'], run ? -1.4 : st === 'stalk' ? -0.9 : -0.2 - Math.max(0, k * Math.sin(ph)) * 0.3, 0, 0);
        E(B[S + 'hand'], st === 'stalk' ? 0.4 : 0, 0, 0);
      }
    }
  } else if (st === 'crawl') {
    // on all fours, fast, the head held up and forward like an animal
    const sw = Math.sin(ph), cw = Math.cos(ph); const amp = Math.min(1, sp / 3) * 0.75 + 0.15;
    B.hips.position.y = 0.62 * s - Math.abs(cw) * 0.04 * s; E(B.hips, 1.22, sw * 0.12, cw * 0.06);
    E(B.spine, 0.12, -sw * 0.1, 0); E(B.chest, 0.05, -sw * 0.12, 0);
    E(B.neck, -1.0, 0, tw(1) * 0.5); E(B.head, -0.35 + tw(2) * 0.4, tw(3), 0);
    for (const [S, k] of [['L', 1], ['R', -1]]) {
      E(B[S + 'thigh'], -1.15 - k * sw * amp * 0.7, 0, (S === 'L' ? 1 : -1) * 0.15); E(B[S + 'shin'], 1.5 + Math.max(0, k * cw) * 0.5, 0, 0); E(B[S + 'foot'], 0.6, 0, 0);
      E(B[S + 'upper'], -1.25 + k * sw * amp * 0.8, 0, (S === 'L' ? 1 : -1) * 0.18); E(B[S + 'fore'], -0.25 - Math.max(0, -k * cw) * 0.5, 0, 0); E(B[S + 'hand'], -0.9, 0, 0);
    }
    B.jaw.rotation.x = 0.35 + Math.sin(t * 11) * 0.12;
  } else if (st === 'idle' || st === 'search' || st === 'listen') {
    const br = Math.sin(t * 1.6) * 0.03;
    E(B.spine, 0.05 + br, 0, 0); E(B.chest, 0.04 + br, 0, 0);
    const look = st === 'search' ? Math.sin(t * 0.9) * 0.9 : st === 'listen' ? 0.25 : Math.sin(t * 0.3) * 0.2;
    E(B.neck, 0.1 + (st === 'listen' ? 0.15 : 0), look * 0.5, st === 'listen' ? 0.35 : 0); E(B.head, tw(1) * 0.6, look * 0.5 + tw(2), tw(3));
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], -0.05, 0, (S === 'L' ? 1 : -1) * 0.05); E(B[S + 'shin'], 0.1, 0, 0); E(B[S + 'foot'], -0.05, 0, 0); }
    if (body.recipe.outfit === 'straitjacket') armsBound(B);
    else for (const S of ['L', 'R']) { E(B[S + 'upper'], 0.05, 0, (S === 'L' ? 1 : -1) * 0.12); E(B[S + 'fore'], -0.25 + tw(S === 'L' ? 5 : 6) * 0.5, 0, 0); E(B[S + 'hand'], tw(7) * 0.4, 0, 0); }
    B.hips.position.y -= 0.02 * s;
  } else if (st === 'rock') {
    // kneeling, rocking, hugging itself, head down, murmuring
    const rk = Math.sin(t * 2.4) * 0.22;
    B.hips.position.y = 0.42 * s; E(B.hips, -0.15 + rk, 0, 0);
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], -1.75, 0, (S === 'L' ? 1 : -1) * 0.12); E(B[S + 'shin'], 2.6, 0, 0); E(B[S + 'foot'], 0.6, 0, 0); }
    E(B.spine, 0.35 + rk * 0.5, 0, 0); E(B.chest, 0.3, 0, 0); E(B.neck, 0.5, 0, 0); E(B.head, 0.3 + tw(1), tw(2), 0.2);
    if (body.recipe.outfit === 'straitjacket') armsBound(B); else for (const S of ['L', 'R']) { E(B[S + 'upper'], -0.9, (S === 'L' ? -1 : 1) * 0.6, (S === 'L' ? 1 : -1) * -0.1); E(B[S + 'fore'], -1.7, 0, 0); }
    B.jaw.rotation.x = Math.max(0, Math.sin(t * 7)) * 0.12;
  } else if (st === 'eat') {
    // crouched over a body, tearing
    const pull = Math.sin(t * 3.1); const tear = Math.max(0, Math.sin(t * 1.3)) ** 4;
    B.hips.position.y = 0.45 * s; E(B.hips, 0.3, 0, 0);
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], -2.1, 0, (S === 'L' ? 1 : -1) * 0.35); E(B[S + 'shin'], 2.5, 0, 0); E(B[S + 'foot'], 0.4, 0, 0); }
    E(B.spine, 0.45 + pull * 0.05, 0, 0); E(B.chest, 0.4 - tear * 0.3, 0, 0); E(B.neck, 0.3 - tear * 0.6, Math.sin(t * 2) * 0.2, 0); E(B.head, 0.3 - tear * 0.4 + tw(1) * 0.4, tw(2), 0);
    for (const [S, k] of [['L', 1], ['R', -1]]) { E(B[S + 'upper'], -1.1 - pull * k * 0.2, 0, k * 0.2); E(B[S + 'fore'], -0.6 - tear * 0.8, 0, 0); E(B[S + 'hand'], 0.5, 0, 0); }
    B.jaw.rotation.x = 0.15 + Math.max(0, Math.sin(t * 9)) * 0.25;
  } else if (st === 'attack') {
    // p.k 0..1 through the swing: wind up, then down hard
    const k = p.k ?? 0; const wind = Math.min(1, k / 0.45), hit = Math.max(0, (k - 0.45) / 0.25);
    E(B.spine, 0.1 - wind * 0.25 + hit * 0.55, wind * 0.3 - hit * 0.5, 0); E(B.chest, 0.1 + hit * 0.3, 0, 0); E(B.neck, -0.2, 0, 0);
    E(B.Rupper, -2.6 * wind + hit * 2.2, 0, -0.3); E(B.Rfore, -0.8 * wind + hit * 0.6, 0, 0); E(B.Rhand, -0.4 * wind, 0, 0);
    E(B.Lupper, -1.0, 0, 0.3); E(B.Lfore, -0.6, 0, 0);
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], S === 'L' ? -0.4 : 0.2, 0, 0); E(B[S + 'shin'], 0.4, 0, 0); }
    B.jaw.rotation.x = 0.3 + hit * 0.25; B.hips.position.y -= 0.05 * s;
  } else if (st === 'grab') {
    const k = p.k ?? 0;
    E(B.spine, 0.25, 0, 0); E(B.chest, 0.2, 0, 0); E(B.neck, -0.3, 0, 0); E(B.head, -0.2 + tw(1), tw(2), 0);
    for (const [S, k2] of [['L', 1], ['R', -1]]) { E(B[S + 'upper'], -1.45, 0, k2 * 0.05); E(B[S + 'fore'], -0.35 - Math.sin(t * 20) * 0.1 * k, 0, 0); E(B[S + 'hand'], 0.3, 0, 0); }
    B.jaw.rotation.x = 0.45 + Math.sin(t * 13) * 0.1;
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], -0.3, 0, 0); E(B[S + 'shin'], 0.5, 0, 0); }
  } else if (st === 'hang') {
    E(B.neck, 0.1, 0, 0.55); E(B.head, 0.4, 0.2, 0.5);
    for (const S of ['L', 'R']) { E(B[S + 'upper'], 0.05, 0, (S === 'L' ? 1 : -1) * 0.05); E(B[S + 'fore'], -0.1, 0, 0); E(B[S + 'thigh'], 0.05, 0, 0); E(B[S + 'shin'], 0.1, 0, 0); E(B[S + 'foot'], 0.9, 0, 0); }
    B.jaw.rotation.x = 0.35;
  } else if (st === 'lie') {
    // flat on the back (root is rotated by the caller), limbs splayed
    E(B.neck, -0.15, 0, 0.3); E(B.head, -0.2, 0.6, 0); B.jaw.rotation.x = 0.4;
    E(B.Lupper, 0.1, 0, 0.6); E(B.Rupper, 0.2, 0, -0.9); E(B.Lfore, -0.3, 0, 0); E(B.Rfore, -1.2, 0, 0);
    E(B.Lthigh, -0.1, 0, 0.2); E(B.Rthigh, 0, 0, -0.15); E(B.Lshin, 0.3, 0, 0); E(B.Lfoot, 0.8, 0, 0.3); E(B.Rfoot, 0.8, 0, -0.3);
  } else if (st === 'slump') {
    // sitting against a wall, head fallen to the side
    B.hips.position.y = 0.12 * s; E(B.hips, 0.1, 0, 0);
    for (const S of ['L', 'R']) { E(B[S + 'thigh'], -1.45, (S === 'L' ? 1 : -1) * 0.3, 0); E(B[S + 'shin'], 0.5, 0, 0); E(B[S + 'foot'], 0.6, 0, 0); E(B[S + 'upper'], 0.2, 0, (S === 'L' ? 1 : -1) * 0.25); E(B[S + 'fore'], -0.3, 0, 0); }
    E(B.spine, 0.3, 0, 0); E(B.chest, 0.3, 0, 0.1); E(B.neck, 0.6, 0, 0.5); E(B.head, 0.3, 0, 0.3); B.jaw.rotation.x = 0.35;
  }
  // jaw idle movement (muttering / panting) unless a pose set it
  if (p.mouth !== undefined) B.jaw.rotation.x = Math.max(B.jaw.rotation.x, p.mouth);
}
function armsBound(B) {
  // arms wrapped across the belly, sleeves buckled behind: upper arms turned in, elbows bent square
  B.Lupper.rotation.set(-0.12, -1.3, 0.12); B.Lfore.rotation.set(-1.62, 0, 0); B.Lhand.rotation.set(0, 0, 0);
  B.Rupper.rotation.set(-0.08, 1.3, -0.12); B.Rfore.rotation.set(-1.5, 0, 0); B.Rhand.rotation.set(0, 0, 0);
}

// append extra parts (with per-vertex colour and a bone each) to an indexed head geometry
function mergeParts(base, parts) {
  const A = (name) => Array.from(base.attributes[name].array);
  const pos = A('position'), nor = A('normal'), col = A('color'), uv = A('uv'), fr = A('front'), si = A('skinIndex'), sw = A('skinWeight'); const idx = Array.from(base.index.array);
  const nm = new THREE.Matrix3(); const v = new V(), n = new V();
  for (const p of parts) {
    const g = p.geo; const off = pos.length / 3; nm.getNormalMatrix(p.m4);
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      n.fromBufferAttribute(N, i); const c = p.colorFn(v.fromBufferAttribute(P, i), n).convertSRGBToLinear();
      v.fromBufferAttribute(P, i).applyMatrix4(p.m4); n.applyMatrix3(nm).normalize();
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); uv.push(0, 0); fr.push(0); si.push(p.bone, p.bone2, 0, 0); sw.push(1 - p.w, p.w, 0, 0);
    }
    if (g.index) for (const k of g.index.array) idx.push(k + off); else for (let i = 0; i < P.count; i++) idx.push(i + off);
    g.dispose();
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); o.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); o.setAttribute('front', new THREE.Float32BufferAttribute(fr, 1));
  o.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); o.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); o.setIndex(idx);
  return o;
}

// a small soft round glint: the eye-shine night vision picks up
let _glint = null;
function glintTex() {
  if (_glint) return _glint;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.8)'); g.addColorStop(0.45, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _glint = new THREE.CanvasTexture(c); return _glint;
}

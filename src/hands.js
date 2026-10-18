// Hands: the reporter's own hands. One skinned mesh per hand: a palm,
// three-jointed fingers and a thumb grown from tapered rings, knuckles,
// nails, the cuff of a shirt and the sleeve of a waxed canvas jacket.
// Built in WebXR grip space (origin in the curled fingers, -Z along the
// handle toward the thumb, +Y back along the forearm, palm facing -X on
// the right hand and +X on the left), so it sits on the controller as is.
import * as THREE from '../vendor/three.module.js';
import { fbm } from './surfaces.js?v=18';

const V = THREE.Vector3;
const FINGERS = [   // z along the handle (index nearest the thumb), knuckle drop, phalanx lengths, base radius
  { z: -0.0255, ky: -0.004, L: [0.043, 0.025, 0.02], r: 0.0094 },
  { z: -0.0085, ky: 0.0, L: [0.047, 0.029, 0.021], r: 0.0097 },
  { z: 0.0085, ky: -0.003, L: [0.044, 0.027, 0.02], r: 0.0091 },
  { z: 0.0245, ky: -0.012, L: [0.035, 0.02, 0.018], r: 0.008 },
];

export function makeHand(side, light) {
  const S = side === 'right' ? 1 : -1;    // mirror on X for the left hand
  const bones = []; const B = {};
  const bone = (name, parent, pos) => { const b = new THREE.Bone(); b.name = name; b.position.copy(pos); (parent || null) && parent.add(b); bones.push(b); B[name] = b; return b; };
  // skeleton: forearm -> wrist -> palm -> fingers; the knuckles sit toward the back of the hand (+X*S)
  const wristP = new V(0.006 * S, 0.075, 0.0);
  const fore = bone('fore', null, new V(0.006 * S, 0.3, 0));
  const wrist = bone('wrist', fore, new V().subVectors(wristP, fore.position));
  const knuck = (f) => new V(0.012 * S, f.ky, f.z);
  FINGERS.forEach((f, i) => {
    let parent = wrist, at = wristP.clone();
    const k = knuck(f); let p = bone(`f${i}0`, parent, new V().subVectors(k, at)); at = k;
    let y = k.y; for (let j = 1; j < 3; j++) { y -= f.L[j - 1]; const np = new V(k.x, y, k.z); p = bone(`f${i}${j}`, p, new V().subVectors(np, at)); at = np; }
  });
  // thumb: the CMC joint sits inside the heel of the hand, the thumb swings out from the thenar pad
  const tb = new V(-0.004 * S, 0.054, -0.02);
  let tp = bone('t0', wrist, new V().subVectors(tb, wristP)); let tat = tb;
  for (const [j, d] of [[1, new V(-0.013 * S, -0.024, -0.021)], [2, new V(-0.006 * S, -0.017, -0.018)]]) { const np = tat.clone().add(d); tp = bone('t' + j, tp, new V().subVectors(np, tat)); tat = np; }
  const thumbTip = tat.clone().add(new V(-0.004 * S, -0.014, -0.014));
  const BI = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  // world-space bind positions
  const root = new THREE.Group(); root.add(fore); root.updateMatrixWorld(true);
  const W = (n) => B[n].getWorldPosition(new V());

  const pos = [], nor = [], col = [], si = [], sw = [], idx = []; let vc = 0;
  const skin = new THREE.Color(0.56, 0.42, 0.35);
  const paint = (p, kind, t, ang) => {
    let c;
    if (kind === 'sleeve') { const n = fbm(p.x * 60, p.y * 60 + p.z * 40, 3, 4, 64); c = new THREE.Color(0.2, 0.17, 0.11).multiplyScalar(0.75 + n * 0.5); if (t < 0.12) c.multiplyScalar(0.7); }
    else if (kind === 'cuff') { c = new THREE.Color(0.55, 0.56, 0.6).multiplyScalar(0.8 + fbm(p.x * 80, p.y * 80, 5, 3, 64) * 0.3); }
    else {
      // kind: palm | finger | thumb ; ang 0 = back of the hand; t along the piece; extra info in paint.j / paint.v / paint.z
      const back = Math.cos(ang) * S;            // +1 back of hand, -1 palm side
      const n = fbm(p.x * 90, p.y * 90 + p.z * 70, 7, 4, 64), m = fbm(p.x * 300, p.y * 300 + p.z * 200, 8, 2, 64);
      c = skin.clone().multiplyScalar(0.86 + n * 0.2 + (m - 0.5) * 0.06);
      if (back < -0.2) c.lerp(new THREE.Color(0.72, 0.52, 0.45), Math.min(1, (-back - 0.2) * 1.6) * 0.75);     // palms and finger pads are paler, pinker
      if (kind === 'palm') {
        const v = paint.v, z = paint.z;
        if (back < -0.3) {   // the creases of the palm: heart, head and life lines
          const lines = [Math.abs(v - (0.78 + z * 1.2)) , Math.abs(v - (0.62 - z * 0.9)), Math.abs(Math.hypot((z + 0.03) * 1.2, v - 0.75) - 0.42)];
          for (const L of lines) if (L < 0.018) c.lerp(new THREE.Color(0.42, 0.28, 0.24), 0.55 * (1 - L / 0.018));
        }
        if (back > 0.4) { const ten = Math.min(...FINGERS.map((f) => Math.abs(z - f.z * 0.85))); if (ten < 0.0025 && v > 0.35) c.multiplyScalar(1.07); const vein = Math.abs(Math.sin(z * 260 + v * 9) * 0.5 + Math.sin(v * 31) * 0.3); if (vein < 0.05 && v < 0.75) c.lerp(new THREE.Color(0.42, 0.42, 0.55), 0.25); }
        if (back > 0.5 && v > 0.85) c.lerp(new THREE.Color(0.66, 0.4, 0.34), 0.3);   // knuckles
      } else {
        const j = paint.j;
        if (back < -0.5 && (t < 0.07 || (t > 0.93 && j < 2))) c.lerp(new THREE.Color(0.45, 0.3, 0.26), 0.5);   // joint creases
        if (back > 0.4 && t < 0.18 && j < 2) c.lerp(new THREE.Color(0.66, 0.4, 0.34), 0.35 * (1 - t / 0.18)); // knuckle wrinkles, reddened
        if (j === 2 && back > 0.45 && t > 0.42) {                                                            // the nail
          c = new THREE.Color(0.76, 0.6, 0.56).multiplyScalar(0.92 + n * 0.12);
          if (t < 0.52) c.lerp(new THREE.Color(0.85, 0.78, 0.72), 0.5);                                       // lunula
          if (t > 1.0) c.lerp(new THREE.Color(0.86, 0.82, 0.74), 0.7);                                        // free edge
          if (m > 0.6) c.lerp(new THREE.Color(0.2, 0.15, 0.1), 0.6);                                          // dirt under it
        }
      }
      if (fbm(p.x * 40 + 9, p.y * 40, 11, 3, 64) > 0.68) c.lerp(new THREE.Color(0.25, 0.18, 0.12), 0.3);     // grime from the place
    }
    return c.convertSRGBToLinear();
  };
  // tapered tube from a to b; frame: "side" axis is X (palm/back), "width" axis is Z
  const tube = (a, b, rings, segs, rad, boneOf, kind, capA, capB) => {
    const d = new V().subVectors(b, a); const len = d.length(); d.normalize();
    let ux = new V(1, 0, 0); ux.addScaledVector(d, -ux.dot(d)); if (ux.lengthSq() < 1e-4) ux.set(0, 0, 1); ux.normalize(); const uz = new V().crossVectors(d, ux).normalize();
    const start = vc;
    for (let i = 0; i <= rings; i++) {
      const t = i / rings; const c = a.clone().addScaledVector(d, len * t); const [b0, b1, w] = boneOf(t);
      for (let j = 0; j < segs; j++) {
        const ang = j / segs * Math.PI * 2; let [rx, rz] = rad(t, ang); const ca = Math.cos(ang), sa = Math.sin(ang);
        if ((capA && i === 0) || (capB && i === rings)) { rx *= 0.45; rz *= 0.45; }
        const p = c.clone().addScaledVector(ux, ca * rx).addScaledVector(uz, sa * rz);
        pos.push(p.x, p.y, p.z); nor.push(0, 0, 0); col.push(...paint(p, kind, t, ang).toArray()); si.push(b0, b1, 0, 0); sw.push(1 - w, w, 0, 0); vc++;
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a0 = start + i * segs + j, a1 = start + i * segs + (j + 1) % segs, b0 = a0 + segs, b1 = a1 + segs; idx.push(a0, a1, b0, a1, b1, b0); }
    for (const [ring, flip, at] of [[0, false, a], [rings, true, b]]) {
      if ((ring === 0 && !capA) || (ring === rings && !capB)) continue;
      const ci = vc; pos.push(at.x, at.y, at.z); nor.push(0, 0, 0); col.push(...paint(at, kind, ring ? 1 : 0, 0).toArray()); const bb = boneOf(ring ? 1 : 0); si.push(bb[0], bb[1], 0, 0); sw.push(1 - bb[2], bb[2], 0, 0); vc++;
      for (let j = 0; j < segs; j++) { const q0 = start + ring * segs + j, q1 = start + ring * segs + (j + 1) % segs; if (flip) idx.push(ci, q0, q1); else idx.push(ci, q1, q0); }
    }
  };
  // sleeve and cuff on the forearm
  tube(new V(0.006 * S, 0.34, 0), wristP.clone().add(new V(0, 0.04, 0)), 6, 18, (t) => [0.045 + t * 0.004, 0.05 + t * 0.004], () => [BI.fore, BI.fore, 0], 'sleeve', false, true);
  tube(wristP.clone().add(new V(0, 0.07, 0)), wristP.clone().add(new V(0, 0.015, 0)), 3, 16, () => [0.036, 0.04], () => [BI.fore, BI.fore, 0], 'cuff', false, false);
  // ---- the palm: a rounded slab, wider at the knuckles, with the thenar and hypothenar pads and a hollow
  const pe = (c, n = 2.6) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const g2 = (x, y, sx, sy) => Math.exp(-((x / sx) ** 2) - ((y / sy) ** 2));
  const kyAt = (z) => { const fs = FINGERS; if (z <= fs[0].z) return fs[0].ky; if (z >= fs[3].z) return fs[3].ky - (z - fs[3].z) * 0.6; for (let i = 0; i < 3; i++) if (z <= fs[i + 1].z) { const k = (z - fs[i].z) / (fs[i + 1].z - fs[i].z); return fs[i].ky + (fs[i + 1].ky - fs[i].ky) * k; } return 0; };
  {
    const NV = 16, NA = 32; const start = vc; const y0 = wristP.y + 0.014;
    for (let i = 0; i <= NV; i++) {
      const v = i / NV; const sv = v * v * (3 - 2 * v);
      for (let k = 0; k < NA; k++) {
        const ang = k / NA * Math.PI * 2; const ca = Math.cos(ang), sa = Math.sin(ang);
        const hw = 0.0275 + 0.0115 * sv; let z = 0.0005 + hw * pe(sa);
        let tb = 0.0135 - 0.003 * v, tp = 0.0155 - 0.003 * v;
        tp += 0.012 * g2(z + 0.022, v - 0.32, 0.015, 0.3) + 0.0045 * g2(z - 0.027, v - 0.42, 0.011, 0.3) - 0.003 * g2(z + 0.002, v - 0.62, 0.02, 0.2);
        if (v > 0.78) tb += 0.0028 * FINGERS.reduce((acc, f) => acc + Math.exp(-(((z - f.z) / 0.0065) ** 2)), 0) * (v - 0.78) / 0.22;
        const back = ca >= 0; const xo = (back ? tb : tp) * pe(ca);
        const y = y0 + (kyAt(z) + 0.004 - y0) * v;
        const p = new V(S * (0.006 + 0.005 * v) + S * xo, y, z);
        paint.v = v; paint.z = z;
        const w = v < 0.22 ? Math.min(1, v / 0.22) : 1;
        pos.push(p.x, p.y, p.z); nor.push(0, 0, 0); col.push(...paint(p, 'palm', v, ang).toArray()); si.push(BI.fore, BI.wrist, 0, 0); sw.push(1 - w, w, 0, 0); vc++;
      }
    }
    for (let i = 0; i < NV; i++) for (let k = 0; k < NA; k++) { const a0 = start + i * NA + k, a1 = start + i * NA + (k + 1) % NA, b0 = a0 + NA, b1 = a1 + NA; if (S > 0) idx.push(a0, a1, b0, a1, b1, b0); else idx.push(a0, b0, a1, a1, b0, b1); }
    // close the knuckle end (the fingers cover it)
    const ci = vc; const cc = new V(S * 0.011, kyAt(0) + 0.002, 0); pos.push(cc.x, cc.y, cc.z); nor.push(0, 0, 0); col.push(...paint(cc, 'palm', 1, 0).toArray()); si.push(BI.wrist, BI.wrist, 0, 0); sw.push(1, 0, 0, 0); vc++;
    for (let k = 0; k < NA; k++) { const q0 = start + NV * NA + k, q1 = start + NV * NA + (k + 1) % NA; if (S > 0) idx.push(ci, q0, q1); else idx.push(ci, q1, q0); }
  }
  // ---- a phalanx: a flattened capsule, fuller at the joints, a fat pad and a rounded tip on the last one
  const phalanx = (a0, b, r0, r1, j, boneOf, tipCap) => {
    const d = new V().subVectors(b, a0).normalize(); const a = a0.clone().addScaledVector(d, -r0 * 0.5);
    const len = a.distanceTo(b);
    let ux = new V(1, 0, 0); ux.addScaledVector(d, -ux.dot(d)); ux.normalize(); const uz = new V().crossVectors(d, ux).normalize();
    const RINGS = 9, SEG = 14, CAP = tipCap ? 5 : 0; const start = vc;
    const ring = (c, t, rad, cap) => {
      const [b0, b1, w] = boneOf(Math.min(1, t));
      for (let k = 0; k < SEG; k++) {
        const ang = k / SEG * Math.PI * 2; const ca = Math.cos(ang), sa = Math.sin(ang); const backS = ca * S;
        let rx = rad * 0.92, rz = rad * 1.04;
        const joint = Math.max(0, 1 - t / 0.16) + (j < 2 ? Math.max(0, (t - 0.84) / 0.16) : 0);
        rx *= 1 + 0.06 * joint; rz *= 1 + 0.07 * joint;
        if (j === 2 && backS < 0) rx *= 1 + 0.16 * Math.sin(Math.min(1, Math.max(0, (t - 0.3) / 0.65)) * Math.PI);   // the fingertip pad
        if (j === 2 && backS > 0.45 && t > 0.42) rx *= 1.04;                                                    // the nail sits proud
        const p = c.clone().addScaledVector(ux, ca * rx * cap).addScaledVector(uz, sa * rz * cap);
        paint.j = j; pos.push(p.x, p.y, p.z); nor.push(0, 0, 0); col.push(...paint(p, 'finger', t, ang).toArray()); si.push(b0, b1, 0, 0); sw.push(1 - w, w, 0, 0); vc++;
      }
    };
    for (let i = 0; i <= RINGS; i++) { const t = i / RINGS; ring(a.clone().addScaledVector(d, len * t), t, r0 + (r1 - r0) * t, 1); }
    for (let i = 1; i <= CAP; i++) { const ph = i / (CAP + 1) * Math.PI / 2; ring(b.clone().addScaledVector(d, r1 * 0.95 * Math.sin(ph)), 1 + i * 0.01, r1, Math.cos(ph)); }
    const rows = RINGS + CAP;
    for (let i = 0; i < rows; i++) for (let k = 0; k < SEG; k++) { const a0i = start + i * SEG + k, a1 = start + i * SEG + (k + 1) % SEG, b0 = a0i + SEG, b1 = a1 + SEG; idx.push(a0i, a1, b0, a1, b1, b0); }
    if (tipCap) { const ti = vc; const tp = b.clone().addScaledVector(d, r1 * 0.95); pos.push(tp.x, tp.y, tp.z); nor.push(0, 0, 0); col.push(...paint(tp, 'finger', 1.05, Math.PI).toArray()); const bb = boneOf(1); si.push(bb[0], bb[1], 0, 0); sw.push(1, 0, 0, 0); vc++; for (let k = 0; k < SEG; k++) { const q0 = start + rows * SEG + k, q1 = start + rows * SEG + (k + 1) % SEG; idx.push(ti, q0, q1); } }
  };
  FINGERS.forEach((f, i) => {
    for (let j = 0; j < 3; j++) {
      const a = W(`f${i}${j}`), b = j < 2 ? W(`f${i}${j + 1}`) : a.clone().add(new V(0, -f.L[2], 0));
      const r0 = f.r * [1, 0.86, 0.76][j], r1 = f.r * [0.88, 0.78, 0.66][j];
      phalanx(a, b, r0, r1, j, (t) => t < 0.22 ? [j ? BI[`f${i}${j - 1}`] : BI.wrist, BI[`f${i}${j}`], 0.5 + t / 0.44] : [BI[`f${i}${j}`], BI[`f${i}${j}`], 0], j === 2);
    }
  });
  // ---- the thumb: metacarpal buried in the thenar pad, then two thick phalanges
  {
    const P0 = W('t0'), P1 = W('t1'), P2 = W('t2');
    phalanx(P0, P1, 0.0135, 0.0115, 0, (t) => t < 0.4 ? [BI.wrist, BI.t0, t / 0.4] : [BI.t0, BI.t0, 0], false);
    phalanx(P1, P2, 0.0112, 0.0102, 1, (t) => t < 0.22 ? [BI.t0, BI.t1, 0.5 + t / 0.44] : [BI.t1, BI.t1, 0], false);
    phalanx(P2, thumbTip, 0.0102, 0.0088, 2, (t) => t < 0.22 ? [BI.t1, BI.t2, 0.5 + t / 0.44] : [BI.t2, BI.t2, 0], true);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  mat.onBeforeCompile = (sh) => { sh.uniforms.uAmb = light; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAmb;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (uAmb * 1.4 + 0.004);'); };
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.frustumCulled = false; root.add(mesh);
  mesh.bind(new THREE.Skeleton(bones));
  const rest = Object.fromEntries(bones.map((b) => [b.name, b.quaternion.clone()]));
  const hand = { root, mesh, B, S, side, rest,
    // curl: index (trigger), rest of the fingers (grip), thumb; 0 open .. 1 fist
    pose(index, grip, thumb = 0.5, spread = 0) {
      const bend = (n, a, sideways = 0) => { B[n].rotation.set(sideways, 0, -a * S); };
      FINGERS.forEach((f, i) => { const c = i === 0 ? index : grip; const sp = (i - 1.5) * 0.09 * spread; bend(`f${i}0`, 0.15 + c * 1.35, sp); bend(`f${i}1`, 0.1 + c * 1.45); bend(`f${i}2`, 0.05 + c * 0.9); });
      B.t0.rotation.set(-0.1 - thumb * 0.25, (0.35 + thumb * 0.5) * S, 0); B.t1.rotation.set(0, (0.15 + thumb * 0.5) * S, 0); B.t2.rotation.set(0, (0.2 + thumb * 0.65) * S, 0);
    },
  };
  hand.pose(0.4, 0.6);
  return hand;
}

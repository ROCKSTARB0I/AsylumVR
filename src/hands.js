// Hands: the reporter's own hands. One skinned mesh per hand: a palm,
// three-jointed fingers and a thumb grown from tapered rings, knuckles,
// nails, the cuff of a shirt and the sleeve of a waxed canvas jacket.
// Built in WebXR grip space (origin in the curled fingers, -Z along the
// handle toward the thumb, +Y back along the forearm, palm facing -X on
// the right hand and +X on the left), so it sits on the controller as is.
import * as THREE from '../vendor/three.module.js';
import { fbm } from './surfaces.js?v=3';

const V = THREE.Vector3;
const FINGERS = [   // z along the handle (index nearest the thumb), length of the three bones, base radius
  { z: -0.026, L: [0.05, 0.03, 0.024], r: 0.0092 },
  { z: -0.008, L: [0.055, 0.034, 0.025], r: 0.0095 },
  { z: 0.01, L: [0.052, 0.032, 0.024], r: 0.009 },
  { z: 0.026, L: [0.042, 0.025, 0.021], r: 0.008 },
];

export function makeHand(side, light) {
  const S = side === 'right' ? 1 : -1;    // mirror on X for the left hand
  const bones = []; const B = {};
  const bone = (name, parent, pos) => { const b = new THREE.Bone(); b.name = name; b.position.copy(pos); (parent || null) && parent.add(b); bones.push(b); B[name] = b; return b; };
  // skeleton: forearm -> wrist -> palm -> fingers; the knuckles sit toward the back of the hand (+X*S)
  const wristP = new V(0.006 * S, 0.068, 0.0);
  const fore = bone('fore', null, new V(0.006 * S, 0.3, 0));
  const wrist = bone('wrist', fore, new V().subVectors(wristP, fore.position));
  const knuck = (f) => new V(0.016 * S, -0.012, f.z);
  FINGERS.forEach((f, i) => {
    let parent = wrist, at = wristP.clone();
    const k = knuck(f); let p = bone(`f${i}0`, parent, new V().subVectors(k, at)); at = k;
    let y = k.y; for (let j = 1; j < 3; j++) { y -= f.L[j - 1]; const np = new V(k.x, y, k.z); p = bone(`f${i}${j}`, p, new V().subVectors(np, at)); at = np; }
  });
  const tb = new V(-0.012 * S, 0.035, -0.03);
  let tp = bone('t0', wrist, new V().subVectors(tb, wristP)); let tat = tb;
  for (const [j, d] of [[1, new V(-0.006 * S, -0.02, -0.03)], [2, new V(-0.003 * S, -0.012, -0.026)]]) { const np = tat.clone().add(d); tp = bone('t' + j, tp, new V().subVectors(np, tat)); tat = np; }
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
      c = skin.clone(); const n = fbm(p.x * 90, p.y * 90 + p.z * 70, 7, 4, 64); c.multiplyScalar(0.84 + n * 0.25); c.r *= 1.03;
      const back = Math.cos(ang) * S > 0.3;   // the back of the hand / fingers
      if (kind === 'finger' && t > 0.98 && back) c.lerp(new THREE.Color(0.8, 0.68, 0.62), 0.6);                    // nails
      if (kind === 'finger' && back && (t < 0.08)) c.lerp(new THREE.Color(0.6, 0.38, 0.33), 0.35);                  // reddened knuckles
      if (kind === 'palm' && back) { const v = Math.abs(Math.sin(p.z * 220 + p.y * 40)); if (v < 0.06) c.lerp(new THREE.Color(0.45, 0.42, 0.55), 0.3); }   // veins and tendons
      if (fbm(p.x * 40 + 9, p.y * 40, 11, 3, 64) > 0.66) c.lerp(new THREE.Color(0.25, 0.18, 0.12), 0.35);          // grime from the place
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
  // wrist and palm: flattened, wider across the knuckles, thicker at the heel of the hand
  tube(wristP.clone().add(new V(0, 0.018, 0)), new V(0.012 * S, -0.006, 0), 10, 20, (t, ang) => {
    const w = 0.024 + t * 0.016, th = 0.016 - t * 0.004 + (Math.cos(ang) * S < 0 ? 0.004 * Math.sin(t * Math.PI) : 0); return [th, w];
  }, (t) => t < 0.35 ? [BI.fore, BI.wrist, Math.min(1, t / 0.35)] : [BI.wrist, BI.wrist, 0], 'palm', false, true);
  // fingers
  FINGERS.forEach((f, i) => {
    for (let j = 0; j < 3; j++) {
      const a = W(`f${i}${j}`), b = j < 2 ? W(`f${i}${j + 1}`) : a.clone().add(new V(0, -f.L[2], 0));
      const r0 = f.r * (1 - j * 0.12), r1 = f.r * (1 - (j + 1) * 0.12) * (j === 2 ? 0.85 : 1);
      const aa = a.clone().add(new V(0, 0.006, 0));
      tube(aa, b, 5, 10, (t) => { const r = r0 + (r1 - r0) * t; return [r * 0.92, r]; }, (t) => t < 0.25 && j > 0 ? [BI[`f${i}${j - 1}`], BI[`f${i}${j}`], 0.5 + t * 2] : t < 0.25 ? [BI.wrist, BI[`f${i}0`], 0.5 + t * 2] : [BI[`f${i}${j}`], BI[`f${i}${j}`], 0], 'finger', false, j === 2);
    }
  });
  // thumb
  for (let j = 0; j < 3; j++) {
    const a = W('t' + j), b = j < 2 ? W('t' + (j + 1)) : a.clone().add(new V(-0.002 * S, -0.008, -0.02));
    const r = [0.013, 0.011, 0.0098][j];
    tube(a, b, 5, 10, (t) => [r * (1 - t * 0.12), r * (1 - t * 0.12) * 1.05], (t) => t < 0.3 ? [j ? BI['t' + (j - 1)] : BI.wrist, BI['t' + j], 0.5 + t] : [BI['t' + j], BI['t' + j], 0], 'finger', false, j === 2);
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
      const bend = (n, a, sideways = 0) => { B[n].rotation.set(0, sideways, -a * S); };
      FINGERS.forEach((f, i) => { const c = i === 0 ? index : grip; const sp = (i - 1.5) * 0.06 * spread * S; bend(`f${i}0`, 0.15 + c * 1.35, sp); bend(`f${i}1`, 0.1 + c * 1.45); bend(`f${i}2`, 0.05 + c * 0.9); });
      B.t0.rotation.set(-0.15 - thumb * 0.25, (0.25 + thumb * 0.55) * S, 0); B.t1.rotation.set(0, thumb * 0.55 * S, 0); B.t2.rotation.set(0, thumb * 0.7 * S, 0);
    },
  };
  hand.pose(0.4, 0.6);
  return hand;
}

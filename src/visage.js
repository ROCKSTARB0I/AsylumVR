// Visage: faces. A head is a dense sphere shaped into a skull and jaw,
// then the face is sculpted by a depth map painted on a canvas (sockets,
// brow, nose, cheekbones, folds, lips, chin) and coloured by a painted
// face texture (brows, lids, lips, stubble, pores, veins, and whatever was
// done to this person: stitches, a gouged eye, a cut smile, burns,
// bandages, a missing nose, a surgical mask). Both maps share a front
// projection; the rest of the head keeps procedural vertex colour.
import * as THREE from '../vendor/three.module.js';
import { picture, keepPicture } from './keep.js?v=28';
import { rng, fbm } from './surfaces.js?v=28';

const V = THREE.Vector3;
const D = 256, T = 512;     // depth map and face texture sizes

// face space: fx, fy in [-1, 1], +fy up; canvas px = (fx * 0.5 + 0.5) * size
function painter(size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
  const X = (fx) => (fx * 0.5 + 0.5) * size, Y = (fy) => (0.5 - fy * 0.5) * size, L = (l) => l * 0.5 * size;
  return { cv, c, X, Y, L, size };
}
function blob(P, fx, fy, rx, ry, color, blur = 0, rot = 0) {
  const { c, X, Y, L } = P; c.save(); c.filter = blur ? `blur(${blur}px)` : 'none'; c.fillStyle = color; c.beginPath(); c.ellipse(X(fx), Y(fy), Math.max(0.5, L(rx)), Math.max(0.5, L(ry)), rot, 0, Math.PI * 2); c.fill(); c.restore();
}
function stroke(P, pts, w, color, blur = 0) {
  const { c, X, Y, L } = P; c.save(); c.filter = blur ? `blur(${blur}px)` : 'none'; c.strokeStyle = color; c.lineWidth = Math.max(0.5, L(w)); c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); c.restore();
}
const g = (v) => `rgb(${v},${v},${v})`;

function depthMap(r, R) {
  const P = painter(D); const { c } = P; c.fillStyle = g(128); c.fillRect(0, 0, D, D);
  const lean = r.lean, gaunt = r.face === 'gaunt' || lean > 0.8;
  blob(P, 0, 0.2, 0.62, 0.1, g(150), 7);                                         // brow ridge
  blob(P, 0, 0.5, 0.6, 0.25, g(138), 12);                                        // forehead
  for (const s of [-1, 1]) {
    blob(P, s * 0.36, 0.05, 0.2, 0.13, g(gaunt ? 70 : 88), 6);                  // eye sockets
    blob(P, s * 0.36, 0.04, 0.13, 0.075, g(118), 3);                             // the lids over the eye
    blob(P, s * 0.33, -0.06, 0.15, 0.05, g(gaunt ? 108 : 122), 4);               // bags under
    blob(P, s * 0.52, -0.12, 0.16, 0.11, g(152), 7);                             // cheekbones
    blob(P, s * 0.44, -0.38, 0.16, 0.16, g(gaunt ? 88 : 118), 10);               // hollow cheeks
    stroke(P, [[s * 0.14, -0.2], [s * 0.24, -0.36], [s * 0.26, -0.5]], 0.035, g(110), 3);   // nasolabial folds
  }
  if (r.face !== 'noseless') {
    stroke(P, [[0, 0.1], [0, -0.05], [0, -0.2]], 0.1, g(178), 4);                // bridge
    blob(P, 0, -0.24, 0.1, 0.075, g(214), 4);                                    // tip
    for (const s of [-1, 1]) { blob(P, s * 0.1, -0.27, 0.07, 0.05, g(176), 3); blob(P, s * 0.06, -0.31, 0.03, 0.02, g(110), 1); }   // wings, nostrils
  } else {
    blob(P, 0, -0.2, 0.12, 0.13, g(82), 4); blob(P, -0.04, -0.24, 0.04, 0.05, g(50), 2); blob(P, 0.05, -0.24, 0.04, 0.05, g(52), 2);
  }
  stroke(P, [[0, -0.33], [0, -0.42]], 0.05, g(118), 2);                          // philtrum
  blob(P, 0, -0.45, 0.26, 0.05, g(158), 3);                                      // upper lip
  stroke(P, [[-0.25, -0.505], [0, -0.495], [0.25, -0.505]], 0.022, r.face === 'sewn' ? g(112) : g(78), 1.5);   // mouth line
  blob(P, 0, -0.56, 0.23, 0.05, g(156), 3);                                      // lower lip
  blob(P, 0, -0.66, 0.2, 0.05, g(116), 4);                                       // under the lip
  blob(P, 0, -0.8, 0.22, 0.12, g(160), 8);                                       // chin
  if (r.face === 'gouged') blob(P, 0.36, 0.05, 0.14, 0.1, g(30), 3);
  if (r.face === 'smile' || r.smile) for (const s of [-1, 1]) stroke(P, [[s * 0.24, -0.5], [s * 0.4, -0.38], [s * 0.55, -0.24]], 0.03, g(80), 1);
  if (r.face === 'burned') { const R2 = rng(r.seed || 3); for (let i = 0; i < 40; i++) blob(P, 0.1 + R2() * 0.7, -0.8 + R2() * 1.4, 0.04 + R2() * 0.1, 0.03 + R2() * 0.08, g(110 + R2() * 40), 3); }
  if (r.muscle) { blob(P, 0, 0.22, 0.6, 0.12, g(160), 6); for (const s of [-1, 1]) blob(P, s * 0.62, -0.55, 0.2, 0.25, g(146), 10); }   // heavy brow and jaw
  const img = c.getImageData(0, 0, D, D).data; const out = new Float32Array(D * D);
  for (let i = 0; i < D * D; i++) out[i] = (img[i * 4] - 128) / 128;
  return out;
}

function faceTexture(r, R, skinHex) {
  const P = painter(T); const { c, cv } = P;
  // skin base with a soft oval alpha so it blends into the vertex-coloured head
  const grd = c.createRadialGradient(P.X(0), P.Y(-0.1), P.L(0.55), P.X(0), P.Y(-0.1), P.L(1.0));
  grd.addColorStop(0, skinHex); grd.addColorStop(1, skinHex.replace('rgb', 'rgba').replace(')', ',0)'));
  c.fillStyle = grd; c.fillRect(0, 0, T, T);
  c.globalCompositeOperation = 'source-atop';
  // pores and mottling
  const id = c.getImageData(0, 0, T, T); const d = id.data; const sd = (r.seed || 1) * 3.1;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (y * T + x) * 4; if (!d[i + 3]) continue;
    const n = fbm(x / 40 + sd, y / 40, 7, 4, 64), pore = fbm(x / 3, y / 3, 9, 2, 256);
    const k = 0.84 + n * 0.26 + (pore - 0.5) * 0.1; d[i] *= k * (1 + (n - 0.5) * 0.12); d[i + 1] *= k; d[i + 2] *= k;
  }
  c.putImageData(id, 0, 0);
  const rgba = (rr, gg, bb, a) => `rgba(${rr},${gg},${bb},${a})`;
  for (const s of [-1, 1]) {
    if (r.healthy) {                                                                // someone who sleeps at night: soft shadow, a lid line
      blob(P, s * 0.36, 0.04, 0.2, 0.12, rgba(95, 62, 55, 0.22), 10); blob(P, s * 0.36, 0.045, 0.12, 0.05, rgba(60, 35, 30, 0.45), 2);
    } else {
    blob(P, s * 0.36, 0.04, 0.24, 0.17, rgba(28, 12, 18, 0.8), 12);               // sunken, bruised, sleepless sockets
    blob(P, s * 0.34, -0.07, 0.17, 0.06, rgba(70, 25, 45, 0.6), 6);                // dark bags
    blob(P, s * 0.36, 0.045, 0.13, 0.065, rgba(25, 8, 8, 0.85), 2);                // lid crease shadow
    blob(P, s * 0.36, 0.0, 0.1, 0.035, rgba(140, 30, 30, 0.55), 3);               // raw red rims
    }
    if (r.face !== 'burned' || s < 0) for (let k = 0; k < 26; k++) {                // brows, hair by hair
      const t = k / 25; const x0 = s * (0.18 + t * 0.32), y0 = 0.2 + Math.sin(t * Math.PI) * 0.04 - t * 0.02;
      stroke(P, [[x0, y0 - 0.02], [x0 + s * 0.04, y0 + 0.015]], 0.012, rgba(30, 22, 16, 0.7), 0.5);
    }
    blob(P, s * 0.5, -0.15, 0.14, 0.1, rgba(150, 60, 60, 0.12), 10);             // a flush on the cheeks
  }
  blob(P, 0, -0.5, 0.26, 0.09, r.female ? rgba(150, 52, 58, 0.75) : rgba(110, 50, 50, 0.55), 3);                      // lips
  if (r.female) for (const s of [-1, 1]) { stroke(P, [[s * 0.22, 0.06], [s * 0.36, 0.1], [s * 0.5, 0.07]], 0.018, rgba(25, 15, 15, 0.85), 0.6); blob(P, s * 0.48, -0.17, 0.13, 0.08, rgba(190, 90, 90, 0.18), 10); }   // lashes, a little blush
  stroke(P, [[-0.25, -0.505], [0, -0.495], [0.25, -0.505]], 0.02, rgba(30, 8, 8, 0.9), 1);
  blob(P, 0, -0.24, 0.1, 0.07, rgba(140, 60, 55, 0.18), 5);                      // nose tip, slightly red
  // stubble on the jaw and lip
  if (!r.dead && r.face !== 'masked' && !r.female) {
    const R3 = rng(r.seed * 7 + 1); c.fillStyle = 'rgba(30,24,20,0.35)';
    for (let i = 0; i < 2600; i++) { const fx = (R3() - 0.5) * 1.5, fy = -0.3 - R3() * 0.7; if (Math.hypot(fx / 0.75, (fy + 0.6) / 0.5) > 1 || Math.abs(fy + 0.5) < 0.06 && Math.abs(fx) < 0.26) continue; c.fillRect(P.X(fx), P.Y(fy), 1.2, 1.2); }
  }
  // filth, scabs and old blood ground into the skin
  if (!r.healthy) for (let i = 0; i < 26; i++) blob(P, (R() - 0.5) * 1.6, (R() - 0.5) * 1.8, 0.03 + R() * 0.12, 0.02 + R() * 0.1, R() > 0.6 ? rgba(60, 10, 8, 0.35) : rgba(40, 30, 18, 0.3), 4, R() * 3);
  if (!r.healthy) for (let i = 0; i < 12; i++) blob(P, (R() - 0.5) * 1.4, (R() - 0.5) * 1.6, 0.012 + R() * 0.02, 0.012 + R() * 0.02, rgba(90, 20, 15, 0.8), 1);
  // forehead creases, veins at the temples on starved faces
  for (let i = 0; i < 3; i++) stroke(P, [[-0.4, 0.4 + i * 0.08], [0, 0.42 + i * 0.08], [0.4, 0.4 + i * 0.08]], 0.008, 'rgba(70,40,35,0.35)', 1);
  if (r.lean > 0.6) for (const s of [-1, 1]) stroke(P, [[s * 0.62, 0.35], [s * 0.58, 0.2], [s * 0.65, 0.1]], 0.012, 'rgba(70,80,110,0.4)', 1);
  if (r.dead) { c.fillStyle = 'rgba(110,120,100,0.35)'; c.fillRect(0, 0, T, T); }
  // what was done to them
  const blood = (a = 0.9) => rgba(70 + R() * 20 | 0, 4, 3, a);
  const drips = (fx, fy, n, len) => { for (let i = 0; i < n; i++) { const x = fx + (R() - 0.5) * 0.15; stroke(P, [[x, fy], [x + (R() - 0.5) * 0.02, fy - len * (0.4 + R())]], 0.012 + R() * 0.012, blood(0.85), 0.5); } };
  if (r.smile && r.face !== 'smile') for (const s of [-1, 1]) { stroke(P, [[s * 0.24, -0.5], [s * 0.42, -0.36], [s * 0.6, -0.2]], 0.03, 'rgba(60,5,5,1)', 0.5); stroke(P, [[s * 0.24, -0.5], [s * 0.42, -0.36], [s * 0.6, -0.2]], 0.07, blood(0.45), 4); for (let i = 0; i < 5; i++) { const x = s * (0.3 + i * 0.05); stroke(P, [[x, -0.45 + i * 0.03], [x, -0.5 + i * 0.03]], 0.012, 'rgba(200,180,140,0.9)', 0); } drips(s * 0.4, -0.42, 3, 0.4); }
  switch (r.face) {
    case 'sewn':
      for (let i = 0; i < 9; i++) { const x = -0.22 + i * 0.055; stroke(P, [[x - 0.015, -0.45], [x + 0.015, -0.56]], 0.012, 'rgba(20,12,8,0.95)', 0); blob(P, x - 0.015, -0.45, 0.012, 0.012, blood(0.7), 1); blob(P, x + 0.015, -0.56, 0.012, 0.012, blood(0.7), 1); }
      drips(0, -0.56, 4, 0.2); break;
    case 'gouged':
      blob(P, 0.36, 0.05, 0.14, 0.11, 'rgba(25,0,0,0.95)', 3); blob(P, 0.36, 0.04, 0.17, 0.14, blood(0.6), 6); drips(0.36, -0.02, 6, 0.5); break;
    case 'smile':
      for (const s of [-1, 1]) { stroke(P, [[s * 0.24, -0.5], [s * 0.4, -0.38], [s * 0.55, -0.24]], 0.025, 'rgba(60,5,5,1)', 0.5); stroke(P, [[s * 0.24, -0.5], [s * 0.4, -0.38], [s * 0.55, -0.24]], 0.05, blood(0.4), 3); drips(s * 0.4, -0.4, 3, 0.35); } break;
    case 'burned':
      for (let i = 0; i < 60; i++) blob(P, 0.05 + R() * 0.75, -0.85 + R() * 1.5, 0.03 + R() * 0.12, 0.02 + R() * 0.09, R() > 0.5 ? 'rgba(150,60,50,0.6)' : 'rgba(80,35,25,0.6)', 2, R() * 3);
      for (let i = 0; i < 30; i++) blob(P, 0.1 + R() * 0.6, -0.7 + R() * 1.2, 0.01 + R() * 0.03, 0.01 + R() * 0.03, 'rgba(225,190,170,0.6)', 1); break;
    case 'bandaged':
      for (let i = 0; i < 7; i++) { const y = 0.6 - i * 0.16; c.save(); c.fillStyle = `rgba(${170 + R() * 20 | 0},${160 + R() * 20 | 0},${130 + R() * 15 | 0},1)`; c.translate(P.X(0), P.Y(y)); c.rotate((R() - 0.5) * 0.3); c.fillRect(-P.L(1), -P.L(0.07), P.L(2), P.L(0.15)); c.restore(); }
      blob(P, -0.36, 0.05, 0.12, 0.1, blood(0.75), 8); drips(-0.36, -0.02, 4, 0.4); blob(P, 0.1, -0.5, 0.2, 0.08, rgba(120, 90, 40, 0.5), 6); break;
    case 'noseless':
      blob(P, 0, -0.2, 0.12, 0.13, 'rgba(70,10,8,0.95)', 3); blob(P, -0.04, -0.24, 0.035, 0.045, 'rgba(10,0,0,1)', 1); blob(P, 0.05, -0.24, 0.035, 0.045, 'rgba(10,0,0,1)', 1);
      stroke(P, [[-0.5, 0.45], [-0.3, 0.1], [-0.35, -0.25]], 0.03, 'rgba(160,100,95,0.8)', 1); stroke(P, [[0.2, 0.55], [0.45, 0.1]], 0.025, 'rgba(160,100,95,0.7)', 1); break;
    case 'masked':
      c.save(); c.fillStyle = 'rgba(150,165,155,1)'; c.beginPath(); c.moveTo(P.X(-0.7), P.Y(-0.1)); c.quadraticCurveTo(P.X(0), P.Y(-0.02), P.X(0.7), P.Y(-0.1)); c.lineTo(P.X(0.6), P.Y(-0.75)); c.quadraticCurveTo(P.X(0), P.Y(-0.95), P.X(-0.6), P.Y(-0.75)); c.closePath(); c.fill(); c.restore();
      for (let i = 0; i < 3; i++) stroke(P, [[-0.55, -0.25 - i * 0.15], [0.55, -0.25 - i * 0.15]], 0.006, 'rgba(90,100,95,0.6)', 0.5);
      blob(P, 0.1, -0.5, 0.25, 0.18, blood(0.45), 8); blob(P, -0.2, -0.65, 0.1, 0.08, blood(0.6), 4); break;
    case 'lobotomy': for (const s of [-1, 1]) blob(P, s * 0.36, 0.04, 0.2, 0.15, 'rgba(60,20,40,0.5)', 8); break;
    case 'dead': blob(P, 0, -0.5, 0.2, 0.05, 'rgba(40,20,30,0.6)', 3); break;
  }
  // hair: the face texture covers the front of the scalp, so the hairline is painted here
  if (!r.bald && r.face !== 'masked' && r.face !== 'lobotomy' && r.face !== 'bandaged' && r.face !== 'burned') {
    const hc = r.hair || [0.09, 0.075, 0.06]; const hr = (a) => `rgba(${hc[0] * 255 | 0},${hc[1] * 255 | 0},${hc[2] * 255 | 0},${a})`;
    blob(P, 0, 0.98, 1.2, 0.42, hr(1), 5);                                          // over the top, down to the hairline
    blob(P, r.female ? -0.25 : 0.1, 0.6, 0.5, 0.1, hr(0.9), 4);                   // a softer edge, parted to one side
    if (r.female) for (const s of [-1, 1]) { blob(P, s * 0.86, 0.25, 0.2, 0.55, hr(0.95), 6); blob(P, s * 0.72, 0.55, 0.22, 0.25, hr(0.9), 5); }   // framing the face
    const R4 = rng((r.seed || 1) * 13 + 2); for (let i = 0; i < 160; i++) { const x = (R4() - 0.5) * 1.6, y = 0.62 + R4() * 0.4; stroke(P, [[x, y], [x + (R4() - 0.5) * 0.06, y - 0.07]], 0.008, `rgba(255,240,220,${0.05 + R4() * 0.06})`, 0); }   // strands catching the light
  }
  c.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function buildVisage({ r, seed, c0, HS, skinFn, BIhead, BIjaw, bald }) {
  const R = rng(seed * 31 + 5); r.seed = seed;
  const depth = depthMap(r, R);
  const sk = r.skin; const skinHex = `rgb(${Math.round(sk[0] * 220)},${Math.round(sk[1] * 220)},${Math.round(sk[2] * 220)})`;
  // the painted face is kept after the first run (nothing after this draws from R, so skipping it changes nothing)
  const fkey = 'face:' + seed + ':' + JSON.stringify(r); const kept = picture(fkey); let tex;
  if (kept) { tex = new THREE.CanvasTexture(kept); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }
  else { tex = faceTexture(r, R, skinHex); keepPicture(fkey, tex.image); }
  const sampleD = (fx, fy) => { const x = Math.max(0, Math.min(D - 1.001, (fx * 0.5 + 0.5) * D)), y = Math.max(0, Math.min(D - 1.001, (0.5 - fy * 0.5) * D)); const xi = x | 0, yi = y | 0, tx = x - xi, ty = y - yi; const a = depth[yi * D + xi], b = depth[yi * D + xi + 1], c = depth[(yi + 1) * D + xi], d = depth[(yi + 1) * D + xi + 1]; return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; };
  const SX = 0.079, SY = 0.112, SZ = 0.097;
  const segW = 64, segH = 48;
  const pos = [], col = [], uv = [], front = [], si = [], sw = [], idx = [];
  for (let i = 0; i <= segH; i++) {
    const th = i / segH * Math.PI;
    for (let j = 0; j <= segW; j++) {
      const ph = j / segW * Math.PI * 2;
      const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
      // skull and jaw
      let sx = SX, sy = SY, sz = SZ; const lower = Math.max(0, -y);
      sx *= 1 - lower * lower * 0.3 * (r.muscle ? 0.5 : 1);
      if (y > 0.2) sx *= 1 + (y - 0.2) * 0.05;
      if (z < -0.2) sz *= 1.06;
      if (lower > 0.55 && z < 0.3) sz *= 1 - (lower - 0.55) * 0.6;          // the jaw tucks under at the back
      let px = x * sx, py = y * sy, pz = z * sz;
      // ears
      for (const e of [-1, 1]) { const dd = Math.hypot(x - e, (y + 0.02) / 1.4, z + 0.05); if (dd < 0.35) px += e * 0.014 * Math.cos(dd / 0.35 * Math.PI / 2) ** 2; }
      // the face, from the depth map
      const fx = px / SX, fy = py / SY; const zf = Math.max(0, z);
      const fw = smooth(0.15, 0.6, zf) * (1 - smooth(0.85, 1.05, Math.hypot(fx / 0.95, (fy + 0.1) / 1.0)));
      pz += sampleD(fx, fy) * 0.024 * fw;
      if (r.face === 'lobotomy') { const seam = Math.abs(y - 0.72); if (seam < 0.05) { px *= 0.985; py -= 0.003; pz *= 0.985; } }
      const p = new V(px * HS, py * HS, pz * HS).add(c0);
      const vc = skinFn(p, new V(x, y, z), x, y, z, ph, bald);
      const lc = vc.clone().convertSRGBToLinear();
      pos.push(p.x, p.y, p.z); col.push(lc.r, lc.g, lc.b);
      uv.push(fx * 0.5 + 0.5, fy * 0.5 + 0.5); front.push(smooth(0.05, 0.45, zf));
      const jw = y < -0.42 && fy < -0.5 ? Math.min(1, (-0.5 - fy) * 6) * smooth(-0.2, 0.3, z) : 0;
      si.push(BIhead, BIjaw, 0, 0); sw.push(1 - jw, jw, 0, 0);
    }
  }
  for (let i = 0; i < segH; i++) for (let j = 0; j < segW; j++) { const a = i * (segW + 1) + j, b = a + segW + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('front', new THREE.Float32BufferAttribute(front, 1)); geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx); geo.computeVertexNormals();
  // eye centres sit in the sculpted sockets
  const eyes = [-1, 1].map((e) => { const fx = e * 0.36, fy = 0.05; const zz = Math.sqrt(Math.max(0, 1 - fx * fx * 0.55 - fy * fy)) * SZ + sampleD(fx, fy) * 0.024 - 0.006; return new V(fx * SX * HS, fy * SY * HS, zz * HS).add(c0); });
  const mouth = new V(0, -0.5 * SY * HS, SZ * 0.55 * HS).add(c0);
  return { geo, tex, eyes, mouth };
}
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// the head material: vertex colour everywhere, the painted face blended over the front
export function headMaterial(tex, uAmb, upU) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.55 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAmb = uAmb; sh.uniforms.uUp = upU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float front; varying float vFront;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFront = front;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAmb; uniform vec3 uUp; varying float vFront;')
      .replace('#include <map_fragment>', 'vec4 faceTex = texture2D(map, vMapUv);')
      .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(vColor, faceTex.rgb, faceTex.a * vFront);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float top = dot(normal, uUp);
        totalEmissiveRadiance += diffuseColor.rgb * uAmb * (0.5 + 0.5 * top) * 1.3;
        totalEmissiveRadiance += uAmb * pow(clamp(top, 0.0, 1.0), 6.0) * 0.3;`);
  };
  return m;
}

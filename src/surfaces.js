// Procedural surfaces: every texture in the asylum is painted here on
// canvases at load time (tile, plaster, linoleum, concrete, rust, blood,
// mattress stains, scrawl), with a matching normal map from its height.
import * as THREE from '../vendor/three.module.js';
import { picture, keepPicture, keptData, keepData } from './keep.js?v=37';

// ---------------------------------------------------------------- noise
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s, p) {   // tileable value noise with period p
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const m = (v) => ((v % p) + p) % p;
  const a = hash(m(xi), m(yi), s), b = hash(m(xi + 1), m(yi), s), c = hash(m(xi), m(yi + 1), s), d = hash(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x, y, s, oct = 5, p = 8) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, s + i * 17, p * f); a *= 0.5; f *= 2; } return v; }
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

// a paint buffer: colour + height + roughness, then turned into textures
class Paint {
  constructor(w, h = w) { this.w = w; this.h = h; this.c = new Float32Array(w * h * 3); this.z = new Float32Array(w * h); this.r = new Float32Array(w * h).fill(0.8); }
  each(fn) { const { w, h } = this; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fn(x, y, y * w + x); }
  set(i, r, g, b) { this.c[i * 3] = r; this.c[i * 3 + 1] = g; this.c[i * 3 + 2] = b; }
  mul(i, k) { this.c[i * 3] *= k; this.c[i * 3 + 1] *= k; this.c[i * 3 + 2] *= k; }
  mix(i, r, g, b, t) { const c = this.c; c[i * 3] += (r - c[i * 3]) * t; c[i * 3 + 1] += (g - c[i * 3 + 1]) * t; c[i * 3 + 2] += (b - c[i * 3 + 2]) * t; }
  // grime that pools low on walls and in streaks under the ceiling
  grime(seed, amt = 1, wall = false) {
    if (CLEAN) amt *= 0.12;
    this.each((x, y, i) => {
      const u = x / this.w, v = y / this.h;
      const n = fbm(u * 6, v * 6, seed, 5, 6);
      const streak = wall ? fbm(u * 40, v * 1.5, seed + 9, 3, 40) : 0;
      let k = Math.max(0, n - 0.42) * 1.6 * amt;
      if (wall) k += (Math.pow(v, 6) * 0.9 + Math.max(0, streak - 0.55) * 1.5 * (1 - v * 0.6)) * amt;   // floor line + drip streaks
      this.mix(i, 0.11, 0.09, 0.05, Math.min(0.85, k));
      this.r[i] = Math.min(1, this.r[i] + k * 0.1);
    });
  }
  canvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const cx = cv.getContext('2d'); const im = cx.createImageData(this.w, this.h); const d = im.data;
    for (let i = 0; i < this.w * this.h; i++) {
      d[i * 4] = Math.max(0, Math.min(255, this.c[i * 3] * 255)); d[i * 4 + 1] = Math.max(0, Math.min(255, this.c[i * 3 + 1] * 255)); d[i * 4 + 2] = Math.max(0, Math.min(255, this.c[i * 3 + 2] * 255)); d[i * 4 + 3] = 255;
    }
    cx.putImageData(im, 0, 0); return cv;
  }
  normal(strength = 2) {
    const { w, h, z } = this; const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); const im = cx.createImageData(w, h); const d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const l = z[y * w + ((x - 1 + w) % w)], r = z[y * w + (x + 1) % w], u = z[((y - 1 + h) % h) * w + x], dn = z[((y + 1) % h) * w + x];
      let nx = (l - r) * strength, ny = (u - dn) * strength, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
      const i = (y * w + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    cx.putImageData(im, 0, 0); return cv;
  }
  rough() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const cx = cv.getContext('2d'); const im = cx.createImageData(this.w, this.h); const d = im.data;
    for (let i = 0; i < this.w * this.h; i++) { const v = Math.max(0, Math.min(255, this.r[i] * 255)); d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    cx.putImageData(im, 0, 0); return cv;
  }
}

function tex(cv, srgb = true, rep = true) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4; t.needsUpdate = true; return t;
}
function set(p, nStr = 2) { return { map: tex(p.canvas()), normalMap: tex(p.normal(nStr), false), roughnessMap: tex(p.rough(), false) }; }

// tiles in a grid: returns per-pixel {tile id, inside mask, edge distance}
function tiles(p, nx, ny, grout, cb) {
  const tw = p.w / nx, th = p.h / ny;
  p.each((x, y, i) => {
    const tx = Math.floor(x / tw), ty = Math.floor(y / th);
    const fx = (x % tw) / tw, fy = (y % th) / th;
    const e = Math.min(fx, 1 - fx, fy * th / tw, (1 - fy) * th / tw) * tw;
    cb(x, y, i, tx, ty, e < grout ? 0 : Math.min(1, (e - grout) / 2), hash(tx, ty, 77));
  });
}

// ---------------------------------------------------------------- the set
// Wall textures span 3 m horizontally and the full 3.2 m ceiling height.
export const T = {};
// Tape 3 is four years before the others: fresh paint, whole tiles, mopped floors
let CLEAN = false;
export function buildSurfaces(clean = false) {
  CLEAN = clean; const K = clean ? 'texc:' : 'tex:';
  // kept from an earlier run: no painting at all
  const names = keptData('texNames');
  if (names && names.every((n) => picture(K + n + ':map')) && picture('tex:decals')) {
    for (const n of names) T[n] = { map: tex(picture(K + n + ':map')), normalMap: tex(picture(K + n + ':normalMap'), false), roughnessMap: tex(picture(K + n + ':roughnessMap'), false) };
    const t = new THREE.CanvasTexture(picture('tex:decals')); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; T.decals = { tex: t, cells: keptData('decalCells') };
    return;
  }
  paintSurfaces();
  const list = Object.keys(T).filter((n) => n !== 'decals');
  for (const n of list) for (const k of ['map', 'normalMap', 'roughnessMap']) keepPicture(K + n + ':' + k, T[n][k].image);
  keepPicture('tex:decals', T.decals.tex.image); keepData('decalCells', T.decals.cells); keepData('texNames', list);
}
function paintSurfaces() {
  const S = 512;
  // ward corridor wall: sick green tile to 1.35 m with a dark cap, nicotine cream paint above, peeling
  {
    const p = new Paint(S); const tileTop = 1 - 1.35 / 3.2;
    p.each((x, y, i) => {
      const u = x / S, v = y / S;
      const n = fbm(u * 8, v * 8, 3, 5, 8), peel = fbm(u * 5, v * 5, 11, 5, 5);
      if (v > tileTop) {
        // tiles: 15 cm squares
        const tw = S / 20, tx = Math.floor(x / tw), ty = Math.floor((y - tileTop * S) / tw);
        const fx = (x % tw) / tw, fy = (((y - tileTop * S) % tw) + tw) % tw / tw;
        const e = Math.min(fx, 1 - fx, fy, 1 - fy) * tw; const h = hash(tx, ty, 5);
        const crack = !CLEAN && hash(tx, ty, 9) > 0.86;
        if (e < 1.3) { p.set(i, 0.16, 0.15, 0.11); p.z[i] = 0; p.r[i] = 0.95; }
        else { const k = 0.85 + h * 0.2 + n * 0.1; p.set(i, 0.32 * k, 0.44 * k, 0.36 * k); p.z[i] = 1; p.r[i] = 0.32 + n * 0.25; }
        if (crack && Math.abs((fx - fy) * tw) < 0.8) { p.set(i, 0.1, 0.1, 0.08); p.z[i] = 0.3; }
        if (!CLEAN && h > 0.95 && e > 1.3) { p.set(i, 0.35, 0.33, 0.27); p.z[i] = 0.15; p.r[i] = 0.95; }    // missing tile
        if (v < tileTop + 0.025) { p.set(i, 0.12 + n * 0.05, 0.16, 0.13); p.z[i] = 1.4; p.r[i] = 0.4; }   // the dark cap row
      } else {
        const k = 0.82 + n * 0.25; p.set(i, 0.62 * k, 0.56 * k, 0.4 * k); p.z[i] = 0.6 + n * 0.1; p.r[i] = 0.85;
        if (CLEAN) { /* fresh paint */ } else if (peel > 0.6) { const t = Math.min(1, (peel - 0.6) * 10); p.mix(i, 0.36, 0.34, 0.3, t); p.z[i] -= 0.4 * t; }       // bare plaster under the paint
        else if (peel > 0.57) { p.mul(i, 1.12); p.z[i] += 0.2; }                                                       // curling paint edge
        const stain = fbm(u * 3, v * 2, 21, 4, 3); if (!CLEAN && stain > 0.62) p.mix(i, 0.42, 0.3, 0.12, (stain - 0.62) * 2.2);  // water stains
      }
    });
    p.grime(40, 1.1, true); T.wallWard = set(p, 3);
  }
  // patient cell: scratched, stained plaster, tally marks
  {
    const p = new Paint(S); const R = rng(9);
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 7, v * 7, 33, 5, 7), m = fbm(u * 2, v * 2, 34, 4, 2);
      const k = 0.7 + n * 0.3; p.set(i, 0.6 * k, 0.58 * k, 0.5 * k); p.z[i] = n; p.r[i] = 0.9;
      if (!CLEAN && m > 0.6) p.mix(i, 0.32, 0.28, 0.18, (m - 0.6) * 2);
    });
    // scratches: little gouges and tally groups at hand height
    for (let s = 0; s < (CLEAN ? 0 : 260); s++) {
      const x0 = R() * S, y0 = S * (0.35 + R() * 0.45), len = 4 + R() * 26, a = -1.4 + R() * 0.4;
      for (let t = 0; t < len; t++) { const x = (x0 + Math.cos(a) * t + S) % S | 0, y = Math.min(S - 1, y0 + Math.sin(a) * t * -1) | 0; const i = y * S + x; p.mul(i, 0.55); p.z[i] -= 0.5; }
    }
    p.grime(41, 1.3, true); T.wallCell = set(p, 3);
  }
  // padded cell: quilted canvas cushions with buttons, yellowed, torn, stained
  for (const [key, seed, cols] of [['wallPadded', 300, 8], ['floorPadded', 310, 10]]) {
    const p = new Paint(S);
    p.each((x, y, i) => {
      const u = x / S, v = y / S; const qu = (u * cols) % 1, qv = (v * cols) % 1;
      const d = Math.min(qu, 1 - qu, qv, 1 - qv); const puff = Math.sqrt(Math.min(1, d * 4));
      const n = fbm(u * 8, v * 8, seed, 5, 8); const k = 0.72 + puff * 0.2 + n * 0.12;
      p.set(i, 0.66 * k, 0.62 * k, 0.5 * k); p.z[i] = puff; p.r[i] = 0.9;
      if (d < 0.025) { p.mul(i, 0.6); p.z[i] = 0; }                                          // stitched seams
      const bx = Math.abs(qu - 0.5) + Math.abs(qv - 0.5); if (bx < 0.05) { p.mul(i, 0.45); p.z[i] = 0.2; }   // buttons
      const st = fbm(u * 3, v * 3, seed + 1, 4, 3); if (!CLEAN && st > 0.56) p.mix(i, 0.42, 0.32, 0.12, Math.min(0.75, (st - 0.56) * 3));
      const tear = fbm(u * 14, v * 14, seed + 2, 3, 14); if (!CLEAN && tear > 0.74) { p.mix(i, 0.25, 0.22, 0.16, 0.9); p.z[i] = -0.3; }   // torn open, stuffing showing
      const bl = fbm(u * 5, v * 5, seed + 3, 4, 5); if (!CLEAN && bl > 0.7) p.mix(i, 0.3, 0.03, 0.02, Math.min(0.85, (bl - 0.7) * 5));
    });
    p.grime(seed + 4, key === 'floorPadded' ? 1.3 : 0.9, key === 'wallPadded'); T[key] = set(p, 4);
  }
  // shower / morgue tile: small white tiles, black mould, rust tears
  for (const [key, col, seed] of [['wallShower', [0.78, 0.8, 0.76], 50], ['wallMorgue', [0.58, 0.66, 0.68], 60]]) {
    const p = new Paint(S);
    tiles(p, 32, 32, 1.2, (x, y, i, tx, ty, inside, h) => {
      const u = x / S, v = y / S, n = fbm(u * 8, v * 8, seed, 5, 8);
      if (!inside) { p.set(i, 0.25, 0.24, 0.2); p.z[i] = 0; p.r[i] = 0.95; }
      else { const k = 0.88 + h * 0.12; p.set(i, col[0] * k, col[1] * k, col[2] * k); p.z[i] = 0.8 + inside * 0.2; p.r[i] = 0.18 + n * 0.2; }
      const mould = fbm(u * 10, v * 10, seed + 3, 5, 10) * (0.4 + v);
      if (!CLEAN && mould > 0.72) { p.mix(i, 0.04, 0.05, 0.03, Math.min(1, (mould - 0.72) * 6)); p.r[i] = 0.95; }
      const rust = fbm(u * 60, v * 1.2, seed + 5, 3, 60); if (!CLEAN && rust > 0.66 && v > 0.2) p.mix(i, 0.4, 0.18, 0.05, Math.min(0.8, (rust - 0.66) * 4));
    });
    p.grime(seed + 1, 0.8, true); T[key] = set(p, 2.5);
  }
  // office wood panelling to dado, faded wallpaper above
  {
    const p = new Paint(S); const dado = 1 - 1.0 / 3.2;
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 8, v * 8, 70, 5, 8);
      if (v > dado) { const g = fbm(u * 2, v * 40, 71, 4, 2); const plank = (x % 64) < 2; const k = 0.6 + g * 0.5; p.set(i, 0.32 * k, 0.19 * k, 0.1 * k); p.z[i] = plank ? 0 : 0.8 + g * 0.2; p.r[i] = 0.55; }
      else {
        const stripe = Math.sin(u * Math.PI * 2 * 12) > 0.6 ? 1 : 0; const flower = fbm(u * 24, v * 24, 72, 2, 24) > 0.62 ? 1 : 0;
        p.set(i, 0.5 - stripe * 0.06 - flower * 0.08, 0.46 - stripe * 0.05 - flower * 0.1, 0.34 - stripe * 0.02); p.mul(i, 0.8 + n * 0.3); p.z[i] = 0.5; p.r[i] = 0.9;
        const peel = fbm(u * 4, v * 4, 73, 4, 4); if (!CLEAN && peel > 0.63) { p.mix(i, 0.38, 0.34, 0.28, 0.9); p.z[i] = 0.3; }
      }
    });
    p.grime(74, 1, true); T.wallOffice = set(p, 2.5);
  }
  // raw concrete block for the generator room and storage
  {
    const p = new Paint(S);
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 12, v * 12, 80, 5, 12);
      const bw = S / 8, bh = S / 16, row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0;
      const fx = ((x + off) % bw) / bw, fy = (y % bh) / bh; const mortar = fx < 0.02 || fy < 0.05;
      const k = 0.55 + n * 0.35 + hash(Math.floor((x + off) / bw), row, 81) * 0.1;
      p.set(i, 0.46 * k, 0.45 * k, 0.42 * k); p.z[i] = mortar ? 0.2 : 0.9 + n * 0.1; p.r[i] = 0.92;
      if (mortar) p.mul(i, 0.7);
    });
    p.grime(82, 1.4, true); T.wallBlock = set(p, 3);
  }
  // floors (span 3 m x 3 m)
  {
    const p = new Paint(S);   // ward linoleum: 30 cm checker, cracked, curling
    tiles(p, 10, 10, 0.8, (x, y, i, tx, ty, inside, h) => {
      const u = x / S, v = y / S, n = fbm(u * 10, v * 10, 90, 5, 10);
      const dark = (tx + ty) % 2 === 0; const k = 0.8 + n * 0.3;
      if (dark) p.set(i, 0.2 * k, 0.19 * k, 0.15 * k); else p.set(i, 0.56 * k, 0.53 * k, 0.43 * k);
      p.z[i] = inside ? 0.8 : 0.4; p.r[i] = 0.45 + n * 0.3;
      if (!CLEAN && h > 0.9) { const c = fbm(u * 30, v * 30, 91, 3, 30); if (c > 0.55) { p.mix(i, 0.3, 0.28, 0.24, 0.8); p.z[i] = 0.2; p.r[i] = 0.95; } }
      const wet = fbm(u * 3, v * 3, 92, 4, 3); if (CLEAN) p.r[i] = 0.3; else if (wet > 0.6) { p.r[i] = 0.12; p.mul(i, 0.75); }        // standing damp
    });
    p.grime(93, 1.2); T.floorWard = set(p, 2);
  }
  {
    const p = new Paint(S);   // concrete with oil and drains
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 10, v * 10, 100, 6, 10), b = fbm(u * 3, v * 3, 101, 4, 3);
      const k = 0.5 + n * 0.3; p.set(i, 0.42 * k, 0.41 * k, 0.38 * k); p.z[i] = n; p.r[i] = 0.85;
      if (!CLEAN && b > 0.62) { p.mix(i, 0.06, 0.05, 0.04, (b - 0.62) * 2.5); p.r[i] = 0.3; }
    });
    p.grime(102, 1.4); T.floorConcrete = set(p, 3);
  }
  {
    const p = new Paint(S);   // shower floor: small grey mosaic, slick, brown water lines
    tiles(p, 48, 48, 0.9, (x, y, i, tx, ty, inside, h) => {
      const u = x / S, v = y / S, n = fbm(u * 8, v * 8, 110, 5, 8);
      const k = 0.7 + h * 0.25; if (inside) p.set(i, 0.5 * k, 0.52 * k, 0.5 * k); else p.set(i, 0.16, 0.15, 0.12);
      p.z[i] = inside ? 0.9 : 0.2; p.r[i] = inside ? 0.12 + n * 0.15 : 0.7;
      const w = fbm(u * 4, v * 4, 111, 4, 4); if (!CLEAN && w > 0.55) p.mix(i, 0.25, 0.14, 0.06, Math.min(0.7, (w - 0.55) * 3));
    });
    p.grime(112, 0.9); T.floorShower = set(p, 2);
  }
  {
    const p = new Paint(S);   // office: worn parquet
    p.each((x, y, i) => {
      const u = x / S, v = y / S; const pw = S / 24, row = Math.floor(x / pw); const g = fbm(u * 3, v * 50 + row * 3.3, 120, 4, 3);
      const k = 0.55 + g * 0.5 + hash(row, Math.floor((y + row * 37) / 128), 121) * 0.2; p.set(i, 0.35 * k, 0.21 * k, 0.11 * k);
      p.z[i] = (x % pw) < 1.2 || ((y + row * 37) % 128) < 1.2 ? 0 : 0.8; p.r[i] = 0.6;
      const wear = fbm(u * 2, v * 2, 122, 4, 2); if (!CLEAN && wear > 0.55) p.mix(i, 0.3, 0.25, 0.2, (wear - 0.55) * 1.5);
    });
    p.grime(123, 1); T.floorWood = set(p, 1.5);
  }
  {
    const p = new Paint(S);   // ceiling: 60 cm acoustic tiles, brown water rings, sags, gaps
    tiles(p, 5, 5, 1.6, (x, y, i, tx, ty, inside, h) => {
      const u = x / S, v = y / S, n = fbm(u * 30, v * 30, 130, 3, 30);
      if (!inside) { p.set(i, 0.2, 0.19, 0.17); p.z[i] = 0; }
      else { const k = 0.75 + n * 0.2; p.set(i, 0.62 * k, 0.6 * k, 0.53 * k); p.z[i] = 0.7 + n * 0.3; }
      if (!CLEAN && h > 0.88 && inside) { p.set(i, 0.03, 0.03, 0.03); p.z[i] = -0.5; }    // a missing tile: the void above
      const ring = fbm(u * 3, v * 3, 131, 4, 3); if (!CLEAN && ring > 0.58) p.mix(i, 0.38, 0.25, 0.1, Math.min(0.8, (ring - 0.58) * 3));
      p.r[i] = 0.95;
    });
    p.grime(132, 0.8); T.ceiling = set(p, 2);
  }
  // props
  {
    const p = new Paint(256);   // painted steel, chipped to rust
    p.each((x, y, i) => {
      const u = x / 256, v = y / 256, n = fbm(u * 8, v * 8, 140, 5, 8), c = fbm(u * 16, v * 16, 141, 4, 16);
      p.set(i, 0.42, 0.45, 0.42); p.mul(i, 0.85 + n * 0.25); p.z[i] = 1; p.r[i] = 0.55;
      if (!CLEAN && c > 0.62) { p.mix(i, 0.35, 0.16, 0.06, Math.min(1, (c - 0.62) * 5)); p.z[i] = 0.6; p.r[i] = 0.9; }
    });
    p.grime(142, 0.9); T.metal = set(p, 2);
  }
  {
    const p = new Paint(256);   // door: old institutional green-grey paint over wood
    p.each((x, y, i) => {
      const u = x / 256, v = y / 256, g = fbm(u * 2, v * 30, 150, 4, 2), n = fbm(u * 8, v * 8, 151, 5, 8);
      p.set(i, 0.36, 0.4, 0.34); p.mul(i, 0.8 + n * 0.3); p.z[i] = 0.8 + g * 0.1; p.r[i] = 0.7;
      const chip = fbm(u * 10, v * 10, 152, 4, 10); if (!CLEAN && chip > 0.64) { p.mix(i, 0.3, 0.2, 0.12, 0.9); p.z[i] = 0.5; }
      const kick = v > 0.88 ? 1 : 0; if (kick) { p.mix(i, 0.4, 0.38, 0.3, 0.6); p.r[i] = 0.4; }
    });
    p.grime(153, 1.2, true); T.door = set(p, 2);
  }
  {
    const p = new Paint(256);   // mattress ticking with old stains
    p.each((x, y, i) => {
      const u = x / 256, v = y / 256; const stripe = (x % 16) < 3; const n = fbm(u * 6, v * 6, 160, 5, 6);
      p.set(i, stripe ? 0.4 : 0.62, stripe ? 0.42 : 0.6, stripe ? 0.5 : 0.52); p.mul(i, 0.85 + n * 0.2); p.z[i] = n * 0.5; p.r[i] = 0.95;
      const s = fbm(u * 3, v * 3, 161, 5, 3); if (!CLEAN && s > 0.55) p.mix(i, 0.45, 0.32, 0.12, Math.min(0.8, (s - 0.55) * 3));
      const b = fbm(u * 4, v * 4, 162, 5, 4); if (!CLEAN && b > 0.68) p.mix(i, 0.25, 0.03, 0.02, Math.min(0.9, (b - 0.68) * 5));
    });
    T.mattress = set(p, 1);
  }
  {
    const p = new Paint(256);   // stained sheet / gown cotton
    p.each((x, y, i) => {
      const u = x / 256, v = y / 256, n = fbm(u * 6, v * 6, 170, 5, 6); const weave = ((x + y) % 3 === 0) ? 0.96 : 1;
      p.set(i, 0.72 * weave, 0.72 * weave, 0.66 * weave); p.mul(i, 0.85 + n * 0.2); p.z[i] = n * 0.3; p.r[i] = 0.95;
      const s = fbm(u * 3, v * 3, 171, 5, 3); if (!CLEAN && s > 0.58) p.mix(i, 0.5, 0.38, 0.16, Math.min(0.7, (s - 0.58) * 3));
      const b = fbm(u * 5, v * 5, 172, 5, 5); if (!CLEAN && b > 0.66) p.mix(i, 0.32, 0.02, 0.01, Math.min(0.95, (b - 0.66) * 4));
    });
    T.sheet = set(p, 0.8);
  }
  {
    const p = new Paint(256);   // dark wood (desks, piano, benches)
    p.each((x, y, i) => {
      const u = x / 256, v = y / 256, g = fbm(u * 3, v * 24, 180, 5, 3);
      const k = 0.5 + g * 0.6; p.set(i, 0.26 * k, 0.15 * k, 0.08 * k); p.z[i] = g; p.r[i] = 0.5;
    });
    p.grime(181, 0.6); T.wood = set(p, 1.5);
  }
  {
    const p = new Paint(S);   // grass (3 m tile): dense and uneven, bare dirt and dry yellow patches
    p.each((x, y, i) => {
      const u = x / S, v = y / S; const n = fbm(u * 6, v * 6, 190, 5, 6), f = fbm(u * 60, v * 60, 191, 3, 60), dirt = fbm(u * 3, v * 3, 192, 4, 3);
      const blade = hash(x, y, 193); const k = 0.55 + f * 0.6 + blade * 0.25;
      p.set(i, (0.15 + n * 0.08) * k, (0.24 + n * 0.12) * k, (0.08 + n * 0.04) * k); p.z[i] = f * 0.8 + blade * 0.4; p.r[i] = 0.95;
      if (dirt > 0.64) p.mix(i, 0.2, 0.16, 0.1, Math.min(1, (dirt - 0.64) * 5) * 0.8);
      if (n < 0.32) p.mix(i, 0.3, 0.27, 0.14, (0.32 - n) * 2);
    });
    T.grass = set(p, 2.5);
  }
  {
    const p = new Paint(S);   // car park tarmac with a painted bay line
    p.each((x, y, i) => { const u = x / S, v = y / S, n = fbm(u * 20, v * 20, 200, 4, 20), g = hash(x, y, 201); const k = 0.17 + n * 0.08 + g * 0.06; p.set(i, k, k, k * 1.03); p.z[i] = g * 0.5 + n * 0.3; p.r[i] = 0.85; if (Math.abs(u - 0.5) < 0.012) p.set(i, 0.62, 0.6, 0.52); });
    T.asphalt = set(p, 1.5);
  }
  // ---- the Testing Site: a clean, cold lab under the Nevada desert
  {
    const p = new Paint(S);   // lab wall: white enamel panels 1 m wide, seams and rivets, a dark kick band, a teal line at 1.2 m, a hazard band low down
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 6, v * 6, 210, 4, 6), f = fbm(u * 40, v * 40, 211, 3, 40);
      const h = 3.2 * (1 - v);   // height above the floor (m)
      const pu = (u * 3) % 1; const seam = Math.min(pu, 1 - pu) * 3; // metres to the nearest panel seam
      let k = 0.86 + n * 0.08 + f * 0.03; p.set(i, 0.82 * k, 0.84 * k, 0.85 * k); p.z[i] = 0.6; p.r[i] = 0.22 + n * 0.1;
      if (seam < 0.006) { p.set(i, 0.35, 0.37, 0.38); p.z[i] = 0.2; p.r[i] = 0.6; }
      if (Math.abs(h - 2.6) < 0.01 || Math.abs(h - 0.32) < 0.01) { p.set(i, 0.4, 0.42, 0.43); p.z[i] = 0.3; }
      for (const rh of [0.4, 1.5, 2.5]) if (Math.hypot(seam - 0.03, h - rh) < 0.008) { p.set(i, 0.55, 0.57, 0.58); p.z[i] = 1.2; }   // rivets
      if (h < 0.3) { p.set(i, 0.16 + n * 0.03, 0.17, 0.18); p.z[i] = 0.4; p.r[i] = 0.5; }
      if (h > 1.17 && h < 1.23) { p.set(i, 0.12, 0.5, 0.48); p.r[i] = 0.3; }
      if (h > 0.34 && h < 0.46) { const st = Math.floor((u * 3 * 6 + h * 4)) % 2; p.set(i, st ? 0.85 : 0.08, st ? 0.66 : 0.07, st ? 0.08 : 0.05); p.r[i] = 0.45; }
    });
    p.grime(212, 0.35, true); T.wallLab = set(p, 1.5);
  }
  {
    const p = new Paint(S);   // lab floor: pale grey epoxy, scuffed by trolleys, a yellow safety line
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 5, v * 5, 220, 5, 5), sc = fbm(u * 50, v * 3, 221, 3, 50);
      const k = 0.62 + n * 0.12; p.set(i, 0.5 * k, 0.52 * k, 0.53 * k); p.z[i] = n * 0.2; p.r[i] = 0.32 + n * 0.15;
      if (sc > 0.66) { p.mul(i, 0.85); p.r[i] = 0.55; }
      if (Math.abs(u - 0.03) < 0.012) { p.set(i, 0.8, 0.62, 0.1); p.r[i] = 0.4; }
    });
    p.grime(222, 0.4); T.floorLab = set(p, 1);
  }
  {
    const p = new Paint(S);   // steel deck plate, diamond tread
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 8, v * 8, 230, 4, 8); const a = ((u * 24 + v * 24) % 1), b = ((u * 24 - v * 24 + 100) % 1);
      const bump = (Math.floor(u * 12 + v * 12) % 2 ? Math.max(0, 1 - Math.abs(a - 0.5) * 8) * (Math.abs(b - 0.5) < 0.18 ? 1 : 0) : Math.max(0, 1 - Math.abs(b - 0.5) * 8) * (Math.abs(a - 0.5) < 0.18 ? 1 : 0));
      const k = 0.33 + n * 0.1 + bump * 0.12; p.set(i, k, k * 1.01, k * 1.03); p.z[i] = bump; p.r[i] = 0.4 - bump * 0.1 + n * 0.1;
    });
    p.grime(232, 0.7); T.floorSteel = set(p, 3);
  }
  {
    const p = new Paint(S);   // desert: pale sand in wind ripples, pebbles, scrub
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 4, v * 4, 240, 5, 4), rp = Math.sin((v * 30 + fbm(u * 3, v * 3, 241, 3, 3) * 6) * Math.PI * 2) * 0.5 + 0.5, pb = hash(x >> 2, y >> 2, 242);
      const k = 0.62 + n * 0.2 + rp * 0.06; p.set(i, 0.66 * k, 0.55 * k, 0.4 * k); p.z[i] = rp * 0.5 + n * 0.3; p.r[i] = 0.95;
      if (pb > 0.985) { p.set(i, 0.32, 0.29, 0.25); p.z[i] = 1.4; }
      if (n < 0.3) p.mix(i, 0.38, 0.36, 0.22, (0.3 - n) * 2);
    });
    T.sand = set(p, 2);
  }
  {
    const p = new Paint(S);   // bunker concrete: board-formed, form-tie holes, a stencil band
    p.each((x, y, i) => {
      const u = x / S, v = y / S, n = fbm(u * 7, v * 7, 250, 5, 7), board = fbm(u * 1.5, v * 16, 251, 3, 2);
      const k = 0.42 + n * 0.14 + board * 0.06; p.set(i, k, k * 0.99, k * 0.96); p.z[i] = n * 0.5 + board * 0.3; p.r[i] = 0.9;
      const hx = (u * 6) % 1, hy = (v * 4) % 1; if (Math.hypot(hx - 0.5, (hy - 0.5) * 0.66) < 0.035) { p.set(i, 0.16, 0.15, 0.14); p.z[i] = 0; }
      if (v > 0.6 && v < 0.62) p.set(i, 0.6, 0.12, 0.08);
    });
    p.grime(252, 0.9, true); T.wallBunker = set(p, 2.5);
  }
  T.decals = buildDecals();
}

// ---------------------------------------------------------------- decals
// an atlas of transparent stains: blood pools, smears, handprints, drag trails, filth
function buildDecals() {
  const N = 1024, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const cx = cv.getContext('2d'); const R = rng(4242);
  const cells = {};      // name -> [u0, v0, u1, v1]
  const slot = (i) => { const s = N / 4; return [(i % 4) * s, Math.floor(i / 4) * s, s]; };
  const blood = (a) => `rgba(${70 + R() * 30 | 0},${2 + R() * 6 | 0},${2 + R() * 4 | 0},${a})`;
  let k = 0;
  const reg = (name, fn) => { const [x, y, s] = slot(k++); cx.save(); cx.beginPath(); cx.rect(x, y, s, s); cx.clip(); cx.translate(x, y); fn(s); cx.restore(); cells[name] = [x / N, 1 - (y + s) / N, (x + s) / N, 1 - y / N]; };
  // pools: layered blobs with darker, congealed centres and a glossy rim
  for (let n = 0; n < 3; n++) reg('pool' + n, (s) => {
    const c = s / 2;
    for (let l = 0; l < 4; l++) {
      cx.fillStyle = blood(0.45 + l * 0.15); cx.beginPath();
      const r0 = s * (0.36 - l * 0.07), pts = 28;
      for (let i = 0; i <= pts; i++) { const a = i / pts * Math.PI * 2; const r = r0 * (0.7 + fbm(Math.cos(a) * 2 + n, Math.sin(a) * 2, n * 9 + l, 3, 64) * 0.7); const px = c + Math.cos(a) * r, py = c + Math.sin(a) * r * 0.85; i ? cx.lineTo(px, py) : cx.moveTo(px, py); }
      cx.fill();
    }
    for (let i = 0; i < 40; i++) { cx.fillStyle = blood(0.7); cx.beginPath(); const a = R() * 6.28, r = s * (0.3 + R() * 0.18); cx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 1 + R() * 5, 0, 6.28); cx.fill(); }
  });
  // drag smear
  reg('smear', (s) => {
    for (let i = 0; i < 9; i++) {
      const y0 = s * (0.25 + R() * 0.5); cx.strokeStyle = blood(0.25 + R() * 0.4); cx.lineWidth = 6 + R() * 30; cx.lineCap = 'round'; cx.beginPath();
      cx.moveTo(s * 0.05, y0); cx.bezierCurveTo(s * 0.3, y0 + (R() - 0.5) * 40, s * 0.6, y0 + (R() - 0.5) * 40, s * (0.7 + R() * 0.28), y0 + (R() - 0.5) * 30); cx.stroke();
    }
  });
  // wall smear with drips running down
  reg('wallsmear', (s) => {
    cx.fillStyle = blood(0.75);
    for (let i = 0; i < 4; i++) { cx.beginPath(); cx.ellipse(s * (0.3 + R() * 0.4), s * (0.25 + R() * 0.2), s * (0.08 + R() * 0.16), s * (0.05 + R() * 0.08), R(), 0, 6.28); cx.fill(); }
    for (let i = 0; i < 14; i++) { const x = s * (0.18 + R() * 0.64), y = s * (0.25 + R() * 0.2), l = s * (0.15 + R() * 0.55), w = 2 + R() * 6; const g = cx.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, blood(0.85)); g.addColorStop(1, blood(0)); cx.fillStyle = g; cx.fillRect(x, y, w, l); cx.beginPath(); cx.arc(x + w / 2, y + l * 0.92, w * 0.8, 0, 6.28); cx.fillStyle = blood(0.6); cx.fill(); }
  });
  // handprints
  reg('hands', (s) => {
    const hand = (x, y, a, sc) => {
      cx.save(); cx.translate(x, y); cx.rotate(a); cx.scale(sc, sc); cx.fillStyle = blood(0.7);
      cx.beginPath(); cx.ellipse(0, 0, 22, 26, 0, 0, 6.28); cx.fill();
      for (const [fx, fl, fa] of [[-17, 30, -0.35], [-6, 40, -0.08], [6, 42, 0.05], [17, 36, 0.2]]) { cx.beginPath(); cx.ellipse(fx + Math.sin(fa) * fl * 0.5, -26 - fl * 0.5, 5.5, fl * 0.55, fa, 0, 6.28); cx.fill(); }
      cx.beginPath(); cx.ellipse(-26, 4, 7, 18, -0.9, 0, 6.28); cx.fill();
      cx.restore();
      const g = cx.createLinearGradient(0, y, 0, y + 90); g.addColorStop(0, blood(0.6)); g.addColorStop(1, blood(0)); cx.fillStyle = g; cx.fillRect(x - 10, y + 10, 5, 60 + R() * 40);
    };
    hand(s * 0.3, s * 0.35, -0.2, 1.1); hand(s * 0.65, s * 0.5, 0.25, 1.0); hand(s * 0.45, s * 0.75, 0.1, 0.9);
  });
  // filth: brown-black stain
  reg('filth', (s) => {
    for (let l = 0; l < 5; l++) { cx.fillStyle = `rgba(${30 + R() * 20 | 0},${22 + R() * 10 | 0},${8},${0.18 + R() * 0.2})`; cx.beginPath(); cx.ellipse(s / 2 + (R() - 0.5) * s * 0.3, s / 2 + (R() - 0.5) * s * 0.3, s * (0.15 + R() * 0.25), s * (0.1 + R() * 0.2), R() * 3, 0, 6.28); cx.fill(); }
  });
  // water puddle: dark, only roughness really
  reg('puddle', (s) => { cx.fillStyle = 'rgba(10,12,10,0.45)'; cx.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * 6.28, r = s * (0.3 + fbm(Math.cos(a) * 2, Math.sin(a) * 2, 7, 3, 64) * 0.2); i ? cx.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r) : cx.moveTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } cx.fill(); });
  // splatter spray
  reg('spray', (s) => { for (let i = 0; i < 260; i++) { const a = -0.6 + R() * 1.2, d = Math.pow(R(), 0.6) * s * 0.48; cx.fillStyle = blood(0.5 + R() * 0.4); cx.beginPath(); cx.ellipse(s * 0.04 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, 1 + R() * 4 * (1 - d / s), 1 + R() * 2, a, 0, 6.28); cx.fill(); } });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, cells };
}

// one-off texture of words smeared on a wall
export function scrawlTexture(text, seed = 1) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const cx = cv.getContext('2d'); const R = rng(seed * 31 + 7);
  const words = text.split(' '); let fs = 120; cx.font = `bold ${fs}px "Courier New", monospace`;
  while (cx.measureText(text).width > 960 && fs > 40) { fs -= 6; cx.font = `bold ${fs}px "Courier New", monospace`; }
  let x = 32;
  for (const w of words) {
    for (const ch of w) {
      cx.save(); cx.translate(x, 160 + (R() - 0.5) * 24); cx.rotate((R() - 0.5) * 0.25); cx.scale(1 + (R() - 0.5) * 0.2, 1 + (R() - 0.5) * 0.3);
      cx.fillStyle = `rgba(${80 + R() * 40 | 0},5,4,0.9)`; cx.fillText(ch, 0, 0);
      cx.fillRect(4 + R() * fs * 0.4, 0, 3 + R() * 3, R() * 70);       // drips
      cx.restore(); x += cx.measureText(ch).width * 0.95;
    }
    x += fs * 0.45;
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Mason: turns the floor plan into the building. Walls, floors and
// ceilings are tessellated so light can be baked into every vertex (with
// grid occlusion, wall AO and one bounce), props are assembled from boxes
// and cylinders into a handful of merged meshes, and doors, fixtures, haze
// cones and stains are added on top. Light comes in four channels: S always
// on, A and B the stuttering broken tubes, P the main circuit (generator).
import * as THREE from '../vendor/three.module.js';
import { C, H, W, D, Z, cx, cz } from './plan.js?v=16';
import { T, scrawlTexture, rng } from './surfaces.js?v=16';

const V3 = THREE.Vector3;
export const LIGHT = { A: { value: 1 }, B: { value: 1 }, P: { value: 0 }, S: { value: 1 }, cool: { value: new THREE.Color(0.78, 0.88, 1.0) } };

// ------------------------------------------------------------ baked material
// A standard material whose light comes from per-vertex bake attributes
// (added as emissive radiance), so real lights are only needed for the
// camcorder's infrared lamp and a few effects.
export function bakedMaterial(opts) {
  const m = new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.85, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uA = LIGHT.A; sh.uniforms.uB = LIGHT.B; sh.uniforms.uP = LIGHT.P; sh.uniforms.uS = LIGHT.S; sh.uniforms.uCool = LIGHT.cool;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 bake; attribute vec3 bake2; uniform float uA, uB, uP, uS; uniform vec3 uCool; varying vec3 vBake;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBake = bake * uS + uCool * (bake2.x * uA + bake2.y * uB + bake2.z * uP);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBake;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // baked light, with a little lift from the normal map so tile and grout read, and a damp sheen on smooth surfaces
        float nb = 0.78 + 0.22 * clamp(dot(normal, normalize(vec3(0.0, 0.6, 0.8))) , 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * vBake * nb;
        float wet = (1.0 - roughnessFactor);
        totalEmissiveRadiance += vBake * wet * wet * 0.22 * pow(clamp(1.0 - dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);`);
  };
  m.customProgramCacheKey = () => 'baked';
  return m;
}

// ------------------------------------------------------------ geometry batch
class Batch {
  constructor(mat) { this.mat = mat; this.p = []; this.n = []; this.u = []; }
  tri(a, b, c, na, nb, nc, ua, ub, uc) { this.p.push(...a, ...b, ...c); this.n.push(...na, ...nb, ...nc); this.u.push(...ua, ...ub, ...uc); }
  // quad a b c d counter-clockwise seen from the normal side
  quad(a, b, c, d, n, ua, ub, uc, ud) { this.tri(a, b, c, n, n, n, ua, ub, uc); this.tri(a, c, d, n, n, n, ua, uc, ud); }
  geo(g, m, uvs = 1) {     // append a THREE geometry transformed by matrix m
    const gg = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    const P = gg.attributes.position.array, N = gg.attributes.normal.array, U = gg.attributes.uv ? gg.attributes.uv.array : null;
    for (let i = 0; i < P.length / 3; i++) { this.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); this.n.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); this.u.push(U ? U[i * 2] * uvs : 0, U ? U[i * 2 + 1] * uvs : 0); }
    gg.dispose();
  }
  // box with metric uvs (texScale metres per texture repeat)
  box(w, h, d, m, ts = 1) {
    const x = w / 2, y = h / 2, z = d / 2; const v = new V3(); const nv = new V3();
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const F = [
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0], d, h], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0], d, h],
      [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0], w, d], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0], w, d],
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1], w, h], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1], w, h],
    ];
    for (const [a, b, c, dd, n, su, sv] of F) {
      const T4 = [a, b, c, dd].map((q) => v.set(...q).applyMatrix4(m).toArray());
      const N = nv.set(...n).applyMatrix3(nm).normalize().toArray();
      const U = su / ts, VV = sv / ts;
      this.quad(T4[0], T4[1], T4[2], T4[3], N, [0, 0], [U, 0], [U, VV], [0, VV]);
    }
  }
}

// ------------------------------------------------------------ the bake
class Baker {
  constructor(plan) {
    this.plan = plan;
    this.lamps = plan.lamps.map((l) => ({ ...l, wx: cx(l.x), wz: cz(l.y), wy: l.y !== undefined && l.kind !== 'tube' && l.kind !== 'cage' && l.kind !== 'bulb' && l.kind !== 'monitor' && l.kind !== 'lamp' ? (l.yH ?? (l.kind === 'none' ? l.y2 ?? 2.1 : l.kind === 'candle' ? (l.yy ?? 0.3) : H - 0.3)) : H - 0.3,
      c: new THREE.Color(l.col), dir: l.dir ? new V3(...l.dir).normalize() : null }));
    for (const l of this.lamps) { if (l.kind === 'candle') l.wy = l.h ?? 0.35; if (l.kind === 'none') l.wy = 2.1; if (l.kind === 'lamp') l.wy = 1.15; if (l.kind === 'monitor') l.wy = 1.1; }
    // per cell irradiance for bounce, AI vision and character light
    this.cell = new Float32Array(W * D * 6);
    for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
      if (!plan.at(x, y)) continue;
      const r = this.direct(cx(x), 1.2, cz(y), 0, 0, 0, true);
      this.cell.set(r, (y * W + x) * 6);
    }
    // blur for the bounce term
    this.bounce = new Float32Array(W * D * 6);
    for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
      if (!plan.at(x, y)) continue; let n = 0; const acc = [0, 0, 0, 0, 0, 0];
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (!plan.at(xx, yy)) continue; if (this.blocked(cx(x), cz(y), cx(xx), cz(yy))) continue; for (let k = 0; k < 6; k++) acc[k] += this.cell[(yy * W + xx) * 6 + k]; n++; }
      for (let k = 0; k < 6; k++) this.bounce[(y * W + x) * 6 + k] = acc[k] / Math.max(1, n);
    }
  }
  solid(x, z) { const gx = Math.floor(x / C), gy = Math.floor(z / C); return !this.plan.at(gx, gy); }
  blocked(x0, z0, x1, z1) {   // grid DDA through solid cells
    let gx = Math.floor(x0 / C), gy = Math.floor(z0 / C); const tx = Math.floor(x1 / C), ty = Math.floor(z1 / C);
    const dx = x1 - x0, dz = z1 - z0; const sx = Math.sign(dx), sy = Math.sign(dz);
    const tdx = sx ? Math.abs(C / dx) : Infinity, tdy = sy ? Math.abs(C / dz) : Infinity;
    let tmx = sx ? ((sx > 0 ? (gx + 1) * C - x0 : x0 - gx * C) / Math.abs(dx)) : Infinity;
    let tmy = sy ? ((sy > 0 ? (gy + 1) * C - z0 : z0 - gy * C) / Math.abs(dz)) : Infinity;
    for (let s = 0; s < 64; s++) {
      if (gx === tx && gy === ty) return false;
      if (tmx < tmy) { gx += sx; tmx += tdx; } else { gy += sy; tmy += tdy; }
      if (!this.plan.at(gx, gy) && !(gx === tx && gy === ty)) return true;
    }
    return false;
  }
  direct(px, py, pz, nx, ny, nz, omni = false) {
    const out = [0, 0, 0, 0, 0, 0];
    for (const l of this.lamps) {
      const dx = l.wx - px, dy = l.wy - py, dz = l.wz - pz; const d2 = dx * dx + dy * dy + dz * dz; const r = l.r;
      if (d2 > r * r) continue;
      const d = Math.sqrt(d2) || 1e-3;
      let ndl = omni ? 1 : (nx * dx + ny * dy + nz * dz) / d; ndl = Math.max(0, (ndl + 0.1) / 1.1);
      if (ndl <= 0) continue;
      const fall = Math.pow(Math.max(0, 1 - d2 / (r * r)), 2) / (1 + d2 * 0.35);
      let k = l.i * fall * ndl * 2.2;
      if (l.kind === 'tube' || l.kind === 'cage' || l.kind === 'bulb') k *= 0.35 + 0.65 * Math.max(0, -dy / d);   // ceiling lamps throw downward
      if (l.dir) { const c = -(dx * l.dir.x + dy * l.dir.y + dz * l.dir.z) / d; k *= Math.max(0, (c - 0.2) / 0.8); }
      if (k < 1e-4) continue;
      if (this.blocked(px + nx * 0.06, pz + nz * 0.06, l.wx, l.wz)) continue;
      if (l.ch === 'S') { out[0] += l.c.r * k; out[1] += l.c.g * k; out[2] += l.c.b * k; }
      else out[{ A: 3, B: 4, P: 5 }[l.ch]] += k;
    }
    return out;
  }
  vertex(px, py, pz, nx, ny, nz) {
    const r = this.direct(px, py, pz, nx, ny, nz);
    const gx = Math.min(W - 1, Math.max(0, Math.floor((px + nx * 0.2) / C))), gy = Math.min(D - 1, Math.max(0, Math.floor((pz + nz * 0.2) / C)));
    const bo = (gy * W + gx) * 6;
    // contact AO: near floor/ceiling lines and wall corners
    let ao = 0.55 + 0.45 * Math.min(1, py / 0.7) * Math.min(1, (H - py) / 0.45);
    if (ny > 0.5 || ny < -0.5) {
      let walls = 0; for (const [ox, oz] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) if (this.solid(px + ox, pz + oz)) walls++;
      ao *= 1 - walls * 0.17;
    }
    for (let k = 0; k < 6; k++) r[k] = (r[k] + this.bounce[bo + k] * 0.22) * ao;
    // a floor of near-black so nothing is truly zero (the camcorder amplifies this)
    r[0] += 0.0035 * ao; r[1] += 0.0032 * ao; r[2] += 0.003 * ao;
    return r;
  }
  bakeGeometry(g) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3;
    const b = new Float32Array(n * 3), b2 = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = this.vertex(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); b[i * 3] = r[0]; b[i * 3 + 1] = r[1]; b[i * 3 + 2] = r[2]; b2[i * 3] = r[3]; b2[i * 3 + 1] = r[4]; b2[i * 3 + 2] = r[5]; }
    g.setAttribute('bake', new THREE.BufferAttribute(b, 3)); g.setAttribute('bake2', new THREE.BufferAttribute(b2, 3));
  }
}

// ------------------------------------------------------------ the build
const WALL_OF = { [Z.HALL]: 'wallWard', [Z.CAFE]: 'wallWard', [Z.LOBBY]: 'wallWard', [Z.DAY]: 'wallWard', [Z.DOOR]: 'wallWard', [Z.CELL]: 'wallCell', [Z.SHOWER]: 'wallShower', [Z.MORGUE]: 'wallMorgue', [Z.ADMIN]: 'wallOffice', [Z.SEC]: 'wallOffice', [Z.GEN]: 'wallBlock', [Z.STORE]: 'wallBlock', [Z.OUT]: 'wallBlock', [Z.CHAPEL]: 'wallOffice', [Z.PADDED]: 'wallPadded', [Z.SURGERY]: 'wallMorgue', [Z.DORM]: 'wallWard', [Z.NURSE]: 'wallOffice', [Z.STAIR]: 'wallBlock' };
const FLOOR_OF = { [Z.HALL]: 'floorWard', [Z.CAFE]: 'floorWard', [Z.LOBBY]: 'floorWard', [Z.DAY]: 'floorWard', [Z.DOOR]: 'floorWard', [Z.CELL]: 'floorWard', [Z.SHOWER]: 'floorShower', [Z.MORGUE]: 'floorShower', [Z.ADMIN]: 'floorWood', [Z.SEC]: 'floorWood', [Z.GEN]: 'floorConcrete', [Z.STORE]: 'floorConcrete', [Z.OUT]: 'floorConcrete', [Z.CHAPEL]: 'floorWood', [Z.PADDED]: 'floorPadded', [Z.SURGERY]: 'floorShower', [Z.DORM]: 'floorWard', [Z.NURSE]: 'floorWard', [Z.STAIR]: 'floorConcrete' };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function buildAsylum(plan, scene) {
  const baker = new Baker(plan);
  const mats = {}; const batches = {};
  const M = (key) => {
    if (!batches[key]) {
      let m;
      const surf = T[key];
      if (surf) m = bakedMaterial({ map: surf.map, normalMap: surf.normalMap, roughnessMap: surf.roughnessMap, normalScale: new THREE.Vector2(0.8, 0.8) });
      else if (EXTRA_MATS[key]) m = EXTRA_MATS[key]();
      else if (key === 'porcelain') m = bakedMaterial({ color: 0xc9c6b8, roughness: 0.25 });
      else if (key === 'black') m = bakedMaterial({ color: 0x0a0a0a, roughness: 0.6 });
      else if (key === 'rubber') m = bakedMaterial({ color: 0x1a1a1a, roughness: 0.9 });
      else if (key === 'paper') m = bakedMaterial({ color: 0xb8b09a, roughness: 1 });
      else if (key === 'glassdark') m = bakedMaterial({ color: 0x0c1010, roughness: 0.1 });
      else m = bakedMaterial({ color: 0x777777 });
      mats[key] = m; batches[key] = new Batch(m);
    }
    return batches[key];
  };
  const at = plan.at; const solid = (x, y) => !at(x, y);
  const winGlass = [];
  const outside = (x, y) => at(x, y) === Z.OUT;

  // ---- floors and ceilings
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const z = at(x, y); if (!z) continue;
    const fb = M(FLOOR_OF[z]); const x0 = x * C, z0 = y * C; const h = C / 2;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const a = x0 + i * h, b = z0 + j * h;
      fb.quad([a, 0, b + h], [a + h, 0, b + h], [a + h, 0, b], [a, 0, b], [0, 1, 0], [a / 3, -(b + h) / 3], [(a + h) / 3, -(b + h) / 3], [(a + h) / 3, -b / 3], [a / 3, -b / 3]);
      if (z !== Z.OUT) M('ceiling').quad([a, H, b], [a + h, H, b], [a + h, H, b + h], [a, H, b + h], [0, -1, 0], [a / 3, b / 3], [(a + h) / 3, b / 3], [(a + h) / 3, (b + h) / 3], [a / 3, (b + h) / 3]);
    }
  }

  // ---- walls: every face between a floor cell and a solid cell
  const HS = [0, 0.45, 1.35, 2.2, 3.2];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const z = at(x, y); if (!z) continue;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!solid(nx, ny)) continue;
      const wb = M(WALL_OF[z]);
      // the face lies on the cell edge, normal points back into the floor cell
      const n = [-dx, 0, -dy];
      const top = z === Z.OUT ? 9 : H; const hs = z === Z.OUT ? [0, 1, 3.2, 6, 9] : HS;
      // endpoints along the edge, ordered so the quad faces the room
      let ax, az, bx, bz;
      if (dx === 1) { ax = (x + 1) * C; az = y * C; bx = ax; bz = (y + 1) * C; }
      else if (dx === -1) { ax = x * C; az = (y + 1) * C; bx = ax; bz = y * C; }
      else if (dy === 1) { ax = (x + 1) * C; az = (y + 1) * C; bx = x * C; bz = az; }
      else { ax = x * C; az = y * C; bx = (x + 1) * C; bz = az; }
      const isWin = plan.win[ny * W + nx] && z !== Z.OUT;
      const along = (t) => [ax + (bx - ax) * t, az + (bz - az) * t];
      const ucoord = (t) => { const [px, pz] = along(t); return (dx ? pz : px) / 3 * (dx === -1 || dy === 1 ? -1 : 1); };
      const segs = 2;
      const strip = (t0, t1, y0, y1) => {
        const [p0x, p0z] = along(t0), [p1x, p1z] = along(t1);
        wb.quad([p0x, y0, p0z], [p1x, y0, p1z], [p1x, y1, p1z], [p0x, y1, p0z], n, [ucoord(t0), y0 / H], [ucoord(t1), y0 / H], [ucoord(t1), y1 / H], [ucoord(t0), y1 / H]);
      };
      if (!isWin) {
        for (let s = 0; s < segs; s++) for (let k = 0; k < hs.length - 1; k++) strip(s / segs, (s + 1) / segs, hs[k], Math.min(top, hs[k + 1]));
      } else {
        // a barred window: hole 0.3..1.2 along, 1.05..2.45 high, deep reveal, night beyond
        const h0 = 1.05, h1 = 2.45, t0 = 0.2, t1 = 0.8;
        for (const [a, b, c, d] of [[0, 1, 0, 0.45], [0, 1, 0.45, h0], [0, 1, h1, H], [0, t0, h0, h1], [t1, 1, h0, h1]]) strip(a, b, c, d);
        const dep = 0.45; const [q0x, q0z] = along(t0), [q1x, q1z] = along(t1); const ox = dx * dep, oz = dy * dep;
        const rv = M('wallBlock');
        rv.quad([q0x, h0, q0z], [q1x, h0, q1z], [q1x + ox, h0, q1z + oz], [q0x + ox, h0, q0z + oz], [0, 1, 0], [0, 0], [1, 0], [1, 0.2], [0, 0.2]);
        rv.quad([q1x, h1, q1z], [q0x, h1, q0z], [q0x + ox, h1, q0z + oz], [q1x + ox, h1, q1z + oz], [0, -1, 0], [0, 0], [1, 0], [1, 0.2], [0, 0.2]);
        const sn = [(bx - ax) / C, 0, (bz - az) / C];
        rv.quad([q0x + ox, h0, q0z + oz], [q0x, h0, q0z], [q0x, h1, q0z], [q0x + ox, h1, q0z + oz], sn, [0, 0], [0.15, 0], [0.15, 0.5], [0, 0.5]);
        rv.quad([q1x, h0, q1z], [q1x + ox, h0, q1z + oz], [q1x + ox, h1, q1z + oz], [q1x, h1, q1z], [-sn[0], 0, -sn[2]], [0, 0], [0.15, 0], [0.15, 0.5], [0, 0.5]);
        winGlass.push({ a: [q0x + ox, q0z + oz], b: [q1x + ox, q1z + oz], h0, h1, n });
        for (let i = 1; i <= 4; i++) { const [bx2, bz2] = along(t0 + (t1 - t0) * i / 5); M('metal').box(0.025, h1 - h0, 0.025, new THREE.Matrix4().makeTranslation(bx2 + dx * 0.12, (h0 + h1) / 2, bz2 + dy * 0.12), 0.5); }
      }
    }
  }

  // ---- door frames: jambs + lintel inside every door cell
  const doors = [];
  for (const d of plan.doors) {
    const pass = at(d.x - 1, d.y) && at(d.x + 1, d.y) ? 'x' : 'z';
    const x0 = d.x * C, z0 = d.y * C; const jw = 0.15; const wb = M('wallWard');
    const mm = (px, py, pz) => new THREE.Matrix4().makeTranslation(px, py, pz);
    if (pass === 'x') {
      wb.box(C, H - 2.3, C, mm(x0 + C / 2, 2.3 + (H - 2.3) / 2, z0 + C / 2), 3);
      wb.box(C, 2.3, jw, mm(x0 + C / 2, 1.15, z0 + jw / 2), 3); wb.box(C, 2.3, jw, mm(x0 + C / 2, 1.15, z0 + C - jw / 2), 3);
    } else {
      wb.box(C, H - 2.3, C, mm(x0 + C / 2, 2.3 + (H - 2.3) / 2, z0 + C / 2), 3);
      wb.box(jw, 2.3, C, mm(x0 + jw / 2, 1.15, z0 + C / 2), 3); wb.box(jw, 2.3, C, mm(x0 + C - jw / 2, 1.15, z0 + C / 2), 3);
    }
    doors.push({ ...d, pass, wx: x0 + C / 2, wz: z0 + C / 2 });
  }

  // ---- props
  const colliders = [];   // {x0,z0,x1,z1,y1, prop}
  const hides = [];       // lockers and beds
  const R = rng(777);
  for (const p of plan.props) buildProp(p);
  function buildProp(p) {
    const def = PROPS[p.k]; if (!def) return;
    const ang = p.r * Math.PI / 2;
    let px = cx(p.x), pz = cz(p.y);
    const [w, hh, d] = def.size;
    if (def.snap) {   // push it back against the wall behind it
      const bx = -Math.sin(ang), bz = -Math.cos(ang);
      for (let s = 0; s < 40; s++) { const tx = px + bx * (d / 2 + 0.02 + s * 0.05), tz = pz + bz * (d / 2 + 0.02 + s * 0.05); if (baker.solid(tx, tz)) { px += bx * s * 0.05; pz += bz * s * 0.05; break; } if (s === 39) break; }
      // and from the other side, if we started inside the wall
      for (let s = 0; s < 30 && baker.solid(px + bx * (d / 2), pz + bz * (d / 2)); s++) { px -= bx * 0.05; pz -= bz * 0.05; }
    }
    const base = new THREE.Matrix4().makeRotationY(ang).setPosition(px, 0, pz);
    if (p.tipped && def.tip) base.multiply(def.tip);
    const ctx = { base, p, R, M, at: (lx, ly, lz) => base.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz)), box: (key, sx, sy, sz, lx, ly, lz, ts = 1, rot) => { const m = ctx.at(lx, ly, lz); if (rot) m.multiply(rot); M(key).box(sx, sy, sz, m, ts); }, cyl: (key, r0, r1, len, lx, ly, lz, rot, seg = 12, ts = 1) => { const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, false); const m = ctx.at(lx, ly, lz); if (rot) m.multiply(rot); M(key).geo(g, m, ts); g.dispose(); } };
    def.build(ctx);
    if (def.solid !== false) {
      const cw = Math.abs(Math.cos(ang)) * w + Math.abs(Math.sin(ang)) * d, cd = Math.abs(Math.sin(ang)) * w + Math.abs(Math.cos(ang)) * d;
      const tipH = p.tipped ? Math.max(0.5, hh * 0.6) : hh;
      colliders.push({ x0: px - cw / 2, x1: px + cw / 2, z0: pz - cd / 2, z1: pz + cd / 2, y1: tipH, k: p.k });
    }
    if (p.k === 'locker') hides.push({ k: 'locker', x: px, z: pz, ang, fx: Math.sin(ang), fz: Math.cos(ang), mesh: null, d });
    if (p.k === 'bed' && !p.tipped) hides.push({ k: 'bed', x: px, z: pz, ang, fx: Math.sin(ang), fz: Math.cos(ang) });
    p.wx = px; p.wz = pz; p.ang = ang;
  }

  // ---- bake + meshes
  const group = new THREE.Group(); scene.add(group);
  for (const [key, b] of Object.entries(batches)) {
    if (!b.p.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
    baker.bakeGeometry(g); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, b.mat); mesh.matrixAutoUpdate = false; group.add(mesh);
  }

  // ---- night beyond the windows
  {
    const m = new THREE.MeshBasicMaterial({ color: 0x0d1424, fog: false });
    for (const wg of winGlass) {
      const g = new THREE.PlaneGeometry(1, 1); const len = Math.hypot(wg.b[0] - wg.a[0], wg.b[1] - wg.a[1]);
      const mesh = new THREE.Mesh(g, m); mesh.scale.set(len, wg.h1 - wg.h0, 1);
      mesh.position.set((wg.a[0] + wg.b[0]) / 2, (wg.h0 + wg.h1) / 2, (wg.a[1] + wg.b[1]) / 2); mesh.lookAt(mesh.position.x + wg.n[0], mesh.position.y, mesh.position.z + wg.n[2]);
      group.add(mesh);
    }
  }

  // ---- fixtures: glowing parts tied to their channel, merged per channel and colour
  const fixtureMats = {}; const fixB = {}; const houseB = new Batch(null); const cageB = new Batch(null);
  const fixBatch = (ch, col) => { const k = ch + col; if (!fixtureMats[k]) { fixtureMats[k] = { m: new THREE.MeshBasicMaterial({ color: new THREE.Color(col), fog: false }), ch, col: new THREE.Color(col) }; fixB[k] = new Batch(fixtureMats[k].m); } return fixB[k]; };
  const T4 = (x, y, z, rot) => { const m = new THREE.Matrix4().makeTranslation(x, y, z); if (rot) m.multiply(rot); return m; };
  const hazeB = { S: [], A: [], B: [], P: [] };
  for (const l of baker.lamps) {
    const x = l.wx, zz = l.wz;
    if (l.kind === 'tube') {
      houseB.box(1.25, 0.09, 0.32, T4(x, H - 0.05, zz), 1);
      for (const o of [-0.07, 0.07]) fixBatch(l.ch, l.col).geo(new THREE.CylinderGeometry(0.018, 0.018, 1.18, 6), T4(x, H - 0.11, zz + o, new THREE.Matrix4().makeRotationZ(Math.PI / 2)));
      hazeB[l.ch].push([l, x, zz, 1.6, 2.9]);
    } else if (l.kind === 'cage' || l.kind === 'bulb') {
      fixBatch(l.ch, l.col).geo(new THREE.SphereGeometry(0.07, 10, 8), T4(x, H - 0.16, zz));
      for (let i = 0; i < 4; i++) cageB.box(0.008, 0.2, 0.008, T4(x + Math.cos(i * 1.57) * 0.1, H - 0.16, zz + Math.sin(i * 1.57) * 0.1), 1);
      houseB.box(0.24, 0.04, 0.24, T4(x, H - 0.03, zz), 1);
      hazeB[l.ch].push([l, x, zz, 1.2, 2.6]);
    } else if (l.kind === 'candle') {
      houseB.geo(new THREE.CylinderGeometry(0.02, 0.022, 0.12, 8), T4(x, l.wy - 0.1, zz));
      fixBatch('S', 0xffb050).geo(new THREE.SphereGeometry(0.012, 6, 6).scale(1, 2, 1), T4(x, l.wy - 0.02, zz));
    }
  }
  const toMesh = (b, mat) => { if (!b.p.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); const m = new THREE.Mesh(g, mat); group.add(m); return m; };
  const housing = new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.7 });
  housing.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.02;'); };
  toMesh(houseB, housing); toMesh(cageB, new THREE.MeshBasicMaterial({ color: 0x111111 }));
  for (const [k, b] of Object.entries(fixB)) toMesh(b, fixtureMats[k].m);
  // haze cones: one mesh per channel; each cone carries its colour and strength
  const hazeCones = [];
  for (const [ch, cones] of Object.entries(hazeB)) {
    if (!cones.length) continue;
    const P = [], N = [], Y = [], Col = [];
    for (const [l, x, zz, r, h] of cones) {
      const g = new THREE.ConeGeometry(r, h, 20, 1, true).translate(0, -h / 2, 0).toNonIndexed(); const pa = g.attributes.position.array, na = g.attributes.normal.array;
      const c = new THREE.Color(l.col).multiplyScalar(l.i);
      for (let i = 0; i < pa.length / 3; i++) { P.push(pa[i * 3] + x, pa[i * 3 + 1] + H - 0.12, pa[i * 3 + 2] + zz); N.push(na[i * 3], na[i * 3 + 1], na[i * 3 + 2]); Y.push(-pa[i * 3 + 1]); Col.push(c.r, c.g, c.b); }
      g.dispose();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('depth', new THREE.Float32BufferAttribute(Y, 1)); geo.setAttribute('tint', new THREE.Float32BufferAttribute(Col, 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { k: { value: 0 } },
      vertexShader: 'attribute float depth; attribute vec3 tint; varying float vy; varying vec3 vn; varying vec3 vv; varying vec3 vc; void main(){ vy = depth; vc = tint; vec4 mv = modelViewMatrix * vec4(position,1.0); vn = normalize(normalMatrix * normal); vv = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying float vy; varying vec3 vn; varying vec3 vv; varying vec3 vc; void main(){ float edge = pow(abs(dot(vn, vv)), 1.5); float f = exp(-vy * 0.9) * edge * k * 0.06; gl_FragColor = vec4(vc * f, 1.0); }' });
    const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 5; group.add(mesh);
    hazeCones.push({ mesh, m, ch });
  }

  return {
    group, baker, mats, doors, colliders, hides, fixtureMats, hazeCones, lamps: baker.lamps,
    // current light at a point (rgb), using live channel levels
    lightAt(x, z, out = new THREE.Color()) {
      const fx = x / C - 0.5, fz = z / C - 0.5; const x0 = Math.floor(fx), z0 = Math.floor(fz); const tx = fx - x0, tz = fz - z0;
      let r = 0, g = 0, b = 0, wsum = 0;
      for (const [ox, oz, w] of [[0, 0, (1 - tx) * (1 - tz)], [1, 0, tx * (1 - tz)], [0, 1, (1 - tx) * tz], [1, 1, tx * tz]]) {
        const X = x0 + ox, Y = z0 + oz; if (!plan.at(X, Y)) continue; const o = (Y * W + X) * 6; const c = baker.cell, bo = baker.bounce;
        const ch = (c[o + 3] + bo[o + 3] * 0.2) * LIGHT.A.value + (c[o + 4] + bo[o + 4] * 0.2) * LIGHT.B.value + (c[o + 5] + bo[o + 5] * 0.2) * LIGHT.P.value;
        r += w * ((c[o] + bo[o] * 0.2) * LIGHT.S.value + ch * LIGHT.cool.value.r); g += w * ((c[o + 1] + bo[o + 1] * 0.2) * LIGHT.S.value + ch * LIGHT.cool.value.g); b += w * ((c[o + 2] + bo[o + 2] * 0.2) * LIGHT.S.value + ch * LIGHT.cool.value.b); wsum += w;
      }
      if (wsum > 0) { r /= wsum; g /= wsum; b /= wsum; }
      return out.setRGB(r + 0.004, g + 0.0035, b + 0.003);
    },
  };
}

// ------------------------------------------------------------ prop library
// size = [width x, height, depth z] in local space; front faces +z
const RX = (a) => new THREE.Matrix4().makeRotationX(a), RZ = (a) => new THREE.Matrix4().makeRotationZ(a), RY = (a) => new THREE.Matrix4().makeRotationY(a);
const PROPS = {
  table: { size: [2.4, 0.76, 0.9], tip: new THREE.Matrix4().makeTranslation(0, 0.45, 0).multiply(RX(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.38, 0)), build(c) {
    const s = c.p.small ? 0.45 : 1; c.box('wood', 2.4 * s, 0.05, 0.9 * (c.p.small ? 0.8 : 1), 0, 0.74, 0, 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box('metal', 0.05, 0.72, 0.05, sx * 1.1 * s, 0.36, sz * 0.38 * (c.p.small ? 0.8 : 1));
  } },
  chair: { size: [0.45, 0.9, 0.45], tip: new THREE.Matrix4().makeTranslation(0, 0.22, 0).multiply(RZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.22, 0)), build(c) {
    c.box('wood', 0.44, 0.04, 0.42, 0, 0.45, 0); c.box('wood', 0.44, 0.4, 0.03, 0, 0.7, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box('metal', 0.03, 0.45, 0.03, sx * 0.19, 0.22, sz * 0.18);
  } },
  counter: { size: [4, 1.0, 0.7], snap: true, build(c) { c.box('metal', 4, 0.95, 0.68, 0, 0.475, 0, 1); c.box('metal', 4, 0.04, 0.72, 0, 0.97, 0, 1); for (let i = 0; i < 5; i++) c.box('black', 0.6, 0.2, 0.45, -1.6 + i * 0.8, 0.9, 0); } },
  bed: { size: [0.95, 0.6, 2.05], build(c) {
    for (const sx of [-1, 1]) { c.box('metal', 0.04, 0.04, 2.0, sx * 0.45, 0.4, 0); for (const sz of [-1, 1]) c.box('metal', 0.04, 0.4, 0.04, sx * 0.45, 0.2, sz * 0.98); }
    c.box('metal', 0.94, 0.5, 0.04, 0, 0.55, -1.0); for (let i = 0; i < 5; i++) c.box('metal', 0.02, 0.4, 0.02, -0.36 + i * 0.18, 0.62, -1.0);
    c.box('mattress', 0.86, 0.15, 1.92, 0, 0.5, 0.02, 1); c.box('sheet', 0.7, 0.05, 0.4, 0.05, 0.6, -0.72, 1);
    c.box('metal', 0.88, 0.02, 1.95, 0, 0.42, 0); for (const sz of [-0.6, 0, 0.6]) c.box('metal', 0.03, 0.02, 0.03, 0, 0.12, sz);   // springs/cross
    for (const sx of [-1, 1]) c.box('metal', 0.18, 0.02, 0.02, sx * 0.45, 0.32, 0.6);   // restraint straps hanging
  } },
  bucket: { size: [0.3, 0.32, 0.3], solid: false, build(c) { c.cyl('metal', 0.15, 0.12, 0.32, 0, 0.16, 0, null, 12); c.cyl('black', 0.135, 0.135, 0.01, 0, 0.28, 0, null, 12); } },
  locker: { size: [0.62, 1.95, 0.55], snap: true, build(c) {
    c.box('metal', 0.62, 1.95, 0.04, 0, 0.975, -0.255); for (const sx of [-1, 1]) c.box('metal', 0.03, 1.95, 0.55, sx * 0.295, 0.975, 0); c.box('metal', 0.62, 0.03, 0.55, 0, 1.935, 0); c.box('metal', 0.62, 0.08, 0.55, 0, 0.04, 0);
    // door with vent slats you can see through
    const y0 = 0.08; c.box('metal', 0.56, 1.2, 0.02, 0, y0 + 0.6, 0.265); c.box('metal', 0.56, 0.28, 0.02, 0, 1.92 - 0.14, 0.265);
    for (let i = 0; i < 7; i++) c.box('metal', 0.56, 0.028, 0.06, 0, 1.36 + i * 0.045, 0.255, 1, RX(-0.6));
    c.box('black', 0.03, 0.12, 0.03, 0.22, 1.1, 0.29);
  } },
  sofa: { size: [2.0, 0.85, 0.85], build(c) { c.box('sheet', 2, 0.42, 0.8, 0, 0.21, 0, 1); c.box('sheet', 2, 0.45, 0.2, 0, 0.62, -0.32, 1); for (const s of [-1, 1]) c.box('sheet', 0.2, 0.25, 0.8, s * 0.9, 0.52, 0, 1); } },
  tv: { size: [0.9, 1.7, 0.6], snap: true, build(c) { c.box('wood', 0.9, 0.9, 0.55, 0, 0.45, 0); c.box('black', 0.7, 0.55, 0.5, 0, 1.18, 0); c.box('glassdark', 0.55, 0.42, 0.02, 0, 1.18, 0.26); } },
  wheelchair: { size: [0.65, 0.95, 0.75], build(c) {
    for (const s of [-1, 1]) { c.cyl('rubber', 0.3, 0.3, 0.04, s * 0.32, 0.3, -0.05, RZ(Math.PI / 2), 16); c.cyl('metal', 0.07, 0.07, 0.03, s * 0.24, 0.07, 0.3, RZ(Math.PI / 2), 8); c.box('metal', 0.025, 0.5, 0.025, s * 0.25, 0.75, -0.3); }
    c.box('sheet', 0.48, 0.04, 0.45, 0, 0.5, 0); c.box('sheet', 0.48, 0.42, 0.03, 0, 0.75, -0.24);
  } },
  piano: { size: [1.5, 1.25, 0.6], snap: true, build(c) { c.box('wood', 1.5, 1.25, 0.55, 0, 0.62, 0); c.box('wood', 1.5, 0.08, 0.3, 0, 0.72, 0.4); c.box('paper', 1.3, 0.02, 0.16, 0, 0.77, 0.44); } },
  stall: { size: [0.1, 2.0, 1.4], snap: false, build(c) { c.box('metal', 1.6, 2.0, 0.04, 0, 1.0, 0); c.cyl('metal', 0.012, 0.012, 0.5, -0.7, 2.1, 0.3, RX(Math.PI / 2), 6); c.cyl('metal', 0.06, 0.03, 0.06, -0.7, 2.08, 0.55, null, 8); } },
  tub: { size: [0.85, 0.65, 1.8], build(c) { c.box('porcelain', 0.85, 0.08, 1.8, 0, 0.12, 0, 1); for (const s of [-1, 1]) { c.box('porcelain', 0.08, 0.6, 1.8, s * 0.385, 0.38, 0, 1); c.box('porcelain', 0.85, 0.6, 0.08, 0, 0.38, s * 0.86, 1); } c.box('filthwater', 0.7, 0.02, 1.64, 0, 0.5, 0, 1); } },
  drawers: { size: [6, 2.4, 0.9], snap: true, build(c) { c.box('metal', 6, 2.4, 0.86, 0, 1.2, 0, 1); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const open = (i * 3 + j) % 7 === 2; c.box('metal', 0.85, 0.62, 0.05, -2.5 + i, 0.5 + j * 0.75, 0.45 + (open ? 0.6 : 0)); c.box('black', 0.2, 0.03, 0.05, -2.5 + i, 0.72 + j * 0.75, 0.49 + (open ? 0.6 : 0)); if (open) c.box('sheet', 0.6, 0.18, 0.9, -2.5 + i, 0.42 + j * 0.75, 0.2 + 0.4, 1); } } },
  slab: { size: [0.9, 0.9, 2.1], build(c) { c.box('metal', 0.9, 0.05, 2.1, 0, 0.88, 0); c.cyl('metal', 0.12, 0.18, 0.86, 0, 0.43, 0, null, 10); c.cyl('black', 0.04, 0.04, 0.05, 0, 0.91, 0.85, null, 8); } },
  gurney: { size: [0.7, 0.9, 2.0], tip: new THREE.Matrix4().makeTranslation(0, 0.35, 0).multiply(RZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.35, 0)), build(c) { c.box('metal', 0.66, 0.04, 1.95, 0, 0.8, 0); c.box('sheet', 0.62, 0.08, 1.9, 0, 0.86, 0, 1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { c.box('metal', 0.03, 0.75, 0.03, sx * 0.3, 0.4, sz * 0.9); c.cyl('rubber', 0.05, 0.05, 0.03, sx * 0.3, 0.05, sz * 0.9, RZ(Math.PI / 2), 8); } } },
  sinkrow: { size: [3, 1.0, 0.6], snap: true, build(c) { for (let i = 0; i < 3; i++) { c.box('porcelain', 0.75, 0.2, 0.55, -1 + i, 0.85, 0); c.box('metal', 0.04, 0.85, 0.04, -1 + i, 0.42, 0.1); c.cyl('metal', 0.015, 0.015, 0.2, -1 + i, 1.05, -0.2, RX(1.2), 6); } } },
  generator: { size: [2.4, 1.6, 1.4], build(c) { c.box('metal', 2.4, 1.3, 1.3, 0, 0.75, 0, 1); c.box('black', 2.5, 0.12, 1.4, 0, 0.06, 0); c.cyl('metal', 0.35, 0.35, 1.3, -0.6, 1.4, 0, RZ(Math.PI / 2), 16); c.box('black', 0.6, 0.5, 0.05, 0.7, 0.95, 0.66); for (let i = 0; i < 3; i++) c.cyl('black', 0.06, 0.06, 0.08, 0.5 + i * 0.2, 0.95, 0.69, RX(Math.PI / 2), 10); c.cyl('metal', 0.08, 0.08, 1.8, 0.9, 2.2, -0.4, null, 8); } },
  pipes: { size: [3.5, 3.0, 0.5], snap: true, solid: false, build(c) { for (let i = 0; i < 4; i++) c.cyl('metal', 0.06 + i * 0.02, 0.06 + i * 0.02, 3.5, 0, 0.6 + i * 0.6, 0, RZ(Math.PI / 2), 10); for (const x of [-1.2, 0.4, 1.4]) c.cyl('metal', 0.07, 0.07, 3, x, 1.5, 0.12, null, 8); } },
  crate: { size: [0.9, 0.8, 0.9], build(c) { c.box('wood', 0.9, 0.8, 0.9, 0, 0.4, 0, 0.6); for (const y of [0.1, 0.7]) c.box('metal', 0.92, 0.04, 0.92, 0, y, 0); } },
  shelf: { size: [1.6, 2.1, 0.5], snap: true, build(c) { for (const s of [-1, 1]) c.box('metal', 0.04, 2.1, 0.5, s * 0.78, 1.05, 0); for (let i = 0; i < 5; i++) { c.box('metal', 1.56, 0.02, 0.48, 0, 0.1 + i * 0.48, 0); for (let j = 0; j < 4; j++) if (c.R() > 0.35) c.box(c.R() > 0.5 ? 'paper' : 'wood', 0.2 + c.R() * 0.2, 0.15 + c.R() * 0.2, 0.3, -0.55 + j * 0.37, 0.2 + i * 0.48 + 0.08, 0, 0.5); } } },
  secdesk: { size: [2.6, 1.3, 0.8], snap: true, build(c) { c.box('wood', 2.6, 0.06, 0.8, 0, 0.76, 0); c.box('wood', 2.6, 0.74, 0.05, 0, 0.37, -0.36); for (let i = 0; i < 4; i++) { c.box('black', 0.42, 0.36, 0.35, -0.9 + i * 0.6, 1.0, -0.15); c.box('screen', 0.34, 0.27, 0.01, -0.9 + i * 0.6, 1.0, 0.03); } c.box('black', 0.6, 0.06, 0.25, 0.2, 0.82, 0.2); for (let i = 0; i < 6; i++) c.box(i === 3 ? 'redbtn' : 'metal', 0.06, 0.03, 0.06, -0.02 + i * 0.09, 0.86, 0.2); } },
  filing: { size: [0.5, 1.35, 0.65], snap: true, build(c) { c.box('metal', 0.5, 1.35, 0.62, 0, 0.675, 0); for (let i = 0; i < 4; i++) { c.box('metal', 0.44, 0.3, 0.02, 0, 0.2 + i * 0.32, 0.32 + (i === 1 ? 0.25 : 0)); c.box('black', 0.12, 0.02, 0.03, 0, 0.28 + i * 0.32, 0.34 + (i === 1 ? 0.25 : 0)); } } },
  reception: { size: [3.2, 1.15, 1.0], build(c) { c.box('wood', 3.2, 1.1, 0.12, 0, 0.55, 0.44); for (const s of [-1, 1]) c.box('wood', 0.12, 1.1, 1.0, s * 1.54, 0.55, 0); c.box('wood', 3.3, 0.05, 0.4, 0, 1.13, 0.45); c.box('wood', 3.0, 0.05, 0.7, 0, 0.75, 0); c.box('black', 0.4, 0.3, 0.35, -0.8, 0.93, 0); } },
  bench: { size: [0.5, 0.5, 1.8], build(c) { c.box('wood', 0.45, 0.05, 1.8, 0, 0.45, 0); for (const s of [-1, 1]) c.box('metal', 0.4, 0.43, 0.05, 0, 0.21, s * 0.8); } },
  plant: { size: [0.5, 1.2, 0.5], build(c) { c.cyl('porcelain', 0.22, 0.16, 0.4, 0, 0.2, 0, null, 12); for (let i = 0; i < 6; i++) c.box('black', 0.02, 0.6 + c.R() * 0.3, 0.02, 0, 0.6, 0, 1, RZ((c.R() - 0.5) * 0.9).multiply(RX((c.R() - 0.5) * 0.9))); } },
  desk: { size: [1.6, 0.8, 0.8], build(c) { c.box('wood', 1.6, 0.05, 0.8, 0, 0.75, 0); c.box('wood', 0.45, 0.72, 0.75, 0.55, 0.36, 0); c.box('wood', 0.05, 0.72, 0.75, -0.77, 0.36, 0); c.box('paper', 0.3, 0.01, 0.22, -0.2, 0.78, 0.1, 1, RY(0.3)); c.cyl('metal', 0.08, 0.1, 0.03, 0.5, 0.79, -0.2, null, 10); c.cyl('metal', 0.012, 0.012, 0.35, 0.5, 0.95, -0.2, RZ(0.4), 6); c.cyl('lampshade', 0.05, 0.12, 0.12, 0.42, 1.12, -0.2, null, 10); } },
  cross: { size: [1.0, 1.6, 0.12], snap: true, solid: false, build(c) { c.box('wood', 0.12, 1.6, 0.08, 0, 1.6, 0); c.box('wood', 0.9, 0.12, 0.08, 0, 2.0, 0); } },
  ivstand: { size: [0.4, 1.9, 0.4], solid: false, build(c) { c.cyl('metal', 0.012, 0.012, 1.85, 0, 0.93, 0, null, 6); for (let i = 0; i < 4; i++) c.box('metal', 0.32, 0.02, 0.02, 0, 0.04, 0, 1, RY(i * Math.PI / 4)); c.box('metal', 0.3, 0.015, 0.015, 0, 1.84, 0); c.box('sheet', 0.1, 0.16, 0.04, 0.12, 1.7, 0, 1); c.cyl('rubber', 0.004, 0.004, 0.9, 0.12, 1.15, 0.05, RX(0.1), 4); } },
  trolley: { size: [0.6, 0.9, 1.0], tip: new THREE.Matrix4().makeTranslation(0, 0.3, 0).multiply(RZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, -0.3, 0)), build(c) { for (const y of [0.25, 0.85]) c.box('metal', 0.56, 0.02, 0.95, 0, y, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box('metal', 0.02, 0.85, 0.02, sx * 0.27, 0.43, sz * 0.46); for (let i = 0; i < 4; i++) c.box(i % 2 ? 'porcelain' : 'metal', 0.08, 0.04, 0.2, -0.15 + i * 0.1, 0.88, -0.2 + (i % 3) * 0.2); } },
};
// a few colour-only materials props refer to
export const EXTRA_MATS = {
  filthwater: () => bakedMaterial({ color: 0x2a200c, roughness: 0.05 }),
  screen: () => bakedMaterial({ color: 0x0a120c, emissive: 0x0a2a10, roughness: 0.1 }),
  redbtn: () => bakedMaterial({ color: 0x6a0806, emissive: 0x200000 }),
  lampshade: () => bakedMaterial({ color: 0x6a5a30, emissive: 0x3a2a08 }),
};

// Stains, scrawl and the dead are laid over the build by main once the
// body module exists (see dressing.js).
// find the wall face nearest to (x, z), trying the preferred side first
function snapWall(world, x, z, pref) {
  const D4 = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }; let best = null;
  for (const k of [pref, 'n', 's', 'e', 'w']) {
    const dir = D4[k]; if (!dir) continue; let px = x, pz = z, hit = false;
    for (let i = 0; i < 70; i++) { if (world.baker.solid(px + dir[0] * 0.02, pz + dir[1] * 0.02)) { hit = true; break; } px += dir[0] * 0.04; pz += dir[1] * 0.04; }
    if (!hit) continue; const d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d - (k === pref ? -0.3 : 0)) best = { d, px: px - dir[0] * 0.012, pz: pz - dir[1] * 0.012, dir };
  }
  return best;
}
export function laydecals(world, plan, scene) {
  const { tex, cells } = T.decals;
  const mat = bakedMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.3 });
  const b = new Batch(mat); const R = rng(99);
  const uvq = (name) => { const [u0, v0, u1, v1] = cells[name]; return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; };
  const floorDecal = (name, x, z, s, a) => {
    const ca = Math.cos(a) * s / 2, sa = Math.sin(a) * s / 2; const y = 0.006 + R() * 0.002; const u = uvq(name);
    b.quad([x - ca - sa, y, z + sa - ca], [x + ca - sa, y, z - sa - ca], [x + ca + sa, y, z - sa + ca], [x - ca + sa, y, z + sa + ca], [0, 1, 0], u[0], u[1], u[2], u[3]);
  };
  const wallDecal = (name, x, z, wall, s, y0) => {
    // find the wall surface by marching toward it
    const sw = snapWall(world, x, z, wall); if (!sw) return null; const { px, pz, dir } = sw;
    const tx = -dir[1], tz = dir[0]; const h = s / 2; const u = uvq(name); const n = [-dir[0], 0, -dir[1]];
    b.quad([px - tx * h, y0, pz - tz * h], [px + tx * h, y0, pz + tz * h], [px + tx * h, y0 + s, pz + tz * h], [px - tx * h, y0 + s, pz - tz * h], n, u[0], u[1], u[2], u[3]);
    return { px, pz, tx, tz, n };
  };
  for (const gd of plan.gore) {
    const x = cx(gd.x), z = cz(gd.y);
    if (gd.k === 'pool') floorDecal('pool' + ((gd.x * 3 + gd.y) | 0) % 3, x, z, 1.1 * gd.s + 0.4, R() * 6.28);
    if (gd.k === 'smear') { wallDecal(R() > 0.5 ? 'wallsmear' : 'hands', x, z, gd.wall, 1.4, 0.5 + R() * 0.5); }
  }
  // drag trails between some pools, filth and damp everywhere
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * D; if (!plan.at(x | 0, y | 0)) continue;
    const zone = plan.at(x | 0, y | 0); const name = zone === Z.SHOWER || zone === Z.MORGUE ? (R() > 0.5 ? 'puddle' : 'filth') : ['filth', 'puddle', 'smear', 'spray', 'filth'][(R() * 5) | 0];
    floorDecal(name, x * C, y * C, 0.8 + R() * 1.4, R() * 6.28);
  }
  for (let i = 0; i < 30; i++) {
    const x = (R() * W) | 0, y = (R() * D) | 0; if (!plan.at(x, y)) continue;
    for (const [w, dx, dy] of [['n', 0, -1], ['s', 0, 1], ['e', 1, 0], ['w', -1, 0]]) if (!plan.at(x + dx, y + dy) && R() > 0.5) { wallDecal(R() > 0.7 ? 'hands' : R() > 0.5 ? 'spray' : 'wallsmear', cx(x), cz(y), w, 0.8 + R() * 0.8, 0.3 + R() * 1.2); break; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
  world.baker.bakeGeometry(g);
  const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 1; scene.add(mesh);
  // the writing on the walls
  for (const gd of plan.gore) if (gd.k === 'scrawl') {
    const m = bakedMaterial({ map: scrawlTexture(gd.t, (gd.x * 13 + gd.y) | 0), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.4 });
    const bb = new Batch(m); const s = 2.4;
    const sw = snapWall(world, cx(gd.x), cz(gd.y), gd.wall); if (!sw) continue; const { px, pz, dir } = sw; const tx = -dir[1], tz = dir[0]; const n = [-dir[0], 0, -dir[1]]; const y0 = 1.3;
    bb.quad([px - tx * s / 2, y0, pz - tz * s / 2], [px + tx * s / 2, y0, pz + tz * s / 2], [px + tx * s / 2, y0 + s / 4, pz + tz * s / 2], [px - tx * s / 2, y0 + s / 4, pz - tz * s / 2], n, [0, 0], [1, 0], [1, 1], [0, 1]);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(bb.p, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(bb.n, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(bb.u, 2));
    world.baker.bakeGeometry(gg); const sm = new THREE.Mesh(gg, m); sm.renderOrder = 1; scene.add(sm);
  }
}
export { Batch };

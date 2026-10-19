// Dressing: the dead and the air. Corpses posed where they were left
// (slabs, slumped against walls, hanged from pipes, in the tub), opened
// bodies with their insides out, piles of offal with flies, the dust and
// damp hanging in the beams, water dripping from the ceiling, steam in
// the showers.
import * as THREE from '../vendor/three.module.js';
import { C, H, cx, cz, liftAt, ceilOf } from './plan.js?v=33';
import { makeBody, pose } from './carcass.js?v=33';
import { rng } from './surfaces.js?v=33';

const V = THREE.Vector3;

function gutsMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x5a1a14, roughness: 0.25, metalness: 0 });
  m.userData.uAmb = { value: new THREE.Color(0.02, 0.02, 0.02) };
  m.onBeforeCompile = (sh) => { sh.uniforms.uAmb = m.userData.uAmb; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAmb;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uAmb * 1.4 + uAmb * 0.15;'); };
  return m;
}
// a coil of intestine and torn meat: tubes along a wandering curve
function offal(R, n = 3, spread = 0.35) {
  const g = new THREE.Group(); const mat = gutsMaterial(); const dark = gutsMaterial(); dark.color.setHex(0x2a0806);
  for (let k = 0; k < n; k++) {
    const pts = []; let p = new V((R() - 0.5) * spread, 0.03, (R() - 0.5) * spread); let a = R() * 6.28;
    for (let i = 0; i < 14; i++) { pts.push(p.clone()); a += (R() - 0.5) * 1.8; p = p.clone().add(new V(Math.cos(a) * 0.06, (R() - 0.4) * 0.02, Math.sin(a) * 0.06)); p.y = Math.max(0.02, Math.min(0.12, p.y)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018 + R() * 0.01, 7), k % 3 === 2 ? dark : mat);
    tube.geometry.attributes.position.array.forEach((v, i, arr) => { if (i % 3 === 1) arr[i] += Math.sin(i * 0.37) * 0.003; });
    g.add(tube);
  }
  for (let i = 0; i < 4; i++) { const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04 + R() * 0.05, 1), R() > 0.5 ? mat : dark); lump.scale.set(1, 0.5, 1.3); lump.position.set((R() - 0.5) * spread, 0.03, (R() - 0.5) * spread); g.add(lump); }
  g.userData.mats = [mat, dark];
  return g;
}

export class Dressing {
  constructor(world, plan, scene) {
    this.world = world; this.scene = scene; this.dead = []; this.mats = [];
    const R = rng(1234); this.R = R;
    // a big building (Tape 4) dresses one area at a time: the first now, the rest a body per frame as you get near
    this.queue = []; this.pending = [];
    for (const [i, gd] of plan.gore.entries()) { if (plan.lazyGore && gd.reg !== plan.lazyGore) this.pending.push([i, gd]); else this.addGore(i, gd); }
    for (const b of this.dead) b.mat.userData.uAmb.value.copy(world.lightAt(b.root.position.x, b.root.position.z));
    for (const g of this.mats) g.m.userData.uAmb.value.copy(world.lightAt(g.x, g.z));
    if (plan.tape === 4) { this.motes(); this.steamS = []; }
    else if (plan.tape !== 3) { this.motes(); this.drips(plan); this.steam(plan); }   // (in 1989 the roof didn't leak yet)
    else this.steamS = [];
  }
  // queue an area's dead; pump() builds one per call
  dressRegion(reg) { const rest = []; for (const e of this.pending) (e[1].reg === reg ? this.queue : rest).push(e); this.pending = rest; }
  pump() { const e = this.queue.shift(); if (!e) return false; const n = this.dead.length, m = this.mats.length; this.addGore(e[0], e[1]); for (const b of this.dead.slice(n)) b.mat.userData.uAmb.value.copy(this.world.lightAt(b.root.position.x, b.root.position.z)); for (const g of this.mats.slice(m)) g.m.userData.uAmb.value.copy(this.world.lightAt(g.x, g.z)); return true; }
  addGore(i, gd) {
    const { world, scene } = this; const R = this.R;
    {
      const x = cx(gd.x), z = cz(gd.y);
      if (gd.k === 'corpse' || gd.k === 'hanged') {
        const b = makeBody('corpse', 100 + i, { face: ['dead', 'sewn', 'gouged', 'lobotomy', 'smile'][i % 5], outfit: gd.open ? 'rags' : 'gown' });
        b.mesh.frustumCulled = true; b.root.position.set(x, 0, z);
        if (gd.k === 'hanged') {
          pose(b, 'hang', 0); b.root.position.y = H - 0.25 - 1.95 * b.s; b.root.rotation.y = R() * 6.28;
          const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 1 })); rope.position.set(x, ceilOf(Math.floor(x / C), Math.floor(z / C)) - 0.28, z); scene.add(rope);
          b.swing = { x, z, k: R() * 6 };
        } else if (gd.on === 'slab' || gd.on === 'bed') { pose(b, 'lie', 0); b.root.rotation.set(-Math.PI / 2, 0, 0); b.root.position.set(x, gd.on === 'bed' ? 0.64 : 0.93, z + 0.95); }
        else if (gd.tub) { pose(b, 'slump', 0); b.root.position.set(x, 0.12, z - 0.6); }
        else if (gd.slump) {
          pose(b, 'slump', 0);
          // sit with the back to the nearest wall
          let best = 0, bd = 9; for (let a = 0; a < 4; a++) { const dx = Math.sin(a * Math.PI / 2), dz = Math.cos(a * Math.PI / 2); for (let s = 0.1; s < 1.6; s += 0.1) if (world.baker.solid(x + dx * s, z + dz * s)) { if (s < bd) { bd = s; best = a; } break; } }
          const dx = Math.sin(best * Math.PI / 2), dz = Math.cos(best * Math.PI / 2); b.root.position.set(x + dx * (bd - 0.32), 0, z + dz * (bd - 0.32)); b.root.rotation.y = best * Math.PI / 2 + Math.PI;
        } else { pose(b, 'lie', 0); b.root.rotation.set(-Math.PI / 2, 0, R() * 6.28, 'YXZ'); b.root.position.y = 0.1; }
        const lf = liftAt(x, z); b.root.position.y += gd.k === 'hanged' ? ceilOf(Math.floor(x / C), Math.floor(z / C)) - H : lf;
        scene.add(b.root); this.dead.push(b);
        if (gd.open) { const o = offal(R, 3, 0.25); o.position.copy(b.root.position); if (gd.on !== 'slab' && gd.on !== 'bed') o.position.y = lf; o.position.y += gd.on === 'slab' ? 0.08 : 0.0; if (gd.on === 'slab' || gd.on === 'bed') { o.position.z -= 0.5; if (gd.on === 'bed') o.position.y = 0.6; } scene.add(o); this.mats.push(...o.userData.mats.map((m) => ({ m, x: o.position.x, z: o.position.z }))); }
        this.addFlies(new V(x, (gd.k === 'hanged' ? 1.4 : 0.7), z));
      }
      if (gd.k === 'pile') { const o = offal(R, 5, 0.5); o.position.set(x, liftAt(x, z), z); scene.add(o); this.mats.push(...o.userData.mats.map((m) => ({ m, x, z }))); this.addFlies(new V(x, 0.4, z)); }
    }
  }
  addFlies(at) {
    const n = 26; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x050505, size: 0.012, sizeAttenuation: true })); this.scene.add(pts);
    (this.flies ||= []).push({ pts, at, lift: liftAt(at.x, at.z), seeds: Array.from({ length: n }, () => [Math.random() * 10, 0.6 + Math.random() * 1.5, 0.15 + Math.random() * 0.45]), sound: null });
  }
  motes() {
    // dust and damp hanging in the air around you, catching what light there is
    const n = 500; const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) p[i] = (Math.random() - 0.5) * 12;
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, c: { value: new V() }, L: { value: new THREE.Color() } },
      vertexShader: `uniform float t; uniform vec3 c; varying float vA;
        void main(){ vec3 p = position; p.x += sin(t * 0.13 + position.y * 3.0) * 0.4; p.y += sin(t * 0.07 + position.x) * 0.3; p.z += cos(t * 0.11 + position.z * 2.0) * 0.4;
          vec3 w = c + mod(p - c + 6.0, 12.0) - 6.0; w.y = c.y - 1.5 + clamp(mod(p.y + t * -0.02, 3.0), 0.1, 3.1);
          vec4 mv = modelViewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z; vA = smoothstep(0.3, 1.0, d) * (1.0 - smoothstep(4.0, 7.0, d)); gl_PointSize = clamp(5.0 / max(d, 0.3), 1.0, 4.0); }`,
      fragmentShader: 'uniform vec3 L; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(q)); gl_FragColor = vec4(L * a * vA * 1.2, 1.0); }' });
    this.moteMat = m; const pts = new THREE.Points(g, m); pts.frustumCulled = false; this.scene.add(pts);
  }
  drips(plan) {
    // water drops from the ceiling in a few spots, landing in puddles
    this.dripPts = []; const R = rng(55);
    for (let i = 0; i < 18; i++) { const x = (R() * 47) | 0, y = (R() * 40) | 0; if (!plan.at(x, y) || plan.at(x, y) === 13) continue; this.dripPts.push({ x: cx(x) + (R() - 0.5), z: cz(y) + (R() - 0.5), t: R() * 3, rate: 1.2 + R() * 3 }); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.dripPts.length * 3), 3));
    this.dripMesh = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa8a0, size: 0.018, transparent: true, opacity: 0.6 })); this.dripMesh.frustumCulled = false; this.scene.add(this.dripMesh);
  }
  steam(plan) {
    // a warm haze in the showers that the camcorder lamp lights up
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    this.steamS = [];
    for (let i = 0; i < 26; i++) { const m = new THREE.SpriteMaterial({ map: tex, color: 0x9a9a90, transparent: true, opacity: 0.05, depthWrite: false }); const s = new THREE.Sprite(m); s.scale.setScalar(2.5 + Math.random() * 2); s.position.set(cx(38 + Math.random() * 8), 0.6 + Math.random() * 2.2, cz(8 + Math.random() * 8)); this.scene.add(s); this.steamS.push(s); }
  }
  update(dt, at, camera) {
    this.t = (this.t || 0) + dt; const t = this.t;
    for (const b of this.dead) if (b.swing) { b.root.rotation.z = Math.sin(t * 0.6 + b.swing.k) * 0.02; b.root.rotation.y += dt * 0.03 * Math.sin(t * 0.2 + b.swing.k); }
    if (this.flies) { let best = null, bd = 8; for (const f of this.flies) { const d = f.at.distanceTo(at); if (d < bd) { bd = d; best = f; } } const S = window.__asy && window.__asy.sound; if (S && S.on) S.fliesAt(best ? best.at : at, best ? 1 - bd / 8 : 0); }
    if (this.flies) for (const f of this.flies) {
      const d = f.at.distanceTo(at); f.pts.visible = d < 12; if (!f.pts.visible) continue;
      const a = f.pts.geometry.attributes.position.array; f.seeds.forEach(([s, sp, r], i) => { const k = t * sp * 3 + s; a[i * 3] = f.at.x + Math.sin(k) * r + Math.sin(k * 3.1) * 0.05; a[i * 3 + 1] = f.at.y + f.lift + Math.sin(k * 1.7) * 0.25; a[i * 3 + 2] = f.at.z + Math.cos(k * 1.3) * r; });
      f.pts.geometry.attributes.position.needsUpdate = true;
    }
    if (this.moteMat) { this.moteMat.uniforms.t.value = t; this.moteMat.uniforms.c.value.set(at.x, 1.5 + liftAt(at.x, at.z), at.z); const L = this.world.lightAt(at.x, at.z); this.moteMat.uniforms.L.value.copy(L).multiplyScalar(0.5).addScalar(0.0015); }
    if (this.dripMesh) {
      const a = this.dripMesh.geometry.attributes.position.array;
      this.dripPts.forEach((d, i) => { d.t += dt; const k = (d.t % d.rate) / 0.75; a[i * 3] = d.x; a[i * 3 + 2] = d.z; a[i * 3 + 1] = k < 1 ? H - 0.05 - k * k * (H - 0.05) : -1; if (k >= 1 && !d.hit) { d.hit = true; const s = window.__asy && window.__asy.sound; if (s && s.on && Math.hypot(d.x - at.x, d.z - at.z) < 9) s.tone(new V(d.x, 0, d.z), { f: 1800 + i * 90, f2: 900, dur: 0.07, gain: 0.1, verb: 0.6 }); } if (k < 1) d.hit = false; });
      this.dripMesh.geometry.attributes.position.needsUpdate = true;
    }
    if (this.steamS) for (const [i, s] of this.steamS.entries()) { s.position.y += Math.sin(t * 0.2 + i) * dt * 0.05; s.material.rotation = t * 0.02 * (i % 2 ? 1 : -1); }
  }
}

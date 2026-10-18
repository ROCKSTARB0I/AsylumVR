// Hinged doors: each leaf is baked like the walls in its closed pose, then
// swung about its hinge. Collision treats the leaf as a segment, so a half
// open door still blocks you (and them).
import * as THREE from '../vendor/three.module.js';
import { C } from './plan.js?v=9';
import { T } from './surfaces.js?v=9';
import { bakedMaterial, Batch } from './mason.js?v=9';

export class Doors {
  constructor(world, scene) {
    this.list = [];
    const wood = bakedMaterial({ map: T.door.map, normalMap: T.door.normalMap, roughnessMap: T.door.roughnessMap });
    const steel = bakedMaterial({ map: T.metal.map, normalMap: T.metal.normalMap, roughnessMap: T.metal.roughnessMap, metalness: 0.3 });
    for (const d of world.doors) {
      const metal = d.cell || d.heavy; const b = new Batch(metal ? steel : wood);
      const L = C - 0.3, Ht = 2.28, th = metal ? 0.07 : 0.05;
      const x0 = d.x * C, z0 = d.y * C;
      // hinge position and the axis the leaf runs along when closed
      const hinge = d.pass === 'x' ? new THREE.Vector3(d.wx, 0, z0 + 0.15) : new THREE.Vector3(x0 + 0.15, 0, d.wz);
      const along = d.pass === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
      const mid = hinge.clone().addScaledVector(along, L / 2); mid.y = Ht / 2 + 0.01;
      const rot = d.pass === 'x' ? new THREE.Matrix4().makeRotationY(Math.PI / 2) : new THREE.Matrix4();
      const m = (ox, oy, oz) => rot.clone().setPosition(mid.x, mid.y, mid.z).multiply(new THREE.Matrix4().makeTranslation(ox, oy, oz));
      if (d.cell) {
        // cell door: steel with a sliding observation hatch and a food slot
        b.box(L, Ht - 0.5, th, m(0, -0.25, 0), 1); b.box(L, 0.18, th, m(0, Ht / 2 - 0.09, 0), 1);
        b.box(0.3, 0.32, th, m(-0.42, Ht / 2 - 0.34, 0), 1); b.box(0.3, 0.32, th, m(0.42, Ht / 2 - 0.34, 0), 1);
        b.box(0.32, 0.03, 0.1, m(0, -0.35, 0.04), 1);
        for (let i = 0; i < 3; i++) b.box(0.012, 0.32, 0.012, m(-0.1 + i * 0.1, Ht / 2 - 0.34, 0), 1);
      } else {
        b.box(L, Ht, th, m(0, 0, 0), 1);
        if (!d.heavy) { b.box(0.45, 0.6, 0.012, m(0, 0.45, th / 2 + 0.003), 1); b.box(0.45, 0.6, 0.012, m(0, 0.45, -th / 2 - 0.003), 1); }   // panel mouldings
      }
      for (const s of [1, -1]) b.box(0.03, 0.16, 0.05, m(L / 2 - 0.1, -0.1, s * (th / 2 + 0.03)), 1);   // handles
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
      world.baker.bakeGeometry(g);
      g.translate(-hinge.x, 0, -hinge.z);
      const mesh = new THREE.Mesh(g, b.mat); mesh.position.copy(hinge); scene.add(mesh);
      // some doors start ajar, a few wide open
      const h = ((d.x * 31 + d.y * 17) % 10) / 10;
      const a0 = d.cell ? (h > 0.4 ? 1.5 * (h > 0.7 ? 1 : -1) : 0) : (h > 0.65 ? 1.5 : h > 0.45 ? 0.4 : 0);
      const door = { ...d, mesh, hinge, along, L, angle: d.lock ? 0 : a0, target: d.lock ? 0 : a0, metal, locked: !!(d.locked || d.lock), speed: 2.2, bang: 0 };
      mesh.rotation.y = d.lock ? 0 : a0;
      this.list.push(door);
    }
  }
  // the leaf as a segment in the world right now
  seg(d) {
    const a = d.angle, L = d.L;
    const dir = d.pass === 'x' ? [Math.sin(a), Math.cos(a)] : [Math.cos(a), -Math.sin(a)];
    return [d.hinge.x, d.hinge.z, d.hinge.x + dir[0] * L, d.hinge.z + dir[1] * L];
  }
  // open away from whoever is pushing (x, z); slam = an inmate's shoulder
  push(d, x, z, slam = false) {
    if (d.locked) return false;
    if (Math.abs(d.target) > 0.2) { d.target = 0; d.speed = 2.2; return 'close'; }
    if (d.pass === 'x') d.target = x < d.wx ? 1.62 : -1.62; else d.target = z < d.wz ? -1.62 : 1.62;
    d.speed = slam ? 9 : 2.2; d.bang = slam ? 1 : 0;
    return 'open';
  }
  isOpen(d) { return Math.abs(d.angle) > 1.1; }
  update(dt) {
    for (const d of this.list) {
      if (d.angle === d.target) continue;
      const s = d.speed * dt; d.angle += Math.max(-s, Math.min(s, d.target - d.angle));
      d.mesh.rotation.y = d.angle;
    }
  }
  near(x, z, r = 1.6) { let best = null, bd = r * r; for (const d of this.list) { const dd = (d.wx - x) ** 2 + (d.wz - z) ** 2; if (dd < bd) { bd = dd; best = d; } } return best; }
  at(gx, gy) { return this.list.find((d) => d.x === gx && d.y === gy); }
}

// push a circle out of a segment
export function circleSeg(p, r, s) {
  const [ax, az, bx, bz] = s; const vx = bx - ax, vz = bz - az; const l2 = vx * vx + vz * vz;
  let t = ((p.x - ax) * vx + (p.z - az) * vz) / l2; t = Math.max(0, Math.min(1, t));
  const qx = ax + vx * t, qz = az + vz * t; const dx = p.x - qx, dz = p.z - qz; const d2 = dx * dx + dz * dz; const rr = r + 0.04;
  if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-4; p.x = qx + dx / d * rr; p.z = qz + dz / d * rr; return true; }
  return false;
}

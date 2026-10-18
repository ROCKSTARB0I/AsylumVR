// Space: what is solid. Circle movers (you and them) are pushed out of
// wall cells, props, door leaves and the gate; sight lines are traced
// through the grid and closed doors.
import { C, W, D } from './plan.js?v=26';
import { circleSeg } from './doors.js?v=26';

// props up to this height (m) can be vaulted by the things chasing you
export const VAULT_H = 1.15;

export class Space {
  constructor(plan, world, doors) {
    this.plan = plan; this.world = world; this.doors = doors;
    // prop footprint per cell, for the walk grid
    this.blockedCell = new Uint8Array(W * D); this.tallCell = new Uint8Array(W * D);
    for (const c of world.colliders) {
      if (c.y1 < 0.4) continue;
      // anything above the hip can't be vaulted: mark every cell it really occupies
      if (c.y1 > VAULT_H) for (let gy = Math.floor(c.z0 / C); gy <= Math.floor(c.z1 / C); gy++) for (let gx = Math.floor(c.x0 / C); gx <= Math.floor(c.x1 / C); gx++) {
        const ox = Math.min(c.x1, (gx + 1) * C) - Math.max(c.x0, gx * C), oz = Math.min(c.z1, (gy + 1) * C) - Math.max(c.z0, gy * C);
        if (ox * oz > C * C * 0.2 && gx >= 0 && gy >= 0 && gx < W && gy < D) this.tallCell[gy * W + gx] = 1;
      }
      for (let gy = Math.floor(c.z0 / C); gy <= Math.floor(c.z1 / C); gy++) for (let gx = Math.floor(c.x0 / C); gx <= Math.floor(c.x1 / C); gx++) {
        // only block the cell if the prop covers most of it
        const ox = Math.min(c.x1, (gx + 1) * C) - Math.max(c.x0, gx * C), oz = Math.min(c.z1, (gy + 1) * C) - Math.max(c.z0, gy * C);
        if (ox * oz > C * C * 0.45 && gx >= 0 && gy >= 0 && gx < W && gy < D) this.blockedCell[gy * W + gx] = 1;
      }
    }
    this.gateBox = null; this.boxes = [];   // extra solid boxes [x0, z0, x1, z1] (a fence gate, a parked car)
  }
  solid(gx, gy) { return !this.plan.at(gx, gy); }
  // a cell blocked only by tables, beds, crates: a chaser can go over it
  vaultable(gx, gy) { if (!this.plan.at(gx, gy) || !this.blockedCell[gy * W + gx] || this.tallCell[gy * W + gx]) return false; const d = this.doors.at(gx, gy); return !(d && d.locked); }
  walkable(gx, gy) { if (!this.plan.at(gx, gy) || this.blockedCell[gy * W + gx]) return false; const d = this.doors.at(gx, gy); return !(d && d.locked); }
  collide(p, r, { props = true, doors = true, low = 0 } = {}) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const gx0 = Math.floor((p.x - r) / C), gx1 = Math.floor((p.x + r) / C), gy0 = Math.floor((p.z - r) / C), gy1 = Math.floor((p.z + r) / C);
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) if (this.solid(gx, gy)) hit = box(p, r, gx * C, gy * C, (gx + 1) * C, (gy + 1) * C) || hit;
      if (props) for (const c of this.world.colliders) { if (c.y1 <= low + 0.3) continue; if (p.x + r < c.x0 || p.x - r > c.x1 || p.z + r < c.z0 || p.z - r > c.z1) continue; hit = box(p, r, c.x0, c.z0, c.x1, c.z1) || hit; }
      if (doors) for (const d of this.doors.list) { if (Math.abs(d.wx - p.x) > 2.2 || Math.abs(d.wz - p.z) > 2.2) continue; hit = circleSeg(p, r, this.doors.seg(d)) || hit; }
      if (this.gateBox) hit = box(p, r, ...this.gateBox) || hit;
      for (const b of this.boxes) hit = box(p, r, ...b) || hit;
    }
    return hit;
  }
  // can a straight line pass? (walls, and closed doors when asked)
  los(x0, z0, x1, z1, doors = true) {
    let gx = Math.floor(x0 / C), gy = Math.floor(z0 / C); const tx = Math.floor(x1 / C), ty = Math.floor(z1 / C);
    const dx = x1 - x0, dz = z1 - z0; const sx = Math.sign(dx), sy = Math.sign(dz);
    const tdx = sx ? Math.abs(C / dx) : Infinity, tdy = sy ? Math.abs(C / dz) : Infinity;
    let tmx = sx ? ((sx > 0 ? (gx + 1) * C - x0 : x0 - gx * C) / Math.abs(dx)) : Infinity;
    let tmy = sy ? ((sy > 0 ? (gy + 1) * C - z0 : z0 - gy * C) / Math.abs(dz)) : Infinity;
    for (let s = 0; s < 80; s++) {
      if (this.solid(gx, gy)) return false;
      if (doors) { const d = this.doors.at(gx, gy); if (d && Math.abs(d.angle) < 1.0 && segX(x0, z0, x1, z1, this.doors.seg(d))) return false; }
      if (gx === tx && gy === ty) return true;
      if (tmx < tmy) { gx += sx; tmx += tdx; } else { gy += sy; tmy += tdy; }
    }
    return true;
  }
}

function box(p, r, x0, z0, x1, z1) {
  const qx = Math.max(x0, Math.min(p.x, x1)), qz = Math.max(z0, Math.min(p.z, z1));
  let dx = p.x - qx, dz = p.z - qz; const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = qx + dx / d * r; p.z = qz + dz / d * r; return true; }
  // centre inside the box: leave by the nearest side
  const l = p.x - x0, rr = x1 - p.x, t = p.z - z0, b = z1 - p.z; const m = Math.min(l, rr, t, b);
  if (m === l) p.x = x0 - r; else if (m === rr) p.x = x1 + r; else if (m === t) p.z = z0 - r; else p.z = z1 + r;
  return true;
}
function segX(ax, az, bx, bz, s) {
  const [cx, cz, dx, dz] = s;
  const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax), d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  const d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx), d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

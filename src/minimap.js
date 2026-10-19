// The minimap: the floor you're on, drawn from the plan. Rooms you've been through are bright, the rest
// is a faint outline; room names, stairwells, doors, and you (a red arrow). Shown on the pause screen:
// on desktop (Esc / Tab) in the pause panel, in VR on a panel beside the pause card.
import { W, D, C, Z, ZNAME, LEVELS, floorAt, baseOf } from './plan.js?v=33';

export class MiniMap {
  constructor(plan) {
    this.plan = plan; this.seen = new Uint8Array(W * D);
    // room labels: the plan's own, or one per room (a connected patch of one zone)
    this.labels = plan.labels || autoLabels(plan);
  }
  // you see about four cells around you as you walk
  mark(x, z) {
    const gx = Math.floor(x / C), gy = Math.floor(z / C), r = 4;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = gx + i, Y = gy + j; if (X >= 0 && Y >= 0 && X < W && Y < D && i * i + j * j <= r * r) this.seen[Y * W + X] = 1; }
  }
  // which cells are on your floor (Tape 4 has storeys: only the one you're standing on, its stairwells too)
  onFloor(here, px, py) {
    const p = this.plan, at = p.at;
    if (!LEVELS) return (x, y) => !!at(x, y);
    // a building with separate areas: just the one you're in (and the stairwells at its edges)
    if (p.regions) {
      let best = null, bd = 1e9;
      for (const r of Object.values(p.regions)) { const dx = Math.max(r[0] - px, 0, px - r[2] - 1), dy = Math.max(r[1] - py, 0, py - r[3] - 1); const d = dx + dy; if (d < bd) { bd = d; best = r; } }
      const [x0, y0, x1, y1] = best;
      return (x, y) => { const z = at(x, y); if (!z || x < x0 - 4 || x > x1 + 4 || y < y0 - 4 || y > y1 + 4) return false; if (z === Z.STAIR) return true; return x >= x0 && x <= x1 + 1 && y >= y0 && y <= y1 + 1 && Math.abs(baseOf(x, y) - here) < 0.8; };
    }
    return (x, y) => { const z = at(x, y); if (!z) return false; if (z === Z.STAIR) return Math.abs(LEVELS.base[y * W + x] - here) < 3.4; return Math.abs(baseOf(x, y) - here) < 0.8; };
  }
  draw(cv, walker, title = '') {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height; const p = this.plan;
    c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(8,8,7,0.92)'; c.fillRect(0, 0, w, h);
    const here = floorAt(walker.pos.x, walker.pos.z); const mine = this.onFloor(here, walker.pos.x / C, walker.pos.z / C);
    // fit the floor you're on
    let x0 = W, y0 = D, x1 = 0, y1 = 0;
    for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (mine(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < x0) return;
    const pad = 26, top = title ? 52 : 18; const s = Math.min((w - pad * 2) / (x1 - x0 + 1), (h - top - pad) / (y1 - y0 + 1));
    const ox = (w - (x1 - x0 + 1) * s) / 2 - x0 * s, oy = top + (h - top - pad - (y1 - y0 + 1) * s) / 2 - y0 * s;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!mine(x, y)) continue; const z = p.at(x, y); const seen = this.seen[y * W + x];
      c.fillStyle = z === Z.DOOR ? (seen ? '#b8925a' : '#4a3c28') : z === Z.STAIR ? (seen ? '#8a8fa0' : '#34363e') : z === Z.OUT ? (seen ? '#4f5a44' : '#23281f') : (seen ? '#6c675d' : '#26241f');
      c.fillRect(ox + x * s, oy + y * s, Math.ceil(s), Math.ceil(s));
    }
    // stairwells: a little flight of steps
    c.strokeStyle = '#d8dce8'; c.lineWidth = Math.max(1, s * 0.12);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mine(x, y) && p.at(x, y) === Z.STAIR && LEVELS && LEVELS.rise[y * W + x]) { const d = LEVELS.dir[y * W + x]; for (let k = 1; k < 4; k++) { c.beginPath(); if (d <= 2) { c.moveTo(ox + (x + k / 4) * s, oy + y * s + 2); c.lineTo(ox + (x + k / 4) * s, oy + (y + 1) * s - 2); } else { c.moveTo(ox + x * s + 2, oy + (y + k / 4) * s); c.lineTo(ox + (x + 1) * s - 2, oy + (y + k / 4) * s); } c.stroke(); } }
    // names
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${Math.max(13, Math.min(22, s * 1.1))}px "VT323", monospace`;
    for (const L of this.labels) { if (!mine(Math.floor(L.x), Math.floor(L.y))) continue; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(L.t, ox + (L.x + 0.5) * s + 1, oy + (L.y + 0.5) * s + 1); c.fillStyle = '#d8d0bc'; c.fillText(L.t, ox + (L.x + 0.5) * s, oy + (L.y + 0.5) * s); }
    // you
    const px = ox + walker.pos.x / C * s, py = oy + walker.pos.z / C * s; const a = walker.yaw; const r = Math.max(9, s * 1.3);
    const fx = -Math.sin(a), fz = -Math.cos(a);
    c.fillStyle = '#ff2a1a'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath();
    c.moveTo(px + fx * r, py + fz * r); c.lineTo(px - fz * r * 0.6 - fx * r * 0.6, py + fx * r * 0.6 - fz * r * 0.6); c.lineTo(px + fz * r * 0.6 - fx * r * 0.6, py - fx * r * 0.6 - fz * r * 0.6); c.closePath(); c.fill(); c.stroke();
    // title
    if (title) { c.textAlign = 'left'; c.font = '30px "VT323", monospace'; c.fillStyle = '#e6e1d6'; c.fillText(title, 22, 28); c.textAlign = 'right'; c.fillStyle = '#8a847a'; c.font = '22px "VT323", monospace'; c.fillText('N ↑', w - 22, 28); }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }
}

// one label per room: flood-fill each zone (corridors, doors and stairs don't get one), name the bigger patches
function autoLabels(plan) {
  const out = []; const done = new Uint8Array(W * D); const skip = new Set([Z.HALL, Z.DOOR, Z.STAIR, Z.SOLID]);
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const z = plan.at(x, y); if (!z || skip.has(z) || done[y * W + x]) continue;
    const st = [[x, y]]; done[y * W + x] = 1; let n = 0, sx = 0, sy = 0;
    while (st.length) { const [a, b] = st.pop(); n++; sx += a; sy += b; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = a + dx, Y = b + dy; if (X < 0 || Y < 0 || X >= W || Y >= D || done[Y * W + X] || plan.at(X, Y) !== z) continue; done[Y * W + X] = 1; st.push([X, Y]); } }
    if (n >= 6) out.push({ x: sx / n - 0.5, y: sy / n - 0.5, t: ZNAME[z].toUpperCase() });
  }
  return out;
}

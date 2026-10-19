// Horrors: the people still living in Mount Harrow and how they hunt.
// Each one sees (a cone, blocked by walls and shut doors, worse in the
// dark), hears (your steps, doors, things you knock), patrols or keeps to
// its corner, investigates, chases, searches, checks lockers, and kills.
import * as THREE from '../vendor/three.module.js';
import { C, W, D, cx, cz } from './plan.js?v=29';
import { VAULT_H } from './space.js?v=29';
import { makeBody, pose, cleaver, bonesaw, flashlight, BODY_LIGHT } from './carcass.js?v=29';

const V = THREE.Vector3;
const tmp = new V(), tmp2 = new V();

// ---------------------------------------------------------------- paths
class Nav {
  constructor(space) { this.space = space; }
  ok(x, y) { return x >= 0 && y >= 0 && x < W && y < D && this.space.walkable(x, y); }
  find(x0, z0, x1, z1, vault = false) {
    // chasers may cut over low furniture, at a price, so they still prefer the floor
    const ok = vault ? (x, y) => this.ok(x, y) || (x >= 0 && y >= 0 && x < W && y < D && this.space.vaultable(x, y)) : (x, y) => this.ok(x, y);
    const cost = (i) => (vault && this.space.blockedCell[i] ? 2.5 : 0);
    const sx = Math.floor(x0 / C), sy = Math.floor(z0 / C); let tx = Math.floor(x1 / C), ty = Math.floor(z1 / C);
    if (!this.ok(tx, ty)) { let best = null, bd = 1e9; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (this.ok(tx + i, ty + j)) { const d = i * i + j * j; if (d < bd) { bd = d; best = [tx + i, ty + j]; } } if (!best) return null; [tx, ty] = best; }
    const N = W * D; const g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [[0, sy * W + sx]]; g[sy * W + sx] = 0; const goal = ty * W + tx;
    const h = (i) => Math.hypot((i % W) - tx, Math.floor(i / W) - ty);
    let it = 0;
    while (open.length && it++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, cur] = open.splice(bi, 1)[0]; if (closed[cur]) continue; closed[cur] = 1;
      if (cur === goal) break;
      const x = cur % W, y = Math.floor(cur / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) continue;
        if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
        const ni = ny * W + nx; const ng = g[cur] + (dx && dy ? 1.414 : 1) + cost(ni);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push([ng + h(ni), ni]); }
      }
    }
    if (from[goal] < 0 && goal !== sy * W + sx) return null;
    const cells = []; for (let c = goal; c >= 0 && c !== sy * W + sx; c = from[c]) cells.push(c); cells.reverse();
    const pts = cells.map((c) => new V(cx(c % W), 0, cz(Math.floor(c / W))));
    if (pts.length) pts[pts.length - 1].set(x1, 0, z1);
    // drop points we can already see past
    const out = []; let a = new V(x0, 0, z0);
    for (let i = 0; i < pts.length; i++) { const nxt = pts[i + 1]; if (nxt && this.space.los(a.x, a.z, nxt.x, nxt.z, false) && clearWide(this.space, a, nxt)) continue; out.push(pts[i]); a = pts[i]; }
    return out;
  }
}
function clearWide(space, a, b) { const dx = b.z - a.z, dz = -(b.x - a.x); const l = Math.hypot(dx, dz) || 1; const ox = dx / l * 0.35, oz = dz / l * 0.35; return space.los(a.x + ox, a.z + oz, b.x + ox, b.z + oz, false) && space.los(a.x - ox, a.z - oz, b.x - ox, b.z - oz, false); }

// ---------------------------------------------------------------- one of them
const KINDS = {
  brute: { body: 'brute', walk: 1.25, run: 4.05, fov: 0.6, sight: 1.0, hear: 1.25, dmg: 55, reach: 1.35, wind: 0.55, gait: 'brute', voice: 'brute', weapon: 'cleaver' },
  surgeon: { body: 'surgeon', walk: 1.15, run: 3.7, fov: 0.45, sight: 1.1, hear: 1.4, dmg: 70, reach: 1.25, wind: 0.5, gait: 'walk', voice: 'surgeon', weapon: 'saw', lamp: 'head' },
  patient: { body: 'gown', walk: 0.9, run: 3.4, fov: 0.35, sight: 0.8, hear: 1.0, dmg: 30, reach: 1.1, wind: 0.35, gait: 'shamble', voice: 'patient' },
  eater: { body: 'naked', walk: 0.9, run: 3.6, fov: 0.3, sight: 0.7, hear: 1.3, dmg: 35, reach: 1.1, wind: 0.3, gait: 'stalk', voice: 'eater' },
  orderly: { body: 'orderly', walk: 1.35, run: 4.15, fov: 0.55, sight: 1.05, hear: 1.3, dmg: 45, reach: 1.25, wind: 0.4, gait: 'walk', voice: 'orderly', weapon: 'flashlight', lamp: 'hand' },
  rocker: { body: 'jacket', walk: 0.8, run: 0, fov: 0, sight: 0, hear: 0, dmg: 0, gait: 'shamble', voice: 'rocker', harmless: true },
};

class Horror {
  constructor(H, kind, x, z, opts = {}) {
    this.H = H; this.kind = kind; this.K = KINDS[kind]; this.opts = opts;
    this.body = makeBody(this.K.body, opts.seed ?? Math.floor(x * 7 + z * 3), opts.look || {});
    H.scene.add(this.body.root);
    if (this.K.weapon === 'cleaver') { const w = cleaver(this.body.s); w.position.set(0, -0.1 * this.body.s, 0.02); w.rotation.x = -Math.PI / 2; this.body.bones.Rhand.add(w); }
    if (this.K.weapon === 'saw') { const w = bonesaw(this.body.s); w.position.set(0, -0.1 * this.body.s, 0.02); w.rotation.x = -Math.PI / 2; this.body.bones.Rhand.add(w); }
    if (this.K.weapon === 'flashlight') { const w = flashlight(this.body.s); w.position.set(0, -0.08 * this.body.s, 0.03); w.rotation.x = -Math.PI / 2 + 0.9; this.body.bones.Rhand.add(w); this.torch = w; }
    this.home = new V(x, 0, z); this.homeYaw = opts.yaw ?? 0; this.route = opts.route || null; this.ri = 0;
    this.reset();
  }
  reset() {
    this.pos = this.home.clone(); this.yaw = this.homeYaw; this.state = this.opts.idle || 'patrol'; this.route = this.opts.route || null; this.ri = 0; this.t = 0; this.phase = 0; this.speed = 0;
    this.path = null; this.goal = null; this.repath = 0; this.aware = 0; this.lastSeen = null; this.lostT = 0; this.atk = 0; this.cool = 0; this.wait = 0; this.searchT = 0;
    this.sawHide = null; this.voiceT = 2 + Math.random() * 4; this.active = !this.opts.dormant; this.body.root.visible = this.active; this.stuck = 0; this.doorPause = 0; this.lockerChecks = 0;
  }
  get alertRun() { return this.state === 'chase'; }
  // ---- senses
  canSee(p, hiddenOk = false) {
    const H = this.H; const w = H.walker; if (!this.K.sight) return 0;
    if (w.hidden && !hiddenOk) return 0;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z; const d = Math.hypot(dx, dz);
    if (d < 1.4) return 1;
    const fwd = Math.atan2(dx, dz); let da = Math.abs(((fwd - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const fov = this.state === 'chase' ? 1.6 : 1.0 + this.K.fov;
    if (da > fov) return 0;
    const L = H.world.lightAt(p.x, p.z); const lum = L.r * 0.3 + L.g * 0.59 + L.b * 0.11;
    let range = (3.0 + Math.min(1, lum * 9) * 20) * this.K.sight;
    if (w.isCrouched) range *= 0.55; if (w.speed > 3) range *= 1.35; if (this.state === 'chase') range = Math.max(range, 14);
    if (d > range) return 0;
    if (!H.space.los(this.pos.x, this.pos.z, p.x, p.z, true)) return 0;
    return (1 - d / range) * (da < 0.5 ? 1.4 : 0.8) + 0.2;
  }
  hear(x, z, r) {
    if (!this.active || !this.K.hear || this.state === 'chase' || this.state === 'attack' || this.state === 'execute') return;
    const d = Math.hypot(x - this.pos.x, z - this.pos.z); let rr = r * this.K.hear;
    if (!this.H.space.los(this.pos.x, this.pos.z, x, z, true)) rr *= 0.55;      // through walls and doors it's muffled
    if (d > rr) return;
    if (this.kind === 'rocker' || !this.H.isHunter(this)) return;
    this.goal = new V(x, 0, z); this.state = 'investigate'; this.path = null; this.wait = 0.4 + Math.random() * 0.4;
    if (this.voiceT > 1) { this.voiceT = 0.3; this.H.sound.voice(this.K.voice, 'alert', this.pos); }
  }
  goTo(p, dt, speed) {
    this.repath -= dt;
    if (!this.path || this.repath <= 0 || !this.pathGoal || this.pathGoal.distanceTo(p) > 1.2) { this.path = this.H.nav.find(this.pos.x, this.pos.z, p.x, p.z, this.mayVault()) || []; this.pathGoal = p.clone(); this.repath = this.state === 'chase' ? 0.35 : 1.2; }
    // straight at it when we can see it
    let tgt = this.path[0] || p;
    if (this.state === 'chase' && this.H.space.los(this.pos.x, this.pos.z, p.x, p.z, false) && clearWide(this.H.space, this.pos, p)) tgt = p;
    else if (this.path[0] && this.pos.distanceTo(this.path[0]) < 0.45) { this.path.shift(); tgt = this.path[0] || p; }
    // a table or a bed in the way: over it
    if (!this.vault && (this.vaultCool || 0) <= 0 && this.mayVault()) { const v = this.tryVault(tgt, p); if (v) { this.startVault(v); return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); } }
    // doors in the way
    const d = this.H.doors.near(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.z + Math.cos(this.yaw) * 0.6, 1.1);
    if (d && Math.abs(d.target) < 0.2 && Math.abs(d.angle) < 1.0 && !d.locked) {
      const slam = this.kind === 'brute' || this.state === 'chase';
      this.H.doors.push(d, this.pos.x, this.pos.z, slam); this.H.sound.door(d, slam ? 'slam' : 'open', d.wx, d.wz); this.doorPause = slam ? 0.15 : 0.6;
      if (slam) this.H.shake(d.wx, d.wz, 0.35);
    }
    if (this.doorPause > 0) { this.doorPause -= dt; speed *= 0.15; }
    const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z; const l = Math.hypot(dx, dz);
    if (l < 0.05) { this.speed = 0; return l; }
    const want = Math.atan2(dx, dz); let da = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.yaw += Math.max(-dt * 5, Math.min(dt * 5, da));
    const sp = speed * Math.max(0.2, Math.cos(Math.min(1.4, Math.abs(da))));
    const before = this.pos.clone();
    this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
    this.H.space.collide(this.pos, 0.32, { doors: false });
    const moved = before.distanceTo(this.pos); this.speed = moved / dt;
    if (moved < sp * dt * 0.25 && sp > 0.3) { this.stuck += dt; if (this.stuck > 1.2) { this.path = null; this.stuck = 0; this.yaw += (Math.random() - 0.5) * 2; } } else this.stuck = 0;
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
  }
  // ---- vaulting: only when it's after you
  mayVault() { return this.K.run && (this.state === 'chase' || (this.state === 'investigate' && this.H.isHunter(this))); }
  tryVault(tgt, goal) {
    const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, l = Math.hypot(dx, dz); if (l < 0.3) return null;
    const ux = dx / l, uz = dz / l, r = 0.34, px = this.pos.x, pz = this.pos.z; const cols = this.H.world.colliders;
    // where along our heading a collider (grown by our radius) starts and ends
    const ray = (c) => {
      let tn = -1e9, tf = 1e9;
      for (const [o, u, a0, a1] of [[px, ux, c.x0 - r, c.x1 + r], [pz, uz, c.z0 - r, c.z1 + r]]) {
        if (Math.abs(u) < 1e-6) { if (o < a0 || o > a1) return null; continue; }
        let a = (a0 - o) / u, b = (a1 - o) / u; if (a > b) [a, b] = [b, a]; tn = Math.max(tn, a); tf = Math.min(tf, b);
      }
      return tn <= tf ? [tn, tf] : null;
    };
    let first = null, h = 0;
    for (const c of cols) { if (c.y1 < 0.4 || c.y1 > VAULT_H) continue; const t = ray(c); if (t && t[1] > 0 && t[0] < 0.55 && (!first || t[0] < first[0])) { first = t; h = c.y1; } }
    if (!first) return null;
    // keep going over anything else low that's in the way (a chair pushed up to the table)
    let far = first[1];
    for (let n = 0; n < 3; n++) { let ext = far; for (const c of cols) { if (c.y1 < 0.4) continue; const t = ray(c); if (t && t[0] < far + 0.15 && t[1] > far) { if (c.y1 > VAULT_H) return null; ext = Math.max(ext, t[1]); h = Math.max(h, c.y1); } } if (ext === far) break; far = ext; }
    if (far - Math.max(0, first[0]) > 2.3) return null;        // too long to go over (a bed the long way)
    const land = new V(px + ux * (far + 0.1), 0, pz + uz * (far + 0.1));
    if (Math.hypot(goal.x - land.x, goal.z - land.z) > Math.hypot(goal.x - px, goal.z - pz) + 0.2) return null;   // it would take us away from you
    const chk = land.clone(); this.H.space.collide(chk, 0.32, { doors: true }); if (chk.distanceTo(land) > 0.12) return null;
    if (!this.H.space.los(px, pz, land.x, land.z, true)) return null;
    return { from: this.pos.clone(), to: land, h, k: 0, yaw: Math.atan2(ux, uz) };
  }
  startVault(v) {
    v.dur = this.kind === 'brute' ? 0.95 : this.kind === 'eater' ? 0.5 : this.kind === 'surgeon' ? 0.7 : 0.62;
    this.vault = v; this.yaw = v.yaw; this.path = null; this.stuck = 0;
    if (Math.random() < 0.6) this.H.sound.voice(this.K.voice, this.kind === 'eater' ? 'alert' : 'attack', this.pos);
  }
  vaulting(dt) {
    const v = this.vault, H = this.H; const k0 = v.k; v.k = Math.min(1, v.k + dt / v.dur); const k = v.k;
    const e = Math.min(1, Math.max(0, (k - 0.18) / 0.62)); const sm = e * e * (3 - 2 * e);
    this.pos.lerpVectors(v.from, v.to, sm);
    this.vaultY = Math.sin(Math.PI * Math.min(1, Math.max(0, (k - 0.12) / 0.76))) * Math.max(0.2, v.h - 0.3);
    if (k0 < 0.2 && k >= 0.2) H.sound.thud(this.pos.clone().setY(v.h), 0.55);            // hands slap down on the top
    if (k0 < 0.82 && k >= 0.82) { H.sound.thud(this.pos, this.kind === 'brute' ? 1.2 : 0.75); H.sound.footstep(this.kind, this.pos, 3); if (this.kind === 'brute') H.shake(this.pos.x, this.pos.z, 0.3); }
    this.speed = 0;
    if (k >= 1) { this.vault = null; this.vaultY = 0; this.vaultCool = 0.5; this.path = null; this.burst = Math.max(this.burst || 0, 0.5); }
  }
  update(dt) {
    if (!this.active) return;
    this.vaultCool = (this.vaultCool || 0) - dt;
    const H = this.H, w = H.walker, P = w.pos; this.t += dt; this.voiceT -= dt; this.cool -= dt;
    // the feral patient gets up from its meal when its segment begins
    if (this.opts.huntRoute && H.isHunter(this) && this.state === 'eat') { this.state = 'patrol'; this.route = this.opts.huntRoute; this.ri = 0; this.path = null; H.sound.voice('eater', 'chase', this.pos); }
    const dist = Math.hypot(P.x - this.pos.x, P.z - this.pos.z);
    // seeing you
    const see = w.alive ? this.canSee(P) : 0;
    if (see > 0) { this.aware = Math.min(1.5, this.aware + see * dt * (this.state === 'investigate' || this.state === 'search' ? 3.2 : 1.8)); this.lastSeen = P.clone(); this.lostT = 0; }
    else this.aware = Math.max(0, this.aware - dt * 0.25);
    if (this.aware >= 1 && this.state !== 'chase' && this.state !== 'spot' && this.state !== 'attack' && this.state !== 'execute' && this.K.run && this.state !== 'eat' && H.mayChase(this)) {   // (not again while it's already roaring at you)
      this.state = 'spot'; this.spotT = 0; this.path = null; H.onChase(this);
    } else if (this.aware > 0.35 && (this.state === 'patrol' || this.state === 'idle') && this.K.run && H.isHunter(this)) { this.state = 'investigate'; this.goal = P.clone(); this.wait = 0.5; }
    let st = this.state; let anim = 'idle', animP = {};
    if (this.vault) { this.vaulting(dt); anim = 'vault'; animP = { k: this.vault ? this.vault.k : 1 }; }
    else switch (st) {
      case 'rock': anim = 'rock'; if (this.voiceT < 0) { this.voiceT = 3 + Math.random() * 5; H.sound.voice('rocker', 'mutter', this.pos); } if (dist < 2.2 && !this.flinched) { this.flinched = true; H.sound.voice('rocker', 'scream', this.pos); H.scare(0.5); } if (dist > 4) this.flinched = false; break;
      case 'eat': anim = 'eat'; if (!H.isHunter(this) && dist < 1.8 && !this.hissed) { this.hissed = true; H.sound.voice('eater', 'alert', this.pos); H.scare(0.6); } if (dist > 4) this.hissed = false; if (this.voiceT < 0) { this.voiceT = 1.5 + Math.random() * 2; H.sound.voice('eater', 'chew', this.pos); } if (H.mayChase(this) && (this.aware > 0.5 || (dist < 3 && w.speed > 1.5 && !w.hidden))) { this.state = 'chase'; this.aware = 1.2; H.sound.voice('eater', 'chase', this.pos); H.onChase(this); } break;
      case 'idle': anim = 'idle'; break;
      case 'patrol': {
        if (!this.route) { this.state = 'idle'; break; }
        if (this.wait > 0) { this.wait -= dt; anim = 'search'; this.speed = 0; break; }
        const [rx, ry] = this.route[this.ri]; const tgt = tmp.set(cx(rx), 0, cz(ry));
        const d = this.goTo(tgt.clone(), dt, this.K.walk);
        if (d < 0.6) { this.ri = (this.ri + 1) % this.route.length; this.path = null; this.wait = Math.random() < 0.4 ? 2 + Math.random() * 3 : 0; }
        anim = this.K.gait === 'brute' ? 'brute' : this.K.gait; break;
      }
      case 'investigate': {
        if (this.wait > 0) { this.wait -= dt; anim = 'listen'; this.speed = 0; break; }
        const d = this.goTo(this.goal, dt, this.K.walk * 1.5);
        anim = this.K.gait === 'brute' ? 'brute' : 'walk';
        if (d < 0.8) { this.state = 'search'; this.searchT = 6 + Math.random() * 5; this.searchPts = null; }
        break;
      }
      case 'search': {
        this.searchT -= dt; anim = 'search';
        // check the hiding places close to where it lost you
        if (!this.lockerTarget && Math.random() < dt * 0.5) {
          const near = H.world.hides.filter((h) => Math.hypot(h.x - this.pos.x, h.z - this.pos.z) < 5);
          if (near.length) this.lockerTarget = near[Math.floor(Math.random() * near.length)];
        }
        if (this.lockerTarget) {
          const h = this.lockerTarget; const front = tmp2.set(h.x + h.fx * 0.9, 0, h.z + h.fz * 0.9);
          const d = this.goTo(front.clone(), dt, this.K.walk * 1.3); anim = 'walk';
          if (d < 0.5) {
            this.yaw = Math.atan2(-h.fx, -h.fz); H.sound.locker(true, h.k, h.x, h.z);
            const found = w.hidden === h && (this.sawHide === h || Math.random() < (this.kind === 'surgeon' ? 0.55 : 0.3));
            if (found) { this.state = 'execute'; this.exT = 0; this.exHide = h; H.onFound(this, h); }
            this.lockerTarget = null; this.searchT -= 2;
          }
          break;
        }
        if (this.searchT <= 0) { this.state = this.route ? 'patrol' : (this.opts.idle || 'idle'); this.path = null; this.aware = 0; if (this.opts.idle && this.opts.idle !== 'patrol') this.returning = true; }
        break;
      }
      case 'chase': {
        anim = 'run';
        if (w.hidden) {
          // saw you go in?
          if (this.sawHide === w.hidden) { const h = w.hidden; const d = this.goTo(new V(h.x + h.fx * 0.8, 0, h.z + h.fz * 0.8), dt, this.K.run); if (d < 0.6) { this.state = 'execute'; this.exT = 0; this.exHide = h; H.onFound(this, h); } break; }
          this.state = 'search'; this.searchT = 8; this.goal = this.lastSeen; break;
        }
        if (see <= 0) { this.lostT += dt; if (this.lostT > (this.kind === 'brute' ? 7 : 5)) { this.state = 'investigate'; this.goal = this.lastSeen || P.clone(); this.wait = 0; H.sound.voice(this.K.voice, 'lost', this.pos); break; } }
        const target = see > 0 || this.lostT < 1.2 ? P.clone() : this.lastSeen;
        this.burst = Math.max(0, (this.burst || 0) - dt);
        const lunge = dist < 4.5 && see > 0 ? 1.18 : 1;
        const d = this.goTo(target, dt, this.K.run * lunge * (this.burst > 0 ? 1.1 : 1));
        if (dist < this.K.reach && this.cool <= 0 && w.alive) { this.state = 'attack'; this.atk = 0; this.hitDone = false; H.sound.voice(this.K.voice, 'attack', this.pos); }
        if (this.voiceT < 0) { this.voiceT = 1.2 + Math.random() * 1.5; H.sound.voice(this.K.voice, 'pant', this.pos); }
        break;
      }
      case 'attack': {
        this.atk += dt / (this.K.wind + 0.4); anim = 'attack'; animP = { k: this.atk };
        const want = Math.atan2(P.x - this.pos.x, P.z - this.pos.z); let da = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += Math.max(-dt * 4, Math.min(dt * 4, da));
        if (!this.hitDone && this.atk > 0.55) {
          this.hitDone = true;
          if (dist < this.K.reach + 0.35 && !w.hidden && w.alive) {
            const lethal = w.health <= this.K.dmg;
            if (lethal) { this.state = 'execute'; this.exT = 0; this.exHide = null; H.onKill(this); break; }
            w.hurt(this.K.dmg); H.sound.hit(this.kind); H.glitchKick(0.9);
            // knock you back
            const k = 0.9 / Math.max(0.3, dist); w.pos.x += (P.x - this.pos.x) * k; w.pos.z += (P.z - this.pos.z) * k; H.space.collide(w.pos, 0.3);
            if (w.vr) { w.dolly.position.x += (P.x - this.pos.x) * k * 0.6; w.dolly.position.z += (P.z - this.pos.z) * k * 0.6; }
          } else H.sound.whoosh(this.pos);
        }
        if (this.atk >= 1) { this.state = 'chase'; this.cool = 0.9; }
        break;
      }
      case 'spot': {
        // it stops dead, its head snaps round to you, it screams, then it comes
        this.spotT += dt; anim = 'listen'; this.speed = 0;
        const want = Math.atan2(P.x - this.pos.x, P.z - this.pos.z); let da = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += Math.max(-dt * 9, Math.min(dt * 9, da));
        if (this.spotT > 0.18 && !this.roared) { this.roared = true; H.sound.voice(this.K.voice, 'chase', this.pos); H.glitchKick(1.1); }
        animP = { mouth: this.spotT > 0.18 ? 0.75 : 0 };
        if (this.spotT > (this.kind === 'eater' ? 0.55 : 0.9)) { this.state = 'chase'; this.roared = false; this.burst = 1.4; }
        break;
      }
      case 'execute': {
        // the kill: it drags you out (or you are already down) and its face is all you see
        this.exT += dt; anim = 'grab'; animP = { k: Math.min(1, this.exT), mouth: 0.6 + Math.sin(this.exT * 30) * 0.15 };
        H.holdFace(this); w.shake = Math.max(w.shake, 1.4);
        if (!this.exHit && this.exT > 0.9) { this.exHit = true; H.sound.hit(this.kind); H.sound.squelch(this.pos, 1.3); H.staticBurst(0.08); }
        if (this.exT > 2.0 && w.alive) { w.hurt(999); H.staticBurst(0.5); this.exHit = false; }
        break;
      }
    }
    // patients drift back to their corner after a chase
    if (this.returning && (this.state === 'idle' || this.state === 'rock' || this.state === 'eat')) {
      const d = this.goTo(this.home, dt, this.K.walk); anim = this.K.gait; if (d < 0.4) { this.returning = false; this.yaw = this.homeYaw; this.state = this.opts.idle; }
    }
    // keep out of the player
    if (dist < 0.55 && w.alive && !w.hidden) { const k = (0.55 - dist) / Math.max(0.05, dist); w.pos.x += (P.x - this.pos.x) * k; w.pos.z += (P.z - this.pos.z) * k; }
    // heavy feet
    if (this.speed > 0.2) { const before = Math.floor(this.phase / Math.PI); this.phase += dt * (this.speed > 2 ? 9 : 5.2) * (this.kind === 'brute' ? 0.85 : 1); if (Math.floor(this.phase / Math.PI) !== before) H.sound.footstep(this.kind, this.pos, this.speed); }
    if (this.voiceT < 0 && (this.state === 'patrol' || this.state === 'search' || this.state === 'idle')) { this.voiceT = 4 + Math.random() * 6; H.sound.voice(this.K.voice, 'idle', this.pos); }
    // draw
    const b = this.body;
    if (this.kind === 'eater' && (anim === 'run' || anim === 'stalk' || anim === 'walk' || anim === 'shamble')) anim = 'crawl';
    // the feral and the inmates move like a damaged tape: held frames, then a jump
    const jerky = (this.kind === 'eater' || this.kind === 'patient') && anim !== 'eat' && anim !== 'rock';
    this.frameT = (this.frameT || 0) - dt;
    if (!jerky || this.frameT <= 0 || this.state === 'execute') {
      this.frameT = jerky ? 0.06 + Math.random() * 0.1 : 0;
      b.root.position.set(this.pos.x, this.vaultY || 0, this.pos.z); b.root.rotation.y = this.yaw;
      pose(b, anim, this.t, { speed: this.speed, phase: this.phase, reach: this.state === 'chase' && dist < 3 && this.kind !== 'brute', twitch: this.K.run ? 1 : 0.4, ...animP });
    }
    if (this.lamp) this.lamp.update(this);
    const L = H.world.lightAt(this.pos.x, this.pos.z); b.mat.userData.uAmb.value.copy(L);
  }
}

// ---------------------------------------------------------------- all of them
export class Horrors {
  constructor(ctx) {
    Object.assign(this, ctx); this.nav = new Nav(this.space); this.list = [];
    this.fear = 0; this.chase = 0; this.glitch = 0; this.lightsOut = false; this.blackout = false; this.static = 0; this.staticT = 0; this.kick = 0; this.face = null;
    const p = this.plan;
    // the hunters, one per segment of the tape
    if (p.hunters) {
      this.hunters = p.hunters.map((hd) => { const h = new Horror(this, hd.kind, cx(hd.x), cz(hd.y), { route: hd.route, seed: hd.seed, look: hd.look }); this.list.push(h); return h; });
      this.brute = this.hunters.find((h) => h.kind === 'brute'); this.surgeon = this.hunters.find((h) => h.kind === 'surgeon');
    } else {
      this.brute = new Horror(this, 'brute', cx(p.brute.x), cz(p.brute.y), { route: p.brute.route, seed: 11 });
      this.surgeon = new Horror(this, 'surgeon', cx(p.surgeon.x), cz(p.surgeon.y), { route: p.surgeon.route, seed: 23 });
      this.list.push(this.brute, this.surgeon);
    }
    for (const [i, m] of p.inmates.entries()) {
      const kind = m.kind === 'eater' ? 'eater' : m.kind === 'stalker' ? 'patient' : 'rocker';
      const h = new Horror(this, kind, cx(m.x), cz(m.y), { huntRoute: m.huntRoute, idle: m.kind === 'eater' ? 'eat' : m.kind === 'stalker' ? 'patrol' : 'rock', yaw: m.facing ?? (i * 1.7), seed: 40 + i, route: m.route, look: m.look, dormant: m.dormant, pack: m.pack });
      this.list.push(h);
      if (m.kind === 'eater') this.feral = h;
    }
    if (!p.hunters) this.hunters = [this.brute, this.surgeon, this.feral];
    // one real spotlight, carried by whichever lamp-carrying hunter is out (a headlamp or a flashlight)
    this.beam = new THREE.SpotLight(0xfff0d0, 0, 14, 0.42, 0.55, 1.6); this.beamTgt = new THREE.Object3D(); this.scene.add(this.beam, this.beamTgt); this.beam.target = this.beamTgt;
    for (const h of this.hunters) if (h.K.lamp) this.fitLamp(h);
    for (const h of this.hunters) if (!h.opts.idle) { h.active = false; h.body.root.visible = false; }
    this.setSegment(this.segment, true);
  }
  fitLamp(h) {
    const v = new V(), q = new THREE.Quaternion(), fwd = new V(); const B = h.body.bones; let src, aimFn;
    if (h.K.lamp === 'head') {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
      disc.position.set(0, 0.17 * h.body.s, 0.085 * h.body.s); B.head.add(disc);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.085 * h.body.s, 0.008, 4, 20), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); band.rotation.x = Math.PI / 2; band.position.set(0, 0.16 * h.body.s, 0.005); B.head.add(band);
      src = disc; aimFn = () => { B.head.getWorldQuaternion(q); fwd.set(0, -0.35, 1).applyQuaternion(q); };
    } else {
      src = h.torch.userData.lens; aimFn = () => { h.torch.getWorldQuaternion(q); fwd.set(0, 0, 1).applyQuaternion(q); };
    }
    h.lamp = { update: (hh) => { if (!(hh.active && hh.body.root.visible)) return; src.getWorldPosition(v); aimFn(); this.beam.intensity = 14 * (0.92 + Math.random() * 0.08); this.beam.position.copy(v); this.beamTgt.position.copy(v).addScaledVector(fwd, 3); this.beamTgt.updateMatrixWorld(); } };
  }
  heard(x, z, r) { if (r <= 0) return; for (const h of this.list) h.hear(x, z, r); }
  sawHide(hide) { for (const h of this.list) if (h.state === 'chase' && h.canSee(this.walker.pos, true) > 0) h.sawHide = hide; }
  onChase(h) { this.chaseStart = this.G.t; this.G.chased++; if (h.kind === 'brute' && !this.G.said.has('brute')) { this.G.said.add('brute'); } this.sound.stinger(); }
  onFound(h, hide) { this.sound.lockerRip(); this.glitchKick(1); this.walker.unhide(); }
  onKill(h) { this.sound.kill(h.kind); this.glitchKick(1.5); }
  holdFace(h) {
    // put its face right in yours
    const w = this.walker; this.face = h; const head = this.camera.getWorldPosition(tmp);
    const toMe = Math.atan2(head.x - h.pos.x, head.z - h.pos.z); h.yaw = toMe;
    const want = tmp2.set(head.x - Math.sin(toMe) * 0.55, 0, head.z - Math.cos(toMe) * 0.55); h.pos.lerp(want, 0.2);
    if (!w.vr) { const hy = h.body.bones.head.getWorldPosition(new V()); const dx = hy.x - head.x, dz = hy.z - head.z; w.yaw = Math.atan2(-dx, -dz); w.pitch = Math.atan2(hy.y - head.y, Math.hypot(dx, dz)); }
  }
  glitchKick(k) { this.kick = Math.max(this.kick, k); }
  staticBurst(sec) { this.staticT = Math.max(this.staticT, sec); }
  scare(k) { this.glitchKick(k); }
  shake(x, z, k) { const d = Math.hypot(x - this.walker.pos.x, z - this.walker.pos.z); if (d < 6) this.walker.shake = Math.max(this.walker.shake, k * (1 - d / 6)); }
  // Outlast-style segments: one hunter at a time.
  //   0  before the first fuse: Kroft, the west wing and the cafeteria
  //   1  one or two fuses: Dr. Voss
  //   2  third fuse to the gate: the feral patient from the morgue
  get segment() { return this.plan.segment ? this.plan.segment(this.G) : this.G.power || this.G.fuses >= 3 ? 2 : this.G.fuses >= 1 ? 1 : 0; }
  get hunter() { return this.hunters[this.segment]; }
  packOn(h) { return !!(h && h.opts.pack && this.plan.packOn && this.plan.packOn(this.G)); }
  isHunter(h) { return h === this.hunter || this.packOn(h); }
  mayChase(h) { if (this.packOn(h)) return true; return this.isHunter(h) && !this.list.some((o) => o !== h && (o.state === 'chase' || o.state === 'attack' || o.state === 'execute' || o.state === 'spot')); }
  setSegment(seg, instant = false) {
    this.seg = seg;
    for (const h of this.hunters) {
      const mine = h === this.hunter;
      if (mine && !h.active) { h.reset(); h.active = true; h.body.root.visible = true; }
      if (!mine && h.active && !h.opts.idle) h.leaving = true;      // gone once it stops chasing
      if (!mine && h.opts.idle) h.leaving = false;
    }
    if (instant) for (const h of this.list) if (h.leaving) { h.leaving = false; h.active = false; h.body.root.visible = false; }
  }
  powerOn(at) { this.lightsOut = false; }
  alarm() { const h = this.hunter; if (h && h.state !== 'chase') { h.state = 'investigate'; h.goal = this.walker.pos.clone(); h.path = null; h.wait = 0; } }
  reset() {
    for (const h of this.list) h.reset();
    for (const h of this.hunters) if (!h.opts.idle) { h.active = false; h.body.root.visible = false; }
    this.setSegment(this.segment, true); this.face = null; this.kick = 0;
  }
  update(dt) {
    BODY_LIGHT.up.value.set(0, 1, 0).transformDirection(this.camera.matrixWorldInverse);
    this.beam.intensity = 0;
    if (this.seg !== this.segment) this.setSegment(this.segment);
    for (const h of this.list) if (h.leaving && h.state !== 'chase' && h.state !== 'attack' && h.state !== 'execute') {
      // walk off when you can't see it, then it's gone for good
      const seen = this.space.los(this.walker.pos.x, this.walker.pos.z, h.pos.x, h.pos.z, true) && h.pos.distanceTo(this.walker.pos) < 18;
      if (!seen) { h.leaving = false; h.active = false; h.body.root.visible = false; }
    }
    let fear = 0, chase = 0, near = 1e9; this.face = null; this.chaseKind = this.chaseKind || null;
    for (const h of this.list) {
      h.update(dt);
      if (!h.active || h.K.harmless) continue;
      const d = h.pos.distanceTo(this.walker.pos);
      if (h.state === 'chase' || h.state === 'attack' || h.state === 'execute' || h.state === 'spot') { chase = 1; fear = Math.max(fear, 1 - d / 25); if (d < near) { near = d; this.chaseKind = h.kind; } }
      else if (h.aware > 0.2 || h.state === 'search' || h.state === 'investigate') fear = Math.max(fear, (1 - d / 15) * 0.6);
      else fear = Math.max(fear, (1 - d / 10) * 0.35);
    }
    this.fear += (Math.max(0, fear) - this.fear) * (1 - Math.exp(-dt * 2));
    this.chase += (chase - this.chase) * (1 - Math.exp(-dt * (chase ? 4 : 0.4)));
    this.kick = Math.max(0, this.kick - dt * 1.4);
    this.staticT = Math.max(0, this.staticT - dt); this.static = this.staticT > 0 ? 0.85 + Math.random() * 0.15 : Math.max(0, this.static - dt * 6);
    this.glitch = Math.min(1.5, this.kick + Math.max(0, this.fear - 0.6) * 0.6);
  }
}

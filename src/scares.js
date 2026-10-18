// Scares: set pieces fired once in the right place, plus a director that
// keeps springing new ones on you in the dark (never while something is
// hunting you). The worst of them end the same way: a face lunging into
// the lens, a scream, a burst of dead-channel static.
import * as THREE from '../vendor/three.module.js';
import { C, H, cx, cz } from './plan.js?v=14';
import { makeBody, pose } from './carcass.js?v=14';

const V = THREE.Vector3;
const near = (p, x, y, r) => Math.hypot(p.x - cx(x), p.z - cz(y)) < r;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Scares {
  constructor(ctx) {
    Object.assign(this, ctx); this.t = 0; this.active = null; this.done = new Set(); this.cool = 75; this.n = 0;
    // spare actors, each a different kind of wrong
    this.actors = [
      makeBody('naked', 502, { face: 'gouged', stare: true }), makeBody('gown', 501, { face: 'smile', stare: true }),
      makeBody('jacket', 503, { face: 'sewn', stare: true }), makeBody('naked', 505, { face: 'burned', stare: true }),
    ];
    for (const a of this.actors) { a.root.visible = false; this.scene.add(a.root); }
    this.corpseActor = makeBody('corpse', 504, { face: 'dead', outfit: 'gown' }); this.corpseActor.root.visible = false; this.scene.add(this.corpseActor.root);
    this.list = this.plan.tape !== 1 ? [] : [
      { id: 'window', when: () => near(this.walker.pos, 10, 2.6, 1.9) && this.looking(cx(10), 1.7, cz(1), 0.7), run: this.windowFace },
      { id: 'locker', when: () => near(this.walker.pos, 35, 18.5, 2.2) && this.G.fuses >= 1, run: this.lockerBurst },
      { id: 'drop', when: () => near(this.walker.pos, 24.5, 11.5, 1.6) && this.walker.speed > 0.3, run: this.ceilingDrop },
      { id: 'dark', when: () => near(this.walker.pos, 18, 18.5, 2) && this.G.fuses >= 2 && !this.horrors.chase, run: this.lightsOut },
      { id: 'slab', when: () => near(this.walker.pos, 31, 24, 2.2) && this.looking(cx(31), 1.0, cz(24), 0.85), run: this.sitUp },
      { id: 'tub', when: () => near(this.walker.pos, 40, 14.5, 1.5), run: this.tubGrab },
      { id: 'behind', when: () => this.G.notes.length >= 3 && this.G.reading === null && this.walker.speed < 0.3 && !this.walker.hidden && this.dark(), run: this.behindYou },
      { id: 'slam', when: () => near(this.walker.pos, 32, 15, 1.6), run: this.doorSlam },
    ];
  }
  // ---------------------------------------------------------------- helpers
  head() { return this.camera.getWorldPosition(new V()); }
  fwd() { return new V(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())); }
  looking(x, y, z, cos) { const h = this.head(); return this.fwd().dot(new V(x - h.x, y - h.y, z - h.z).normalize()) > cos; }
  dark() { const L = this.world.lightAt(this.walker.pos.x, this.walker.pos.z); return L.r + L.g + L.b < 0.06; }
  actor() { this.n = (this.n + 1) % this.actors.length; return this.actors[this.n]; }
  light(a, k = 1.3) { a.mat.userData.uAmb.value.copy(this.world.lightAt(a.root.position.x, a.root.position.z)).multiplyScalar(k); }
  // put a posed body so that its face is at `target`, turned to look at you
  faceAt(a, target) {
    const h = this.head(); a.root.rotation.set(0, Math.atan2(h.x - target.x, h.z - target.z), 0); a.root.updateMatrixWorld(true);
    const hw = a.bones.head.getWorldPosition(new V()); a.root.position.add(target.clone().sub(hw)); a.root.updateMatrixWorld(true);
  }
  // the hit: the face fills the lens, it screams, the picture tears into static
  hit(a, A, { dmg = 0, hold = 0.45 } = {}) {
    if (A.hitAt === undefined) {
      A.hitAt = A.t; a.root.visible = true; this.sound.jump('scare'); this.sound.scream(this.head(), 1.2);
      this.horrors.glitchKick(2.2); this.horrors.staticBurst(0.12); this.walker.shake = 1.2; if (dmg) this.walker.hurt(dmg);
    }
    const k = A.t - A.hitAt; const h = this.head(); const f = this.fwd();
    const target = h.clone().addScaledVector(f, 0.24 + Math.sin(k * 40) * 0.02).add(new V((Math.random() - 0.5) * 0.02, -0.03 + (Math.random() - 0.5) * 0.02, 0));
    pose(a, 'grab', this.t, { k: 1 }); a.bones.jaw.rotation.x = 0.7 + Math.sin(k * 30) * 0.15; a.bones.head.rotation.z = Math.sin(k * 23) * 0.2;
    this.faceAt(a, target); a.mat.userData.uAmb.value.setRGB(0.05, 0.045, 0.04);
    if (k > hold) { a.root.visible = false; this.horrors.staticBurst(0.25); return true; }
    return false;
  }
  powerOn() {
    // the lights come up and the thing from the morgue is standing in the generator room doorway
    if (this.done.has('power')) return; this.done.add('power');
    const b = this.horrors.feral; if (!b) return;
    setTimeout(() => {
      b.pos.set(cx(42), 0, cz(19.6)); b.yaw = 0; b.state = 'idle'; b.aware = 0.9; b.path = null; b.route = b.opts.huntRoute;
      this.horrors.glitchKick(1.6); this.horrors.staticBurst(0.15); this.sound.jump('scare'); this.sound.voice('eater', 'chase', b.pos);
      setTimeout(() => { if (this.horrors.mayChase(b)) { b.state = 'chase'; b.aware = 1.4; this.horrors.onChase(b); } else b.state = 'patrol'; }, 1600);
    }, 2700);
  }
  // ---------------------------------------------------------------- running
  update(dt) {
    this.t += dt;
    if (this.active) { const A = this.active; A.t += dt; const r = A.fn.call(this, dt, A); if (r === true) { for (const a of this.actors) a.root.visible = false; this.horrors.blackout = false; this.active = null; this.cool = rnd(80, 160); } return; }
    if (!this.walker.alive || this.G.reading || this.G.paused) return;
    for (const s of this.list) if (!this.done.has(s.id) && s.when()) { this.done.add(s.id); this.start(s.run); return; }
    // the director: when nothing is hunting you and it's quiet, something happens
    this.cool -= dt;
    if (this.cool > 0 || this.horrors.chase > 0.1 || this.horrors.fear > 0.35) return;
    const w = this.walker;
    if (w.hidden && w.hidden.k === 'locker' && w.hideT > 3) return this.start(this.lockerPeek);
    if (w.hidden) return;
    if (this.dark()) return this.start(Math.random() < 0.6 ? this.lunge : this.flicker);
    if (Math.random() < 0.5) return this.start(this.flicker);
    this.cool = 20;
  }
  start(fn) { this.active = { fn, t: 0, s: {} }; }

  // ---------------------------------------------------------------- director scares
  // something stands in the dark ahead, then sprints straight into the lens
  lunge(dt, A) {
    const a = A.a || (A.a = this.actor()); const w = this.walker;
    if (A.hitAt !== undefined) return this.hit(a, A, { dmg: 8 });
    if (!A.s.go) {
      const f = this.fwd(); f.y = 0; f.normalize(); let p = null;
      for (let d = 9; d > 4; d -= 1) { const q = w.pos.clone().addScaledVector(f, d); if (this.space.los(w.pos.x, w.pos.z, q.x, q.z, true) && this.space.walkable(Math.floor(q.x / C), Math.floor(q.z / C))) { p = q; break; } }
      if (!p) return true;
      A.s.go = true; A.s.pos = p; a.root.visible = true; this.sound.hush(1.8); A.s.wait = rnd(1.0, 1.8);
    }
    if (A.t < A.s.wait) {
      a.root.position.copy(A.s.pos); a.root.rotation.y = Math.atan2(w.pos.x - A.s.pos.x, w.pos.z - A.s.pos.z); pose(a, 'idle', this.t, {}); a.bones.head.rotation.z = 0.6; this.light(a, 1);
      return false;
    }
    if (!A.s.ran) { A.s.ran = true; this.sound.voice('eater', 'chase', A.s.pos); }
    const h = this.head(); const to = new V(h.x - A.s.pos.x, 0, h.z - A.s.pos.z); const d = to.length(); to.normalize();
    A.s.pos.addScaledVector(to, Math.min(d, dt * 8.5)); a.root.position.copy(A.s.pos); a.root.rotation.y = Math.atan2(to.x, to.z);
    pose(a, 'run', this.t, { speed: 8, phase: this.t * 13, reach: true }); this.light(a, 1);
    if (d < 0.9) this.hit(a, A, { dmg: 8 });
    return false;
  }
  // the lights die; when they stutter back, someone is standing right in front of you
  flicker(dt, A) {
    const a = A.a || (A.a = this.actor());
    if (A.hitAt !== undefined) return this.hit(a, A, { dmg: 5 });
    if (!A.s.go) { A.s.go = true; this.horrors.blackout = true; this.sound.hush(2.2); this.sound.burst(null, { f: 120, q: 1, dur: 0.5, gain: 0.5, brown: true }); }
    if (A.t > 1.3 && !A.s.placed) {
      A.s.placed = true; const f = this.fwd(); f.y = 0; f.normalize(); const p = this.walker.pos.clone().addScaledVector(f, 0.9);
      if (this.space.collide(p, 0.25)) { this.horrors.blackout = false; return true; }
      pose(a, 'idle', this.t, {}); a.root.visible = true; this.faceAt(a, this.head().addScaledVector(f, 0.9).add(new V(0, -0.05, 0)));
    }
    if (A.s.placed && A.t < 2.0) { this.horrors.blackout = Math.sin(A.t * 47) > 0.2; this.light(a, 2); if (!A.s.st && !this.horrors.blackout) { A.s.st = true; this.sound.jump('sting'); } }
    if (A.t >= 2.0) { this.horrors.blackout = false; return this.hit(a, A, { dmg: 5 }); }
    return false;
  }
  // you're in a locker, and a face comes up to the slats
  lockerPeek(dt, A) {
    const w = this.walker, hd = w.hidden; const a = A.a || (A.a = this.actor());
    if (!hd || hd.k !== 'locker') { a.root.visible = false; return true; }
    if (!A.s.go) { A.s.go = true; this.sound.hush(5); a.root.visible = true; A.s.breath = 0; }
    const slat = new V(hd.x + hd.fx * 0.42, 1.48, hd.z + hd.fz * 0.42);
    const k = Math.min(1, A.t / 2.5); pose(a, 'idle', this.t, {}); a.bones.neck.rotation.x = 0.35; a.bones.head.rotation.z = 0.3 + Math.sin(this.t * 2) * 0.1;
    this.faceAt(a, slat.clone().add(new V(hd.fx * (0.6 * (1 - k)), -0.25 * (1 - k), hd.fz * (0.6 * (1 - k))))); a.mat.userData.uAmb.value.setRGB(0.02, 0.018, 0.016);
    A.s.breath -= dt; if (A.s.breath < 0) { A.s.breath = 0.9; this.sound.breathAt(slat, 0.5, 0.6, 450); }
    if (A.t > 5 && !A.s.bang) { A.s.bang = true; this.sound.lockerRip(); this.sound.scream(slat, 1.1); this.horrors.glitchKick(2); this.horrors.staticBurst(0.2); w.shake = 1; }
    if (A.t > 5.5) { a.root.visible = false; return true; }
    return false;
  }

  // ---------------------------------------------------------------- set pieces
  windowFace(dt, A) {
    const a = this.actors[1];
    if (!A.s.go) { A.s.go = true; a.root.visible = true; this.sound.thud(new V(cx(10), 1.6, cz(1)), 1.4); this.sound.clang(new V(cx(10), 1.6, cz(1)), 220, 0.6, 1.2); this.sound.jump('scare'); this.sound.scream(new V(cx(10), 1.6, cz(1)), 1.2); this.horrors.glitchKick(2); this.horrors.staticBurst(0.1); this.walker.shake = 0.8; }
    pose(a, 'grab', this.t, { k: 1 }); a.bones.Lupper.rotation.set(-2.7, 0, 0.45); a.bones.Rupper.rotation.set(-2.7, 0, -0.45); a.bones.jaw.rotation.x = 0.6 + Math.sin(A.t * 25) * 0.15;
    this.faceAt(a, new V(cx(10) + Math.sin(A.t * 31) * 0.03, 1.72, cz(1) + 0.55)); a.mat.userData.uAmb.value.setRGB(0.06, 0.06, 0.08);
    if (A.t > 1.6) { a.root.visible = false; return true; }
    return false;
  }
  lockerBurst(dt, A) {
    const hd = this.world.hides.find((k) => k.k === 'locker' && Math.hypot(k.x - cx(35), k.z - cz(17.6)) < 1.5); if (!hd) return true;
    const a = this.actors[2];
    if (A.hitAt !== undefined) return this.hit(a, A, { dmg: 10 });
    if (!A.s.go) { A.s.go = true; this.sound.lockerRip(); this.horrors.glitchKick(1.5); a.root.visible = true; A.s.p = new V(hd.x + hd.fx * 0.3, 0, hd.z + hd.fz * 0.3); }
    const h = this.head(); const to = new V(h.x - A.s.p.x, 0, h.z - A.s.p.z); const d = to.length(); to.normalize();
    if (A.t > 0.25) A.s.p.addScaledVector(to, Math.min(d, dt * 7));
    a.root.position.copy(A.s.p); a.root.rotation.y = Math.atan2(to.x, to.z); pose(a, A.t < 0.25 ? 'grab' : 'run', this.t, { k: 1, speed: 7, phase: this.t * 12, reach: true }); this.light(a);
    if (d < 0.9 || A.t > 2) this.hit(a, A, { dmg: 10 });
    return false;
  }
  ceilingDrop(dt, A) {
    const a = this.corpseActor; const x = cx(24.5), z = cz(10.3);
    if (!A.s.go) { A.s.go = true; a.root.visible = true; A.s.y = H + 0.4; this.sound.burst(new V(x, H, z), { f: 900, q: 0.6, dur: 0.4, gain: 0.8 }); this.sound.jump('scare'); this.horrors.glitchKick(1.8); this.horrors.staticBurst(0.08); A.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshStandardMaterial({ color: 0x3a3020 })); this.scene.add(A.rope); }
    const target = H - 0.25 - 1.95 * a.s; A.s.v = (A.s.v || 0) + dt * 14; A.s.y = Math.max(target, A.s.y - A.s.v * dt);
    if (A.s.y === target && !A.s.jerk) { A.s.jerk = true; this.sound.thud(new V(x, 2, z), 1); this.sound.clang(new V(x, H, z), 300, 0.3, 0.6); this.walker.shake = 0.7; }
    pose(a, 'hang', 0); a.root.position.set(x, A.s.y, z); a.root.rotation.y = Math.sin(A.t * 3) * (A.s.jerk ? 0.4 * Math.exp(-A.t) : 0); this.light(a);
    A.rope.position.set(x, (H + A.s.y + 1.95 * a.s) / 2 + 0.1, z); A.rope.scale.y = Math.max(0.1, H - (A.s.y + 1.95 * a.s) + 0.2);
    return A.t > 4;   // it stays there, hanging, for good
  }
  lightsOut(dt, A) {
    const a = this.actors[0]; const w = this.walker;
    if (A.hitAt !== undefined) { const r = this.hit(a, A, { dmg: 12 }); if (r) this.horrors.lightsOut = false; return r; }
    if (!A.s.go) {
      A.s.go = true; this.horrors.lightsOut = true; this.sound.hush(6); this.sound.burst(null, { f: 120, q: 1, dur: 0.6, gain: 0.5, brown: true }); this.sound.tone(null, { f: 60, f2: 30, dur: 1.5, gain: 0.5 });
      const f = this.fwd(); f.y = 0; f.normalize(); const p = w.pos.clone().addScaledVector(f, 2.6); this.space.collide(p, 0.3); A.s.p = p; a.root.visible = true; A.s.whisper = 0;
    }
    // it stands in the dark; you only see it if your night vision is on
    a.root.position.copy(A.s.p); a.root.rotation.y = Math.atan2(w.pos.x - A.s.p.x, w.pos.z - A.s.p.z); pose(a, 'idle', this.t, {}); a.bones.head.rotation.z = 0.5; a.mat.userData.uAmb.value.setRGB(0, 0, 0);
    A.s.whisper -= dt; if (A.s.whisper < 0) { A.s.whisper = 1.5; this.sound.syllables(A.s.p.clone().setY(1.6), 3, 95, { breath: 0.9, gain: 0.35 }); }
    if (A.t > 6 || A.s.p.distanceTo(w.pos) < 1.6 || w.speed > 2) this.hit(a, A, { dmg: 12 });
    return false;
  }
  sitUp(dt, A) {
    const body = this.dressingBody(31, 24); if (!body) return true;
    if (!A.s.go) { A.s.go = true; this.sound.hush(1); this.sound.squelch(body.root.position, 1); }
    const k = Math.min(1, A.t / 0.35); const back = A.t > 3 ? Math.min(1, (A.t - 3) / 0.6) : 0; const up = k * (1 - back);
    pose(body, 'lie', 0); body.bones.spine.rotation.x = -1.2 * up; body.bones.chest.rotation.x = -0.35 * up; body.bones.neck.rotation.set(0, 0.9 * up, 0); body.bones.jaw.rotation.x = 0.7 * up;
    body.bones.Rupper.rotation.set(-1.6 * up, 0, -0.3); body.bones.Rfore.rotation.x = -0.3 * up;
    if (A.t > 0.3 && !A.s.s) { A.s.s = true; this.sound.jump('scare'); this.sound.scream(body.root.position.clone().setY(1.2), 1.1); this.horrors.glitchKick(2); this.horrors.staticBurst(0.1); this.walker.shake = 0.8; }
    return A.t > 3.6;
  }
  tubGrab(dt, A) {
    const body = this.dressingBody(40, 14.5); if (!body) return true;
    if (!A.s.go) { A.s.go = true; this.sound.burst(body.root.position.clone().setY(0.5), { f: 900, q: 0.7, dur: 0.5, gain: 0.8 }); this.sound.jump('scare'); this.sound.scream(body.root.position.clone().setY(0.8), 1); this.horrors.glitchKick(2); this.horrors.staticBurst(0.1); this.walker.hurt(10); this.walker.shake = 1; }
    const k = Math.min(1, A.t / 0.2) * (A.t > 1.8 ? Math.max(0, 1 - (A.t - 1.8) / 0.5) : 1);
    pose(body, 'slump', 0); body.bones.Rupper.rotation.set(-2.2 * k, 0, -0.3); body.bones.Rfore.rotation.x = -0.4 * k; body.bones.neck.rotation.x = 0.6 - 0.9 * k; body.bones.jaw.rotation.x = 0.4 + 0.35 * k;
    return A.t > 2.4;
  }
  behindYou(dt, A) {
    const a = this.actors[1]; const w = this.walker;
    if (A.hitAt !== undefined) return this.hit(a, A, { dmg: 8, hold: 0.6 });
    if (!A.s.go) {
      A.s.go = true; this.sound.hush(30); const f = this.fwd(); f.y = 0; f.normalize();
      const p = w.pos.clone().addScaledVector(f, -1.0); this.space.collide(p, 0.3); A.s.p = p; a.root.visible = true; A.s.breath = 0;
    }
    a.root.position.copy(A.s.p); a.root.rotation.y = Math.atan2(w.pos.x - A.s.p.x, w.pos.z - A.s.p.z); pose(a, 'idle', this.t, {}); a.bones.neck.rotation.x = 0.3; a.bones.head.rotation.z = -0.4; this.light(a);
    A.s.breath -= dt; if (A.s.breath < 0) { A.s.breath = 1.0; this.sound.breathAt(A.s.p.clone().setY(1.6), 0.55, 0.7, 500); }   // breathing right behind your ear
    if (this.looking(A.s.p.x, 1.55, A.s.p.z, 0.6) || A.t > 25) this.hit(a, A, { dmg: 8, hold: 0.6 });
    return false;
  }
  doorSlam(dt, A) {
    const d = this.doors.list.find((k) => k.x === 32 && k.y === 17); if (!d) return true;
    if (A.t > 1.2 && !A.s.slam) { A.s.slam = true; d.target = 0; d.speed = 9; this.sound.door(d, 'slam', d.wx, d.wz); this.sound.jump('sting'); this.horrors.glitchKick(1); this.walker.shake = 0.5; }
    if (A.t > 2.2 && !A.s.knock) { A.s.knock = true; for (let i = 0; i < 6; i++) setTimeout(() => this.sound.thud(new V(d.wx, 1.2, d.wz + 0.5), 0.5 + i * 0.12), i * 260); setTimeout(() => this.sound.scream(new V(d.wx, 1.6, d.wz + 0.8), 0.8), 1900); }
    return A.t > 4.5;
  }
  dressingBody(x, y) { const p = new V(cx(x), 0, cz(y)); let best = null, bd = 2.5; for (const b of this.dressing.dead) { const d = Math.hypot(b.root.position.x - p.x, b.root.position.z - p.z); if (d < bd) { bd = d; best = b; } } return best; }
}

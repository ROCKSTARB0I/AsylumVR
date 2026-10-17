// Scares: scripted moments, each fired once when you are in the right place
// (and usually looking the right way). They borrow a few spare bodies and
// pose them by hand, then hand back to the patrols.
import * as THREE from '../vendor/three.module.js';
import { C, H, cx, cz } from './plan.js?v=2';
import { makeBody, pose } from './carcass.js?v=2';

const V = THREE.Vector3;
const near = (p, x, y, r) => Math.hypot(p.x - cx(x), p.z - cz(y)) < r;

export class Scares {
  constructor(ctx) {
    Object.assign(this, ctx); this.t = 0; this.active = null; this.done = new Set();
    // spare actors
    this.actors = { a: makeBody('gown', 501, { face: 'smile', stare: true }), b: makeBody('naked', 502, { face: 'gouged', stare: true }), c: makeBody('jacket', 503, { face: 'sewn', stare: true }), d: makeBody('corpse', 504, { face: 'dead', outfit: 'gown' }) };
    for (const a of Object.values(this.actors)) { a.root.visible = false; this.scene.add(a.root); }
    this.list = [
      { id: 'window', when: () => near(this.walker.pos, 10, 3.5, 2.6) && this.looking(cx(10), 1.7, cz(1), 0.75), run: this.windowFace },
      { id: 'locker', when: () => near(this.walker.pos, 35, 18.5, 2.2) && this.G.fuses >= 1, run: this.lockerBurst },
      { id: 'drop', when: () => near(this.walker.pos, 24.5, 11.5, 1.6) && this.walker.speed > 0.3, run: this.ceilingDrop },
      { id: 'dark', when: () => near(this.walker.pos, 18, 18.5, 2) && this.G.fuses >= 2 && !this.horrors.chase, run: this.lightsOut },
      { id: 'slab', when: () => near(this.walker.pos, 31, 24, 2.2) && this.looking(cx(31), 1.0, cz(24), 0.85), run: this.sitUp },
      { id: 'tub', when: () => near(this.walker.pos, 40, 14.5, 1.5), run: this.tubGrab },
      { id: 'behind', when: () => this.G.notes.length >= 3 && this.G.reading === null && this.walker.speed < 0.3 && !this.walker.hidden && this.zoneDark(), run: this.behindYou },
      { id: 'slam', when: () => near(this.walker.pos, 32, 15, 1.6), run: this.doorSlam },
    ];
  }
  looking(x, y, z, cos) {
    const cam = this.camera; const head = cam.getWorldPosition(new V()); const f = new V(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const to = new V(x - head.x, y - head.y, z - head.z).normalize(); return f.dot(to) > cos;
  }
  zoneDark() { const L = this.world.lightAt(this.walker.pos.x, this.walker.pos.z); return L.r + L.g + L.b < 0.05; }
  show(a, on) { a.root.visible = on; }
  light(a) { a.mat.userData.uAmb.value.copy(this.world.lightAt(a.root.position.x, a.root.position.z)).multiplyScalar(1.3); }
  powerOn() {
    // the lights come up and the thing from the morgue is standing in the generator room doorway
    if (this.done.has('power')) return; this.done.add('power');
    const b = this.horrors.feral; if (!b) return;
    setTimeout(() => {
      b.pos.set(cx(42), 0, cz(19.6)); b.yaw = 0; b.state = 'idle'; b.aware = 0.9; b.path = null; b.route = b.opts.huntRoute;
      this.horrors.glitchKick(1.2); this.sound.jump('scare'); this.sound.voice('eater', 'chase', b.pos);
      setTimeout(() => { if (this.horrors.mayChase(b)) { b.state = 'chase'; b.aware = 1.4; this.horrors.onChase(b); } else b.state = 'patrol'; }, 1600);
    }, 2700);
  }
  update(dt) {
    this.t += dt;
    if (this.active) { const r = this.active.fn.call(this, dt, this.active); if (r === true) { this.active.cleanup && this.active.cleanup(); this.active = null; } return; }
    if (!this.walker.alive || this.G.reading) return;
    for (const s of this.list) if (!this.done.has(s.id) && s.when()) { this.done.add(s.id); this.active = { fn: s.run, t: 0, s: {} }; break; }
  }
  // ---- the scares (called with this.active as A; return true when finished)
  windowFace(dt, A) {
    const a = this.actors.a; A.t += dt;
    if (A.t === dt) { this.show(a, true); a.root.position.set(cx(10), -0.25, cz(1) - 0.5); a.root.rotation.y = 0; this.sound.thud(new V(cx(10), 1.6, cz(1)), 1.2); this.sound.scream(new V(cx(10), 1.6, cz(1)), 1); this.sound.jump('scare'); this.horrors.glitchKick(1.3); }
    pose(a, 'grab', this.t, { k: 1 }); a.bones.Lupper.rotation.set(-2.6, 0, 0.5); a.bones.Rupper.rotation.set(-2.6, 0, -0.5); a.root.position.z = cz(1) - 0.45 + Math.sin(A.t * 30) * 0.02; this.light(a); a.mat.userData.uAmb.value.addScalar(0.02);
    if (A.t > 1.3) { this.show(a, false); return true; }
  }
  lockerBurst(dt, A) {
    const a = this.actors.c; A.t += dt;
    const h = this.world.hides.find((k) => k.k === 'locker' && Math.hypot(k.x - cx(35), k.z - cz(17.6)) < 1.5); if (!h) return true;
    if (A.t === dt) { this.sound.lockerRip(); this.sound.scream(new V(h.x, 1.6, h.z), 1.2); this.horrors.glitchKick(1.4); this.show(a, true); a.root.position.set(h.x + h.fx * 0.3, 0, h.z + h.fz * 0.3); a.root.rotation.y = Math.atan2(h.fx, h.fz); }
    const run = Math.min(1, A.t / 0.4); const dir = A.t < 0.6 ? 1 : 0;
    // out of the locker and away down the hall, screaming
    if (A.t > 0.4) { a.root.rotation.y = Math.PI / 2; a.root.position.x += dt * 5; }
    pose(a, A.t < 0.4 ? 'grab' : 'run', this.t, { k: run, speed: 5, phase: this.t * 11 }); this.light(a);
    if (A.t > 2.4 || a.root.position.x > cx(47)) { this.show(a, false); return true; }
  }
  ceilingDrop(dt, A) {
    const a = this.actors.d; A.t += dt; const x = cx(24.5), z = cz(10.3);
    if (A.t === dt) { this.show(a, true); A.s.y = H + 0.4; this.sound.burst(new V(x, H, z), { f: 900, q: 0.6, dur: 0.4, gain: 0.6 }); this.sound.jump('scare'); this.horrors.glitchKick(1.2); A.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshStandardMaterial({ color: 0x3a3020 })); this.scene.add(A.rope); }
    const target = H - 0.25 - 1.95 * a.s; A.s.v = (A.s.v || 0) + dt * 14; A.s.y = Math.max(target, A.s.y - A.s.v * dt);
    if (A.s.y === target && !A.s.jerk) { A.s.jerk = true; this.sound.thud(new V(x, 2, z), 0.8); this.sound.clang(new V(x, H, z), 300, 0.2, 0.6); }
    pose(a, 'hang', 0); a.root.position.set(x, A.s.y, z); a.root.rotation.y = this.t * 0.3 + Math.sin(A.t * 3) * (A.s.jerk ? 0.4 * Math.exp(-A.t) : 0); this.light(a);
    A.rope.position.set(x, (H + A.s.y + 1.95 * a.s) / 2 + 0.1, z); A.rope.scale.y = Math.max(0.1, H - (A.s.y + 1.95 * a.s) + 0.2);
    // it stays, swinging, for good
    if (A.t > 4) { this.done.add('dropDone'); return true; }
  }
  lightsOut(dt, A) {
    const a = this.actors.b; A.t += dt; const W = this.walker;
    if (A.t === dt) { this.horrors.lightsOut = true; this.sound.burst(null, { f: 120, q: 1, dur: 0.6, gain: 0.5, brown: true }); this.sound.tone(null, { f: 60, f2: 30, dur: 1.5, gain: 0.5 });
      const f = new V(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize();
      const p = W.pos.clone().addScaledVector(f, 2.6); this.space.collide(p, 0.3); a.root.position.copy(p); a.root.rotation.y = Math.atan2(W.pos.x - p.x, W.pos.z - p.z); this.show(a, true); A.s.whisper = 0; }
    // it stands there in the dark; you only see it if your night vision is on
    pose(a, 'idle', this.t, {}); a.bones.head.rotation.z = 0.5; a.mat.userData.uAmb.value.setRGB(0.0, 0.0, 0.0);
    A.s.whisper -= dt; if (A.s.whisper < 0) { A.s.whisper = 1.5; this.sound.syllables(a.root.position.clone().setY(1.6), 3, 95, { breath: 0.9, gain: 0.35 }); }
    const d = a.root.position.distanceTo(W.pos);
    if (!A.s.go && (A.t > 5 || d < 1.6 || W.speed > 2)) { A.s.go = A.t; this.sound.scream(a.root.position.clone().setY(1.6), 1); this.sound.jump('scare'); this.horrors.glitchKick(1.5); }
    if (A.s.go) { const k = A.t - A.s.go; const dir = new V().subVectors(W.pos, a.root.position).setY(0).normalize(); a.root.position.addScaledVector(dir, dt * 6); pose(a, 'grab', this.t, { k: 1 }); if (a.root.position.distanceTo(W.pos) < 0.7 || k > 1) { W.hurt(12); this.show(a, false); this.horrors.lightsOut = false; return true; } }
    if (A.t > 12) { this.show(a, false); this.horrors.lightsOut = false; return true; }
  }
  sitUp(dt, A) {
    const body = this.dressingBody(31, 24); A.t += dt; if (!body) return true;
    if (A.t === dt) { this.sound.squelch(body.root.position, 1); this.sound.voiceSynth(body.root.position.clone().setY(1.2), { f0: 90, f1: 70, dur: 1.4, vowels: ['o', 'a'], rough: 0.8, breath: 0.6, gain: 0.7 }); }
    const k = Math.min(1, A.t / 0.5); const back = A.t > 3 ? Math.min(1, (A.t - 3) / 0.6) : 0; const up = k * (1 - back);
    pose(body, 'lie', 0); body.bones.spine.rotation.x = -1.1 * up; body.bones.chest.rotation.x = -0.3 * up; body.bones.neck.rotation.set(0, 0.9 * up, 0); body.bones.jaw.rotation.x = 0.6 * up;
    if (A.t > 0.45 && !A.s.s) { A.s.s = true; this.sound.scream(body.root.position.clone().setY(1.2), 0.9); this.sound.jump('scare'); this.horrors.glitchKick(1.3); }
    if (A.t > 3.6) return true;
  }
  tubGrab(dt, A) {
    const body = this.dressingBody(40, 14.5); A.t += dt; if (!body) return true;
    if (A.t === dt) { this.sound.burst(body.root.position.clone().setY(0.5), { f: 900, q: 0.7, dur: 0.5, gain: 0.7 }); this.sound.scream(body.root.position.clone().setY(0.8), 0.8); this.sound.jump('scare'); this.horrors.glitchKick(1.3); this.walker.hurt(8); }
    const k = Math.min(1, A.t / 0.25) * (A.t > 1.8 ? Math.max(0, 1 - (A.t - 1.8) / 0.5) : 1);
    pose(body, 'slump', 0); body.bones.Rupper.rotation.set(-2.2 * k, 0, -0.3); body.bones.Rfore.rotation.x = -0.4 * k; body.bones.neck.rotation.x = 0.6 - 0.9 * k; body.bones.jaw.rotation.x = 0.4 + 0.3 * k;
    if (A.t > 2.4) return true;
  }
  behindYou(dt, A) {
    const a = this.actors.a; A.t += dt; const W = this.walker;
    if (A.t === dt) {
      const f = new V(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize();
      const p = W.pos.clone().addScaledVector(f, -1.1); this.space.collide(p, 0.3); a.root.position.copy(p); a.root.rotation.y = Math.atan2(W.pos.x - p.x, W.pos.z - p.z); this.show(a, true);
      A.s.breath = 0;
    }
    pose(a, 'idle', this.t, {}); a.bones.neck.rotation.x = 0.3; a.bones.head.rotation.z = -0.4; this.light(a);
    A.s.breath -= dt; if (A.s.breath < 0) { A.s.breath = 1.1; this.sound.breathAt(a.root.position.clone().setY(1.6), 0.4, 0.7, 500); }
    // when you turn around...
    if (!A.s.seen && this.looking(a.root.position.x, 1.55, a.root.position.z, 0.7)) { A.s.seen = A.t; this.sound.scream(a.root.position.clone().setY(1.6), 1.1); this.sound.jump('scare'); this.horrors.glitchKick(1.6); }
    if (A.s.seen) { pose(a, 'grab', this.t, { k: 1 }); if (A.t - A.s.seen > 0.7) { this.show(a, false); return true; } }
    if (A.t > 20) { this.show(a, false); return true; }
  }
  doorSlam(dt, A) {
    A.t += dt; const d = this.doors.list.find((k) => k.x === 32 && k.y === 17); if (!d) return true;
    if (A.t > 1.2 && !A.s.slam) { A.s.slam = true; d.target = 0; d.speed = 9; this.sound.door(d, 'slam', d.wx, d.wz); this.horrors.glitchKick(0.8); }
    if (A.t > 2.5 && !A.s.knock) { A.s.knock = true; for (let i = 0; i < 5; i++) this.sound.thud(new V(d.wx, 1.2, d.wz + 0.5), 0.4 + i * 0.1); }
    if (A.t > 4) return true;
  }
  dressingBody(x, y) { const p = new V(cx(x), 0, cz(y)); let best = null, bd = 2.5; for (const b of this.dressing.dead) { const d = Math.hypot(b.root.position.x - p.x, b.root.position.z - p.z); if (d < bd) { bd = d; best = b; } } return best; }
}

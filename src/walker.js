// The journalist's body: walking, running, crouching, hiding in lockers
// and under beds, getting hurt, dying. Desktop moves the dolly from keys
// and mouse; in VR your real head is the body and the stick moves it.
import * as THREE from '../vendor/three.module.js';
import { floorAt } from './plan.js?v=31';

const V = THREE.Vector3;
// Kroft is 2.16 m; his eyes are at about 2.02. However tall you make yourself, you're still a head under him.
export const MAX_EYE = 1.83;

export class Walker {
  constructor(dolly, camera, space) {
    this.dolly = dolly; this.camera = camera; this.space = space;
    this.heightOff = 0;   // your height setting (m); your eyes never go above Kroft's
    this.pos = new V(); this.yaw = 0; this.pitch = 0; this.eye = 1.64; this.crouched = false; this.vel = new V();
    this.health = 100; this.lastHurt = -99; this.alive = true; this.t = 0; this.bob = 0; this.stepPhase = 0; this.speed = 0;
    this.hidden = null; this.freecam = false; this.onStep = null; this.vrCrouch = 0; this.exhaust = 0; this.breath = 0;
    this.noise = 0;        // how loud you are right now (metres heard)
    this.lookLimit = null; this.deadT = 0; this.shake = 0;
  }
  place(x, z, yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.pitch = 0; this.hidden = null; this.alive = true; this.health = 100; this.deadT = 0; this.crouched = false; this.dolly.rotation.set(0, 0, 0); this.camera.rotation.set(0, 0, 0); this.syncVR = true; }
  get headY() { return this.vr ? this.camera.getWorldPosition(_h).y : this.eye; }
  get isCrouched() { return this.vr ? (this.headY < 1.15) : this.crouched; }
  hurt(n) { if (!this.alive) return; this.health -= n; this.lastHurt = this.t; this.shake = 0.6; if (this.health <= 0) { this.health = 0; this.alive = false; } }
  update(dt, I) {
    this.t += dt; this.vr = I.vr;
    // health comes back slowly when nothing has touched you for a while
    if (this.alive && this.t - this.lastHurt > 7) this.health = Math.min(100, this.health + dt * 9);
    this.shake = Math.max(0, this.shake - dt * 1.5);
    if (!this.alive) return this.dying(dt);
    if (I.freecam && !I.vr) this.freecam = !this.freecam;
    if (I.crouch && !this.hidden) { if (I.vr) this.vrCrouch = this.vrCrouch ? 0 : 1; else this.crouched = !this.crouched; }
    if (this.hidden) return this.hiding(dt, I);
    if (I.vr) this.vrMove(dt, I); else this.deskMove(dt, I);
  }
  deskMove(dt, I) {
    this.yaw -= I.lookDx * 0.0023 + I.turn * dt * 2.2; this.pitch -= I.lookDy * 0.0023; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    const run = I.run && !this.crouched && I.mz > 0.2;
    const sp = this.freecam ? (I.run ? 9 : 4) : this.crouched ? 1.15 : run ? 4.3 : 1.9;
    const f = new V(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new V(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const want = new V().addScaledVector(f, I.mz).addScaledVector(r, I.mx); if (want.lengthSq() > 1) want.normalize(); want.multiplyScalar(sp);
    if (this.freecam) {
      const fly = new V(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')).multiplyScalar(I.mz * sp).addScaledVector(r, I.mx * sp);
      this.pos.addScaledVector(fly, dt); this.flyY = (this.flyY ?? this.eye) + (I.up * sp + fly.y * 0) * dt;
      this.dolly.position.set(this.pos.x, floorAt(this.pos.x, this.pos.z), this.pos.z); this.camera.position.set(0, this.flyY + this.pos.y, 0); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      return;
    }
    this.flyY = undefined; this.pos.y = 0;
    this.vel.lerp(want, 1 - Math.exp(-dt * (want.lengthSq() ? 9 : 12)));
    this.pos.addScaledVector(this.vel, dt); this.space.collide(this.pos, 0.3);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.eye += ((this.crouched ? 0.98 + this.heightOff * 0.5 : Math.min(MAX_EYE, 1.64 + this.heightOff)) - this.eye) * (1 - Math.exp(-dt * 8));
    this.steps(dt, run);
    // heavy breathing after running sets the bob and the sway
    const bobA = Math.min(1, this.speed / 4.3);
    const by = Math.abs(Math.sin(this.stepPhase * Math.PI)) * 0.045 * bobA, bx = Math.cos(this.stepPhase * Math.PI) * 0.025 * bobA;
    const sh = this.shake; const sway = Math.sin(this.t * 1.3) * 0.004 * (1 + this.exhaust * 3);
    this.dolly.position.set(this.pos.x, floorAt(this.pos.x, this.pos.z), this.pos.z);
    this.camera.position.set(bx, this.eye + by + sway, 0);
    this.camera.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.08 + sway * 0.5, this.yaw + (Math.random() - 0.5) * sh * 0.08, Math.cos(this.stepPhase * Math.PI) * 0.006 * bobA, 'YXZ');
  }
  vrMove(dt, I) {
    const head = this.camera.getWorldPosition(new V());
    if (this.syncVR) {   // put the head where the body was placed
      this.syncVR = false;
      const hl = this.camera.position; const ang = this.yaw - camYaw(this.camera);
      this.dolly.rotation.y = ang;
      const off = new V(hl.x, 0, hl.z).applyAxisAngle(new V(0, 1, 0), ang);
      this.dolly.position.set(this.pos.x - off.x, floorAt(this.pos.x, this.pos.z), this.pos.z - off.z); this.lift = 0;
      return;
    }
    if (I.snap) {   // snap turn about the head
      const a = -I.snap * Math.PI / 6; const d = new V().subVectors(this.dolly.position, head).applyAxisAngle(new V(0, 1, 0), a);
      this.dolly.position.copy(head).add(d).setY(this.dolly.position.y); this.dolly.rotation.y += a;
    }
    const yaw = camYaw(this.camera) + this.dolly.rotation.y; this.yaw = yaw;
    const crouch = this.vrCrouch || head.y < 1.15;
    const run = I.run && !crouch;
    const sp = crouch ? 1.15 : run ? 4.3 : 1.9;
    const f = new V(-Math.sin(yaw), 0, -Math.cos(yaw)), r = new V(Math.cos(yaw), 0, -Math.sin(yaw));
    const want = new V().addScaledVector(f, I.mz).addScaledVector(r, I.mx); if (want.lengthSq() > 1) want.normalize(); want.multiplyScalar(sp);
    this.vel.lerp(want, 1 - Math.exp(-dt * 10));
    const p = new V(head.x, 0, head.z).addScaledVector(this.vel, dt);
    this.space.collide(p, 0.25);
    this.dolly.position.x += p.x - head.x; this.dolly.position.z += p.z - head.z;
    const lift = Math.min((this.vrCrouch ? -0.6 : 0) + this.heightOff, MAX_EYE - this.camera.position.y);   // never taller than Kroft
    this.lift = (this.lift || 0) + (lift - (this.lift || 0)) * (1 - Math.exp(-dt * 8)); this.dolly.position.y = this.lift + floorAt(p.x, p.z);   // (the floor under you: up the stairs)
    this.pos.set(p.x, 0, p.z); this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.steps(dt, run);
  }
  steps(dt, run) {
    const crouch = this.isCrouched;
    const rate = this.speed < 0.2 ? 0 : (run ? 2.6 : crouch ? 1.2 : 1.75);
    const before = Math.floor(this.stepPhase); this.stepPhase += rate * dt;
    if (Math.floor(this.stepPhase) !== before && this.onStep) this.onStep(run ? 1 : crouch ? 0.15 : 0.45, this.pos);
    this.noise = this.speed < 0.2 ? 0 : run ? 11 : crouch ? 1.2 : 4;
    this.exhaust = Math.max(0, Math.min(1, this.exhaust + (run ? dt * 0.12 : -dt * 0.07)));
  }
  // ---- hiding: lockers and beds
  hide(h) {
    this.hidden = h; this.vel.set(0, 0, 0); this.hideT = 0; this.noise = 0;
    this.hideFrom = this.pos.clone();
    if (h.k === 'locker') { this.pos.set(h.x - h.fx * 0.04, 0, h.z - h.fz * 0.04); this.yaw = Math.atan2(-h.fx, -h.fz); this.pitch = 0; }
    else if (h.k === 'strap') { this.pos.set(h.x, 0, h.z); this.yaw = Math.atan2(-h.fx, -h.fz); this.pitch = 1.15; this.eye = 0.95; }
    else { this.pos.set(h.x, 0, h.z); this.yaw = Math.atan2(-h.fx, -h.fz) + Math.PI / 2; this.pitch = -0.05; }
    this.syncVR = true; this.hideYaw = this.yaw;
  }
  unhide() {
    const h = this.hidden; if (!h) return;
    if (h.k === 'locker') this.pos.set(h.x + h.fx * 0.75, 0, h.z + h.fz * 0.75);
    else if (h.k === 'strap') { const sx = Math.cos(h.ang), sz = -Math.sin(h.ang); this.pos.set(h.x + sx * 0.9, 0, h.z + sz * 0.9); if (this.space.collide(this.pos.clone(), 0.3)) this.pos.set(h.x - sx * 0.9, 0, h.z - sz * 0.9); this.pitch = 0; }
    else { const sx = Math.cos(h.ang), sz = -Math.sin(h.ang); this.pos.set(h.x + sx * 0.95, 0, h.z + sz * 0.95); if (this.space.collide(this.pos.clone(), 0.3)) this.pos.set(h.x - sx * 0.95, 0, h.z - sz * 0.95); }
    this.space.collide(this.pos, 0.3);
    this.hidden = null; this.syncVR = true; this.vrCrouch = 0;
  }
  hiding(dt, I) {
    const h = this.hidden; this.hideT += dt; this.speed = 0; this.noise = 0;
    const eye = h.k === 'locker' ? 1.6 : h.k === 'strap' ? 0.95 : 0.26;
    if (I.vr) {
      // keep the head inside the locker / under the bed
      const head = this.camera.getWorldPosition(new V());
      if (this.syncVR) { this.syncVR = false; const hl = this.camera.position; const ang = this.yaw - camYaw(this.camera); this.dolly.rotation.y = ang; const off = new V(hl.x, 0, hl.z).applyAxisAngle(new V(0, 1, 0), ang); this.dolly.position.set(this.pos.x - off.x, floorAt(this.pos.x, this.pos.z), this.pos.z - off.z); this.hideY = 0; }
      else { this.dolly.position.x += this.pos.x - head.x; this.dolly.position.z += this.pos.z - head.z; }
      const fl = floorAt(this.pos.x, this.pos.z); const dy0 = this.dolly.position.y - fl; const want = h.k === 'locker' ? 0 : h.k === 'strap' ? Math.min(0, eye - (head.y - this.dolly.position.y)) : eye - (head.y - this.dolly.position.y); this.dolly.position.y = fl + dy0 + (want - dy0) * (1 - Math.exp(-dt * 6));
    } else {
      this.yaw -= I.lookDx * 0.0018; this.pitch -= I.lookDy * 0.0018;
      const lim = h.k === 'locker' ? 0.45 : h.k === 'strap' ? 1.1 : 0.9; this.yaw = this.hideYaw + Math.max(-lim, Math.min(lim, this.yaw - this.hideYaw)); this.pitch = h.k === 'strap' ? Math.max(0.2, Math.min(1.45, this.pitch)) : Math.max(-0.5, Math.min(0.4, this.pitch));
      this.eye += (eye - this.eye) * (1 - Math.exp(-dt * 6));
      const br = Math.sin(this.t * 2.2) * 0.006;
      this.dolly.position.set(this.pos.x, floorAt(this.pos.x, this.pos.z), this.pos.z); this.camera.position.set(0, this.eye + br, 0); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }
  }
  dying(dt) {
    this.deadT += dt;
    if (!this.vr) {
      const k = Math.min(1, this.deadT / 1.1);
      this.camera.position.y = this.eye * (1 - k * 0.85) + 0.05; this.camera.rotation.z = k * 1.2; this.camera.rotation.x = this.pitch * (1 - k) + k * 0.3;
    } else { const fl = floorAt(this.pos.x, this.pos.z); this.dolly.position.y += (fl - 1.2 - this.dolly.position.y) * dt * 2; }
  }
}
const _h = new V();
function camYaw(cam) { const e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ'); return e.y; }

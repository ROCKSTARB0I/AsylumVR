// Abduction: how Tape 1 ends. A few steps into the courtyard somebody starts whistling behind you.
// The whistling stops. Pell's face is in the lens, lit by his own flashlight, and the flashlight
// comes down. The tape keeps rolling while you lie there, and while he drags you back inside by the
// ankles. Then a card says where he took you (Tape 2 picks up from there).
import * as THREE from '../vendor/three.module.js';
import { makeBody, pose, flashlight } from './carcass.js?v=25';
import { C } from './plan.js?v=25';
const V = THREE.Vector3;
const sm = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

export const ABDUCT_TEXT = [
  'The gate rose. You made it eleven steps into the courtyard.',
  'The blow came from behind: a long steel flashlight, swung by a man who had done it many times before. The camera kept rolling. It caught him standing over you in a stained orderly’s uniform, whistling a tune that never finished.',
  'He didn’t take you out. He took you back in, by the ankles, across the courtyard and past the patients standing in the rain, through a side door of the north building and up the stairs to the Male Ward, where the beds have straps.',
  'His name was Pell. He was the night orderly. He was let go in ’87. He still does his rounds.',
];

export class Abduction {
  // c: { scene, camera, dolly, walker, sound, horrors, scares, setFade(v, now), card, placeCard }
  constructor(c) {
    Object.assign(this, c); this.on = false; this.t = 0;
    // Pell, the same man (same seed) who hunts the Male Ward on Tape 2
    const b = this.pell = makeBody('orderly', 61, {}); const s = b.s;
    const w = flashlight(s); w.position.set(0, -0.08 * s, 0.03); w.rotation.x = -Math.PI / 2 + 0.9; b.bones.Rhand.add(w); this.torch = w;
    b.root.visible = false; this.scene.add(b.root);
  }
  start() {
    this.on = true; this.t = 0; this.ev = new Set(); this.cardUp = false; this.base = null; this.lay = null;
    const H = this.horrors; for (const h of H.list) { h.active = false; h.body.root.visible = false; } H.beam.intensity = 0; H.fear = 0.6;
    // where he'll come from: behind you, back toward the gate
    this.from = this.walker.pos.clone();
  }
  once(k, at) { if (this.t >= at && !this.ev.has(k)) { this.ev.add(k); return true; } return false; }
  // head position and the way it's facing, flattened
  head() { return this.camera.getWorldPosition(new V()); }
  fwd() { const f = new V(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion())); return f; }

  update(dt, vr, I) {
    this.t += dt; const t = this.t, S = this.sound, H = this.horrors, P = this.pell, B = P.bones, w = this.walker;
    const behind = () => { const f = this.fwd(); f.y = 0; f.normalize(); return this.head().addScaledVector(f, -1).setY(1.5); };
    H.glitch = Math.max(0, (H.glitch || 0) - dt * 2.5); H.static = Math.max(0, (H.static || 0) - dt * 3);

    // ---- 1. whistling, behind you, getting closer; you can still look but not move
    if (t < 2.2) {
      w.update(dt, { ...I, mx: 0, mz: 0, run: false, crouch: false, interact: false, snap: 0 });
      if (this.once('w1', 0.05)) S.voice('orderly', 'idle', behind().addScaledVector(this.fwd().setY(0).normalize(), -3));
      if (this.once('w2', 0.75)) S.voice('orderly', 'idle', behind());
      if (this.once('hush', 1.5)) S.hush(0.68);               // it stops. nothing at all. (the hush lifts on the frame he hits)
      return;
    }
    // ---- 2. JUMP: he lunges into the lens out of nothing, his flashlight strobing on his face
    if (t < 2.8) {
      if (this.once('jump', 2.2)) {
        this.loud(() => {
          const h = this.head(); const rec = (k, g, d = 0) => { if (S.has(k)) S.playRec(k, null, { gain: g, delay: d, verb: 0.05 }); };
          rec('j:scare', 1.9); rec('j:scare', 1.4, 0.03); rec('j:sting', 1.6);
          S.voice('orderly', 'attack', h); S.scream(h, 1.8);
          S.burst(null, { f: 900, q: 0.35, dur: 0.7, gain: 1.1 }); S.burst(null, { f: 3200, q: 0.5, dur: 0.35, gain: 0.7 });
          S.tone(null, { f: 58, f2: 28, dur: 1.4, gain: 1.2, verb: 0.2 }); S.tone(null, { f: 440, f2: 1600, type: 'sawtooth', dur: 0.5, gain: 0.25, verb: 0.1 });
        });
        H.glitch = 3; H.static = 1; w.health = 55; P.root.visible = true;
      }
      const k = t - 2.2; const f = this.fwd(); const h = this.head();
      const d = 0.26 + Math.max(0, 1.15 - k * 10) + Math.sin(k * 40) * 0.02;            // a metre away to in your face in a tenth of a second
      const target = h.clone().addScaledVector(f, d).add(new V((Math.random() - 0.5) * 0.03, -0.02 + (Math.random() - 0.5) * 0.03, 0));
      pose(P, 'attack', t, { k: Math.min(0.45, k * 0.85) }); B.jaw.rotation.x = 0.75 + Math.sin(k * 31) * 0.18; B.head.rotation.z = Math.sin(k * 23) * 0.22;
      this.scares.faceAt(P, target);
      const strobe = Math.sin(k * 75) > -0.2 ? 0.32 : 0.03; P.mat.userData.uAmb.value.setRGB(strobe, strobe * 0.9, strobe * 0.78);
      H.static = Math.max(H.static, Math.sin(k * 50) > 0.6 ? 0.45 : 0); H.glitch = Math.max(H.glitch, 1.4);
      this.jolt(vr, 0.07);
      return;
    }
    // ---- 3. the crack
    if (this.once('crack', 2.8)) {
      this.loud(() => {
        S.hit('orderly'); S.thud(this.head(), 2.2); S.squelch(this.head(), 1.1);
        S.burst(null, { f: 2400, q: 0.4, dur: 0.18, gain: 1.2 }); S.tone(null, { f: 70, f2: 22, dur: 1.6, gain: 1.3, verb: 0.4 });
      });
      S.tone(null, { f: 3900, dur: 5.5, gain: 0.05, a: 0.02, verb: 0 });                       // your ears ringing
      H.glitch = 3; H.static = 1; w.health = 18; P.root.visible = false;
      this.setFade(0.15, true);
    }
    if (t < 4.4) { this.setFade(Math.min(1, (t - 2.8) / 0.35), true); this.jolt(vr, Math.max(0, 0.05 - (t - 2.8) * 0.12)); return; }

    // ---- 4. on your back in the courtyard, him over you
    if (!this.lay) {
      // lay you out just through the gate, feet toward the building (north)
      const x = Math.max(25 * C + 0.4, Math.min(27 * C - 0.4, this.from.x)); this.lay = new V(x, 0, 38.4 * C);
      P.root.visible = true;
    }
    const drag = sm(6.8, 10.8, t) * 3.2 + (t > 6.8 ? Math.max(0, Math.sin((t - 6.8) * 7)) * 0.04 : 0);   // pulled in jerks
    const headAt = this.lay.clone().add(new V(0, 0, -drag));
    // the eyes: on the ground, looking along your body to him
    if (vr) {
      const off = this.camera.position.clone().applyAxisAngle(new V(0, 1, 0), this.dolly.rotation.y);
      this.dolly.position.set(headAt.x - off.x, 0.22 - this.camera.position.y, headAt.z - off.z);
    } else {
      this.dolly.position.set(headAt.x, 0, headAt.z); this.dolly.rotation.set(0, 0, 0);
      this.camera.position.set(0, 0.2, 0); this.camera.rotation.set(0.62 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.4) * 0.08, 0.22 + Math.sin(t * 0.9) * 0.03, 'YXZ');
    }
    const feet = headAt.clone().add(new V(0, 0, -1.45));
    if (t < 6.8) {
      // standing at your feet, looking down, the light in your face
      P.root.position.copy(feet).add(new V(0, 0, -0.35)); P.root.rotation.set(0, 0, 0);
      pose(P, 'idle', t, {}); B.neck.rotation.x = 0.55; B.head.rotation.x = 0.35; B.Rupper.rotation.set(-1.0, 0, -0.15); B.Rfore.rotation.x = -0.4; B.jaw.rotation.x = 0.08 + Math.max(0, Math.sin(t * 6)) * 0.05;
      this.setFade(0.35 + (1 - sm(4.4, 5.6, t)) * 0.6 + Math.max(0, Math.sin(t * 1.7)) * 0.2, true);
      if (this.once('w3', 5.0)) S.voice('orderly', 'idle', P.root.position.clone().setY(1.6));
      this.beam(P, this.head());
    } else {
      // he has your ankles: walking backward toward the building, bent, pulling
      const pull = Math.max(0, Math.sin((t - 6.8) * 7));
      P.root.position.copy(feet).add(new V(0, 0, -0.7)); P.root.rotation.set(0, Math.PI, 0);
      pose(P, 'walk', t, { speed: 0.8, phase: (t - 6.8) * 4.5 });
      B.spine.rotation.x = 0.45 + pull * 0.1; B.chest.rotation.x = 0.2; B.neck.rotation.x = -0.3;
      B.Lupper.rotation.set(0.75 + pull * 0.2, 0, 0.12); B.Rupper.rotation.set(0.75 + pull * 0.2, 0, -0.12); B.Lfore.rotation.x = -0.2; B.Rfore.rotation.x = -0.2;
      H.beam.intensity = Math.max(0, H.beam.intensity - dt * 20);
      if (pull > 0.95 && !this.pulled) { this.pulled = true; S.burst(null, { f: 260, q: 0.7, dur: 0.5, gain: 0.22, brown: true }); S.thud(this.head(), 0.25); } if (pull < 0.5) this.pulled = false;
      this.setFade(0.5 + Math.max(0, Math.sin(t * 2.3)) * 0.35 + sm(9.6, 10.8, t), true);
    }
    P.mat.userData.uAmb.value.setRGB(0.07, 0.07, 0.085);    // moonlight, rain
    if (t < 11.2) return;

    // ---- 5. black. In the headset, the card first; on desktop, straight to the end screen
    P.root.visible = false; H.beam.intensity = 0;
    if (!vr) { this.on = false; return 'done'; }
    if (!this.cardUp) { this.cardUp = t; this.card.card([['END OF TAPE 1', 64], ...ABDUCT_TEXT.map((l) => [l, 27, '#d8d0c0']), ['', 10], ['Pull the trigger', 28, '#9a948a']], { top: 70 }); this.placeCard(); }
    if ((t - this.cardUp > 1.5 && I.interact) || t - this.cardUp > 60) { this.card.mesh.visible = false; this.on = false; return 'done'; }
  }
  // straight to the speakers, past the hush
  loud(fn) { const S = this.sound; const v = S.vip; S.vip = true; try { fn(); } finally { S.vip = v; } }
  // the flashlight beam from his hand into your face
  beam(P, at) { const H = this.horrors; const v = this.torch.getWorldPosition(new V()); H.beam.position.copy(v); H.beamTgt.position.copy(at); H.beamTgt.updateMatrixWorld(); H.beam.intensity = 12 * (0.92 + Math.random() * 0.08); }
  // shake around where you were, not a drift
  jolt(vr, k) {
    if (!this.base) this.base = { p: this.dolly.position.clone(), rx: this.camera.rotation.x, ry: this.camera.rotation.y };
    const b = this.base; const r = () => (Math.random() - 0.5) * k * 2;
    if (vr) { this.dolly.position.set(b.p.x + r(), b.p.y + r(), b.p.z + r()); return; }
    this.camera.rotation.x = b.rx + r(); this.camera.rotation.y = b.ry + r();
  }
}

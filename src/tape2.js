// Tape 2, The Male Ward: the documents, what you mutter, the objectives,
// the wake-up, the keys, and this tape's own set-piece scares.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, H } from './plan.js?v=19';
import { makeBody, pose } from './carcass.js?v=19';

const V = THREE.Vector3;

export const NOTES = {
  n2_wake: { t: 'Clipboard hung on the end of your bed', b: `ADMISSION — MALE WARD (UPPER)\nName: WARD, E.   Age: 34   Brought in by: grounds staff, courtyard, 02:40\nCondition: agitated, carrying recording equipment. Equipment confiscated (see nurses' station).\nPrescribed: restraint, sedation, Morphogenic protocol stage 1.\nSurgery: 03:00 — Dr. A. Voss\n\nUnder the stamp, in pencil: "he asked for this one personally"` },
  n2_pell: { t: 'Night rota, nurses\' station', b: `NIGHT ORDERLY: L. PELL\nRounds every forty minutes. Lights out. Count the beds. Wake anyone who isn't sleeping properly.\n\nPell was let go in '87. He still comes in. Nobody pays him. Nobody has told him to stop, because the last person who told him to stop is in bed 14 now, and he is sleeping very properly.\n\nKEYCARD for the chapel is in the top drawer. Do NOT give it to Pell.` },
  n2_dorm: { t: 'Letter under a pillow, never posted', b: `Mum,\nThey moved me upstairs. It's better up here, there are windows. The man who checks on us at night sings to us. He says rise and shine even when it's dark. He says the ones who don't wake up get to go to the doctor.\nI am always awake now. I am always awake.\n— Danny` },
  n2_padded: { t: 'Torn out of a hymn book, written over', b: `the walls are soft so you cant hurt yourself\nthe walls are soft so they cant hear you\nthe walls are soft so the doctor can listen\nTHE BIG ONE CAME UP FROM DOWNSTAIRS. HE IS LOOKING FOR THE MAN WITH THE CAMERA.` },
  n2_hydro: { t: 'Hydrotherapy treatment card', b: `Patient 31 — continuous bath, 14 hrs. Temperature maintained. Patient became quiet at hour 9.\nPatient 32 — ice wrap, 6 hrs. Patient became quiet at hour 4.\nPatient 33 — continuous bath. Patient has not become quiet. Patient is still talking. Patient is talking to Dr. Voss about the man with the camera.` },
  n2_chapel: { t: 'Chaplain\'s diary, last entry', b: `October. I have stopped saying mass. Voss comes in at night and sits in the front pew and asks me questions about the soul, where it is kept, whether it is in the front of the head or the back. He writes my answers down.\nI keep the key to the stairwell gate on the altar so God can watch it. Voss has the other one. He keeps it with his instruments.\nIf anyone reads this: the basement is not a basement. It goes further down than the building does.` },
  n2_surgery: { t: 'Theater schedule, chalkboard copied to paper', b: `03:00  WARD, E.  — frontal access, stage 1. Bring the camera. He'll want to see it after.\n03:40  KROFT (review) — sutures.\n04:20  —\nTHE STAIRWELL KEY STAYS ON MY TRAY. — A.V.` },
  n2_stairs: { t: 'Sign wired to the stairwell gate', b: `WARD C — STAFF ONLY BEYOND THIS POINT\n\nUnder it, scratched into the paint with something sharp:\n"there is no ward c. there is only down."` },
  n2_kroft: { t: 'Transfer slip, linen store', b: `PATIENT: KROFT, ABEL\nFROM: Ground floor (unsecured)  TO: Male Ward (upper), chapel annexe\nREASON: Incident. Patient pursued an intruder with a camera for some hours. Patient will not settle until he finds him.\nSIGNED: A. Voss\n(Handwritten:) let him look.` },
};

export const MUTTER = {
  start: "Where... where am I? I can't— I can't move my arms.",
  struggle: 'Come on... come on...',
  free: "Okay. Okay. They didn't take the camera. They didn't take the camera.",
  stairs: "The stairwell. Chained. Of course it's chained.",
  card: 'A keycard. Chapel.',
  chapelKey: "The chaplain's key. One more. Voss has the other.",
  stairKey: "Got it. Got it. The stairs. Go. GO.",
  pell: 'Someone is whistling.',
  kroft: "No. No, no, no. Not him again.",
  surgery: "This is where he was going to... Jesus.",
  hide: "Don't breathe. Don't breathe.",
};

export const OBJECTIVES = [
  { id: 'free', text: 'Get free of the restraints', done: (s) => !s.strapped },
  { id: 'out', text: 'Find a way out of the ward', done: (s) => s.sawStairs || s.items.has('card') },
  { id: 'card', text: "Find the chapel keycard in the nurses' station", done: (s) => s.items.has('card') },
  { id: 'chapel', text: "Find the chaplain's key in the chapel", done: (s) => s.items.has('chapelKey') },
  { id: 'theater', text: "Take Dr. Voss's key from the surgical theater", done: (s) => s.items.has('stairKey') },
  { id: 'stairs', text: 'GET TO THE STAIRWELL', done: (s) => s.escaped },
];

export const ITEM_LABEL = { card: 'Take keycard', chapelKey: 'Take key', stairKey: 'Take key' };
export const LOCK_NAME = { card: 'the chapel keycard', chapelKey: "the chaplain's key", stairKey: 'the stairwell key' };

export const ENDING = (G, timecode) => `<div class="end"><p class="kicker">Mount Harrow State Asylum</p><h1 class="logo">END OF TAPE 2</h1><p class="lede">The stairs went down past the ground floor. Past where the foundations should have been. The walls turned from tile to brick to stone.<br>At the bottom there was a light on, and a radio playing, and somebody humming along.</p><p class="kicker">Deaths ${G.deaths} · Notes ${G.notes.length}/${Object.keys(NOTES).length} · Time ${timecode(G.t).slice(3, 8)}</p><p class="lede">Tape 3 — <i>The Fall</i> — is next.</p><nav class="menu"><button onclick="location.href='?tape=1'">Tape 1</button><button onclick="location.href='?tape=2'">Replay Tape 2</button></nav></div>`;

// ------------------------------------------------------------------ set pieces
// These run as Scares methods (this = the Scares instance), like Tape 1's.
const near = (p, x, y, r) => Math.hypot(p.x - cx(x), p.z - cz(y)) < r;
export function setPieces(S) {
  const nearestDead = (x, y) => { let best = null, bd = 2.5; for (const b of S.dressing.dead) { const d = Math.hypot(b.root.position.x - cx(x), b.root.position.z - cz(y)); if (d < bd) { bd = d; best = b; } } return best; };
  return [
    // a sheeted body on a dorm bed sits bolt upright as you pass
    { id: 'dormSit', when: () => near(S.walker.pos, 19, 21.5, 1.8), run(dt, A) {
      const b = nearestDead(19, 20.2); if (!b) return true;
      if (!A.s.go) { A.s.go = true; S.sound.hush(0.8); }
      const k = Math.min(1, A.t / 0.25); const back = A.t > 2.6 ? Math.min(1, (A.t - 2.6) / 0.5) : 0; const up = k * (1 - back);
      pose(b, 'lie', 0); b.bones.spine.rotation.x = -1.3 * up; b.bones.chest.rotation.x = -0.3 * up; b.bones.neck.rotation.set(0.1, -1.1 * up, 0); b.bones.jaw.rotation.x = 0.8 * up;
      if (A.t > 0.22 && !A.s.hit) { A.s.hit = true; S.sound.jump('scare'); S.sound.scream(b.root.position.clone().setY(1.2), 1.1); S.horrors.glitchKick(2); S.horrors.staticBurst(0.1); S.walker.shake = 0.9; }
      return A.t > 3.2;
    } },
    // a face slams into the observation hatch of a padded cell
    { id: 'hatch', when: () => near(S.walker.pos, 13, 16.3, 1.4), run(dt, A) {
      const a = S.actors[2];
      if (!A.s.go) { A.s.go = true; a.root.visible = true; S.sound.thud(new V(cx(13), 1.6, cz(15)), 1.4); S.sound.jump('scare'); S.sound.scream(new V(cx(13), 1.6, cz(15)), 1.1); S.horrors.glitchKick(2); S.horrors.staticBurst(0.08); S.walker.shake = 0.8; }
      pose(a, 'grab', S.t, { k: 1 }); a.bones.jaw.rotation.x = 0.7 + Math.sin(A.t * 25) * 0.15;
      S.faceAt(a, new V(cx(13) + Math.sin(A.t * 30) * 0.02, 1.72, cz(15) - 0.12)); a.mat.userData.uAmb.value.setRGB(0.05, 0.05, 0.05);
      if (A.t > 1.4) { a.root.visible = false; return true; }
      return false;
    } },
    // the hanged chaplain turns his head to look at you
    { id: 'chaplain', when: () => S.G.items.has('card') && near(S.walker.pos, 37, 10.5, 2.2) && S.looking(cx(37), 1.9, cz(9), 0.75), run(dt, A) {
      const b = nearestDead(37, 9); if (!b) return true;
      if (!A.s.go) { A.s.go = true; S.sound.hush(2.5); S.sound.voiceSynth(b.root.position.clone().setY(2), { f0: 80, f1: 60, dur: 2.2, vowels: ['o', 'u', 'm'], rough: 0.9, breath: 0.6, gain: 0.7 }); }
      const k = Math.min(1, A.t / 1.8); pose(b, 'hang', 0); b.bones.neck.rotation.set(0.1, 1.4 * k, 0.55 * (1 - k)); b.bones.head.rotation.set(0.2, 0.3 * k, 0.5 * (1 - k)); b.bones.jaw.rotation.x = 0.35 + k * 0.4;
      const h = S.head(); b.root.rotation.y += (Math.atan2(h.x - b.root.position.x, h.z - b.root.position.z) - 1.4 - b.root.rotation.y) * 0.02;
      if (A.t > 1.9 && !A.s.drop) { A.s.drop = true; S.sound.jump('sting'); S.horrors.glitchKick(1.4); }
      return A.t > 3;
    } },
    // the operating lamp stutters and there's someone on the table
    { id: 'table', when: () => S.G.items.has('chapelKey') && near(S.walker.pos, 12, 7, 3), run(dt, A) {
      const b = nearestDead(12, 4.6); if (!b) return true;
      if (!A.s.go) { A.s.go = true; S.horrors.blackout = true; S.sound.hush(2); }
      S.horrors.blackout = A.t < 1.2 ? Math.sin(A.t * 40) > 0.6 : false;
      pose(b, 'lie', 0); const tw = A.t > 1.2 && A.t < 3 ? Math.sin(A.t * 37) * 0.3 : 0; b.bones.Lupper.rotation.z += tw; b.bones.Rfore.rotation.x -= Math.abs(tw); b.bones.neck.rotation.y = tw * 2; b.bones.jaw.rotation.x = 0.4 + Math.abs(tw);
      if (A.t > 1.2 && !A.s.hit) { A.s.hit = true; S.sound.jump('scare'); S.sound.voiceSynth(b.root.position.clone().setY(1.1), { f0: 260, f1: 420, dur: 1.4, vowels: ['a', 'i'], rough: 0.9, breath: 0.4, gain: 0.9 }); S.horrors.glitchKick(1.8); S.walker.shake = 0.7; }
      return A.t > 3.4;
    } },
  ];
}

// ------------------------------------------------------------------ the tape's own loop
export function setupTape2(ctx) {
  const { G, walker, plan, say, caption, sound, horrors, cam } = ctx;
  G.strapped = true; G.struggle = 0; G.sawStairs = false;
  const bed = ctx.world.hides.find((h) => h.k === 'bed' && Math.hypot(h.x - cx(9.4), h.z - cz(32.6)) < 1.5) || { x: cx(9.4), z: cz(32.6), fx: 0, fz: 1, ang: 0 };
  const strap = { k: 'strap', x: bed.x, z: bed.z, fx: 0, fz: -1, ang: bed.ang };
  return {
    start() { walker.hide(strap); G.strapped = true; G.struggle = 0; setTimeout(() => say('start'), 1200); setTimeout(() => caption(ctx.vr() ? 'Mash any button to fight the straps!' : 'Mash any key or click to fight the straps!', 4), 4500); },
    // you have to keep fighting for about five seconds; stop and the straps win back what you gained
    strapLabel: () => { const n = Math.round(G.struggle * 12); return 'Struggle! ' + '\u25AE'.repeat(n) + '\u25AF'.repeat(12 - n); },
    struggle() {
      if (!G.strapped) return;
      G.struggle = Math.min(1, G.struggle + 0.04); walker.shake = Math.max(walker.shake, 0.35);
      if (!G.rattleT || G.t - G.rattleT > 0.12) { G.rattleT = G.t; sound.rattle(walker.pos.x, walker.pos.z); }
      if (G.struggle > 0.3 && !G.said.has('struggle')) say('struggle');
      if (G.struggle >= 1) { G.strapped = false; walker.unhide(); sound.locker(false, 'bed'); sound.thud(walker.pos.clone().setY(0.6), 0.6); say('free', 0.5); ctx.checkpoint(); }
    },
    update(dt) {
      if (G.strapped) G.struggle = Math.max(0, G.struggle - 0.08 * dt);
      const p = walker.pos;
      if (!G.sawStairs && Math.hypot(p.x - cx(45), p.z - cz(17)) < 3) { G.sawStairs = true; say('stairs'); }
      if (!G.said.has('surgery') && p.z < cz(8.5) && p.x < cx(22.5)) say('surgery');
      if (horrors.hunter && horrors.hunter.kind === 'orderly' && !G.said.has('pell') && !G.strapped && G.t > 40) say('pell');
      if (horrors.hunter && horrors.hunter.kind === 'brute' && !G.said.has('kroft') && horrors.chase > 0.5) say('kroft');
      if (!G.escaped && G.items.has('stairKey') && Math.hypot(p.x - cx(plan.exit.x), p.z - cz(plan.exit.y)) < plan.exit.r) { G.escaped = true; ctx.ending(); }
    },
  };
}

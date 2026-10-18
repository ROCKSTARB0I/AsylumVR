// Tape 3, The Fall: 14 October 1989. You are J. Marsh, night orderly, carrying the ward camcorder
// (Voss has the staff film the patients). Clock in, do the count, take Voss his tray. Then the alarm:
// the mains die, the beacons turn the building red, every cell door opens, and the staff die.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, H } from './plan.js?v=18';
import { makeBody, pose } from './carcass.js?v=18';
const V = THREE.Vector3;

export const NOTES = {
  n3_tray: { t: 'Card tucked under the tray cover', b: `ISOLATION — DR. VOSS\nDeliver 23:30. Do not lift the cover.\nDo not discuss with day staff.\n\nIf the patient in Isolation asks for his mother, do not answer him.` },
  n3_rota: { t: 'Night rota, 14 October 1989', b: `SECURITY: R. DAWES (gate panel)\nNURSE: A. KELLY\nORDERLY: J. MARSH — count at 23:00, Isolation tray at 23:30\nDR. HALE, DR. OKAFOR, DR. BRANDT — on call\nDR. A. VOSS — Isolation. Do not disturb.\n\nL. PELL is NOT to be admitted to the building. If he is seen on the grounds, call the gate.` },
  n3_memo: { t: 'Memo from the State Board of Health', b: `Re: Mount Harrow — budget review\n\nThe Board is minded to recommend decommissioning by the end of the year. Patient transfers to be arranged. Records to be archived.\n\nWritten across the bottom in a doctor's hand:\n"They will not be transferring mine. — A.V."` },
};

export const MUTTER = {
  start: 'Night shift. Clock in, do the count, keep your head down.',
  clock: '"Evening, Marsh. Count’s on the board. The doctor wants his tray."',
  kroft: 'Kroft. Singing to the wall again.',
  rourke: 'Rourke. Chart says deceased. He’s sitting up. Eating.',
  a: 'Bed two. Asleep. Thank God.',
  b: 'Bed nine. Awake. Just... staring at the door.',
  tray: 'Voss’s tray. The cover’s warm.',
  voss: '"Thank you, Marsh. Back to your rounds now."',
  alarm: 'What— what’s happening? The doors... the doors are opening!',
  hang: 'Doctor Hale? Doctor— no. No, no, NO—',
  gut: 'Oh God. Oh God, they’re eating him.',
  security: 'Dawes... The gate’s sealed. Lockdown. The window in Administration— go!',
  window: 'Come on. Come ON.',
  hide: "Don't breathe. Don't breathe.",
};

export const OBJECTIVES = [
  { id: 'clock', text: 'Clock in at the security office', done: (s) => s.clocked },
  { id: 'count', text: (s) => `The 23:00 count: check the cells (${s.counted || 0}/4)`, done: (s) => (s.counted || 0) >= 4 },
  { id: 'tray', text: "Collect Dr. Voss's tray from the kitchen counter", done: (s) => s.items.has('tray') },
  { id: 'voss', text: 'Take the tray to Dr. Voss in the morgue', done: (s) => s.delivered },
  { id: 'sec', text: 'Get to the security office', done: (s) => s.sawLockdown },
  { id: 'out', text: 'GET OUT through the Administration window', done: (s) => s.escaped },
];
export const ITEM_LABEL = { tray: 'Take the tray' };
export const ENDING_TEXT = [
  'The latch snapped off in your hand. You went out through the Administration window, and you did not stop running until the sun came up.',
  'Twenty-three staff were on the night shift at Mount Harrow on 14 October 1989. By the end of the month, the state listed every one of them as transferred.',
  'Three weeks later, Mount Harrow was declared decommissioned. The meal rosters kept coming.',
  'Four years later, you wrote to a journalist. You told them to come after dark, to bring a camera, and that the east window in Administration doesn’t latch.',
];
export const ENDING = (G, timecode, notesN) => `<div class="end"><p class="kicker">Mount Harrow State Asylum &middot; 14 October 1989</p><h1 class="logo">END OF TAPE 3</h1><p class="lede">${ENDING_TEXT.join('<br><br>')}</p><p class="kicker">Deaths ${G.deaths} · Notes ${G.notes.length}/${notesN} · Time ${timecode(G.t).slice(3, 8)}</p><nav class="menu"><button onclick="location.href='?tape=1'">Play Tape 1: Recovered Footage</button><button onclick="location.href='?tape=3'">Rewind</button></nav></div>`;

// ------------------------------------------------------------------ the people
// before the fall the staff are just people: healthy faces, clean whites, nobody staring
const clean = { blood: 0, dirt: 0.05, scars: 0, healthy: true, face: 'plain', stare: false, smile: false, lean: 0.15 };
function body(scene, kind, seed, look) { const b = makeBody(kind, seed, look); scene.add(b.root); b.root.visible = false; return b; }
function place(b, x, y, yaw, anim, t, p = {}) { b.root.visible = true; b.root.rotation.order = 'XYZ'; b.root.rotation.set(0, yaw, 0); b.root.position.set(cx(x), 0, cz(y)); pose(b, anim, t, { calm: true, ...p }); }
// flat on the back on the floor, head toward `yaw`
function laid(b, x, y, yaw, t) { b.root.visible = true; pose(b, 'lie', t); b.root.rotation.order = 'YXZ'; b.root.rotation.set(-Math.PI / 2, yaw, 0); const f = new V(Math.sin(yaw), 0, Math.cos(yaw)); b.root.position.set(cx(x) + f.x * 0.85, 0.11, cz(y) + f.z * 0.85); }
const lightBody = (b, world, k = 1.2) => { b.mat.userData.uAmb.value.copy(world.lightAt(b.root.position.x, b.root.position.z)).multiplyScalar(k); };

export function setupTape3(ctx) {
  const { G, walker, plan, world, sound, horrors, doors, scene, say, caption } = ctx;
  G.clocked = false; G.counted = 0; G.delivered = false; G.alarm = false; G.alarmT = -1; G.sawLockdown = false; G.force = 0;
  const countDone = new Set();
  // staff (clean) and what's left of some of them after the alarm (same faces, bloodied)
  const P = {
    guard: body(scene, 'orderly', 71, { ...clean, h: 1.84, girth: 1.05, skin: [0.72, 0.56, 0.47] }),
    guardDead: body(scene, 'orderly', 71, { ...clean, h: 1.84, girth: 1.05, skin: [0.72, 0.56, 0.47], blood: 1, dirt: 0.3 }),
    nurse: body(scene, 'orderly', 74, { ...clean, h: 1.66, girth: 0.78, skin: [0.8, 0.64, 0.54] }),
    hale: body(scene, 'surgeon', 81, { ...clean, glasses: true, skin: [0.74, 0.58, 0.48] }),
    okafor: body(scene, 'surgeon', 82, { ...clean, glasses: false, skin: [0.36, 0.25, 0.2] }),
    okaforDead: body(scene, 'surgeon', 82, { ...clean, glasses: false, skin: [0.36, 0.25, 0.2], blood: 1, dirt: 0.3 }),
    brandt: body(scene, 'surgeon', 83, { ...clean, glasses: true, bald: true, skin: [0.68, 0.53, 0.44] }),
    voss: body(scene, 'surgeon', 23, {}),
    p1: body(scene, 'naked', 91, { face: 'smile', blood: 1, stare: true }), p2: body(scene, 'gown', 92, { face: 'gouged', blood: 1, stare: true }),
    p3: body(scene, 'gown', 93, { face: 'sewn', blood: 1, stare: true }), p4: body(scene, 'naked', 94, { face: 'burned', blood: 1, stare: true }),
  };
  // props the scenes need: a chair and two ropes, blood that spreads
  const mat = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const chair = new THREE.Group(); { const m = mat(0x6b5a44); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.42), m); seat.position.y = 0.45; chair.add(seat); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.45, 0.035), m); l.position.set(a * 0.19, 0.225, b * 0.18); chair.add(l); } const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.45, 0.03), m); back.position.set(0, 0.69, -0.2); chair.add(back); }
  chair.visible = false; scene.add(chair);
  const rope = () => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 6), mat(0x8a7a5a, 0.95)); r.visible = false; scene.add(r); return r; };
  const ropeA = rope(), ropeB = rope();
  const stretch = (r, a, b) => { r.visible = true; r.position.copy(a).add(b).multiplyScalar(0.5); r.scale.set(1, a.distanceTo(b), 1); r.quaternion.setFromUnitVectors(new V(0, 1, 0), b.clone().sub(a).normalize()); };
  const pool = () => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x2a0303, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m); return m; };
  const poolA = pool(), poolB = pool();
  const allBodies = Object.values(P);

  // where the beats happen
  const HANG = { x: 31, y: 18.5 }, CAFE = { x: 14, y: 6.2 }, SEC = { x: 15.4, y: 31.4 }, LOBBY_HANG = { x: 22, y: 31.5 };
  const S = { hang: 0, hangT: -1, nurseT: -1, saw: new Set() };
  const near = (x, y, r) => Math.hypot(walker.pos.x - cx(x), walker.pos.z - cz(y)) < r;
  const sees = (x, y, r = 9) => near(x, y, r) && ctx.space.los(walker.pos.x, walker.pos.z, cx(x), cz(y), true);

  // ---- the alarm: a two-tone klaxon, made once, looped
  let klaxon = null;
  async function startKlaxon() {
    const SR = 22050, len = 2.4, off = new OfflineAudioContext(1, SR * len, SR);
    const o = off.createOscillator(); o.type = 'square'; const g = off.createGain(); g.gain.value = 0;
    const bp = off.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    for (let i = 0; i < 4; i++) { const t0 = i * 0.6; o.frequency.setValueAtTime(i % 2 ? 470 : 640, t0); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.03); g.gain.setValueAtTime(0.5, t0 + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58); }
    o.connect(g); g.connect(bp); bp.connect(off.destination); o.start(0);
    const buf = await off.startRendering(); const c = sound.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const out = c.createGain(); out.gain.value = 0.32; s.connect(out); out.connect(sound.vipDry); s.start(); klaxon = { s, out };
  }
  function raiseAlarm(restoring = false) {
    if (G.alarm) return; G.alarm = true; G.alarmT = restoring ? 30 : 0;
    P.voss.root.visible = false;                                       // he's gone. nobody saw him go.
    if (!restoring) { sound.thud(walker.pos.clone().setY(2), 1.2); horrors.glitchKick(1.6); horrors.staticBurst(0.15); }
    startKlaxon();
    if (!restoring) { caption('ATTENTION. CODE RED. ALL WARDS. CODE RED.', 4); say('alarm', 3.2, true); }
    // every cell door: unlocked and flung open, one after another
    const cells = doors.list.filter((d) => d.cell);
    cells.forEach((d, i) => {
      d.locked = false;
      const go = () => { const inside = new V(d.wx, 0, d.wz + (d.y === 17 ? -1.5 : 1.5)); doors.push(d, inside.x, inside.z, true); if (!restoring) sound.door(d, 'slam', d.wx, d.wz); };
      if (restoring) go(); else setTimeout(go, 900 + i * 160);
    });
    if (!restoring) setTimeout(() => { sound.farScream && sound.farScream(new V(cx(5), 1.5, cz(18.5))); }, 2200);
  }

  // ---- the beats
  function update(dt, I) {
    const t = G.t; const p = walker.pos;
    for (const b of allBodies) b.root.visible = false; chair.visible = false; ropeA.visible = ropeB.visible = false; poolA.visible = poolB.visible = false;
    if (!G.alarm) {
      // the hospital, working: the guard at his desk, the nurse at reception, the doctors about their business, Voss waiting
      place(P.guard, 16, 30.4, Math.PI, 'idle', t); place(P.nurse, 25.5, 29.3, 0, 'idle', t);
      place(P.hale, 33, 18.7, -Math.PI / 2 + Math.sin(t * 0.2) * 0.3, 'idle', t); place(P.okafor, 14.5, 7.2, Math.PI * 0.9, 'idle', t);
      place(P.brandt, 31.5, 11.5, 0.4, 'listen', t);
      place(P.voss, plan.voss.x, plan.voss.y, Math.PI + (G.delivered ? 0.9 : 0), G.delivered ? 'search' : 'idle', t, { calm: false });
      if (near(plan.voss.x, plan.voss.y, 7) && !(S.humT > t)) { S.humT = t + 6; sound.voice('surgeon', 'idle', P.voss.root.position); }
      // the alarm comes once you've left him with the tray
      if (G.delivered) { S.since = (S.since || 0) + dt; if (S.since > 14 || (S.since > 2.5 && !near(plan.voss.x, plan.voss.y, 5.5))) raiseAlarm(); }
    } else {
      G.alarmT += dt; const a = G.alarmT;
      // ---- Dr. Hale, on a chair under the pipe in the main corridor, the rope already round his neck
      const hx = cx(HANG.x), hz = cz(HANG.y); const top = new V(hx, H - 0.05, hz);
      if (S.hang === 0 && sees(HANG.x, HANG.y, 10)) { S.hang = 1; S.hangT = a; }
      if (S.hang === 1 && a - S.hangT > 1.6) { S.hang = 2; S.dropT = a; sound.thud(new V(hx, 0.4, hz), 0.9); sound.scream(new V(hx, 1.6, hz), 0.7); say('hang', 0.4, true); horrors.glitchKick(0.8); }
      const k = S.hang === 2 ? Math.min(1, (a - S.dropT) / 0.14) : 0;
      chair.visible = true; chair.position.set(hx + (S.hang === 2 ? 0.55 : 0), 0, hz + 0.05); chair.rotation.set(0, 0.3, S.hang === 2 ? -Math.PI / 2 : 0);
      if (S.hang === 2) chair.position.y = 0.22;
      const b = P.hale; place(b, HANG.x, HANG.y, Math.PI / 2, S.hang === 2 ? 'hang' : 'idle', a);
      b.root.position.y = 0.47 - 0.36 * k + (S.hang === 2 ? Math.sin((a - S.dropT) * 9) * 0.05 * Math.exp(-(a - S.dropT) * 1.5) : 0);
      if (S.hang === 1) { const look = Math.atan2(p.x - hx, p.z - hz) - Math.PI / 2; b.bones.neck.rotation.y = Math.max(-1, Math.min(1, look)); }
      if (S.hang === 2) { const kick = Math.max(0, 1 - (a - S.dropT) / 5); for (const s of ['L', 'R']) b.bones[s + 'thigh'].rotation.x = Math.sin(a * (s === 'L' ? 17 : 21)) * 0.6 * kick; b.root.rotation.y = Math.PI / 2 + Math.sin(a * 1.1) * 0.25; }
      b.root.updateMatrixWorld(true); stretch(ropeA, top, b.bones.neck.getWorldPosition(new V()).add(new V(0, 0.06, 0)));
      // ---- Dr. Brandt, already hanging over the lobby, turning slowly
      const lb = P.brandt; place(lb, LOBBY_HANG.x, LOBBY_HANG.y, Math.sin(a * 0.5) * 0.6, 'hang', a); lb.root.position.y = 0.95; lb.root.updateMatrixWorld(true);
      stretch(ropeB, new V(cx(LOBBY_HANG.x), H - 0.05, cz(LOBBY_HANG.y)), lb.bones.neck.getWorldPosition(new V()).add(new V(0, 0.06, 0)));
      // ---- Dr. Okafor, on the cafeteria floor, two of them on him
      gutting(P.okaforDead, [P.p1, P.p2], CAFE, 0.6, a, poolA, 'cafe');
      // ---- Dawes, the guard, under his own desk
      gutting(P.guardDead, [P.p3], SEC, Math.PI * 0.5, a, poolB, 'sec');
      // ---- the nurse, running, someone behind her
      if (S.nurseT < 0 && near(25.5, 22.5, 6.5)) { S.nurseT = a; sound.scream(new V(cx(36), 1.5, cz(18.5)), 1.2); }
      if (S.nurseT >= 0) {
        const e = a - S.nurseT; const x = 40 - e * 5.2;
        if (x > 2) {
          place(P.nurse, x, 18.4, -Math.PI / 2, 'run', a, { speed: 5, phase: a * 13 }); place(P.p4, x + 2.2, 18.6, -Math.PI / 2, 'run', a, { speed: 5, phase: a * 13 + 1, reach: true });
          if (!(S.nScreamT > a)) { S.nScreamT = a + 0.9; sound.scream(P.nurse.root.position.clone().setY(1.5), 0.8); }
          lightBody(P.nurse, world, 1.4); lightBody(P.p4, world, 1.4);
        } else if (!S.nurseGone) { S.nurseGone = true; setTimeout(() => sound.scream(new V(cx(1.5), 1.5, cz(18.5)), 0.6), 400); }
      }
      // ---- the security office: Dawes is dead, the board says lockdown
      if (!G.sawLockdown && near(16, 30.5, 2.6)) { G.sawLockdown = true; say('security', 0.3, true); ctx.checkpoint(); }
      // ---- forcing the window: any button, over and over, while he comes for you
      if (S.forcing) {
        if (!near(plan.exit.x, plan.exit.y, plan.exit.r + 0.6)) S.forcing = false;
        else {
          if (I && I.any) { G.force = Math.min(1, G.force + 0.05); walker.shake = Math.max(walker.shake, 0.3); if (!(S.rattleT > t - 0.12)) { S.rattleT = t; sound.rattle(cx(plan.exit.x) + 0.4, cz(plan.exit.y)); } horrors.heard(p.x, p.z, 2.5); }
          if (G.force >= 1 && !G.escaped) { G.escaped = true; sound.clang(new V(cx(plan.exit.x) + 0.5, 1.2, cz(plan.exit.y)), 900, 0.4, 0.6); sound.thud(p.clone().setY(1), 0.8); ctx.ending(); }
        }
      }
      G.force = Math.max(0, G.force - dt * 0.07);
    }
    for (const bb of [P.guard, P.nurse, P.hale, P.okafor, P.brandt, P.voss]) if (bb.root.visible) lightBody(bb, world, 1.25);
  }
  // patients crouched over a doctor, tearing; he still moves for a while
  function gutting(victim, eaters, at, yaw, a, pl, id) {
    laid(victim, at.x, at.y, yaw, a);
    const f = new V(Math.sin(yaw), 0, Math.cos(yaw)); const torso = new V(cx(at.x), 0, cz(at.y)); const side = new V(f.z, 0, -f.x);
    const alive = Math.max(0, 1 - a / 40);
    victim.bones.Rupper.rotation.x = -1.6 * alive + Math.sin(a * 7) * 0.25 * alive; victim.bones.Rfore.rotation.x = -0.6 * alive; victim.bones.head.rotation.y = Math.sin(a * 3) * 0.4 * alive; victim.bones.jaw.rotation.x = 0.3 + 0.2 * alive * Math.abs(Math.sin(a * 5));
    eaters.forEach((e, i) => { const s = i ? -1 : 1; const pos = torso.clone().addScaledVector(side, s * 0.62).addScaledVector(f, 0.15 * i); e.root.visible = true; e.root.rotation.order = 'XYZ'; e.root.rotation.set(0, Math.atan2(torso.x - pos.x, torso.z - pos.z), 0); e.root.position.copy(pos); pose(e, 'eat', a + i * 1.3); });
    pl.visible = true; const r = Math.min(1.25, 0.25 + a * 0.05); pl.scale.set(r, r * 0.8, 1); pl.position.set(torso.x, 0.012, torso.z); pl.rotation.z = yaw;
    victim.mat.userData.uAmb.value.copy(world.lightAt(torso.x, torso.z)).multiplyScalar(1.3); for (const e of eaters) e.mat.userData.uAmb.value.copy(victim.mat.userData.uAmb.value);
    // sound, when you're close
    const d = Math.hypot(walker.pos.x - torso.x, walker.pos.z - torso.z);
    if (d < 11) {
      if (!S.saw.has(id) && d < 8 && ctx.space.los(walker.pos.x, walker.pos.z, torso.x, torso.z, true)) { S.saw.add(id); say('gut', 0.6, false); horrors.glitchKick(0.7); }
      if (!(S['sq' + id] > a)) { S['sq' + id] = a + 0.5 + Math.random() * 0.7; sound.squelch(torso.clone().setY(0.4), 0.9); }
      if (!(S['ch' + id] > a)) { S['ch' + id] = a + 2.2 + Math.random() * 2; sound.voice('eater', 'chew', torso); }
      if (alive > 0.2 && !(S['sc' + id] > a)) { S['sc' + id] = a + 2.5 + Math.random() * 2; sound.scream(torso.clone().setY(0.5), 0.55 * alive); }
    }
  }

  // ---- things you use
  const inter = [];
  inter.push({ kind: 't3', pos: () => new V(cx(plan.clock.x), 1.0, cz(plan.clock.y) + 0.4), r: 1.3, label: () => (G.alarm ? (G.sawLockdown ? 'LOCKDOWN — GATE SEALED' : '') : G.clocked ? 'Clocked in, 22:58' : 'Clock in'),
    act: () => { if (G.alarm) { G.sawLockdown = true; return; } if (G.clocked) return; G.clocked = true; sound.click(); say('clock', 0.2, true); ctx.checkpoint(); ctx.save(); } });
  for (const [dx, dy, , , who] of plan.count) {
    inter.push({ kind: 't3', pos: () => new V(cx(dx), 1.5, cz(dy)), r: 1.1, label: () => (G.alarm || !G.clocked ? '' : countDone.has(who) ? 'Counted' : 'Look through the hatch'),
      act: () => { if (G.alarm || !G.clocked || countDone.has(who)) return; countDone.add(who); G.counted = countDone.size; sound.clang(new V(cx(dx), 1.5, cz(dy)), 500, 0.15, 0.2); say(who, 0.3, true); if (who === 'kroft') sound.voice('brute', 'idle', new V(cx(dx), 1.5, cz(dy) - 2)); } });
  }
  inter.push({ kind: 't3', pos: () => new V(cx(plan.voss.x), 1.2, cz(plan.voss.y)), r: 1.4, label: () => (G.alarm || G.delivered ? '' : G.items.has('tray') ? 'Give Dr. Voss the tray' : ''),
    act: () => { if (G.alarm || G.delivered || !G.items.has('tray')) return; G.delivered = true; sound.pickup('fuse'); say('voss', 0.2, true); } });
  inter.push({ kind: 't3', pos: () => new V(cx(plan.exit.x) + 0.3, 1.3, cz(plan.exit.y)), r: plan.exit.r, label: () => (!G.alarm ? '' : S.forcing ? 'Force it! ' + '▮'.repeat(Math.round(G.force * 12)) + '▯'.repeat(12 - Math.round(G.force * 12)) : 'Force the window'),
    act: () => { if (!G.alarm || G.escaped) return; if (!S.forcing) { S.forcing = true; say('window', 0, true); caption(ctx.vr() ? 'Mash any button to force it!' : 'Mash any key or click to force it!', 3); } } });

  return {
    interactables: inter,
    // the cells are locked until the alarm
    lockCells() { for (const d of doors.list) if (d.cell) { d.locked = true; d.target = 0; d.angle = 0; d.mesh.rotation.y = 0; } },
    start() { this.lockCells(); setTimeout(() => say('start'), 1200); },
    restore(d) { if (d.alarm) raiseAlarm(true); else this.lockCells(); for (const k of ['kroft', 'rourke', 'a', 'b'].slice(0, d.counted || 0)) countDone.add(k); },
    update,
    stopKlaxon() { if (klaxon) { klaxon.out.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.3); } },
    // lights: the hospital on the mains, then the beacons
    lights(LIGHT) {
      const a = G.alarm ? G.alarmT : -1;
      const mains = a < 0 ? 1 : a < 0.5 ? (Math.random() > 0.5 ? 1 : 0.05) : 0.0;
      LIGHT.P.value = mains * 2.8; LIGHT.A.value = mains; LIGHT.B.value = mains;
      LIGHT.S.value = a < 0.3 ? 0 : 0.32 + 1.0 * Math.pow(0.5 + 0.5 * Math.sin(a * 4.4), 2.4);   // never pitch black: you can always just about see
    },
  };
}

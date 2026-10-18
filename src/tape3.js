// Tape 3, The Fall: 14 October 1989. You are J. Marsh, night orderly, carrying the ward camcorder
// (Voss has the staff film the patients). Clock in, do the count, take Voss his tray. Then the alarm:
// the mains die, the beacons turn the building red, every cell door opens, and the staff die.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, H } from './plan.js?v=19';
import { makeBody, pose } from './carcass.js?v=19';
import { Talk } from './talk.js?v=19';
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
  { id: 'clock', text: 'Clock in with Dawes at the security office', done: (s) => s.clocked },
  { id: 'sheet', text: 'Get the count sheet from Nurse Kelly at reception', done: (s) => s.sheet },
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

// ------------------------------------------------------------------ what people say
// every turn of yours has two replies; flags (G.flags) carry what you chose into later scenes
const end = true;
export const TALKS = {
  dawes: { start: 'a', nodes: {
    a: { say: 'Marsh. You’re late. Again.', choices: [{ t: 'Bus broke down. Sorry, Dawes.', next: 'b1' }, { t: 'Two minutes late. Relax.', next: 'b2' }] },
    b1: { say: 'Sure it did. Sign the sheet. ...You look like hell, you know that?', choices: [{ t: 'Didn’t sleep. This place gets in your head.', next: 'c1', set: { dawes: 1 } }, { t: 'Thanks. You too.', next: 'c2' }] },
    b2: { say: 'Two minutes is how people go missing in here. Sign the sheet.', choices: [{ t: 'Missing? Who’s gone missing?', next: 'c3' }, { t: 'Whatever you say, boss.', next: 'c2', set: { dawesCold: 1 } }] },
    c1: { say: 'Yeah. It does that. Listen... Voss had them bring something up from the basement tonight. Keep your head down. Kelly’s got your count sheet.', act: (G) => (G.clocked = true), end },
    c2: { say: 'Kelly’s got your count sheet. The doctor wants his tray at half eleven. Don’t be late with that one.', act: (G) => (G.clocked = true), end },
    c3: { say: 'Night porter, last month. Clocked in, never clocked out. Voss says he quit. ...Kelly’s got your count sheet.', set: { dawes: 1, missing: 1 }, act: (G) => (G.clocked = true), end },
  } },
  dawesAgain: { start: 'a', nodes: { a: { say: 'Count sheet’s with Kelly. Go on.', end } } },
  kelly: { start: 'a', nodes: {
    a: { say: 'Evening, Jamie. Count sheet’s on the clipboard. Four cells tonight.', choices: [{ t: 'Thanks, Annie. Quiet night?', next: 'b1' }, { t: 'Just four? What happened to the rest?', next: 'b2' }] },
    b1: { say: 'So far. Kroft’s been singing since dinner. Same song, over and over. Gives me the creeps.', choices: [{ t: 'I’ll check on him first.', next: 'c1', set: { kelly: 1 } }, { t: 'Kroft’s harmless while he’s locked up.', next: 'c2' }] },
    b2: { say: 'Transferred. Upstairs, they said. Funny thing... there aren’t any beds left upstairs.', choices: [{ t: 'That doesn’t add up.', next: 'c3', set: { kelly: 1 } }, { t: 'Not my department.', next: 'c2' }] },
    c1: { say: 'You’re sweet. Careful at his hatch, he spits.', act: (G) => (G.sheet = true), end },
    c2: { say: 'Mm. Just do the count, Jamie.', act: (G) => (G.sheet = true), end },
    c3: { say: 'No. It doesn’t. ...Don’t say I said anything. Please.', act: (G) => (G.sheet = true), end },
  } },
  kellyBusy: { start: 'a', nodes: { a: { say: 'Clock in with Dawes first, love, or he’ll have a fit.', end } } },
  kellyAgain: { start: 'a', nodes: { a: { say: 'Four cells, Jamie. Then the doctor’s tray.', end } } },
  hale: { start: 'a', nodes: {
    a: { say: 'Oh— Marsh. Didn’t hear you. ...Do you ever think about leaving this place?', choices: [{ t: 'Every night, doc.', next: 'b1' }, { t: 'It pays the bills.', next: 'b2' }] },
    b1: { say: 'Me too. I’ve handed in my notice three times. Voss tears it up. Says I’m needed for the review.', choices: [{ t: 'What review?', next: 'c1' }, { t: 'So just walk out.', next: 'c2' }] },
    b2: { say: 'Yes. Yes, I suppose it does. Ignore me. Long shift.', end },
    c1: { say: 'The state’s review. Closure. He’s been... preparing. Moving patients downstairs. I signed some of the forms, Marsh. I shouldn’t have signed them.', set: { hale: 1 }, end },
    c2: { say: 'You don’t walk out on Adler Voss. Nobody does.', end },
  } },
  okafor: { start: 'a', nodes: {
    a: { say: 'Marsh! Pull up a chair. The kitchen left me the meatloaf. I think it’s meatloaf.', choices: [{ t: 'I’m on the clock. Maybe later.', next: 'b1' }, { t: 'Brave man, doc.', next: 'b2' }] },
    b1: { say: 'Later. Sure. Voss’s tray is on the counter, by the way. Don’t lift the cover, he gets funny about it.', end },
    b2: { say: 'Twenty years of medicine. I can survive meatloaf. ...Hey. If anything kicks off tonight, don’t be a hero. Just run.', set: { okafor: 1 }, end },
  } },
  brandt: { start: 'a', nodes: {
    a: { say: 'Shh. The news. They’re talking about us. "Mount Harrow under review."', choices: [{ t: 'Are they closing us down?', next: 'b1' }, { t: 'Since when do you watch the news?', next: 'b2' }] },
    b1: { say: 'Closing. Transferring. Words. Voss says nobody leaves. He says it like a promise.', end },
    b2: { say: 'Since they started talking about us.', end },
  } },
  kroft: { start: 'a', nodes: {
    a: { who: 'Kroft', say: 'La la la... la la... Orderly. Orderly. Open the door, orderly.', choices: [{ t: 'Go to sleep, Kroft.', next: 'b1' }, { t: '(Step back from the hatch.)', next: 'b2', set: { kroft: 1 } }] },
    b1: { who: 'Kroft', say: 'I don’t sleep. I listen. I can hear your heart, orderly. It’s going fast.', end },
    b2: { who: 'Kroft', say: '...I’ll find you. When the doors open. I’ll find you.', end },
  } },
  rourke: { start: 'a', nodes: {
    a: { who: 'Rourke', say: '...Is it dinner? Is my mum coming?', choices: [{ t: 'Not tonight, Danny. Go to sleep.', next: 'b1', set: { danny: 1 } }, { t: '(Say nothing.)', next: 'b2' }] },
    b1: { who: 'Rourke', say: '...Okay. You’re nice. The doctor isn’t nice.', end },
    b2: { who: 'Rourke', say: '...Hello? ...Hello?', end },
  } },
  voss: { start: 'a', nodes: {
    a: { say: 'Marsh. Punctual. Put it on the slab.', choices: [{ t: 'Here you are, doctor.', next: 'b1' }, { t: 'What’s under the cover?', next: 'b2' }] },
    b1: { say: 'Thank you. Tell me, Marsh. Do you believe a soul can be moved? From one place, to another?', choices: [{ t: 'I don’t know, doctor.', next: 'c1' }, { t: 'No. It stays where God put it.', next: 'c2' }] },
    b2: { say: 'Dinner. For a patient who hasn’t eaten in a very long time. Put it down, Marsh.', choices: [{ t: 'Yes, doctor.', next: 'c3' }, { t: 'Which patient?', next: 'c4', set: { voss: 1 } }] },
    c1: { say: 'Honest. I like that. Back to your rounds. And Marsh... whatever you hear tonight, keep walking.', act: (G) => (G.delivered = true), end },
    c2: { say: 'God. Yes. We’ll see where He put it. Back to your rounds.', act: (G) => (G.delivered = true), end },
    c3: { say: 'Good. Back to your rounds.', act: (G) => (G.delivered = true), end },
    c4: { say: 'Rourke. He asks for his mother. Back to your rounds, Marsh. Now.', act: (G) => (G.delivered = true), end },
  } },
  vossWait: { start: 'a', nodes: { a: { say: 'Not now, Marsh. Bring me my tray.', end } } },
};

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
  G.clocked = false; G.sheet = false; G.counted = 0; G.delivered = false; G.alarm = false; G.alarmT = -1; G.sawLockdown = false; G.force = 0; G.flags = G.flags || {};
  const talk = new Talk({ G, sound, vr: ctx.vr, card: () => ctx.card, placeCard: () => ctx.placeCard() });
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
  // who you can talk to before the alarm, and where they are
  const PEOPLE = {
    dawes: { name: 'Dawes', b: P.guard, x: 16, y: 30.4, yaw: Math.PI },
    kelly: { name: 'Nurse Kelly', b: P.nurse, x: 25.5, y: 29.3, yaw: 0 },
    hale: { name: 'Dr. Hale', b: P.hale, x: 33, y: 18.7, yaw: -Math.PI / 2, pace: 1 },
    okafor: { name: 'Dr. Okafor', b: P.okafor, x: 14.5, y: 7.2, yaw: Math.PI * 0.9 },
    brandt: { name: 'Dr. Brandt', b: P.brandt, x: 33, y: 10.6, yaw: Math.PI, anim: 'listen' },
    voss: { name: 'Dr. Voss', b: P.voss, x: plan.voss.x, y: plan.voss.y, yaw: Math.PI, calm: false },
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
      for (const [id, who] of Object.entries(PEOPLE)) {
        const on = talk.active && talk.active.npc === who;
        let x = who.x, y = who.y, yaw = who.yaw, anim = who.anim || 'idle', ap = {};
        if (who.pace && !on && !who.nearMe) { const k = Math.sin(t * 0.22 + who.pace); x = who.x + k * 2.2; yaw = Math.cos(t * 0.22 + who.pace) > 0 ? Math.PI / 2 : -Math.PI / 2; anim = Math.abs(Math.cos(t * 0.22 + who.pace)) > 0.15 ? 'walk' : 'idle'; ap = { speed: 0.5, phase: t * 4 }; }
        who.at = { x, y };
        const wx = cx(x), wz = cz(y); const toMe = Math.atan2(p.x - wx, p.z - wz); const d = Math.hypot(p.x - wx, p.z - wz); who.nearMe = d < 3.2;
        if (on) { who.face = who.face ?? yaw; who.face += Math.atan2(Math.sin(toMe - who.face), Math.cos(toMe - who.face)) * Math.min(1, dt * 5); yaw = who.face; anim = 'idle'; } else who.face = null;
        place(who.b, x, y, yaw, anim, t, { ...ap, calm: who.calm !== false });
        // eyes on you when you're close
        if (d < 4.5 && !on) { const rel = Math.atan2(Math.sin(toMe - yaw), Math.cos(toMe - yaw)); who.b.bones.neck.rotation.y = Math.max(-1.1, Math.min(1.1, rel)) * 0.8; }
        // talking
        if (on && talk.active.shown < talk.active.node.say.length) who.b.bones.jaw.rotation.x = 0.06 + Math.abs(Math.sin(t * 13 + Math.sin(t * 5))) * 0.16;
      }
      if (near(plan.voss.x, plan.voss.y, 7) && !(S.humT > t)) { S.humT = t + 6; sound.voice('surgeon', 'idle', P.voss.root.position); }
      // the alarm comes once you've left him with the tray
      if (G.delivered && !talk.busy) { S.since = (S.since || 0) + dt; if (S.since > (G.flags.voss ? 8 : 14) || (S.since > (G.flags.voss ? 1.2 : 2.5) && !near(plan.voss.x, plan.voss.y, 5.5))) raiseAlarm(); }
    } else {
      G.alarmT += dt; const a = G.alarmT;
      // ---- Dr. Hale, on a chair under the pipe in the main corridor, the rope already round his neck
      const hx = cx(HANG.x), hz = cz(HANG.y); const top = new V(hx, H - 0.05, hz);
      if (S.hang === 0 && sees(HANG.x, HANG.y, 10)) { S.hang = 1; S.hangT = a; }
      if (S.hang === 1 && !S.haleSaid) { S.haleSaid = true; caption(G.flags.hale ? 'Dr. Hale: "I signed them, Marsh. I’m sorry."' : 'Dr. Hale: "Don’t look at me. Please don’t look."', 3); }
      if (S.hang === 1 && a - S.hangT > 2.2) { S.hang = 2; S.dropT = a; sound.thud(new V(hx, 0.4, hz), 0.9); sound.scream(new V(hx, 1.6, hz), 0.7); say('hang', 0.4, true); horrors.glitchKick(0.8); }
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
      if (S.nurseT < 0 && near(25.5, 22.5, 6.5)) { S.nurseT = a; sound.scream(new V(cx(36), 1.5, cz(18.5)), 1.2); if (G.flags.kelly) caption('Nurse Kelly: "JAMIE! JAMIE, HELP ME!"', 3); }
      if (S.nurseT >= 0) {
        const e = a - S.nurseT; const x = 40 - e * 5.2;
        if (x > 2) {
          place(P.nurse, x, 18.4, -Math.PI / 2, 'run', a, { speed: 5, phase: a * 13 }); place(P.p4, x + 2.2, 18.6, -Math.PI / 2, 'run', a, { speed: 5, phase: a * 13 + 1, reach: true });
          if (!(S.nScreamT > a)) { S.nScreamT = a + 0.9; sound.scream(P.nurse.root.position.clone().setY(1.5), 0.8); }
          lightBody(P.nurse, world, 1.4); lightBody(P.p4, world, 1.4);
        } else if (!S.nurseGone) { S.nurseGone = true; setTimeout(() => sound.scream(new V(cx(1.5), 1.5, cz(18.5)), 0.6), 400); }
      }
      // ---- the security office: Dawes is dead, the board says lockdown
      if (!G.sawLockdown && near(16, 30.5, 2.6)) { G.sawLockdown = true; if (G.flags.dawes) { caption('Dawes: "Marsh... gate’s sealed... the window. In Admin. Go..."', 4); } else say('security', 0.3, true); ctx.checkpoint(); }
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

  // ---- things you use: people, hatches, the board, the window
  const inter = [];
  const say3 = (id, who, tree, after) => talk.open(who, TALKS[tree], () => after && after());
  for (const [id, who] of Object.entries(PEOPLE)) {
    inter.push({ kind: 't3', pos: () => new V(cx(who.at ? who.at.x : who.x), 1.55, cz(who.at ? who.at.y : who.y)), r: 1.25,
      label: () => (G.alarm || talk.busy ? '' : 'Talk to ' + who.name),
      act: () => {
        if (G.alarm || talk.busy) return;
        if (id === 'dawes') say3(id, who, G.clocked ? 'dawesAgain' : 'dawes', () => { if (G.clocked) { ctx.checkpoint(); ctx.save(); } });
        else if (id === 'kelly') say3(id, who, !G.clocked ? 'kellyBusy' : G.sheet ? 'kellyAgain' : 'kelly', () => { if (G.sheet) { ctx.checkpoint(); ctx.save(); } });
        else if (id === 'voss') say3(id, who, G.delivered ? 'vossWait' : G.items.has('tray') ? 'voss' : 'vossWait', () => { if (G.delivered) sound.pickup('fuse'); });
        else say3(id, who, id);
      } });
  }
  // after the alarm the security desk only says one thing
  inter.push({ kind: 't3', pos: () => new V(cx(plan.clock.x), 1.0, cz(plan.clock.y) + 0.4), r: 1.3, label: () => (G.alarm ? 'LOCKDOWN — GATE SEALED' : ''), act: () => { G.sawLockdown = true; } });
  // the count: look through four hatches; two of them talk back
  const hatchWho = { kroft: { name: 'Kroft', b: null }, rourke: { name: 'Rourke', b: null } };
  for (const [dx, dy, , , who] of plan.count) {
    inter.push({ kind: 't3', pos: () => new V(cx(dx), 1.5, cz(dy)), r: 1.1, label: () => (G.alarm || !G.sheet || talk.busy ? '' : countDone.has(who) ? 'Counted' : 'Look through the hatch'),
      act: () => {
        if (G.alarm || !G.sheet || countDone.has(who) || talk.busy) return;
        sound.clang(new V(cx(dx), 1.5, cz(dy)), 500, 0.15, 0.2);
        const done = () => { countDone.add(who); G.counted = countDone.size; if (G.counted >= 4) { ctx.checkpoint(); ctx.save(); } };
        if (hatchWho[who]) { if (who === 'kroft') sound.voice('brute', 'idle', new V(cx(dx), 1.5, cz(dy) - 2)); talk.open(hatchWho[who], TALKS[who], done); }
        else { say(who, 0.3, true); done(); }
      } });
  }
  inter.push({ kind: 't3', pos: () => new V(cx(plan.exit.x) + 0.3, 1.3, cz(plan.exit.y)), r: plan.exit.r, label: () => (!G.alarm ? '' : S.forcing ? 'Force it! ' + '▮'.repeat(Math.round(G.force * 12)) + '▯'.repeat(12 - Math.round(G.force * 12)) : 'Force the window'),
    act: () => { if (!G.alarm || G.escaped) return; if (!S.forcing) { S.forcing = true; say('window', 0, true); caption(ctx.vr() ? 'Mash any button to force it!' : 'Mash any key or click to force it!', 3); } } });

  return {
    interactables: inter,
    busy: () => talk.busy,
    // the cells are locked until the alarm
    lockCells() { for (const d of doors.list) if (d.cell) { d.locked = true; d.target = 0; d.angle = 0; d.mesh.rotation.y = 0; } },
    start() { this.lockCells(); setTimeout(() => say('start'), 1200); },
    restore(d) { G.flags = d.flags || {}; G.sheet = !!d.sheet; if (d.alarm) raiseAlarm(true); else this.lockCells(); for (const k of ['kroft', 'rourke', 'a', 'b'].slice(0, d.counted || 0)) countDone.add(k); },
    update(dt, I) { if (talk.busy) talk.update(dt, I); update(dt, I); },
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

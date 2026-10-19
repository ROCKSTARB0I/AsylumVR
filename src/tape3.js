// Tape 3, The Fall: 14 October 1989. You are J. Marsh, night orderly, carrying the ward camcorder
// (Voss has the staff film the patients). Clock in, do the count, take Voss his tray. Then the alarm:
// the mains die, the beacons turn the building red, every cell door opens, and the staff die.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, H } from './plan.js?v=29';
import { makeBody, pose } from './carcass.js?v=29';
import { Talk } from './talk.js?v=29';
const V = THREE.Vector3;

export const NOTES = {
  n3_tray: { t: 'Card tucked under the tray cover', b: `ISOLATION — DR. VOSS\nDeliver 23:30. Do not lift the cover.\nDo not discuss with day staff.\n\nIf the patient in Isolation asks for his mother, do not answer him.` },
  n3_rota: { t: 'Night rota, 14 October 1989', b: `SECURITY: R. DAWES (gate panel)\nNURSE: A. KELLY\nORDERLY: J. MARSH — count at 23:00, Isolation tray at 23:30\nDR. HALE, DR. OKAFOR, DR. BRANDT — on call\nDR. A. VOSS — Isolation. Do not disturb.\n\nL. PELL is NOT to be admitted to the building. If he is seen on the grounds, call the gate.` },
  n3_iso: { t: 'Chart clipped to the slab', b: `PATIENT: ROURKE, D. \u2014 ISOLATION\nFed 23:30 daily. Does not sleep. Asks for his mother.\nDo NOT answer him.\n\nTransfer: DOWN.\n\u2014 A.V.` },
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
  mopped: 'There. Spotless. Kelly owes me a coffee.',
  file: 'Rourke, D. ...Deceased. Then why am I taking it to a doctor?',
  maglock: 'The Administration door\u2019s mag-locked. It\u2019s on the emergency circuit... the breaker. The generator room.',
  breaker: 'Power\u2019s off the locks. Administration. GO.',
  yard: 'Outside. Oh God, they\u2019re out here too. The fence... the groundskeeper has the gate keys.',
  groundsman: 'Walt. Oh, Walt. ...His keys. I\u2019m sorry, Walt.',
  gate: 'The gate! The car park. My car\u2014',
  car: 'Start. START. Come on!',
  fencekey: 'Got them. The gate. The south fence— go, go.',
};

export const OBJECTIVES = [
  { id: 'clock', text: 'Clock in with Dawes at the security office', done: (s) => s.clocked },
  { id: 'sheet', text: 'Get the count sheet from Nurse Kelly at reception', done: (s) => s.sheet },
  { id: 'count', text: (s) => `The 23:00 count: check the cells (${s.counted || 0}/4)`, done: (s) => (s.counted || 0) >= 4 },
  { id: 'mop', text: (s) => `Mop up the spill in the shower block (${s.mopped || 0}/3)`, done: (s) => (s.mopped || 0) >= 3 },
  { id: 'file', text: "Fetch Rourke's file from Records (the storage room, west)", done: (s) => s.items.has('file') },
  { id: 'file2', text: 'Take the file to Dr. Okafor in the cafeteria', done: (s) => s.fileGiven },
  { id: 'tray', text: "Collect Dr. Voss's tray from the kitchen counter", done: (s) => s.items.has('tray') },
  { id: 'voss', text: 'Take the tray to Dr. Voss in the morgue', done: (s) => s.delivered },
  { id: 'sec', text: 'Get to the security office', done: (s) => s.sawLockdown },
  { id: 'breaker', text: 'Cut the mag-locks: pull the breaker in the generator room (east wing)', done: (s) => s.breaker },
  { id: 'window', text: 'Force the Administration window', done: (s) => s.inYard },
  { id: 'key', text: "Find the groundskeeper's gate keys (the courtyard, west)", done: (s) => s.items.has('fencekey') },
  { id: 'gate', text: 'Unlock the main gate in the south fence', done: (s) => s.fenceOpen },
  { id: 'car', text: 'GET TO YOUR CAR', done: (s) => s.escaped },
];
export const ITEM_LABEL = { tray: 'Take the tray', file: 'Take the file', fencekey: 'Take the keys' };
export const ENDING_TEXT = [
  'The engine caught on the third try. You drove through the gate with them on the hood, and you did not stop driving until the sun came up.',
  'Twenty-three staff were on the night shift at Mount Harrow on 14 October 1989. By the end of the month, the state listed every one of them as transferred. Nobody asked about the orderly whose car was gone from the lot.',
  'Three weeks later, Mount Harrow was declared decommissioned. The meal rosters kept coming.',
  'Four years later, you wrote to a journalist. You told them to come after dark, to bring a camera, and that the east window in Administration doesn\u2019t latch. You broke it yourself.',
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
    c1: { say: 'You\u2019re sweet. Careful at his hatch, he spits. ...Oh, and someone\u2019s flooded the shower block again. Mop\u2019s in there.', act: (G) => (G.sheet = true), end },
    c2: { say: 'Mm. Just do the count, Jamie. And mop the showers, they\u2019re flooded again.', act: (G) => (G.sheet = true), end },
    c3: { say: 'No. It doesn\u2019t. ...Don\u2019t say I said anything. Please. Just... go and mop the showers, they\u2019re flooded.', act: (G) => (G.sheet = true), end },
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
    b1: { say: 'Later. Sure. Do me a favour? Bring me the Rourke file from Records. Storage room, west side. Voss\u2019s tray\u2019s on the counter after that. Don\u2019t lift the cover.', end },
    b2: { say: 'Twenty years of medicine. I can survive meatloaf. Fetch me the Rourke file from Records, would you? And if anything kicks off tonight, don\u2019t be a hero. Just run.', set: { okafor: 1 }, end },
  } },
  okaforFile: { start: 'a', nodes: {
    a: { say: 'Ah, the Rourke file. Thank you, Marsh.', choices: [{ t: 'His chart says deceased, doc.', next: 'b1' }, { t: 'Light reading?', next: 'b2' }] },
    b1: { say: '...It does, doesn\u2019t it. And yet I took his pulse on Tuesday. Do me a favour. Forget you read that.', set: { okaforTold: 1 }, act: (G) => (G.fileGiven = true), end },
    b2: { say: 'Something like that. Go on, Voss will want his tray.', act: (G) => (G.fileGiven = true), end },
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
  G.clocked = false; G.sheet = false; G.counted = 0; G.delivered = false; G.alarm = false; G.alarmT = -1; G.sawLockdown = false; G.force = 0; G.flags = G.flags || {}; G.mopped = 0; G.fileGiven = false; G.breaker = false; G.inYard = false; G.fenceOpen = false;
  const talk = new Talk({ G, sound, vr: ctx.vr, card: () => ctx.card, placeCard: () => ctx.placeCard() });
  const countDone = new Set();
  // staff (clean) and what's left of some of them after the alarm (same faces, bloodied)
  const P = {
    guard: body(scene, 'orderly', 71, { ...clean, h: 1.84, girth: 1.05, skin: [0.72, 0.56, 0.47] }),
    guardDead: body(scene, 'orderly', 71, { ...clean, h: 1.84, girth: 1.05, skin: [0.72, 0.56, 0.47], blood: 1, dirt: 0.3 }),
    nurse: body(scene, 'orderly', 74, { ...clean, outfit: 'nurse', female: true, h: 1.66, girth: 0.78, lean: 0.1, muscle: 0, skin: [0.82, 0.66, 0.56], hair: [0.16, 0.09, 0.05] }),
    hale: body(scene, 'surgeon', 81, { ...clean, glasses: true, skin: [0.74, 0.58, 0.48] }),
    okafor: body(scene, 'surgeon', 82, { ...clean, glasses: false, skin: [0.36, 0.25, 0.2] }),
    okaforDead: body(scene, 'surgeon', 82, { ...clean, glasses: false, skin: [0.36, 0.25, 0.2], blood: 1, dirt: 0.3 }),
    brandt: body(scene, 'surgeon', 83, { ...clean, glasses: true, bald: true, skin: [0.68, 0.53, 0.44] }),
    voss: body(scene, 'surgeon', 23, {}),
    groundsman: body(scene, 'corpse', 95, { outfit: 'trousers', face: 'dead', blood: 1, h: 1.8 }),
    rocker: body(scene, 'jacket', 96, { face: 'sewn', blood: 0.3, stare: true }),
    p1: body(scene, 'naked', 91, { face: 'smile', blood: 1, stare: true }), p2: body(scene, 'gown', 92, { face: 'gouged', blood: 1, stare: true }),
    p3: body(scene, 'gown', 93, { face: 'sewn', blood: 1, stare: true }), p4: body(scene, 'naked', 94, { face: 'burned', blood: 1, stare: true }),
  };
  // who you can talk to before the alarm, and where they are
  const PEOPLE = {
    dawes: { name: 'Dawes', voice: 140, b: P.guard, x: 16, y: 30.4, yaw: Math.PI },
    kelly: { name: 'Nurse Kelly', voice: 390, b: P.nurse, x: 25.5, y: 29.3, yaw: 0 },
    hale: { name: 'Dr. Hale', voice: 255, b: P.hale, x: 33, y: 18.7, yaw: -Math.PI / 2, pace: 1 },
    okafor: { name: 'Dr. Okafor', voice: 175, b: P.okafor, x: 14.5, y: 7.2, yaw: Math.PI * 0.9 },
    brandt: { name: 'Dr. Brandt', voice: 215, b: P.brandt, x: 33, y: 10.6, yaw: Math.PI, anim: 'listen' },
    voss: { name: 'Dr. Voss', voice: 108, b: P.voss, x: plan.voss.x, y: plan.voss.y, yaw: Math.PI, calm: false },
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
  // the spill in the showers (and what it turns into)
  const spills = [[40, 9.2], [43.2, 12.2], [39.6, 15.2]].map(([x, y]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshStandardMaterial({ color: 0x1a2a2e, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(cx(x), 0.011, cz(y)); m.scale.set(1, 0.7, 1); m.renderOrder = 2; scene.add(m); return { m, x, y, done: false }; });
  // the morgue afterwards: his tray on the slab, the cover off, a hatch in the floor standing open
  const slabTray = new THREE.Group(); { const st = mat(0x9a9a94, 0.35); st.metalness = 0.8; slabTray.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.3), st)); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), st); dome.scale.set(1.2, 0.8, 0.9); dome.rotation.z = Math.PI * 0.55; dome.position.set(0.3, 0.06, 0.05); slabTray.add(dome); }
  slabTray.position.set(cx(31), 0.95, cz(24)); slabTray.visible = false; scene.add(slabTray);
  const hatch = new THREE.Group(); { const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.012; hatch.add(hole); const lid = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 1.15), mat(0x3a3a36, 0.6)); lid.position.set(0, 0.58, -0.6); lid.rotation.x = -1.35; hatch.add(lid); for (const sx of [-0.35, 0.35]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), mat(0x555550, 0.5)); r.position.set(sx, -0.2, -0.45); hatch.add(r); } }
  hatch.position.set(cx(35.4), 0, cz(22.2)); hatch.visible = false; scene.add(hatch);
  // the main gate: iron bars across the gap in the south fence
  const gate = new THREE.Group(); { const iron = mat(0x2a2a28, 0.55); iron.metalness = 0.6; const w = (plan.fence.x1 - plan.fence.x0 + 1) * 1.5; for (let i = 0; i <= 18; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 6), iron); b.position.set(-w / 2 + i * w / 18, 2.1, 0); gate.add(b); } for (const y of [0.2, 2.1, 4.1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.06), iron); r.position.y = y; gate.add(r); } const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), mat(0x8a7030, 0.4)); lock.position.set(0, 1.15, -0.06); gate.add(lock); gate.userData.lock = lock; }
  const gateX = (plan.fence.x0 + plan.fence.x1 + 1) / 2 * 1.5, gateZ = cz(plan.fence.y);
  gate.position.set(gateX, 0, gateZ); scene.add(gate);
  const gateBox = [gateX - 3.9, gateZ - 0.12, gateX + 3.9, gateZ + 0.12]; ctx.space.boxes.push(gateBox);
  // your car: a brown '81 sedan, nose to the road
  const car = new THREE.Group(); { const paint = mat(0x4a3424, 0.45); paint.metalness = 0.4; const glass = new THREE.MeshStandardMaterial({ color: 0x0c1012, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.5), paint); body.position.y = 0.62; car.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.55, 2.3), glass); cab.position.set(0, 1.2, -0.2); car.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 2.0), paint); roof.position.set(0, 1.49, -0.2); car.add(roof);
    for (const [x, z] of [[-0.88, 1.4], [0.88, 1.4], [-0.88, -1.45], [0.88, -1.45]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), mat(0x111111, 0.9)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); car.add(w); }
    car.userData.hl = [];
    for (const x of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a2a20 })); hl.position.set(x, 0.66, 2.26); car.add(hl); car.userData.hl.push(hl); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0x300808 })); tl.position.set(x, 0.66, -2.26); car.add(tl); } }
  car.position.set(cx(plan.car.x), 0, cz(plan.car.y)); scene.add(car);
  const carBox = [car.position.x - 0.95, car.position.z - 2.3, car.position.x + 0.95, car.position.z + 2.3]; ctx.space.boxes.push(carBox);
  const CAR = { state: 0, ign: 0, coughs: 0, t: 0, engine: null, grab: [] };
  // the breaker panel on the generator room's east wall: a grey box, a big lever, a red lamp
  const breaker = new THREE.Group(); let lever;
  { const steel = mat(0x6a6e68, 0.5); steel.metalness = 0.5; steel.emissive = new THREE.Color(0x1a1c1a);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.46), steel); breaker.add(box);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xc8b030 })); plate.position.set(-0.075, 0.2, 0); breaker.add(plate);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2010 })); lamp.position.set(-0.08, 0.2, 0.17); breaker.add(lamp); breaker.userData.lamp = lamp;
    lever = new THREE.Group(); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.03), mat(0x2a2a28, 0.4)); arm.position.y = 0.13; lever.add(arm);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10), mat(0xa01810, 0.5)); grip.rotation.x = Math.PI / 2; grip.position.y = 0.26; lever.add(grip);
    lever.position.set(-0.09, -0.08, 0); lever.rotation.z = 0.5; breaker.add(lever); }
  breaker.position.set((47) * 1.5 - 0.08, 1.35, cz(plan.breaker.y)); scene.add(breaker);
  // ---- the grounds: a chain-link fence on the open perimeter, grass you can see, the dark beyond
  {
    const W = plan.W, at = plan.at, Cc = 1.5;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    // chain-link: a diamond weave with a little rust
    const linkT = tex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(170,172,165,1)'; c.lineWidth = 3; for (let i = -w; i < w * 2; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); } c.strokeStyle = 'rgba(120,80,50,0.5)'; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const x = Math.random() * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); } });
    const linkM = new THREE.MeshStandardMaterial({ map: linkT, emissive: 0x2c2c2a, emissiveMap: linkT, alphaTest: 0.45, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    const ironM = new THREE.MeshStandardMaterial({ color: 0x55574f, emissive: 0x1c1c1a, metalness: 0.6, roughness: 0.5 });
    // every open edge of the grounds
    const pos = [], uv = [], posts = [], rails = []; const FH = 3.0;
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < plan.g.length / W; y++) for (let x = 0; x < W; x++) {
      if (at(x, y) !== 13) continue;
      for (const [dx, dy] of DIR) {
        const nx = x + dx, ny = y + dy; if (at(nx, ny) || !plan.perimeter(nx, ny)) continue;
        let ax, az, bx, bz;
        if (dx === 1) { ax = (x + 1) * Cc; az = y * Cc; bx = ax; bz = (y + 1) * Cc; } else if (dx === -1) { ax = x * Cc; az = (y + 1) * Cc; bx = ax; bz = y * Cc; }
        else if (dy === 1) { ax = (x + 1) * Cc; az = (y + 1) * Cc; bx = x * Cc; bz = az; } else { ax = x * Cc; az = y * Cc; bx = (x + 1) * Cc; bz = az; }
        const u0 = (ax + az) / 0.9, u1 = (bx + bz) / 0.9;
        pos.push(ax, 0, az, bx, 0, bz, bx, FH, bz, ax, 0, az, bx, FH, bz, ax, FH, az); uv.push(u0, 0, u1, 0, u1, FH / 0.9, u0, 0, u1, FH / 0.9, u0, FH / 0.9);
        posts.push([ax, az], [bx, bz]); rails.push([ax, az, bx, bz]);
      }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.computeVertexNormals();
    scene.add(new THREE.Mesh(fg, linkM));
    // posts (one per corner), the top rail and three strands of barbed wire
    const uniq = [...new Map(posts.map((q) => [q[0].toFixed(2) + ',' + q[1].toFixed(2), q])).values()];
    const postI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, FH + 0.5, 6), ironM, uniq.length); const m4 = new THREE.Matrix4();
    uniq.forEach(([px, pz], i) => postI.setMatrixAt(i, m4.makeTranslation(px, (FH + 0.5) / 2, pz))); scene.add(postI);
    const railG = new THREE.CylinderGeometry(1, 1, 1, 5).rotateZ(Math.PI / 2); const railI = new THREE.InstancedMesh(railG, ironM, rails.length * 4); let ri = 0;
    const q = new THREE.Quaternion(), sv = new THREE.Vector3();
    for (const [ax, az, bx, bz] of rails) for (const [h, r] of [[FH, 0.025], [FH + 0.18, 0.006], [FH + 0.32, 0.006], [FH + 0.46, 0.006]]) {
      const len = Math.hypot(bx - ax, bz - az); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(bz - az, bx - ax)); sv.set(len, r, r);
      railI.setMatrixAt(ri++, m4.compose(new THREE.Vector3((ax + bx) / 2, h, (az + bz) / 2), q, sv));
    }
    scene.add(railI);
    // grass tufts on the lawns (not the car park)
    const tuftT = tex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = 6 + Math.random() * (w - 12), lean = (Math.random() - 0.5) * 18, hh = h * (0.45 + Math.random() * 0.55); c.strokeStyle = `rgba(${60 + Math.random() * 50 | 0},${85 + Math.random() * 60 | 0},${30 + Math.random() * 25 | 0},1)`; c.lineWidth = 1.5 + Math.random() * 1.5; c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + lean * 0.3, h - hh * 0.6, x + lean, h - hh); c.stroke(); } });
    const tuftM = new THREE.MeshStandardMaterial({ map: tuftT, emissive: 0x16200c, emissiveMap: tuftT, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
    const tg = new THREE.PlaneGeometry(0.5, 0.36); tg.translate(0, 0.18, 0); const tg2 = tg.clone().rotateY(Math.PI / 2);
    const merged = new THREE.BufferGeometry(); { const a = tg.attributes, b = tg2.attributes; const P2 = new Float32Array([...a.position.array, ...b.position.array]); const U2 = new Float32Array([...a.uv.array, ...b.uv.array]); const N2 = new Float32Array([...a.normal.array, ...b.normal.array]); const I2 = [...tg.index.array, ...tg2.index.array.map((v) => v + a.position.count)]; merged.setAttribute('position', new THREE.BufferAttribute(P2, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(U2, 2)); merged.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); merged.setIndex(I2); }
    const spots = []; for (let y = 38; y < 55; y++) for (let x = 0; x < W; x++) if (at(x, y) === 13) spots.push([x, y]); for (let y = 29; y < 38; y++) for (let x = 40; x < 48; x++) if (at(x, y) === 13) spots.push([x, y]);
    const NT = Math.min(2600, spots.length * 4); const tuftI = new THREE.InstancedMesh(merged, tuftM, NT); let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < NT; i++) { const [x, y] = spots[(rnd() * spots.length) | 0]; const s = 0.7 + rnd() * 0.8; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); tuftI.setMatrixAt(i, m4.compose(new THREE.Vector3((x + rnd()) * Cc, 0, (y + rnd()) * Cc), q, sv.set(s, s * (0.8 + rnd() * 0.6), s))); }
    tuftI.frustumCulled = false; scene.add(tuftI);
    // the dark beyond the fence: ground, and a line of trees against the stars
    const farGround = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x080a06 })); farGround.rotation.x = -Math.PI / 2; farGround.position.set(36, -0.03, 60); scene.add(farGround);
    const treeG = new THREE.ConeGeometry(1, 1, 7); treeG.translate(0, 0.5, 0); const treeM = new THREE.MeshBasicMaterial({ color: 0x050704 }); const NTR = 150; const treeI = new THREE.InstancedMesh(treeG, treeM, NTR);
    for (let i = 0; i < NTR; i++) { const a = rnd() * Math.PI * 2, r = 62 + rnd() * 30; const tx = 36 + Math.cos(a) * r, tz = 55 + Math.sin(a) * r; const h = 9 + rnd() * 9, w = 2 + rnd() * 2.2; treeI.setMatrixAt(i, m4.compose(new THREE.Vector3(tx, 0, tz), q.identity(), sv.set(w, h, w))); }
    treeI.frustumCulled = false; scene.add(treeI);
    for (const m of [linkM, ironM, tuftM]) m.userData = { ...m.userData };
  }



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
    for (const b of allBodies) b.root.visible = false; chair.visible = false; ropeA.visible = ropeB.visible = false; poolA.visible = poolB.visible = false; slabTray.visible = hatch.visible = false;
    if (G.inYard) { yard(dt, I, t); }
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
      for (const sp of spills) { sp.m.visible = !sp.done; }
      if (G.delivered && !talk.busy) { S.since = (S.since || 0) + dt; if (S.since > (G.flags.voss ? 8 : 14) || (S.since > (G.flags.voss ? 1.2 : 2.5) && !near(plan.voss.x, plan.voss.y, 5.5))) raiseAlarm(); }
    } else {
      G.alarmT += dt; const a = G.alarmT;
      // ---- the Administration door stays mag-locked until the breaker is pulled
      const ad = doors.list.find((d) => d.x === plan.adminDoor.x && d.y === plan.adminDoor.y);
      if (ad) { if (!G.breaker) { ad.locked = true; ad.target = 0; } else ad.locked = false; }
      if (!G.breaker && !S.saidLock && G.sawLockdown && (near(plan.adminDoor.x, plan.adminDoor.y, 2.2) || (S.secT !== undefined && a - S.secT > 4.5))) { S.saidLock = true; say('maglock', 0, true); }
      if (G.sawLockdown && S.secT === undefined) S.secT = a;
      // pulling the breaker, while whoever's sitting on the generator watches you
      if (S.pulling && !G.breaker) {
        if (!near(plan.breaker.x, plan.breaker.y, 2.2)) S.pulling = false;
        else if (I && I.any) { G.pull = Math.min(1, (G.pull || 0) + 0.055); walker.shake = Math.max(walker.shake, 0.25); if (!(S.clT > t - 0.15)) { S.clT = t; sound.clang(new V(cx(plan.breaker.x), 1.4, cz(plan.breaker.y)), 300 + G.pull * 200, 0.08, 0.15); } horrors.heard(p.x, p.z, 2.5); }
        else G.pull = Math.max(0, (G.pull || 0) - dt * 0.06);   // (only slips back while you're not pulling)
        if (G.pull >= 1) { G.breaker = true; S.pulling = false; sound.thud(new V(cx(plan.breaker.x), 1.4, cz(plan.breaker.y)), 1.4); sound.burst(new V(cx(plan.breaker.x), 1.6, cz(plan.breaker.y)), { f: 3000, q: 0.5, dur: 0.4, gain: 0.4 }); horrors.glitchKick(1.2); say('breaker', 1.2, true); S.rockScream = a; ctx.checkpoint(); ctx.save(); }
      }
      // the lever follows your pull; down when it's done
      lever.rotation.z = G.breaker ? -1.1 : 0.5 - (G.pull || 0) * 1.4; breaker.userData.lamp.material.color.setHex(G.breaker ? 0x103010 : (Math.sin(a * 6) > 0 ? 0xff2010 : 0x400806));
      // the patient on the generator
      if (!G.inYard) { const rb = P.rocker; rb.root.visible = true; rb.root.rotation.set(0, Math.PI, 0); pose(rb, 'rock', a); rb.root.position.set(cx(43), 1.62 - 0.42 * rb.s, cz(24)); rb.mat.userData.uAmb.value.copy(world.lightAt(cx(43), cz(23))).multiplyScalar(1.4);
        if (S.rockScream !== undefined && a - S.rockScream < 2.5) { rb.bones.head.rotation.x = -0.6; rb.bones.jaw.rotation.x = 0.7; if (!S.rockScreamed) { S.rockScreamed = true; sound.voice('rocker', 'scream', rb.root.position); } }
        if (near(43, 24, 7) && !(S.rmT > a)) { S.rmT = a + 4; sound.voice('rocker', 'mutter', rb.root.position); } }
      // the showers you mopped run red now
      for (const sp of spills) { sp.m.visible = true; sp.m.material.color.setHex(0x3a0404); const k = Math.min(1, a / 30); sp.m.scale.set(1 + k * 1.3, 0.7 + k * 1.0, 1); }
      // the morgue: his tray, cover off, empty. a hatch in the floor, standing open
      slabTray.visible = true; hatch.visible = true;
      // ---- Kroft: out of his cell and straight for you. He doesn't see well; he listens, and keeps
      // closing in on where you are (less sure of it while you're hidden and keeping still)
      const kr = horrors.hunter;
      if (kr && kr.kind === 'brute' && kr.active && !G.inYard) {
        if (!S.kroftWoke && a > 1.7) {
          S.kroftWoke = true; S.kroftT = 6; sound.voice('brute', 'chase', kr.pos); horrors.glitchKick(0.6);
          caption(G.flags.kroft ? 'Kroft: "ORDERLY! I told you! I can HEAR you!"' : 'Kroft: "ORDERLY!"', 3);
          kr.state = 'investigate'; kr.goal = p.clone(); kr.path = null; kr.wait = 0; kr.aware = 0.6;
        }
        S.kroftT = (S.kroftT ?? 6) - dt;
        const idle = kr.state === 'patrol' || kr.state === 'idle' || (kr.state === 'search' && kr.searchT < 4);
        if (S.kroftWoke && S.kroftT <= 0 && idle) {
          const hid = !!walker.hidden, spread = hid ? 11 : walker.speed > 2.5 ? 2.5 : 5.5;
          S.kroftT = hid ? 12 + Math.random() * 6 : 6 + Math.random() * 4;
          kr.state = 'investigate'; kr.goal = p.clone().add(new V((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)); kr.path = null; kr.wait = 0.3;
          if (Math.random() < 0.5) sound.voice('brute', 'alert', kr.pos);
        }
      }
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
          if (G.force >= 1 && !G.inYard) { S.forcing = false; sound.clang(new V(cx(plan.exit.x) + 0.5, 1.2, cz(plan.exit.y)), 900, 0.4, 0.6); sound.thud(p.clone().setY(1), 0.8); toYard(); }
        }
      }
      G.force = Math.max(0, G.force - dt * 0.07);
    }
    for (const bb of [P.guard, P.nurse, P.hale, P.okafor, P.brandt, P.voss]) if (bb.root.visible) lightBody(bb, world, 1.25);
  }
  // ---- out of the window: the grounds
  function toYard(restoring = false) {
    G.inYard = true; S.forcing = false;
    // Kroft's part is over the moment you're out of the window (and his music with him)
    for (const h of horrors.hunters) if (h && !h.opts.pack) { h.active = false; h.body.root.visible = false; h.state = 'idle'; h.leaving = false; }
    horrors.chase = 0;
    if (!restoring) walker.place(cx(plan.windowOut.x), cz(plan.windowOut.y), -Math.PI / 2);
    for (const h of horrors.list) if (h.opts.pack) { h.active = true; h.body.root.visible = true; h.state = 'patrol'; h.ri = 0; h.path = null; }
    if (!restoring) { horrors.glitchKick(1); say('yard', 0.6, true); ctx.checkpoint(); ctx.save(); }
  }
  function enterCar() {
    CAR.state = 1; CAR.ign = 0; CAR.coughs = 0; CAR.t = 0; const bi = ctx.space.boxes.indexOf(carBox); if (bi >= 0) ctx.space.boxes.splice(bi, 1);
    walker.place(car.position.x - 0.42, car.position.z - 0.15, 0); walker.crouched = true;
    sound.door({ metal: true }, 'close', car.position.x, car.position.z); say('car', 0.4, true); caption(ctx.vr() ? 'Mash any button to turn the key!' : 'Mash any key or click to turn the key!', 3);
  }
  function yard(dt, I, t) {
    // the groundskeeper, where they left him
    { const gb = P.groundsman; laid(gb, plan.groundsman.x, plan.groundsman.y, 2.2, 0); gb.mat.userData.uAmb.value.copy(world.lightAt(cx(plan.groundsman.x), cz(plan.groundsman.y))).multiplyScalar(1.3);
      if (!S.saidWalt && near(plan.groundsman.x, plan.groundsman.y, 3)) { S.saidWalt = true; say('groundsman', 0, true); } }
    // the gate rolls open into the wall
    if (G.fenceOpen) { S.gateT = Math.min(1, (S.gateT ?? 1) + dt / 2.6); const k = S.gateT * S.gateT * (3 - 2 * S.gateT); gate.position.x = gateX + k * 7.6; gate.userData.lock.visible = false; const i = ctx.space.boxes.indexOf(gateBox); if (k > 0.55 && i >= 0) ctx.space.boxes.splice(i, 1); if (S.gateT < 1 && !(S.grT > t)) { S.grT = t + 0.35; sound.tone(new V(gateX, 2, gateZ), { f: 70 + Math.random() * 40, f2: 50, type: 'sawtooth', dur: 0.4, gain: 0.08 }); } }
    // in the car: turn the key while they come for the glass
    if (CAR.state === 1) {
      CAR.t += dt; walker.crouched = true;
      if (I && I.any) { CAR.ign = Math.min(1, CAR.ign + 0.045); if (!(S.krT > t - 0.1)) { S.krT = t; sound.tone(null, { f: 42 + Math.random() * 8, type: 'sawtooth', dur: 0.12, gain: 0.12 }); } }
      else CAR.ign = Math.max(0, CAR.ign - dt * 0.05);
      for (const [n, at] of [[1, 0.35], [2, 0.7]]) if (CAR.coughs < n && CAR.ign >= at) { CAR.coughs = n; for (let i = 0; i < 3; i++) sound.tone(null, { f: 38, f2: 26, type: 'sawtooth', dur: 0.22, gain: 0.3, delay: i * 0.12 }); sound.burst(null, { f: 200, q: 0.7, dur: 0.5, gain: 0.3, brown: true }); CAR.ign -= 0.08; }
      // they come for the car: the nearest ones drop their chase and go for the windows
      const slots = [[-1.25, 0.5], [-1.25, -0.9], [1.25, 0.2], [1.25, -1.1], [0, 2.7], [0, -2.7]];
      for (const h of horrors.list) {
        if (!h.opts.pack || !h.body.root.visible) continue;
        const d = Math.hypot(h.pos.x - car.position.x, h.pos.z - car.position.z); if (d > 16 && !CAR.grab.includes(h)) continue;
        if (!CAR.grab.includes(h)) { if (CAR.grab.length >= slots.length) continue; CAR.grab.push(h); h.active = false; }
        const sl = slots[CAR.grab.indexOf(h)]; const tx = car.position.x + sl[0], tz = car.position.z + sl[1]; const dx = tx - h.pos.x, dz = tz - h.pos.z, dd = Math.hypot(dx, dz);
        const b = h.body; b.root.visible = true;
        if (dd > 0.15) { const st = Math.min(dd, dt * 4.2); h.pos.x += dx / dd * st; h.pos.z += dz / dd * st; b.root.position.set(h.pos.x, 0, h.pos.z); b.root.rotation.set(0, Math.atan2(dx, dz), 0); pose(b, 'run', t, { speed: 4, phase: t * 12, reach: true }); }
        else { b.root.position.set(h.pos.x, 0, h.pos.z); b.root.rotation.set(0, Math.atan2(car.position.x - h.pos.x, car.position.z - h.pos.z), 0); pose(b, 'grab', t, { k: 1 }); b.bones.Rupper.rotation.x += Math.sin(t * 14 + (h.opts.seed || 1)) * 0.4;
          if (!(h.bangT > t)) { h.bangT = t + 0.45 + Math.random() * 0.4; sound.thud(h.pos.clone().setY(1.2), 0.6); walker.shake = Math.max(walker.shake, 0.3); horrors.glitchKick(0.25); if (Math.random() < 0.3) sound.voice('patient', 'attack', h.pos); } }
        b.mat.userData.uAmb.value.copy(world.lightAt(h.pos.x, h.pos.z)).multiplyScalar(1.4);
      }
      if (CAR.ign >= 1) { CAR.state = 2; CAR.t = 0; sound.thud(null, 1); startEngine(); for (const hl of car.userData.hl) hl.material.color.setHex(0xfff2c0); }
    } else if (CAR.state === 2) {
      // and away: through the gate, into the dark
      CAR.t += dt; const v = Math.min(14, CAR.t * 7); car.position.z += v * dt; walker.pos.set(car.position.x - 0.42, 0, car.position.z - 0.15); walker.crouched = true;
      if (CAR.engine) CAR.engine.o.frequency.setTargetAtTime(38 + v * 6, sound.ctx.currentTime, 0.2);
      for (const h of CAR.grab) { const b = h.body; if (Math.hypot(b.root.position.x - car.position.x, b.root.position.z - car.position.z) < 2.5) { b.root.position.x += (b.root.position.x - car.position.x) * dt * 3; b.root.rotation.x = Math.min(1.4, b.root.rotation.x + dt * 3); } }
      if (ctx.setFade) ctx.setFade(Math.min(1, Math.max(0, (CAR.t - 1.4) / 1.4)), true);
      if (CAR.t > 3.2 && !G.escaped) { G.escaped = true; if (CAR.engine) CAR.engine.g.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.6); ctx.ending(); }
    }
  }
  function startEngine() {
    const c = sound.ctx; if (!c) return; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 40; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const lfo = c.createOscillator(); lfo.frequency.value = 11; const lg = c.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.32, c.currentTime, 0.1); o.connect(lp); lp.connect(g); g.connect(sound.vipDry); o.start(); lfo.start(); CAR.engine = { o, g };
  }
  const bar = (k) => '▮'.repeat(Math.round(k * 12)) + '▯'.repeat(12 - Math.round(k * 12));
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
        else if (id === 'okafor' && G.items.has('file') && !G.fileGiven) say3(id, who, 'okaforFile', () => { if (G.fileGiven) { ctx.checkpoint(); ctx.save(); } });
        else if (id === 'voss') say3(id, who, G.delivered ? 'vossWait' : G.items.has('tray') ? 'voss' : 'vossWait', () => { if (G.delivered) sound.pickup('fuse'); });
        else say3(id, who, id);
      } });
  }
  // the showers: three puddles to mop
  for (const sp of spills) inter.push({ kind: 't3', pos: () => new V(cx(sp.x), 0.3, cz(sp.y)), r: 1.3, label: () => (G.alarm || sp.done || !G.sheet ? '' : 'Mop it up'),
    act: () => { if (G.alarm || sp.done) return; sp.done = true; G.mopped = spills.filter((q) => q.done).length; sound.burst(new V(cx(sp.x), 0.2, cz(sp.y)), { f: 900, q: 0.6, dur: 0.6, gain: 0.25, brown: true, verb: 0.3 }); if (G.mopped >= 3) { say('mopped', 0.4, true); ctx.checkpoint(); ctx.save(); } } });
  // the breaker on the generator room wall: hold on and keep pulling
  inter.push({ kind: 't3', pos: () => new V(cx(plan.breaker.x), 1.4, cz(plan.breaker.y)), r: 1.3, label: () => (!G.alarm || G.breaker ? '' : S.pulling ? 'Pull! ' + bar(G.pull || 0) : 'Pull the breaker'),
    act: () => { if (!G.alarm || G.breaker) return; if (!S.pulling) { S.pulling = true; G.pull = 0; caption(ctx.vr() ? 'Mash any button to pull it!' : 'Mash any key or click to pull it!', 3); } } });
  // the gate in the south fence
  inter.push({ kind: 't3', pos: () => new V(gateX, 1.2, gateZ - 0.3), r: 2.2, label: () => (!G.inYard || G.fenceOpen ? '' : G.items.has('fencekey') ? 'Unlock the gate' : 'Padlocked'),
    act: () => { if (!G.inYard || G.fenceOpen) return; if (!G.items.has('fencekey')) { sound.rattle(gateX, gateZ); return; } G.fenceOpen = true; S.gateT = 0; sound.clang(new V(gateX, 1.2, gateZ), 600, 0.4, 0.5); say('gate', 0.8, true); ctx.checkpoint(); ctx.save(); } });
  // your car
  inter.push({ kind: 't3', pos: () => new V(car.position.x - 0.95, 1.1, car.position.z - 0.2), r: 1.6, label: () => (!G.fenceOpen || CAR.state ? (CAR.state === 1 ? 'Turn the key! ' + bar(CAR.ign) : '') : 'Get in your car'),
    act: () => { if (!G.fenceOpen || CAR.state) return; enterCar(); } });
  // after the alarm the security desk only says one thing

  inter.push({ kind: 't3', pos: () => new V(cx(plan.clock.x), 1.0, cz(plan.clock.y) + 0.4), r: 1.3, label: () => (G.alarm ? 'LOCKDOWN — GATE SEALED' : ''), act: () => { G.sawLockdown = true; } });
  // the count: look through four hatches; two of them talk back
  const hatchWho = { kroft: { name: 'Kroft', voice: 78, b: null }, rourke: { name: 'Rourke', voice: 480, b: null } };
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
  inter.push({ kind: 't3', pos: () => new V(cx(plan.exit.x) + 0.3, 1.3, cz(plan.exit.y)), r: plan.exit.r, label: () => (!G.alarm || G.inYard || !G.breaker ? '' : S.forcing ? 'Force it! ' + '▮'.repeat(Math.round(G.force * 12)) + '▯'.repeat(12 - Math.round(G.force * 12)) : 'Force the window'),
    act: () => { if (!G.alarm || G.escaped) return; if (!S.forcing) { S.forcing = true; say('window', 0, true); caption(ctx.vr() ? 'Mash any button to force it!' : 'Mash any key or click to force it!', 3); } } });

  return {
    interactables: inter,
    busy: () => talk.busy || CAR.state > 0,
    // for tools (the trailer): the cast and the props of the set pieces
    dev: { P, S, chair, ropeA, ropeB, stretch, poolA, poolB, gutting: (a) => gutting(P.okaforDead, [P.p1, P.p2], CAFE, 0.6, a, poolA, 'cafe'), laid, raiseAlarm: () => raiseAlarm(), lever: () => lever },
    // the cells are locked until the alarm
    lockCells() { for (const d of doors.list) if (d.cell) { d.locked = true; d.target = 0; d.angle = 0; d.mesh.rotation.y = 0; } },
    start() { this.lockCells(); if (ctx.LIGHT) this.lights(ctx.LIGHT); setTimeout(() => say('start'), 1200); },
    restore(d) { G.flags = d.flags || {}; G.sheet = !!d.sheet; G.mopped = d.mopped || 0; spills.forEach((sp, i) => (sp.done = i < G.mopped)); G.fileGiven = !!d.fileGiven; G.breaker = !!d.breaker; G.fenceOpen = !!d.fenceOpen; if (G.fenceOpen) S.gateT = 1; if (d.inYard) setTimeout(() => toYard(true), 0); if (d.alarm) raiseAlarm(true); else this.lockCells(); for (const k of ['kroft', 'rourke', 'a', 'b'].slice(0, d.counted || 0)) countDone.add(k); },
    update(dt, I) { if (talk.busy) talk.update(dt, I); update(dt, I); },
    stopKlaxon() { if (klaxon) { klaxon.out.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.3); } },
    // lights: the hospital on the mains, then the beacons
    lights(LIGHT) {
      const a = G.alarm ? G.alarmT : -1;
      const mains = a < 0 ? 1 : a < 0.5 ? (Math.random() > 0.5 ? 1 : 0.05) : 0.0;
      LIGHT.P.value = mains * 2.8; LIGHT.A.value = 1.4; LIGHT.B.value = mains;   // A is outside: the moon and the wall floods, never on the mains
      LIGHT.S.value = a < 0.3 ? 0 : 0.32 + 1.0 * Math.pow(0.5 + 0.5 * Math.sin(a * 4.4), 2.4);   // never pitch black: you can always just about see
    },
  };
}

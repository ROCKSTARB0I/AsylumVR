// Tape 4, The End. October 1993, the small hours to first light. Ward, at the bottom of the stairs from
// Tape 2, with the camcorder still running: Ward C under the basement, up through the women's ward to the
// disturbed ward, down through the staff offices to the examining rooms, and down again to the boiler
// house, the power plant, and the coal yard. Everything Mount Harrow was hiding is on this tape.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, C, floorAt } from './plan.js?v=35';
import { makeBody, pose, bonesaw } from './carcass.js?v=35';
const V = THREE.Vector3;

// ------------------------------------------------------------------ the documents
export const NOTES = {
  n4_radio: { t: 'Dr. Voss’s working journal, open by the radio', b: `The protocol does not kill. It never was meant to.\nEach stage takes away something the patient does not need. Fear first. Then sleep. Then memory. Then the name. What is left at the end should be the thing itself, the part that is kept.\n\nI have watched the monitors in infrared. At the end of it something warm leaves the body. It is there for two frames. I need it closer. I need it on tape, from inside the eye that is losing it.\n\nThe journalist has a camcorder with a night setting. I asked for this one personally.\n— A.V.` },
  n4_trays: { t: 'Meal roster, Ward C, pinned over the counter', b: `WARD C — TRAYS: 40 / DAY\nSoft food only. Most of them cannot chew. Several cannot swallow (tube).\nNone of them may be allowed to starve. Starving does not end it, it only makes them loud.\n\nTray 41 — WARD, E. — from tomorrow.` },
  n4_wardc: { t: 'Clipboard on a cell door, Ward C', b: `TRANSFERRED — OCT 1989\nDAWES, R. (security) — stage 3. Deceased 1991. Left at his post.\nKELLY, A. (nursing) — stage 2. Reassigned: Women’s Ward, as Matron. Doing very well.\nOKAFOR, T. (medical) — stage 4. Cell 6.\nROURKE, D. — stage 7. Complete? Does not sleep. Disturbed Ward.\nMARSH, J. (orderly) — absconded 14/10/89.\n   READMITTED 30/9/93. Theater.` },
  n4_pump: { t: 'Note taped to the pump', b: `Cistern pump failed again.\nIf you hear them in the water, don’t go in after them.\nThey don’t drown. They just get cold.\n— Maint.` },
  n4_kelly: { t: 'A diary in the Matron’s desk', b: `Dr. Voss says I am doing very well. He says I was too frightened before, so he took the frightened part out. I’m not frightened of anything now.\n\nI have forty girls and they are all mine and they are all good and they all sleep when Mother says. Some of them don’t want to sleep. I help them sleep.\n\nI keep the ward keys in my store so the girls can’t wander. The key to my office I keep in Dolly.\n\nJamie came back. I saw him go past on a trolley. I waved.` },
  n4_dorm: { t: 'Scrap of paper under a mattress', b: `mother keeps the office key inside DOLLY\nshe made us watch her put it in\ndolly is the big one in the nursery\ndolly is soft inside\ndolly is WARM inside\ndont put your hand in dolly` },
  n4_laundry: { t: 'Laundry list', b: `40 gowns. 40 sheets. 40 pillowslips.\n1 nurse’s uniform — STAINED.\nDO NOT WASH. Matron wants it as it is. Matron says it is the last thing she was wearing when she was still frightened.` },
  n4_nursery: { t: 'Nursery rules, in a careful nurse’s hand', b: `The babies are fed at six.\nThe babies are washed at seven.\nThe babies are NOT to be held by visitors.\n\nUnderneath, in crayon:\nthe babies have real teeth\nthe babies have real hair\nwe know whose` },
  n4_booth: { t: 'Attendants’ log, 14 October 1989', b: `03:15 Refractories held. All strong rooms secure.\n03:20 They are chewing at the hatches.\n03:40 Rourke is out. He is in corridor A. He is not walking right. He is not walking.\n03:45 We have locked the glass.\n03:50 The release lever opens EVERY door on this floor. The strong rooms. The staff stairs. All of it.\nDo not pull it.\nWhatever happens, do not pull it.` },
  n4_restraint: { t: 'Chart, restraint room', b: `PATIENT 9 — REFRACTORY\nSelf-injurious. Fingers 1–4, left hand: self-removed (eaten).\nPatient states he is hungry “for the doctor’s sake”.\nPatient offers the remainder to staff.\nStaff are not to accept.` },
  n4_hole: { t: 'Scratched into the padding, the hole', b: `ROURKE CANT SLEEP\nIF ROURKE CANT SLEEP NOBODY SLEEPS\nhe comes in at night and he watches\nhe watches with his face right up\nhis eyes dont close they took the closing out` },
  n4_typing: { t: 'A page still in a typewriter', b: `RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE RISE AND SHINE\n\n(the typing pool. he types when there’s nobody here. he’s been typing for four years.)` },
  n4_records: { t: 'Transfer register, 1989–1993', b: `212 names.\nDestination column, every line: DOWN.\nCountersigned on every page: R. Haldane, Medical Director.\nThe last page is this week. The last line is blank, and the destination is already filled in.` },
  n4_marsh: { t: 'Personnel file: MARSH, J.', b: `Night orderly. Absconded 14 Oct 1989 (own vehicle, through the main gate).\nLocated September 1993.\nReadmitted 30/9/93. Stage 1: 2/10/93.\n\nNote, in Voss’s hand:\nHe had written to a journalist. A brave letter. I read it, and I wrote a better one, and I sent mine in his name. The journalist will come after dark, alone, with a camera.\nLet him watch them come in.` },
  n4_director: { t: 'Letter on the Director’s desk, sealed, never posted', b: `To the State Board of Health.\n\nI signed everything. The decommissioning. The transfers. The meal budgets for a hospital that does not exist.\nVoss promised the protocol would make them quiet. It made them unable to die.\n\nThere are two hundred and twelve people under this building who cannot die. I have tried to end it. I tried the boilers — he keeps them banked, and someone has welded the relief valve shut.\n\nI am going to do the only thing in this building that still works.\n— R. Haldane, Director\n\nThe keycard for the examining wing is in my desk. If anyone finds this: open the valves. Burn it.` },
  n4_lounge: { t: 'Memo on the staff noticeboard', b: `To whoever keeps answering the switchboard at night:\nDawes is dead.\nStop answering for him.` },
  n4_ect: { t: 'ECT log', b: `Patient 117. 42 treatments.\nPatient no longer responds to treatment.\nPatient no longer responds.\nPatient is still being treated.` },
  n4_xray: { t: 'X-ray envelope', b: `Lateral skull — ROURKE, D.\nBoth frontal lobes absent. Cavity healed.\nPatient alert. Patient conversing.\nPatient asks for his mother.` },
  n4_hydro: { t: 'Continuous bath card', b: `Patient submerged: 4 hrs 10 min.\nPatient still breathing.\nPatient should not be breathing.\nContinue.` },
  n4_theater: { t: 'Case note on the theater trolley', b: `SUBJECT 41: WARD, E.\nAccess: transorbital (left eye). The camera to remain RUNNING throughout.\nIn infrared it will show warm. I want to see it leave from the inside.\nFront first. Then the back.\n\nSUBJECT 40: MARSH, J. — hold for observation. Let him watch.` },
  n4_control: { t: 'Engineer’s note, control room', b: `Boilers banked by order of Dr. Voss.\nDO NOT open the steam valves without the relief open.\nThe relief valve has been welded shut.\nI didn’t weld it. I don’t know who welded it.\nIf all three valves go and the turbine starts, you have about a minute and a half before the drums go.\nThe yard gate is on the turbine circuit.` },
  n4_furnace: { t: 'Disposal book, by the furnace', b: `This week: 6.\nKroft does it now. He likes the fire. He sings to it.\nSome of them are still moving when they go in.\nThey don’t stop moving. Not even in there.` },
  n4_last: { t: 'A letter in the workshop drawer, never sent', b: `Dear E. Ward,\n\nMy name is Jamie Marsh. I worked nights at Mount Harrow in 1989. I was there when it fell.\nThe patients on the meal rosters are alive. They are under the building.\nI was going to ask you to come and see. I was going to tell you the Administration window doesn’t latch.\n\nI’m not going to send this. Don’t come.\nHe wants someone to come. He wants it on tape.\n— J.M.` },
};

export const MUTTER = {
  start: 'The gate... it locked behind me. It’s locked. There’s a radio. Someone’s down here.',
  radio: 'Voss. This is where he works. ...Is that man breathing?',
  stairDoor: 'Stairs up. Locked. He’ll have the key. Where does he keep his keys?',
  stairKey: 'Got it. Oh God. Oh God, it moved.',
  wardc: 'They’re alive. All of them. They’re all alive.',
  up: 'Up. Keep going up.',
  female: 'A women’s ward. Candles. Who keeps candles lit down here?',
  wardDoor: 'Locked. The ward keys. The Matron will have them.',
  officeLocked: 'Her office is locked. ...Dolly?',
  dolly: 'It’s warm. It’s WARM inside. Oh no. Oh no no no.',
  officeKey: 'Her office. Her keys are through there.',
  wardKeys: 'The ward gate. GO.',
  disturbed: 'The disturbed ward. The worst of them. They put the worst of them at the top.',
  booth: 'The attendants’ booth. The release is in there. ...“Do not pull it.”',
  boothKey: 'The booth key. I have to open everything. Everything.',
  release: 'Run. RUN.',
  offices: 'Offices. It’s quiet. It’s too quiet.',
  director: 'The Director’s office. Locked.',
  directorKey: 'The spare key. Sorry, Dawes.',
  examCard: 'The examining wing. He’ll be there. He’s always there.',
  exam: 'It smells like a dentist. It smells like burnt hair.',
  chain: 'Chained. I need something to cut it.',
  cutters: 'Bolt cutters. The chain. Before he finds me.',
  boiler: 'The boiler house. It’s hot. Something’s singing.',
  valve: 'That’s one.',
  valves: 'All three. The turbine. Control room.',
  power: 'It’s going up. The whole place is going up. THE YARD.',
  hide: 'Don’t breathe. Don’t breathe.',
};

export const OBJECTIVES = [
  { id: 'radio', text: 'Follow the radio', done: (s) => s.t4.radio },
  { id: 'out', text: 'Find a way up out of Ward C', done: (s) => s.t4.sawStairDoor || s.items.has('stairKey') },
  { id: 'key', text: 'Find the key to the stairwell door (try the cold room)', done: (s) => s.items.has('stairKey') },
  { id: 'up', text: 'Take the stairs up', done: (s) => s.t4.female },
  { id: 'ward', text: 'Find a way through the women’s ward', done: (s) => s.t4.sawWardDoor || s.items.has('wardKeys') },
  { id: 'office', text: 'The Matron’s office is locked. Find its key', done: (s) => s.items.has('officeKey') },
  { id: 'keys', text: 'Take the ward keys from the Matron’s store, through her office', done: (s) => s.items.has('wardKeys') },
  { id: 'gate', text: 'Unlock the ward gate (south) and climb', done: (s) => s.t4.disturbed },
  { id: 'booth', text: 'The way out is held shut from the attendants’ booth. Get in', done: (s) => s.items.has('boothKey') || s.t4.release },
  { id: 'release', text: 'Pull the release in the booth', done: (s) => s.t4.release },
  { id: 'run', text: 'RUN — the staff stairs, WEST', done: (s) => s.t4.offices },
  { id: 'card', text: 'The examining wing is sealed. Find the Director’s keycard', done: (s) => s.items.has('directorKey') || s.items.has('examCard') },
  { id: 'card2', text: 'Take the keycard from the Director’s office', done: (s) => s.items.has('examCard') },
  { id: 'exam', text: 'Go south, into the examining rooms', done: (s) => s.t4.exam },
  { id: 'down', text: 'Find the way down to the boiler house', done: (s) => s.t4.captured || s.t4.boiler },
  { id: 'cutters', text: 'Bolt cutters: the instrument store', done: (s) => s.items.has('cutters') || s.t4.boiler },
  { id: 'chain', text: 'Cut the chain on the boiler house stairs (behind the theater)', done: (s) => s.t4.boiler },
  { id: 'valves', text: (s) => `Open the three steam valves (${s.t4.valves || 0}/3)`, done: (s) => (s.t4.valves || 0) >= 3 },
  { id: 'turbine', text: 'Start the turbine in the control room', done: (s) => s.t4.power },
  { id: 'yard', text: 'GET OUT — THE COAL YARD', done: (s) => s.escaped },
];

export const ITEM_LABEL = { wardKeys: 'Take the keys', boothKey: 'Take the key', directorKey: 'Take the key', examCard: 'Take the keycard', cutters: 'Take the bolt cutters' };
export const LOCK_NAME = { stairKey: 'the stairwell key', officeKey: 'the office key', wardKeys: 'the ward keys', boothKey: 'the booth key', directorKey: 'the Director’s key', examCard: 'the Director’s keycard', chain: 'something to cut the chain', release: 'the release, in the booth', power: 'power', never: 'it won’t open' };

export const ENDING_TEXT = [
  'You came out into the coal yard as the sky was going grey, and behind you the boilers of Mount Harrow went up, one after another.',
  'The fire burned for two days. The state recorded no casualties. Officially, nobody had been inside since 1989.',
  'E. Ward was never seen again.',
  'In 1997, four unlabelled videotapes arrived at a television station in the state capital. The last one ends with fifty-eight seconds of night-vision footage of the fire. Something walks out of it.',
];
export const ENDING = (G, timecode, notesN) => `<div class="end"><p class="kicker">Mount Harrow State Asylum &middot; October 1993</p><h1 class="logo">THE END</h1><p class="lede">${ENDING_TEXT.join('<br><br>')}</p><p class="kicker">Tape 4 of 4 &middot; Deaths ${G.deaths} &middot; Documents ${G.notes.length}/${notesN} &middot; Time ${timecode(G.t).slice(0, 8)}</p><nav class="menu"><button onclick="location.href='?tape=1'">Watch it again from Tape 1</button><button onclick="location.href='?tape=4'">Replay Tape 4</button></nav></div>`;

// ------------------------------------------------------------------ helpers
function body(scene, kind, seed, look) { const b = makeBody(kind, seed, look); scene.add(b.root); b.root.visible = false; return b; }
function sit(b, x, y, yaw, t, seat = 0.55) {
  b.root.visible = true; b.root.rotation.order = 'XYZ'; b.root.rotation.set(0, yaw, 0); pose(b, 'idle', t, { calm: true });
  const B = b.bones; B.Lthigh.rotation.x = -1.45; B.Rthigh.rotation.x = -1.45; B.Lshin.rotation.x = 1.45; B.Rshin.rotation.x = 1.45;
  B.Lupper.rotation.x = -0.35; B.Rupper.rotation.x = -0.35; B.Lfore.rotation.x = -1.0; B.Rfore.rotation.x = -1.0;
  // on the seat, not inside the chair back: forward a little, hips at seat height
  b.root.position.set(cx(x) + Math.sin(yaw) * 0.3, floorAt(cx(x), cz(y)) + seat - b.rest.hips.y * 0.98 + 0.12, cz(y) + Math.cos(yaw) * 0.3);
}
function laid(b, x, y, yaw, h, t) { b.root.visible = true; pose(b, 'lie', t); b.root.rotation.order = 'YXZ'; b.root.rotation.set(-Math.PI / 2, yaw, 0); const f = new V(Math.sin(yaw), 0, Math.cos(yaw)); b.root.position.set(cx(x) + f.x * 0.95, floorAt(cx(x), cz(y)) + h, cz(y) + f.z * 0.95); }
function stand(b, x, y, yaw, anim, t, p = {}) { b.root.visible = true; b.root.rotation.order = 'XYZ'; b.root.rotation.set(0, yaw, 0); b.root.position.set(cx(x), floorAt(cx(x), cz(y)), cz(y)); pose(b, anim, t, p); }
const lightBody = (b, world, k = 1.2) => { b.mat.userData.uAmb.value.copy(world.lightAt(b.root.position.x, b.root.position.z)).multiplyScalar(k); };
// an open crown: what the protocol leaves on top of a head
function crown(b) {
  const g = new THREE.Group(); const s = b.s;
  const wet = new THREE.Mesh(new THREE.CircleGeometry(0.062 * s, 18), new THREE.MeshStandardMaterial({ color: 0x5a1210, roughness: 0.15, emissive: 0x1a0303 })); wet.rotation.x = -Math.PI / 2; g.add(wet);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.064 * s, 0.008 * s, 6, 20), new THREE.MeshStandardMaterial({ color: 0xc8bca0, roughness: 0.6, emissive: 0x1e1c16 })); rim.rotation.x = Math.PI / 2; g.add(rim);
  for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: 0x111111 })); const a = i / 6 * Math.PI * 2; st.position.set(Math.cos(a) * 0.075 * s, 0, Math.sin(a) * 0.075 * s); st.rotation.y = -a; g.add(st); }
  g.position.set(0, 0.158 * s, -0.012); g.scale.set(1, 1, 1.15); b.bones.head.add(g); return g;
}
// a rope of something wet, grown along a curve (hair, gut)
function strand(col, r) { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })); m.userData.r = r; m.frustumCulled = false; return m; }
function grow(m, pts) { if (pts.length < 2) return; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length * 3), m.userData.r, 6); }
const bar = (k) => '▮'.repeat(Math.round(k * 12)) + '▯'.repeat(12 - Math.round(k * 12));
const P3 = (x, y, h) => new V(cx(x), floorAt(cx(x), cz(y)) + h, cz(y));

export function setupTape4(ctx) {
  const { G, walker, plan, world, sound, horrors, doors, scene, say, caption } = ctx;
  G.t4 = { valves: 0 };
  const s = () => G.t4;
  const near = (x, y, r) => Math.hypot(walker.pos.x - cx(x), walker.pos.z - cz(y)) < r;
  const sees = (x, y, r = 9) => near(x, y, r) && ctx.space.los(walker.pos.x, walker.pos.z, cx(x), cz(y), true);
  const inReg = (k) => { const [x0, y0, x1, y1] = plan.regions[k]; const gx = walker.pos.x / C, gy = walker.pos.z / C; return gx >= x0 && gx <= x1 + 1 && gy >= y0 && gy <= y1 + 1; };
  const S = { t: 0, beats: new Set(), mash: null };
  const once = (id) => { if (S.beats.has(id)) return false; S.beats.add(id); return true; };
  // timers on the game's clock (they wait while you're paused or reading)
  const timers = []; const later = (a, b) => (typeof a === 'function' ? timers.push({ at: S.t + b / 1000, fn: a }) : timers.push({ at: S.t + a, fn: b }));   // later(sec, fn) or later(fn, ms)
  const speak = (who, line, f0, secs = 4) => { caption(`${who}: ${line}`, secs); if (sound.on) sound.syllables(null, Math.min(14, Math.round(line.length / 6)), f0, { gain: 0.28, breath: 0.35, verb: 0.25 }); };

  // ---- sounds made once and looped: the radio, a telephone, the alarm bell, the furnace, the overpressure horn
  const loops = {};
  async function makeLoop(name, len, fn, pos, gain, opts = {}) {
    if (loops[name] || !sound.ctx) return; loops[name] = 'pending';
    const SR = 22050, off = new OfflineAudioContext(1, Math.floor(SR * len), SR); fn(off, len);
    const buf = await off.startRendering(); const c = sound.ctx; const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = c.createGain(); g.gain.value = 0; src.connect(g); const out = pos ? sound.out(g, pos, { verb: opts.verb ?? 0.4, ref: opts.ref ?? 2, roll: opts.roll ?? 1.1 }) : (g.connect(sound.vipDry), g);
    src.start(); loops[name] = { src, g, gain }; g.gain.setTargetAtTime(gain, c.currentTime, 0.4);
  }
  const loopGain = (name, v, tc = 0.3) => { const l = loops[name]; if (l && l.g) l.g.gain.setTargetAtTime(v, sound.ctx.currentTime, tc); };
  const tonePlay = (off, f, t0, dur, g, type = 'sine', dest) => { const o = off.createOscillator(); o.type = type; o.frequency.value = f; const e = off.createGain(); e.gain.setValueAtTime(0.0001, t0); e.gain.exponentialRampToValueAtTime(g, t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(e); e.connect(dest || off.destination); o.start(t0); o.stop(t0 + dur + 0.05); };
  const noise = (off, len) => { const b = off.createBuffer(1, off.sampleRate * len, off.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = off.createBufferSource(); n.buffer = b; return n; };
  // a 1940s waltz on a cheap set, half lost in static
  const radio = (off, len) => {
    const bp = off.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.9; bp.connect(off.destination);
    const mel = [7, 9, 7, 4, 2, 4, 7, 12, 11, 9, 7, 4, 5, 4, 2, 0]; const root = 330;
    for (let i = 0; i < Math.floor(len / 0.5); i++) { const t = i * 0.5; tonePlay(off, root * Math.pow(2, mel[i % mel.length] / 12), t, 0.45, 0.22, 'triangle', bp); if (i % 3 === 0) tonePlay(off, root / 2 * Math.pow(2, [0, 5, 7, 0][(i / 3 | 0) % 4] / 12), t, 0.4, 0.18, 'sine', bp); else tonePlay(off, root * Math.pow(2, [4, 9, 11, 4][(i / 3 | 0) % 4] / 12), t, 0.2, 0.08, 'sine', bp); }
    const n = noise(off, len); const ng = off.createGain(); ng.gain.value = 0.06; n.connect(ng); ng.connect(bp); n.start();
  };
  const phone = (off, len) => { for (let k = 0; k < len / 3; k++) for (let i = 0; i < 20; i++) { tonePlay(off, 900, k * 3 + i * 0.05, 0.04, 0.35, 'square'); tonePlay(off, 1150, k * 3 + i * 0.05 + 0.025, 0.04, 0.25, 'square'); if (i === 19) break; } };
  const bell = (off, len) => { for (let i = 0; i < len / 0.07; i++) tonePlay(off, 2100 + (i % 2) * 40, i * 0.07, 0.065, 0.3, 'square'); };
  const roar = (off, len) => { const n = noise(off, len); const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; const g = off.createGain(); g.gain.value = 0.8; n.connect(lp); lp.connect(g); g.connect(off.destination); n.start(); for (let i = 0; i < len * 6; i++) { const t = Math.random() * len; tonePlay(off, 2000 + Math.random() * 3000, t, 0.01, 0.15, 'square'); } };
  const horn = (off, len) => { for (let i = 0; i < len / 1.6; i++) { tonePlay(off, 220, i * 1.6, 1.2, 0.5, 'sawtooth'); tonePlay(off, 277, i * 1.6, 1.2, 0.35, 'sawtooth'); } };
  const whisper = (off, len) => { const n = noise(off, len); const bp = off.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2; const g = off.createGain(); g.gain.value = 0; for (let t = 0; t < len; t += 0.18) g.gain.setValueAtTime(Math.random() > 0.45 ? 0.5 : 0.02, t); n.connect(bp); bp.connect(g); g.connect(off.destination); n.start(); };
  const water = (off, len) => { const n = noise(off, len); const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g = off.createGain(); g.gain.value = 0.3; n.connect(lp); lp.connect(g); g.connect(off.destination); n.start(); for (let i = 0; i < len * 3; i++) tonePlay(off, 300 + Math.random() * 500, Math.random() * len, 0.06, 0.12, 'sine'); };

  // ------------------------------------------------------------------ the cast and the props
  const M = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  // Ward C: the man on Voss's slab, opened, breathing, watching you
  const slabMan = body(scene, 'naked', 141, { face: 'lobotomy', blood: 1, scars: 1, lean: 1 }); crown(slabMan);
  const slabGuts = new THREE.Group(); { for (let i = 0; i < 5; i++) { const pts = []; let p = new V((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.3); for (let j = 0; j < 10; j++) { pts.push(p.clone()); p = p.clone().add(new V((Math.random() - 0.5) * 0.08, Math.random() * 0.02, (Math.random() - 0.5) * 0.08)); } const t = strand(i % 2 ? 0x6a1a14 : 0x3a0806, 0.022); grow(t, pts); slabGuts.add(t); } scene.add(slabGuts); }
  // Voss at work over him when you come in (a double; the real hunter takes his place the moment he sees you)
  const vossB = body(scene, 'surgeon', 23, {}); { const w = bonesaw(vossB.s); w.position.set(0, -0.1 * vossB.s, 0.02); w.rotation.x = -Math.PI / 2; vossB.bones.Rhand.add(w); }
  // the transferred, strapped in their chairs, every head turning with you
  const chairs = [[11, 15, 0], [19, 15, 0], [31, 15, 0], [35, 15, 0], [15, 22.2, Math.PI], [23, 22.2, Math.PI], [27, 22.2, Math.PI], [31, 22.2, Math.PI]];
  const seated = chairs.map(([x, y, yaw], i) => { const b = body(scene, i % 3 ? 'gown' : 'naked', 150 + i, { face: ['lobotomy', 'bandaged', 'sewn', 'gaunt'][i % 4], blood: 0.6, scars: 1, bald: true, ...(i === 5 ? { female: true, h: 1.62 } : {}) }); crown(b); return { b, x, y, yaw }; });
  // the larder: the body on the hook by the key
  const hook = body(scene, 'corpse', 160, { outfit: 'rags', face: 'dead', blood: 1, dirt: 1 }); const hookRope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), M(0x3a3020, 1)); scene.add(hookRope);
  const spill = new THREE.Group(); scene.add(spill); spill.visible = false; { for (let i = 0; i < 7; i++) { const t = strand(i % 3 ? 0x7a2018 : 0x2a0806, 0.026 + Math.random() * 0.01); spill.add(t); } }
  // the cistern: knee-deep black water, and something in it
  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(23 * C, 6 * C), new THREE.MeshStandardMaterial({ color: 0x0a0c08, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.86 })); waterPlane.rotation.x = -Math.PI / 2; waterPlane.position.set(cx(21), 0.32, cz(28.5)); scene.add(waterPlane);
  const floater = body(scene, 'corpse', 161, { face: 'dead', blood: 0.3, dirt: 1, outfit: 'gown' });
  // forty trays, and the forty-first
  { const tg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), M(0x8a8a84, 0.4, 0.7), 41); const m4 = new THREE.Matrix4(); let k = 0; for (const [y, n] of [[4.5, 14], [7, 14], [2.3, 13]]) for (let i = 0; i < n; i++) { const x = 21.6 + i * 0.36; m4.makeRotationY((i * 13 % 7) * 0.05).setPosition(cx(x) - 0.75, y === 2.3 ? 1.0 : 0.79, cz(y)); tg.setMatrixAt(k++, m4); } tg.count = k; scene.add(tg); }
  // the women's ward: sleepers who sit up together; the woman in the bath; Dolly; Kelly sewing
  const fem = (o = {}) => ({ female: true, outfit: 'gown', h: 1.62, girth: 0.72, hair: [0.2, 0.14, 0.1], bald: false, blood: 0.2, dirt: 0.6, stare: true, ...o });
  const DUMMY = () => ({ root: { visible: false }, landed: false });
  let sleepers = []; const SLEEP = [[61, 4.1, 0], [65, 4.1, 0], [69, 4.1, 0], [73, 4.1, 0], [59, 12.4, Math.PI], [67, 12.4, Math.PI], [71, 12.4, Math.PI]];
  const mkSleeper = (i) => { const [x, y, yaw] = SLEEP[i]; sleepers.push({ b: body(scene, 'gown', 170 + i, fem({ face: ['sewn', 'gaunt', 'bandaged', 'smile', 'sewn', 'gouged', 'gaunt'][i], hair: [[0.2, 0.14, 0.1], [0.5, 0.45, 0.4], [0.08, 0.05, 0.03], [0.35, 0.2, 0.1]][i % 4] })), x, y, yaw }); };
  let bather = DUMMY();
  const hair = strand(0x1a120c, 0.018); scene.add(hair);
  const dolly = new THREE.Group(); { const cloth = M(0x8a7a6a, 0.95), china = M(0xd8cdbc, 0.35); const torso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), cloth); torso.scale.set(1, 1.25, 0.9); torso.position.y = 0.32; dolly.add(torso); const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), china); head.position.y = 0.78; dolly.add(head); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), M(0x0a0a0a, 0.2)); e.position.set(sx * 0.06, 0.8, 0.15); dolly.add(e); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.34, 8), cloth); arm.position.set(sx * 0.3, 0.32, 0.05); arm.rotation.z = sx * 0.5; dolly.add(arm); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.36, 8), cloth); leg.position.set(sx * 0.12, 0.06, 0.22); leg.rotation.x = Math.PI / 2; dolly.add(leg); }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), M(0x5a0a08, 0.3)); mouth.position.set(0, 0.72, 0.165); dolly.add(mouth); for (let i = 0; i < 6; i++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.014, 0.006), M(0xd8d0b0, 0.4)); tooth.position.set(-0.025 + i * 0.01, 0.72, 0.17); dolly.add(tooth); }
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.01), M(0x3a0806, 0.2)); seam.position.set(0, 0.34, 0.26); dolly.add(seam); const wig = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, 1.6), M(0x2a1a10, 0.9)); wig.position.y = 0.8; dolly.add(wig); }
  dolly.position.set(cx(91.5), floorAt(cx(91.5), cz(12.4)) + 0.45, cz(12.4) - 0.1); dolly.rotation.y = Math.PI; dolly.scale.setScalar(1.15); scene.add(dolly);
  const babies = []; for (const [x, y] of [[88, 5], [92, 5], [95, 5], [88, 11], [95, 11]]) { const b = dolly.clone(); b.scale.setScalar(0.42); b.position.set(cx(x), floorAt(cx(x), cz(y)) + 0.56, cz(y)); b.rotation.y = Math.random() * 6; scene.add(b); babies.push(b); }
  let kellyD = DUMMY(), sewn = DUMMY(); const mkKelly = () => (kellyD = body(scene, 'orderly', 74, { outfit: 'nurse', female: true, h: 1.74, girth: 0.82, muscle: 0, lean: 0.55, face: 'smile', skin: [0.7, 0.58, 0.52], hair: [0.42, 0.38, 0.34], bald: false, blood: 0.85, dirt: 0.6, scars: 0.5, stare: true }));
  // the disturbed ward: the man in the chair who eats his fingers
  let eater = DUMMY();
  // the offices: Dawes at the switchboard is dressing; this is the receiver
  // the examining rooms: the man on the ECT bed, the bath, the dentist's patient; the theater: Voss and Marsh
  let ectMan = DUMMY(), drowned = DUMMY(), dentist = DUMMY();
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.018, 0.01), M(0xd8d0b0, 0.4), 60); { const m4 = new THREE.Matrix4(); for (let i = 0; i < 60; i++) { m4.makeRotationY(Math.random() * 6).setPosition(cx(31.6) + (Math.random() - 0.5) * 0.4, floorAt(cx(31.6), cz(88)) + 0.88, cz(88) + (Math.random() - 0.5) * 0.25); teeth.setMatrixAt(i, m4); } scene.add(teeth); }
  let vossA = DUMMY(), marsh = DUMMY();
  const mallet = new THREE.Group(); { const wood = M(0x5a3a20, 0.7); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), wood); hd.rotation.z = Math.PI / 2; mallet.add(hd); const hn = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 6), wood); hn.position.y = -0.13; mallet.add(hn); mallet.visible = false; scene.add(mallet); }
  const pick = new THREE.Group(); { const st = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.22, metalness: 0.35, emissive: 0x3a3a38 }); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.002, 0.2, 6), st); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.1; pick.add(shaft); const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 8), st); handle.rotation.x = Math.PI / 2; handle.position.z = -0.04; pick.add(handle); scene.add(pick); pick.visible = false; }
  // the boiler house: the pile that comes down
  const pile = [];
  // ---- the people of each area are made while you're still in the one before it, one a frame
  const FACT = {
    basement: [],
    female: [...SLEEP.map((_, i) => () => mkSleeper(i)), () => (bather = body(scene, 'gown', 180, fem({ face: 'gaunt', hair: [0.1, 0.07, 0.05], blood: 0.4 }))), mkKelly, () => (sewn = body(scene, 'gown', 181, fem({ face: 'plain', hair: [0.6, 0.45, 0.25], blood: 0.5 })))],
    disturbed: [() => (eater = body(scene, 'jacket', 190, { outfit: 'trousers', face: 'smile', blood: 1, scars: 1, bald: true }))],
    offices: [],
    exam: [() => (ectMan = body(scene, 'gown', 200, { face: 'lobotomy', blood: 0.5, bald: true })), () => (drowned = body(scene, 'gown', 201, fem({ face: 'gaunt', hair: [0.4, 0.3, 0.2] }))), () => (dentist = body(scene, 'gown', 202, { face: 'smile', blood: 1, bald: true })), () => (vossA = body(scene, 'surgeon', 23, {})), () => (marsh = body(scene, 'gown', 210, { face: 'bandaged', skin: [0.66, 0.52, 0.44], blood: 0.4, bald: false, h: 1.8 }))],
    boiler: [0, 1, 2, 3].map((i) => () => pile.push(body(scene, 'corpse', 220 + i, { face: ['dead', 'sewn', 'gouged', 'burned'][i], blood: 1, dirt: 1, outfit: i % 2 ? 'rags' : 'gown' }))),
  };
  const built = {}; const bq = [];
  const want = (reg) => { if (built[reg]) return; built[reg] = 'queued'; if (ctx.dressing) { ctx.dressing.dressRegion(reg); bq.push(...ctx.dressing.queue.splice(0).map((e) => () => { ctx.dressing.queue.unshift(e); ctx.dressing.pump(); })); } bq.push(...FACT[reg], () => { built[reg] = true; }); };
  const ORDER = ['basement', 'female', 'disturbed', 'offices', 'exam', 'boiler'];
  const valves = [[60.2, 81, 'hall'], [86.6, 74.6, 'furnace'], [95.6, 84.6, 'coal']].map(([x, y, id]) => { const g = new THREE.Group(); const st = M(0x7a2a1a, 0.5, 0.5); const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 18), st); g.add(wheel); for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.02), st); sp.rotation.z = i * Math.PI / 4; g.add(sp); } const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), M(0x4a4a44, 0.5, 0.7)); stem.rotation.x = Math.PI / 2; stem.position.z = -0.15; g.add(stem); g.position.set(cx(x), floorAt(cx(x), cz(y)) + 1.3, cz(y)); scene.add(g); return { g, wheel, x, y, id, open: false, k: 0 }; });
  for (const v of valves) { v.g.lookAt(v.g.position.clone().add(new V(cx(v.x > 80 ? 85 : 62) - v.g.position.x, 0, cz(v.y > 82 ? 80 : 77) - v.g.position.z))); }
  const flash = new THREE.PointLight(0xffd8a0, 0, 30, 1.5); scene.add(flash);

  // things made here aren't in the bake: give each the light of where it stands (a glow), so it isn't black off night vision
  const glow = (o, k = 1.6) => { o.updateMatrixWorld(true); const p = o.getWorldPosition(new V()); const L = world.lightAt(p.x, p.z); o.traverse((m) => { if (m.material && m.material.emissive) { m.material = m.material.clone(); m.material.emissive.copy(m.material.color).multiply(new THREE.Color(L.r * k + 0.01, L.g * k + 0.01, L.b * k + 0.01)); } }); };
  for (const o of [dolly, ...babies, slabGuts, spill, hair, waterPlane, ...valves.map((v) => v.g)]) glow(o, o === waterPlane ? 0.6 : 1.8);
  glow(teeth, 2.2); scene.traverse((o) => { if (o.isInstancedMesh && o !== teeth && o.material && o.material.emissive && o.count === 41) { o.material.emissive.setRGB(0.04, 0.04, 0.038); } });

  // ------------------------------------------------------------------ the capture: strapped to Voss's table
  const STRAP = { k: 'strap', x: cx(39.5), z: cz(83), fx: 0, fz: -1, ang: 0 };
  function capture() {
    const st = s(); if (st.captured) return; st.captured = true; S.cap = { t: 0, free: false };
    ctx.setFade(1, true); sound.thud(walker.pos.clone().setY(1.6), 1.4); horrors.glitchKick(2); horrors.staticBurst(0.4); walker.shake = 1.5;
    const h = horrors.hunter; if (h) { h.state = 'idle'; h.path = null; h.body.root.visible = false; h.active = false; }
    later(1.6, () => { walker.hide(STRAP); G.strapped = true; G.struggle = 0; ctx.setFade(0); S.cap.t = 0; S.cap.on = true; });
  }
  function captureFree() {
    const st = s(); S.cap.on = false; G.strapped = false; walker.unhide(); pick.visible = false; mallet.visible = false; vossA.root.visible = false; ctx.setFade(0);
    sound.thud(P3(39.5, 83, 1), 1.2); sound.voice('surgeon', 'attack', P3(38, 83, 0)); horrors.glitchKick(1.4);
    const h = horrors.hunter; if (h) { h.active = true; h.body.root.visible = true; h.reset(); h.active = true; h.body.root.visible = true; h.pos.set(cx(37.6), 0, cz(82)); h.state = 'spot'; h.spotT = 0; h.aware = 1.5; }
    speak('MARSH', 'RUN! The store — he keeps cutters in the store! RUN!', 175, 4);
    ctx.checkpoint(); ctx.save();
  }

  // ------------------------------------------------------------------ interactions
  const inter = [];
  const add = (pos, r, label, act) => inter.push({ kind: 't3', pos, r, label, act });
  // Dolly: reach in
  add(() => new V(dolly.position.x, dolly.position.y + 0.35, dolly.position.z), 0.9, () => (G.items.has('officeKey') ? '' : S.mash && S.mash.id === 'dolly' ? 'Reach in! ' + bar(S.mash.k) : 'Reach inside the doll'),
    () => { if (G.items.has('officeKey') || S.mash) return; S.mash = { id: 'dolly', k: 0, rate: 0.06, decay: 0.05, tick: () => { sound.squelch(dolly.position, 0.9); walker.shake = Math.max(walker.shake, 0.25); }, done: () => { G.items.add('officeKey'); sound.pickup('fuse'); say('dolly', 0, true); later(() => say('officeKey', 0, true), 3500); horrors.heard(dolly.position.x, dolly.position.z, 12); ctx.checkpoint(); ctx.save(); } }; caption(ctx.vr() ? 'Mash any button to reach in' : 'Mash any key or click to reach in', 3); });
  // the booth: the release
  add(() => P3(61.5, 49.2, 1.1), 1.2, () => (!G.items.has('boothKey') && !s().release ? '' : s().release ? '' : 'PULL THE RELEASE'), () => { if (s().release) return; release(); });
  // the switchboard: answer it
  add(() => P3(19, 55.8, 1.0), 1.2, () => (S.ringing ? 'Answer the phone' : ''), () => { if (!S.ringing) return; S.ringing = false; loopGain('phone', 0, 0.05); pellCall(); });
  // the chained door at the head of the boiler stairs
  add(() => P3(46, 86, 1.1), 1.2, () => (s().chainCut ? '' : G.items.has('cutters') ? 'Cut the chain' : 'Chained shut'),
    () => { if (s().chainCut) return; if (!G.items.has('cutters')) { sound.rattle(cx(46), cz(86)); say('chain'); return; } s().chainCut = true; const d = doors.at(46, 86); if (d) { d.locked = false; doors.push(d, walker.pos.x, walker.pos.z); } sound.clang(P3(46, 86, 1.1), 900, 0.4, 0.5); horrors.heard(cx(46), cz(86), 14); ctx.checkpoint(); ctx.save(); });
  // the steam valves
  for (const v of valves) add(() => v.g.position.clone(), 1.1, () => (!s().boiler || v.open ? '' : S.mash && S.mash.id === v.id ? 'Turn it! ' + bar(S.mash.k) : 'Open the steam valve'),
    () => { if (v.open || S.mash || !s().boiler) return; S.mash = { id: v.id, k: 0, rate: 0.045, decay: 0.03, tick: () => { v.wheel.rotation.z += 0.25; if (Math.random() < 0.3) sound.clang(v.g.position, 180 + Math.random() * 60, 0.12, 0.4); horrors.heard(v.g.position.x, v.g.position.z, 9); }, done: () => { v.open = true; s().valves = valves.filter((q) => q.open).length; sound.burst(v.g.position, { f: 3000, q: 0.5, dur: 3.5, gain: 0.6, a: 0.05, verb: 0.5 }); horrors.heard(v.g.position.x, v.g.position.z, 22); say(s().valves >= 3 ? 'valves' : 'valve', 0.5, true); if (v.id === 'coal') bodySlide(); ctx.checkpoint(); ctx.save(); } }; caption(ctx.vr() ? 'Mash any button to turn it' : 'Mash any key or click to turn it', 3); });
  // the turbine
  add(() => P3(81, 90.6, 1.1), 1.3, () => (s().power ? '' : (s().valves || 0) >= 3 ? 'Start the turbine' : 'Turbine (no steam)'), () => { if (s().power || (s().valves || 0) < 3) return; powerUp(); });

  // ------------------------------------------------------------------ the big moments
  function release() {
    const st = s(); st.release = true; sound.clang(P3(61.5, 49, 1.2), 300, 0.6, 1.2); horrors.glitchKick(1.6); horrors.staticBurst(0.15); walker.shake = 1;
    makeLoop('bell', 2.8, bell, null, 0.16);
    caption('Every door on the floor unlocks at once.', 3); say('release', 1.2, true);
    doors.list.filter((d) => d.y >= 37 && d.y <= 68 && d.x >= 52).forEach((d, i) => { d.locked = false; later(0.4 + i * 0.12, () => { doors.push(d, d.wx + (d.strong ? 0 : 1), d.wz + (d.strong ? 1 : 0), true); sound.door(d, 'slam', d.wx, d.wz); }); });
    later(1.5, () => wakePack(true));
    ctx.checkpoint(); ctx.save();
  }
  function wakePack(roar) { for (const h of horrors.list) if (h.opts.pack && !h.active) { h.reset(); h.active = true; h.body.root.visible = true; h.state = 'investigate'; h.goal = walker.pos.clone(); h.wait = Math.random() * 0.6; if (roar) later(Math.random() * 1.5, () => sound.voice('patient', 'chase', h.pos)); } }
  function pellCall() {
    speak('THE PHONE', '...rise and shine... rise and shine... rise and shine...', 230, 4);
    const h = horrors.hunters[3]; if (!h) return;
    later(() => {
      const back = new V(walker.pos.x + Math.sin(walker.yaw) * 2.6, 0, walker.pos.z + Math.cos(walker.yaw) * 2.6);
      if (!ctx.space.los(walker.pos.x, walker.pos.z, back.x, back.z, true)) back.set(cx(19), 0, cz(54.5));
      h.active = true; h.body.root.visible = true; h.pos.copy(back); h.state = 'investigate'; h.goal = walker.pos.clone(); h.wait = 1.2; h.path = null;
      sound.voice('orderly', 'chase', h.pos); horrors.glitchKick(1.2); walker.shake = 0.8; caption('He’s behind you.', 2);
    }, 3800);
  }
  function bodySlide() { S.slide = { t: 0 }; sound.thud(P3(94, 81, 2), 1.4); }
  function powerUp() {
    const st = s(); st.power = true; G.power = true; sound.generator(P3(68, 95, 1)); horrors.glitchKick(1.5);
    const d = doors.list.find((q) => q.lock === 'power'); if (d) d.locked = false;
    later(() => { makeLoop('horn', 3.2, horn, null, 0.22); caption('PRESSURE ALARM. ALL BOILERS. PRESSURE ALARM.', 4); say('power', 2, true); st.finale = true; st.boom = 95; }, 3500);
    ctx.checkpoint(); ctx.save();
  }
  function explode() {
    const st = s(); if (st.blown) return; st.blown = true; walker.shake = 2; horrors.glitchKick(2.5); horrors.staticBurst(0.6); loopGain('horn', 0, 0.05);
    for (let i = 0; i < 6; i++) later(() => { sound.thud(P3(68, 80, 1), 2.2); sound.burst(null, { f: 200, q: 0.4, dur: 2.5, gain: 1.0, brown: true, verb: 0.8 }); walker.shake = 2; }, i * 380);
    flash.position.set(walker.pos.x, floorAt(walker.pos.x, walker.pos.z) + 3, walker.pos.z - 4); flash.intensity = 40;
  }

  // ------------------------------------------------------------------ Ward C, the first minutes
  function wardC(dt, I, st, t) {
    // the cold open: the gate slams up there, the lights choke, something down here screams
    if (S.t > 2.2 && once('gate')) { sound.clang(P3(4, 1.2, 1.2), 160, 0.9, 1.4); sound.thud(P3(4, 1.2, 1.2), 1.6); walker.shake = 1.0; horrors.glitchKick(1.6); horrors.blackout = true; later(0.25, () => (horrors.blackout = false)); later(0.4, () => (horrors.blackout = true)); later(0.7, () => (horrors.blackout = false)); later(2.6, () => sound.farScream && sound.farScream(P3(24, 20, 1))); }
    // Voss, sawing; the man on the slab screaming through it. He sees you, and it starts.
    const h0 = horrors.hunters[0];
    if (!st.vossLoose) {
      if (h0 && horrors.hunter === h0) { h0.active = false; h0.body.root.visible = false; }
      if (near(14, 7, 16)) {
        stand(vossB, 14, 7.15, 0, 'attack', t, { k: 0.35 + Math.abs(Math.sin(t * 3.2)) * 0.4 }); vossB.bones.neck.rotation.x = 0.5; vossB.bones.spine.rotation.x = 0.25; lightBody(vossB, world, 1.5);
        if (Math.random() < dt * 3) sound.burst(P3(14, 6.4, 1.0), { f: 1400 + Math.random() * 600, q: 3, dur: 0.18, gain: 0.35, verb: 0.3 });   // the saw
        if (Math.random() < dt * 0.45) sound.scream(P3(14, 6, 1.0), 0.7 + Math.random() * 0.3);
        if (Math.random() < dt * 0.3) sound.voice('surgeon', 'idle', P3(14, 7, 0));
      } else vossB.root.visible = false;
      const seen = (near(14, 7, 7.5) && sees(14, 7, 8)) || S.t > 90;
      if (seen && once('vossLoose')) {
        st.vossLoose = true; vossB.root.visible = false;
        if (h0 && horrors.hunter === h0) { h0.reset(); h0.active = true; h0.body.root.visible = true; h0.pos.set(cx(14), 0, cz(7.15)); h0.yaw = Math.atan2(walker.pos.x - h0.pos.x, walker.pos.z - h0.pos.z); if (near(14, 7, 9)) { h0.state = 'spot'; h0.spotT = 0; h0.aware = 1.5; } }
        if (near(14, 7, 9)) { sound.jump('sting'); speak('DR. VOSS', 'Ah. There you are. I was starting to think you weren\u2019t coming down.', 120, 4); }
      }
    } else vossB.root.visible = false;
    // the main tunnel: a body drops out of a ceiling hatch in front of you
    const ca = ctx.scares && ctx.scares.corpseActor;
    if (ca && !S.drop && walker.pos.z < cz(13) && walker.pos.z > cz(10.5) && walker.pos.x > cx(26.5) && walker.pos.x < cx(29) && Math.cos(walker.yaw + Math.PI / 2) > 0.3) S.drop = { y: 3.6, v: 0, t: 0 };
    if (ca && S.drop) {
      const d = S.drop; d.t += dt; const x = cx(30.6), z = cz(11.5); const target = 3.2 - 0.25 - 1.95 * ca.s; d.v += dt * 14; d.y = Math.max(target, d.y - d.v * dt);
      if (d.t < dt * 1.5) { sound.burst(new V(x, 3, z), { f: 900, q: 0.6, dur: 0.4, gain: 0.8 }); sound.jump('scare'); horrors.glitchKick(2); horrors.staticBurst(0.06); }
      if (d.y === target && !d.jerk) { d.jerk = true; sound.thud(new V(x, 2, z), 1.2); sound.clang(new V(x, 3, z), 300, 0.3, 0.6); walker.shake = 1; }
      pose(ca, 'hang', 0); ca.root.visible = !st.female; ca.root.position.set(x, d.y, z); ca.root.rotation.y = Math.sin(d.t * 3) * (d.jerk ? 0.5 * Math.exp(-d.t) : 0); const lk = d.t < 1.2 ? (Math.sin(d.t * 60) > 0 ? 0.45 : 0.12) : 0; lightBody(ca, world, 1.3); if (lk) ca.mat.userData.uAmb.value.setRGB(lk, lk, lk);
      if (!S.dropRope) { S.dropRope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), M(0x3a3020, 1)); scene.add(S.dropRope); }
      S.dropRope.visible = ca.root.visible; S.dropRope.position.set(x, (3.2 + d.y + 1.95 * ca.s) / 2 + 0.1, z); S.dropRope.scale.y = Math.max(0.1, 3.2 - (d.y + 1.95 * ca.s) + 0.2);
    }
    // the Ward C corridor from the west: something on all fours crosses the far end, fast, and is gone
    const sc = ctx.scares;
    if (sc && !sc.active && walker.pos.z > cz(17.6) && walker.pos.z < cz(19.6) && walker.pos.x < cx(13) && walker.pos.x > cx(7) && Math.sin(walker.yaw) < -0.5 && once('crawler')) {
      sc.start(function (dt2, A) { const a = A.a || (A.a = this.actors[3]); if (!A.s.go) { A.s.go = true; a.root.visible = true; this.sound.voice('eater', 'chase', new V(cx(24), 1, cz(18.5))); this.horrors.glitchKick(1.2); }
        const k = A.t / 0.9; const x = cx(24), z = cz(16.6) + k * (cz(20.6) - cz(16.6)); a.root.position.set(x, 0, z); a.root.rotation.set(0, 0, 0); pose(a, 'crawl', this.t, { speed: 6, phase: this.t * 16 }); a.mat.userData.uAmb.value.setRGB(0.12, 0.11, 0.1);
        if (k >= 1) { a.root.visible = false; return true; } return false; });
    }
    // an open cell in Ward C that isn't empty: he comes out at you
    if (sc && !sc.active && near(23, 18.5, 1.6) && st.radio && once('cellBurst')) {
      sc.start(function (dt2, A) { const a = A.a || (A.a = this.actors[2]); if (A.hitAt !== undefined) return this.hit(a, A, { dmg: 12 });
        if (!A.s.go) { A.s.go = true; this.sound.hush(0.6); A.s.p = new V(cx(23), 0, cz(15.2)); a.root.visible = true; }
        if (A.t < 0.55) { a.root.position.copy(A.s.p); a.root.rotation.y = 0; pose(a, 'idle', this.t, {}); a.bones.head.rotation.z = 0.7; a.mat.userData.uAmb.value.setRGB(0.05, 0.05, 0.05); return false; }
        const h = this.head(); const to = new V(h.x - A.s.p.x, 0, h.z - A.s.p.z); const d2 = to.length(); to.normalize(); A.s.p.addScaledVector(to, Math.min(d2, dt2 * 9)); a.root.position.copy(A.s.p); a.root.rotation.y = Math.atan2(to.x, to.z); pose(a, 'run', this.t, { speed: 8, phase: this.t * 14, reach: true }); this.light(a, 2);
        if (d2 < 1.0) this.hit(a, A, { dmg: 12 }); return false; });
    }
  }

  // ------------------------------------------------------------------ the frame
  const say1 = (k, d = 0) => { if (!G.said.has(k)) say(k, d, true); };
  function update(dt, I) {
    const st = s(); S.t += dt; const t = S.t;
    for (let i = timers.length - 1; i >= 0; i--) if (S.t >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); f(); }
    // back from the dead: the pressure clock (and the horn) start over
    if (!walker.alive) S.wasDead = true;
    else if (S.wasDead) { S.wasDead = false; S.mash = null; if (st.finale) { st.blown = false; st.boom = 95; loopGain('horn', 0.22, 0.2); } }
    // which stretch of the building you're in
    // build the next area's people a little at a time (every other frame)
    S.pf = (S.pf || 0) + 1; if (bq.length && S.pf % 2 === 0) bq.shift()();
    if (S.t > 3) for (let i = 1; i < ORDER.length; i++) { const k = ORDER[i - 1]; if (k === 'basement' || st[k]) want(ORDER[i]); }
    const enter = (k, flag, line) => { if (!st[flag] && inReg(k)) { st[flag] = true; shake(); say1(line, 0.6); ctx.checkpoint(); ctx.save(); want(k); while (built[k] !== true && bq.length) bq.shift()(); } };
    // through the door at the top (or bottom) of a stairwell: whoever was hunting the floor you left is gone, chase or no chase
    const shake = () => { horrors.setSegment(horrors.segment); for (const h of horrors.hunters) if (h !== horrors.hunter && h.active) { h.active = false; h.leaving = false; h.body.root.visible = false; h.state = 'patrol'; h.path = null; h.aware = 0; } };
    enter('female', 'female', 'female'); enter('disturbed', 'disturbed', 'disturbed'); enter('offices', 'offices', 'offices'); enter('exam', 'exam', 'exam'); enter('boiler', 'boiler', 'boiler');
    if (st.offices) loopGain('bell', 0, 1.5);
    // a mash in progress (Dolly, a valve)
    if (S.mash) { const m = S.mash; if (I.any) { m.k = Math.min(1, m.k + m.rate); m.tick && m.tick(); } else m.k = Math.max(0, m.k - m.decay * dt * 10); if (m.k >= 1) { S.mash = null; m.done(); } else if (!near(...(m.id === 'dolly' ? [91.5, 12.4] : valves.find((v) => v.id === m.id) ? [valves.find((v) => v.id === m.id).x, valves.find((v) => v.id === m.id).y] : [0, 0]), 2.4)) S.mash = null; }

    // ======== Ward C
    if (!st.female) wardC(dt, I, st, t);
    if (near(14, 6, 18) && !st.female) makeLoop('radio', 16, radio, P3(17, 3, 1.0), 0.5, { ref: 1.6, roll: 1.4 });
    if (st.female) loopGain('radio', 0, 2);
    if (!st.radio && near(14, 6, 4.2) && sees(14, 6, 5)) { st.radio = true; say1('radio', 0.4); }
    // the man on the slab breathes; his eyes follow you; when you lean close he asks you something
    if (near(14, 6, 16)) {
      laid(slabMan, 14, 6, Math.PI, 0.93, t); const B = slabMan.bones; const br = Math.sin(t * 1.9) * 0.05; B.chest.rotation.x += br; B.spine.rotation.x += br * 0.5;
      const toMe = Math.atan2(walker.pos.x - slabMan.root.position.x, walker.pos.z - slabMan.root.position.z); B.head.rotation.z = Math.max(-0.9, Math.min(0.9, -(toMe - Math.PI) * 0.6)); B.jaw.rotation.x = !G.t4.vossLoose ? 0.55 + Math.abs(Math.sin(t * 5.3)) * 0.35 : 0.15 + Math.max(0, Math.sin(t * 0.9)) * 0.1; if (!G.t4.vossLoose) { B.Lupper.rotation.z += Math.sin(t * 17) * 0.15; B.Rupper.rotation.z -= Math.sin(t * 19) * 0.15; B.head.rotation.z += Math.sin(t * 11) * 0.2; }
      slabGuts.position.set(cx(14), floorAt(cx(14), cz(6)) + 1.02, cz(6) - 0.3); slabGuts.scale.y = 1 + br * 2; lightBody(slabMan, world, 1.4); slabGuts.visible = true;
      if (near(14, 6, 1.6) && once('slab')) { speak('THE MAN ON THE TABLE', 'Is it morning? He said I could go home in the morning. ...Is my face still there?', 150, 5); sound.breathAt(P3(14, 6, 1), 0.3, 1.6, 600); }
    } else { slabMan.root.visible = false; slabGuts.visible = false; }
    // Ward C's chairs: all their heads turn to you at once
    const inWardC = walker.pos.z > cz(13) && walker.pos.z < cz(25) && walker.pos.x < cx(41) && !st.female;
    for (const c of seated) {
      if (!inWardC && !near(c.x, c.y, 10)) { c.b.root.visible = false; continue; }
      sit(c.b, c.x, c.y, c.yaw, t); const B = c.b.bones; B.Lfore.rotation.x = -0.4; B.Rfore.rotation.x = -0.4; B.Lupper.rotation.x = -0.6; B.Rupper.rotation.x = -0.6;
      const toMe = Math.atan2(walker.pos.x - cx(c.x), walker.pos.z - cz(c.y)) - c.yaw; const a = ((toMe + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      B.neck.rotation.y = Math.max(-1.3, Math.min(1.3, a)) * 0.45; B.head.rotation.y = Math.max(-1.3, Math.min(1.3, a)) * 0.55; B.head.rotation.x = 0.15 + Math.sin(t * 0.7 + c.x) * 0.03; B.jaw.rotation.x = 0.25;
      lightBody(c.b, world, 1.3);
    }
    if (inWardC && walker.pos.x > cx(17) && once('wardc')) { say1('wardc', 0.5); for (const c of seated) sound.breathAt(P3(c.x, c.y, 1.2), 0.18, 1.2, 500 + Math.random() * 200); }
    // the stair door: locked
    if (!st.sawStairDoor && near(46, 12, 2.2)) { st.sawStairDoor = true; if (!G.items.has('stairKey')) say1('stairDoor', 0.2); }
    // the larder: the body on the hook, and what happens when you take the key
    { const hx = cx(33.0), hz = cz(7.0); const top = 3.2;   // he hangs right beside the slab with the key on it
      if (near(33, 7, 14) && !st.female) {
        hook.root.visible = true; hookRope.visible = true; hookRope.position.set(hx, top - 0.28, hz);
        if (!S.hookT) { pose(hook, 'hang', 0); hook.root.position.set(hx, top - 0.25 - 1.95 * hook.s, hz); hook.root.rotation.set(0, Math.PI + Math.sin(t * 0.5) * 0.08, 0); }
        else { const k = S.hookT += dt; pose(hook, 'grab', t, { k: Math.min(1, k * 3), mouth: 0.8 }); hook.root.position.set(hx, top - 0.25 - 1.95 * hook.s, hz); hook.root.rotation.set(0, Math.atan2(walker.pos.x - hx, walker.pos.z - hz), Math.sin(k * 20) * 0.08 * Math.max(0, 1 - k)); hook.bones.head.rotation.x = 0.5 * Math.sin(k * 30) * Math.max(0, 1 - k / 2);
          // and its belly gives out
          if (k > 0.6) { spill.visible = true; spill.children.forEach((m, i) => { const n = Math.min(12, Math.floor((k - 0.6) * 20)); const pts = []; for (let j = 0; j < n; j++) pts.push(new V(hx + Math.sin(i * 2.1 + j * 0.3) * 0.12, top - 1.4 - j * 0.12 + Math.max(0, j * 0.12 - 1.4) * 0.9, hz + Math.cos(i * 1.7 + j * 0.2) * 0.1 + Math.max(0, j - 11) * 0.1)); grow(m, pts.map((p) => p.setY(Math.max(0.03, p.y)))); }); }
          if (k > 0.65 && once('spill')) { sound.squelch(new V(hx, 1, hz), 1.6); sound.burst(new V(hx, 0.3, hz), { f: 300, q: 0.7, dur: 0.6, gain: 0.8, brown: true }); caption('It all comes out of him. It’s warm on your shoes.', 3.5); } }
        lightBody(hook, world, 1.2); if (S.hookT && S.hookT < 1.4) { const st = Math.sin(S.hookT * 60) > -0.3 ? 0.5 : 0.15; hook.mat.userData.uAmb.value.setRGB(st, st * 0.92, st * 0.85); }
      } else { hook.root.visible = false; hookRope.visible = false; }
      if (G.items.has('stairKey') && !S.hookT && near(32, 7, 3.2)) { S.hookT = 0.001; sound.jump('scare'); sound.scream(new V(hx, 1.8, hz), 1.3); horrors.glitchKick(2); horrors.staticBurst(0.12); walker.shake = 1.2; horrors.heard(hx, hz, 16); }
    }
    // the cistern: the water, and the body that drifts into you
    if (near(21, 28.5, 16) && !st.female) {
      makeLoop('water', 6, water, P3(21, 28.5, 0.3), 0.28, { ref: 4 });
      if (!S.float && near(17, 28, 6)) S.float = { x: cx(24), z: cz(27.2), t: 0 };
      if (S.float) { const f = S.float; f.t += dt; const dx = walker.pos.x - f.x, dz = walker.pos.z - f.z, d = Math.hypot(dx, dz); if (d > 0.6) { f.x += dx / d * dt * 0.45; f.z += dz / d * dt * 0.45; } laid(floater, f.x / C - 0.5, f.z / C - 0.5, Math.atan2(dx, dz), 0.22 + Math.sin(f.t * 1.3) * 0.03, t); floater.root.position.set(f.x, 0.22 + Math.sin(f.t * 1.3) * 0.03, f.z); lightBody(floater, world, 1);
        if (d < 0.9 && once('bump')) { sound.burst(walker.pos.clone().setY(0.3), { f: 400, q: 0.8, dur: 0.5, gain: 0.6, brown: true }); walker.shake = 0.6; caption('Something soft bumps against your legs. It’s a face.', 3.5); horrors.glitchKick(0.8); } }
    } else { floater.root.visible = false; loopGain('water', 0, 0.8); }
    if (near(21, 28.5, 16) && !st.female) loopGain('water', 0.28, 0.6);

    // ======== the women's ward
    if (st.female && !st.disturbed && built.female === true) {
      // the sleepers; walk in and they all sit up and hush you
      const inDorm = walker.pos.x > cx(57.5) && walker.pos.x < cx(74.5) && walker.pos.z < cz(13.5);
      if (inDorm && !S.hush && once('hush')) S.hush = { t: 0 };
      for (const sl of sleepers) {
        if (!near(66, 8, 16)) { sl.b.root.visible = false; continue; }
        laid(sl.b, sl.x, sl.y + (sl.yaw ? 0.75 : -0.75), sl.yaw, 0.64, t); sl.b.root.position.set(cx(sl.x), floorAt(cx(sl.x), cz(sl.y)) + 0.64, cz(sl.y) + (sl.yaw ? 0.95 : -0.95));
        let up = 0; if (S.hush) { const k = S.hush.t; up = k < 0.25 ? k / 0.25 : k < 3.2 ? 1 : Math.max(0, 1 - (k - 3.2) / 0.6); }
        const B = sl.b.bones; B.spine.rotation.x = -1.3 * up; B.chest.rotation.x = -0.25 * up; B.neck.rotation.y = up * Math.max(-1, Math.min(1, Math.atan2(walker.pos.x - cx(sl.x), walker.pos.z - cz(sl.y)) * 0.5)); B.jaw.rotation.x = 0.1 * up; lightBody(sl.b, world, 1.3 + up * 2.5);
      }
      if (S.hush) { S.hush.t += dt; if (S.hush.t > 0.2 && once('hushS')) { for (const sl of sleepers) sound.burst(P3(sl.x, sl.y, 1.0), { f: 3800 + Math.random() * 600, q: 0.8, dur: 2.2, gain: 0.32, a: 0.2, verb: 0.5 }); sound.jump('scare'); horrors.glitchKick(2.2); horrors.staticBurst(0.06); walker.shake = 1.2; caption('Shhhhhhhhhhh.', 3); } }
      // the woman in the bath, pulling hair out of her mouth; get close and it all comes up
      if (near(60, 22, 12)) {
        stand(bather, 60, 22, Math.PI / 2, 'slump', t); bather.root.position.set(cx(60) - 0.4, floorAt(cx(60), cz(22)) + 0.12, cz(22)); bather.root.rotation.y = Math.PI / 2; const B = bather.bones;
        B.Rupper.rotation.x = -2.2; B.Rfore.rotation.x = -1.5 - Math.max(0, Math.sin(t * 2.2)) * 0.5; B.jaw.rotation.x = 0.5; lightBody(bather, world, 1.3);
        const mouth = new V(); B.jaw.getWorldPosition(mouth); mouth.y += 0.02;
        if (!S.retch && near(60, 22, 2.4)) S.retch = { t: 0 };
        const len = S.retch ? Math.min(40, Math.floor(S.retch.t * 14)) : 6 + Math.floor((Math.sin(t * 2.2) * 0.5 + 0.5) * 4);
        const pts = []; for (let j = 0; j < len; j++) pts.push(mouth.clone().add(new V(0.04 + j * 0.03 * (S.retch ? 1 : 0.4), -j * (S.retch ? 0.035 : 0.012) + Math.sin(j * 0.9) * 0.02, Math.sin(j * 0.7) * 0.05)).setY(Math.max(floorAt(mouth.x, mouth.z) + 0.6, mouth.y - j * (S.retch ? 0.035 : 0.012))));
        grow(hair, pts); hair.visible = true;
        if (S.retch) { S.retch.t += dt; B.spine.rotation.x = 0.3 + Math.sin(S.retch.t * 9) * 0.15; B.jaw.rotation.x = 0.9; if (once('retch')) { for (let i = 0; i < 5; i++) sound.voiceSynth(P3(60, 22, 1), { f0: 140, f1: 90, dur: 0.35, vowels: ['uh', 'a'], rough: 0.9, breath: 0.6, gain: 0.7, delay: i * 0.45 }); caption('It keeps coming. Black hair, wet, yards of it.', 4); } if (S.retch.t > 3 && once('retchScream')) { sound.jump('scare'); walker.shake = 1.2; sound.scream(P3(60, 22, 1.2), 1.2); horrors.glitchKick(1.2); horrors.heard(cx(60), cz(22), 14); } }
      } else { bather.root.visible = false; hair.visible = false; }
      // Kelly at her sewing, a girl in the chair; she hears you, and the ward is hers
      if (!S.sewDone && near(80, 8, 14)) {
        stand(kellyD, 80, 6.6, 0, 'idle', t, { calm: true }); kellyD.bones.Rupper.rotation.x = -0.9 + Math.sin(t * 5) * 0.15; kellyD.bones.Rfore.rotation.x = -1.2; kellyD.bones.neck.rotation.x = 0.35; lightBody(kellyD, world, 1.3);
        sit(sewn, 80, 8.2, Math.PI, t); sewn.bones.Lupper.rotation.x = -0.2; sewn.bones.head.rotation.x = -0.25 + Math.sin(t * 7) * 0.04; lightBody(sewn, world, 1.3);
        if (Math.random() < dt * 1.5) sound.voiceSynth(P3(80, 8.2, 1.2), { f0: 320, f1: 260, dur: 0.6, vowels: ['m', 'm'], breath: 0.6, gain: 0.25 });
        if (near(80, 8, 5.5) && sees(80, 7, 6) && once('sew')) {
          S.sewDone = true; kellyD.root.visible = false; sewn.root.visible = true; caption('She’s sewing the girl’s mouth shut. She stops. She’s seen you.', 3);
          const h = horrors.hunter; if (h && h.kind === 'matron') { h.active = true; h.body.root.visible = true; h.pos.set(cx(80), 0, cz(6.6)); h.yaw = Math.atan2(walker.pos.x - h.pos.x, walker.pos.z - h.pos.z); h.state = 'spot'; h.spotT = 0; h.aware = 1.5; }
        }
      } else if (S.sewDone && near(80, 8, 14)) { sit(sewn, 80, 8.2, Math.PI, t); sewn.bones.head.rotation.x = 0.3; sewn.bones.Rupper.rotation.x = -2.4; sewn.bones.Rfore.rotation.x = -1.6; lightBody(sewn, world, 1.3); }
      else { kellyD.root.visible = false; sewn.root.visible = false; }
      if (!st.sawWardDoor && near(85, 32, 2.2)) { st.sawWardDoor = true; if (!G.items.has('wardKeys')) say1('wardDoor', 0.2); }
      if (near(71, 17, 1.8) && !G.items.has('officeKey')) say1('officeLocked', 0.2);
    } else { for (const sl of sleepers) sl.b.root.visible = false; bather.root.visible = false; hair.visible = false; kellyD.root.visible = false; sewn.root.visible = false; }
    dolly.visible = babies[0].visible = st.female && !st.offices; for (const b of babies) b.visible = dolly.visible;

    // ======== the disturbed ward
    if (st.disturbed && !st.offices && built.disturbed === true) {
      // fists on the strong-room doors as you go by
      if (!st.release && walker.pos.z < cz(46.5) && Math.random() < dt * 1.2) { const cands = doors.list.filter((d) => d.cell && d.y === 43 && d.locked && Math.abs(d.wx - walker.pos.x) < 9); const d = cands[(Math.random() * cands.length) | 0]; if (d) { sound.door(d, 'slam', d.wx, d.wz); sound.thud(new V(d.wx, 1.2, d.wz), 0.6); d.bang = 1; } }
      for (const d of doors.list) if (d.bang) { d.bang = Math.max(0, d.bang - dt * 4); d.mesh.rotation.y = d.angle + Math.sin(d.bang * 40) * 0.03 * d.bang; }
      // the man eating his fingers
      if (near(91.6, 49, 10)) { sit(eater, 91.6, 49, -Math.PI / 2, t); const B = eater.bones; B.Rupper.rotation.x = -1.7; B.Rfore.rotation.x = -2.0; B.jaw.rotation.x = 0.2 + Math.abs(Math.sin(t * 7)) * 0.25; B.head.rotation.x = 0.25; lightBody(eater, world, 1.3);
        if (Math.random() < dt * 2) sound.voice('eater', 'chew', P3(91.6, 49, 0));
        if (near(91.6, 49, 2.3) && once('fingers')) { B.Rupper.rotation.x = -1.2; sound.jump('sting'); speak('PATIENT 9', 'Hungry? They’re good. They’re still warm. I saved you the thumb.', 120, 5); horrors.glitchKick(0.8); }
      } else eater.root.visible = false;
      // the hole: whispering in the dark, and on the way out a hand on your ankle
      if (near(61.5, 57, 5)) { makeLoop('whisper', 5, whisper, P3(61.5, 57, 1), 0.35, { ref: 1 }); loopGain('whisper', 0.35, 0.3); if (near(61.5, 57.5, 1.5)) S.inHole = true; } else loopGain('whisper', 0, 0.5);
      if (S.inHole && near(61, 59.5, 1.0) && once('ankle')) { walker.shake = 1.2; horrors.glitchKick(1.6); sound.jump('scare'); sound.voiceSynth(P3(61, 58.5, 0.3), { f0: 600, f1: 300, dur: 1.0, vowels: ['i', 'a'], rough: 0.9, gain: 0.9 }); caption('Something grabs your ankle in the dark. It lets go.', 3); }
      if (!st.sawBooth && near(58, 50, 2.4)) { st.sawBooth = true; say1('booth', 0.2); }
      if (st.release) { wakePack(false); for (const d of doors.list) if (d.lock === 'release') d.locked = false; }
    } else { eater.root.visible = false; loopGain('whisper', 0, 0.5); }

    // ======== the offices
    if (st.offices && !st.exam) {
      // the phone at the switchboard rings for Dawes
      if (!S.answered && near(19, 59, 9)) { if (!S.ringing && !S.rang) { S.ringing = true; S.rang = true; makeLoop('phone', 6, phone, P3(19, 55.8, 1), 0.4, { ref: 1.5 }); loopGain('phone', 0.4, 0.05); } }
      if (S.ringing && !near(19, 59, 14)) { S.ringing = false; loopGain('phone', 0, 0.2); }
      // a typewriter typing by itself; look at it and it stops
      if (near(14, 46.5, 9) && !S.typed) { const look = Math.atan2(cx(14) - walker.pos.x, cz(46.5) - walker.pos.z); const fwd = Math.atan2(-Math.sin(walker.yaw), -Math.cos(walker.yaw)); const off = Math.abs(((look - fwd + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (off > 0.6) { if (Math.random() < dt * 9) sound.burst(P3(14, 46.5, 0.85), { f: 2400 + Math.random() * 800, q: 3, dur: 0.025, gain: 0.35, verb: 0.3 }); if (Math.random() < dt * 0.8) sound.clang(P3(14, 46.5, 0.85), 1800, 0.08, 0.15); }
        else if (near(14, 46.5, 4)) { S.typed = true; caption('The typing stops the moment you look at it.', 3); } }
      if (!st.sawDirector && near(38, 51, 2.0) && !G.items.has('directorKey')) { st.sawDirector = true; say1('director', 0.2); }
    }

    // ======== the examining rooms
    if (st.exam && !st.boiler && built.exam === true) {
      // the ECT bed: the machine runs on its own, the man on it bucks
      if (near(8, 80, 10)) { laid(ectMan, 8, 80, Math.PI / 2, 0.64, t); ectMan.root.position.set(cx(8), floorAt(cx(8), cz(80)) + 0.64, cz(80)); const B = ectMan.bones; const z = Math.sin(t * 40) > 0.3 ? 1 : 0.3; for (const n of ['spine', 'chest', 'Lupper', 'Rupper', 'Lthigh', 'Rthigh', 'neck']) B[n].rotation.x += (Math.random() - 0.5) * 0.25 * z; B.jaw.rotation.x = 0.5 * z; lightBody(ectMan, world, 1.3 + z * 0.8);
        if (Math.random() < dt * 6) sound.burst(P3(8, 78, 1), { f: 4000, q: 2, dur: 0.05, gain: 0.25 }); if (Math.random() < dt * 0.8) sound.tone(P3(8, 78, 1), { f: 120, dur: 0.6, gain: 0.15, type: 'sawtooth' }); } else ectMan.root.visible = false;
      // the continuous bath: she comes up out of it
      if (near(12, 87.5, 9)) { const up = S.drown ? Math.min(1, S.drown.t * 4) : 0; stand(drowned, 12, 87.5, 0, 'slump', t); drowned.root.position.set(cx(12), floorAt(cx(12), cz(87.5)) + 0.05 + up * 0.25, cz(87.5) - 0.6); drowned.bones.spine.rotation.x = -0.6 * up; drowned.bones.Rupper.rotation.x = -2.5 * up; drowned.bones.Lupper.rotation.x = -2.2 * up; drowned.bones.jaw.rotation.x = 0.7 * up; lightBody(drowned, world, 1.3 + up * 3);
        if (!S.drown && near(12, 87.5, 2.2)) { S.drown = { t: 0 }; sound.jump('scare'); horrors.staticBurst(0.06); sound.burst(P3(12, 87.5, 0.5), { f: 600, q: 0.6, dur: 0.9, gain: 0.9, brown: true }); sound.voiceSynth(P3(12, 87.5, 1), { f0: 280, f1: 400, dur: 1.4, vowels: ['a', 'i'], rough: 0.8, breath: 0.7, gain: 0.9, delay: 0.2 }); horrors.glitchKick(1.6); walker.shake = 0.9; caption('She comes up out of the water, gasping. She’s been under for years.', 3.5); horrors.heard(cx(12), cz(87.5), 12); }
        if (S.drown) S.drown.t += dt; } else drowned.root.visible = false;
      // the dentist's chair: pulling his own teeth, one at a time
      if (near(29, 88, 9)) { sit(dentist, 29, 88, Math.PI / 2, t, 0.62); const B = dentist.bones; B.spine.rotation.x = -0.4; B.Rupper.rotation.x = -2.1; B.Rfore.rotation.x = -1.4 - Math.max(0, Math.sin(t * 1.3)) * 0.4; B.jaw.rotation.x = 0.6; lightBody(dentist, world, 1.3);
        if (Math.sin(t * 1.3) > 0.97 && !S.crackT) { S.crackT = 1; sound.burst(P3(29, 88, 1.2), { f: 1800, q: 4, dur: 0.04, gain: 0.5 }); sound.squelch(P3(29, 88, 1.2), 0.5); } if (Math.sin(t * 1.3) < 0.5) S.crackT = 0;
        if (near(29, 88, 2.2) && once('teeth')) speak('THE PATIENT', 'For the doctor. He wants to know if it’s kept in the teeth. Do you want to help? You have lovely teeth.', 160, 5);
      } else dentist.root.visible = false;
      // into the theater: Voss is waiting
      if (!st.captured && walker.pos.x > cx(34.6) && walker.pos.z > cz(76.6) && walker.pos.z < cz(90.6)) capture();
      if (!st.sawChain && near(46, 86, 2.4)) { st.sawChain = true; if (!G.items.has('cutters')) say1('chain', 0.2); }
    }
    // the capture itself
    if (S.cap && S.cap.on) {
      const c = S.cap; c.t += dt; if (G.struggle < 1) G.struggle = Math.max(0, G.struggle - dt * 0.07);   // (a full bar stays full)
      const head = new V();
      // Voss over you; Marsh on the next table
      // Voss leans in over your face from the side of the table: his head right over yours, looking down into your eye
      const cam0 = ctx.camera; cam0.getWorldPosition(head); const lean = Math.min(1, c.t / 3);
      const side = new V(-1, 0, 0.35).normalize(); const fl = floorAt(head.x, head.z);
      stand(vossA, 0, 0, 0, 'idle', t, { calm: true }); const VB = vossA.bones; VB.spine.rotation.x = 0.75 * lean; VB.chest.rotation.x = 0.35 * lean; VB.neck.rotation.x = 0.55 * lean; VB.head.rotation.x = 0.35 * lean + Math.sin(t * 0.8) * 0.04; VB.head.rotation.z = Math.sin(t * 0.5) * 0.08;
      VB.Rupper.rotation.set(-1.2 - Math.min(1, Math.max(0, c.t - 8) / 14) * 0.5, 0, 0.3); VB.Rfore.rotation.x = -0.9; VB.Lupper.rotation.set(-2.4, 0, -0.4); VB.Lfore.rotation.x = -0.6 + Math.sin(t * 2.2) * 0.1 * Math.min(1, c.t / 10);   // the mallet hand, up
      const yawIn = Math.atan2(-side.x, -side.z); vossA.root.rotation.set(0, yawIn, 0); vossA.root.position.set(0, fl, 0); vossA.root.updateMatrixWorld(true);
      const hp = VB.head.getWorldPosition(new V()); const wantH = head.clone().addScaledVector(side, 0.05 + 0.25 * (1 - lean));
      vossA.root.position.set(wantH.x - hp.x, fl, wantH.z - hp.z); vossA.root.updateMatrixWorld(true); lightBody(vossA, world, 1.6);
      mallet.visible = c.t > 6; VB.Lhand.getWorldPosition(mallet.position); mallet.rotation.set(0.3, yawIn, 1.2);
      laid(marsh, 39.5, 87.2, Math.PI, 0.93, t); marsh.bones.neck.rotation.y = -0.8 + Math.sin(t * 9) * 0.05 * Math.min(1, c.t / 6); lightBody(marsh, world, 1.4);
      // the pick comes down toward your left eye
      const cam = ctx.camera; cam.getWorldPosition(head); const q = cam.getWorldQuaternion(new THREE.Quaternion());
      const k = Math.min(1, Math.max(0, (c.t - 9) / 13)); const ease = k * k * (3 - 2 * k); const toEye = new V(-0.03, -0.012, -1).applyQuaternion(q); const sideV = new V(0.25, 0.12, 0).applyQuaternion(q);
      pick.visible = c.t > 7; pick.scale.set(0.7, 0.7, 1.4); pick.position.copy(head).addScaledVector(toEye, 0.36 - ease * 0.33).addScaledVector(sideV, 1 - ease); pick.lookAt(head.clone().addScaledVector(new V(-0.03, -0.012, 0).applyQuaternion(q), 1));
      ctx.setFade(Math.max(0, (k - 0.55) * 0.5 * (0.6 + 0.4 * Math.sin(t * (6 + k * 10)))));   // the edges of the picture going dark with your pulse
      if (c.t > 0.5 && once('cap1')) { sound.voice('surgeon', 'idle', P3(39, 83, 0)); }
      if (c.t > 2.5 && once('cap2')) speak('DR. VOSS', 'Ah. You’re awake. Good. Keep the camera running. I want to see it from your side.', 120, 5.5);
      if (c.t > 8 && once('cap3')) speak('MARSH', 'Ward... Ward, it’s me. Jamie Marsh. I didn’t send that letter. HE did. I’m sorry. FIGHT IT!', 175, 5.5);
      if (c.t > 9 && once('cap4')) caption(ctx.vr() ? 'MASH ANY BUTTON. BREAK THE STRAPS.' : 'MASH ANY KEY. BREAK THE STRAPS.', 4);
      if (c.t > 14 && once('cap5')) speak('DR. VOSS', 'Front first. Hold still. Hold STILL. There it is. I can almost see it.', 120, 5);
      if (c.t > 9 && Math.random() < dt * (1 + k * 4)) sound.breathAt(null, 0.2 + k * 0.4, 0.4, 300);
      if (k > 0.2) walker.shake = Math.max(walker.shake, k * 0.4);
      if (G.struggle >= 1) captureFree();
      else if (c.t > 22.5 && !c.dead) {   // too slow: in it goes
        c.dead = true; sound.squelch(null, 2); sound.burst(null, { f: 900, q: 3, dur: 0.12, gain: 1 }); sound.jump('kill'); horrors.staticBurst(1.2); horrors.glitchKick(3); walker.shake = 2;
        caption('...', 2); later(() => { S.cap.on = false; G.strapped = false; walker.unhide(); walker.hurt(999); pick.visible = false; mallet.visible = false; vossA.root.visible = false; ctx.setFade(0); marsh.root.visible = false; st.captured = false; S.beats.delete('cap1'); S.beats.delete('cap2'); S.beats.delete('cap3'); S.beats.delete('cap4'); S.beats.delete('cap5'); }, 600);
      }
    } else if (st.captured && !st.boiler && near(39.5, 87.2, 12)) { laid(marsh, 39.5, 87.2, Math.PI, 0.93, t); marsh.bones.neck.rotation.y = -0.6; lightBody(marsh, world, 1.4); if (near(39.5, 87.2, 1.8) && once('marsh2')) speak('MARSH', 'Go. Don’t untie me. If I get up he’ll only put me back. Burn it, Ward. Open the valves. Burn it all.', 175, 6); }
    else if (!S.cap || !S.cap.on) { vossA.root.visible = false; if (st.boiler || !st.exam) marsh.root.visible = false; }

    // ======== the boiler house
    if (st.boiler && built.boiler === true) {
      makeLoop('furnace', 5, roar, P3(82.5, 73.5, 0.9), 0.5, { ref: 2.5, roll: 0.9 });
      if (near(82.5, 76, 8) && once('furnaceScream')) { sound.scream(P3(82.5, 73, 0.9), 0.8); caption('Someone inside the furnace is still screaming.', 3.5); }
      // the pile in the coal store comes down when you open the last valve there
      if (S.slide) { const k = S.slide.t += dt; pile.forEach((b, i) => { const kk = Math.min(1, Math.max(0, (k - i * 0.25) / 0.7)); stand(b, 94.6 - i * 0.4, 82 + i * 0.5, i * 1.3, 'lie', t); b.root.rotation.set(-Math.PI / 2 * kk, i * 1.3, 0.4 * (1 - kk)); b.root.position.set(cx(94.6 - kk * 1.2 - i * 0.3), floorAt(cx(94), cz(82)) + 2.4 * (1 - kk * kk) + 0.1, cz(82.6 + i * 0.4 + kk * 0.8)); lightBody(b, world, 1.2); if (kk >= 1 && !b.landed) { b.landed = true; sound.thud(b.root.position.clone().setY(0.3), 1.1); sound.squelch(b.root.position.clone().setY(0.3), 0.8); walker.shake = 0.9; } });
        if (k > 0.6 && once('pileCap')) caption('The pile comes down on you. Cold, soft, heavy. You’re under them.', 3.5); }
      if (st.finale && !st.blown) { st.boom -= dt; if (st.boom < 30 && once('boomWarn')) caption('The drums are screaming. Thirty seconds.', 3); if (st.boom <= 0) { explode(); later(() => { if (!G.escaped) walker.hurt(999); }, 900); } }
      if (st.power && near(plan.exit.x, plan.exit.y, plan.exit.r) && !G.escaped) { G.escaped = true; st.out = true; explode(); later(() => ctx.ending(), 2600); }
    }
    if (flash.intensity > 0) flash.intensity = Math.max(0, flash.intensity - dt * 18);
  }

  return {
    interactables: inter,
    busy: () => false,
    // for tools (the trailer): everything in the set pieces, built now
    get dev() { return { S, capture, release, powerUp, explode, valves, seated, sleepers, dolly, babies, pick, mallet, vossA, marsh, bather, hair, hook, hookRope, spill, slabMan, slabGuts, floater, waterPlane, kellyD, sewn, eater, ectMan, drowned, dentist, pile, flash, grow, laid, sit, stand, buildAll: () => { for (const k of ORDER) want(k); while (bq.length) bq.shift()(); } }; },
    strapLabel: () => 'Struggle! ' + bar(G.struggle || 0),
    struggle() { if (!G.strapped) return; G.struggle = Math.min(1, (G.struggle || 0) + 0.045); walker.shake = Math.max(walker.shake, 0.35); sound.burst(null, { f: 500, q: 1, dur: 0.08, gain: 0.25, brown: true }); },
    start() { setTimeout(() => say('start'), 1500); const d = doors.at(4, 1); if (d) { d.locked = true; d.target = 0; d.angle = 0; d.mesh.rotation.y = 0; } this.openWardC(); },
    // Ward C's cells stand open: there's nothing in them that could leave
    openWardC() { const wr = doors.at(14, 10); if (wr && !G.t4.vossLoose) { wr.locked = false; wr.target = wr.angle = 1.55; wr.mesh.rotation.y = wr.angle; }   // his door stands open: the light, the radio, the saw
      for (const d of doors.list) if (d.cell && d.x < 44 && (d.y === 17 || d.y === 20)) { d.locked = false; d.target = d.angle = (d.y === 17 ? 1.5 : -1.5); d.mesh.rotation.y = d.angle; } },
    // what goes in the save
    serialize: () => ({ ...G.t4, power: G.power }),
    restore(d) {
      G.t4 = { valves: 0, ...(d.t4 || {}) }; const st = G.t4; delete st.blown; delete st.boom; delete st.finale; delete st.out;
      if (st.captured && !st.boiler && !G.items.has('cutters')) { /* you got free: carry on */ }
      if (st.release) { for (const dd of doors.list) if (dd.y >= 37 && dd.y <= 68 && dd.x >= 52) { dd.locked = false; } }
      if (st.chainCut) { const dd = doors.at(46, 86); if (dd) dd.locked = false; }
      valves.forEach((v, i) => { v.open = i < (st.valves || 0); });
      if (st.power) { st.power = false; G.power = false; }   // the turbine has to be started again: the minute and a half starts over
      for (const k of ['female', 'disturbed', 'offices', 'exam', 'boiler', 'radio']) if (st[k]) S.beats.add(k); this.openWardC();
    },
    update(dt, I) { update(dt, I); },
  };
}

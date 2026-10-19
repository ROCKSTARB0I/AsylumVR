// Testing Site 1: Containment. 2 November 1993, the night after Mount Harrow burned. D. Reyes, a contract
// engineer, is sent out to Site 7 in the Nye County desert because the annex stopped reporting. The camcorder
// is for the insurance report. What the asylum grew down here is out of its tanks.
import * as THREE from '../vendor/three.module.js';
import { cx, cz, C, H, floorAt, ceilOf } from './plan.js?v=38';
import { makeBody, pose } from './carcass.js?v=38';
const V = THREE.Vector3;

// ------------------------------------------------------------------ the documents
export const NOTES = {
  n5_guard: { t: 'Night log, guard shack', b: `NOV 1 — 22:10. No word from Mount Harrow since the evening. The phone line to the asylum is dead.\n23:40. Something moving on the far side of the compound. Low. Fast. Too fast for a coyote.\n00:15. It went under the generator hut.\n00:20. The generator hut is quiet now. The generator is off.\nI am not going out there.\nGATE CARD in the drawer.` },
  n5_reception: { t: 'Visitor sign-in sheet', b: `MOUNT HARROW RESEARCH ANNEX — SITE 7\nVisitors 1993:\n  Dr. A. Voss — monthly — "specimen review"\n  Dr. A. Voss — monthly\n  Dr. A. Voss\n  Dr. A. Voss\nThe last entry is October. The column for "purpose of visit" just says: GRAFTS.` },
  n5_security: { t: 'Security protocol card', b: `IN THE EVENT OF A CONTAINMENT FAILURE\n1. The site seals itself. All exits lock.\n2. Do not attempt to leave by the lift.\n3. The lockdown can only be lifted from the B2 observation gallery.\n4. Lifting the lockdown also opens the Pit.\n5. Do not lift the lockdown.` },
  n5_tanks: { t: 'Tank hall readout, printed', b: `GROWTH ROW A–C: 18 TANKS\nSkitterer line (S-3): 6 viable. Fast. Pack instinct. Responds to sound.\nNote (A.V.): they were patients once. All of these were patients once. Don't name them. The orderlies keep naming them.` },
  n5_memo: { t: 'Memo, B1 offices', b: `TO ALL STAFF\nThe genetics lab key is kept in Dr. Ames’ desk, not on the board. Too many of you have been going in at night to look at the cryo line.\nThey are not people any more. Stop talking to them.\nThey don’t talk back. That’s not the problem. The problem is they listen.` },
  n5_genetics: { t: 'Lab notebook, genetics', b: `The protocol (Mount Harrow) removes what a person doesn’t need. Here we add what they do.\nArms. Length. Hearing. A second spine.\nLongarm (L-1): blind, 2.6 m, can hear a heartbeat at forty metres. It walks B1 at night. Don’t run near it. Walking is fine. Running is how it finds you.\nB2 card stays here. Do NOT take it during a growth cycle.` },
  n5_storage: { t: 'Specimen storage tag', b: `B-2 (“Bloater”). Sleeps 20 hrs a day. Wakes hungry. Wakes LOUD.\nDo not wake it.\nIf it wakes, do not let it get between you and the door. It is slow. It is very hard to stop.` },
  n5_nursery: { t: 'Nursery feeding chart', b: `LARVAL STOCK — VATS 1–4\nFeed: twice daily. Feed: what’s left from dissection.\nThey eat fast. They follow warmth.\nIf the vats breach: RUN. They can’t climb. They can’t keep up with a running adult. They can keep up with a walking one.` },
  n5_dissection: { t: 'Dissection report', b: `SUBJECT: hollowhead (H-type). Skull opened at stage 4 to observe the protocol’s effect.\nRESULT: subject screams on sight of anything warm. Every specimen in range comes to the scream.\nNOTE: one of the cadavers on the floor in here was not a cadaver. We have not found out which. Keep the room locked.` },
  n5_cryo: { t: 'Cryo log', b: `CRYO LINE — 10 PODS\nAll staff transferred from Mount Harrow, Oct 1989, are held here for later use.\nPod 7 woke up on its own last week. It got as far as the ceiling.\nThey hang up there. They wait. They drop.` },
  n5_gallery: { t: 'Observation gallery: the Pit', b: `SUBJECT ZERO\nThe first. Rourke’s brother? (unconfirmed). Grown for 4 years. 2.9 m and rising.\nIt does not sleep. It watches the glass.\nThe lockdown release on this desk opens the emergency exit AND the Pit door. They’re on the same circuit. Whoever designed that should be in the Pit.` },
  n5_bay: { t: 'Note taped to the bay door switch', b: `If you’re reading this you lifted the lockdown.\nThe bay door is on this switch. The truck has fuel. The road goes north.\nDon’t stop at Mount Harrow. There’s nothing left at Mount Harrow.\n— whoever’s still alive` },
};
export const MUTTER = {
  start: 'Site 7. Nobody’s answering the gate. The guard shack’s light is on.',
  gateCard: 'A gate card. In the drawer, like the log said.',
  inside: 'The power’s on down there. Somebody’s still running the place. ...Hello?',
  b1: 'Tanks. Rows of them. There are people in the tanks.',
  labKey: 'The genetics key. Ames’ desk.',
  b2Card: 'The B2 card. ...What’s that alarm?',
  burst: 'The tanks. THE TANKS ARE BREAKING.',
  b2: 'B2. Containment. It’s colder down here.',
  zero: 'Oh no. Oh no, the Pit’s open. RUN.',
  exitArea: 'Stairs up. Up, up, up.',
  bayOpen: 'The bay door. The road. GO.',
  hide: 'Don’t breathe. Don’t breathe.',
};
export const OBJECTIVES = [
  { id: 'card', text: 'Site 7’s doors are locked. Check the guard shack', done: (s) => s.items.has('gateCard') },
  { id: 'inside', text: 'Get inside Site 7 (the doors, south)', done: (s) => s.t5.inside },
  { id: 'down', text: 'Take the stairs down to B1 (east end of the hall)', done: (s) => s.t5.b1 },
  { id: 'labKey', text: 'Genetics is locked. Find its key in the B1 offices', done: (s) => s.items.has('labKey') },
  { id: 'b2Card', text: 'Get the B2 keycard from Genetics', done: (s) => s.items.has('b2Card') },
  { id: 'b2', text: 'Get down to B2: the stairs off the storage corridor', done: (s) => s.t5.b2 },
  { id: 'release', text: 'Every exit is sealed. Lift the lockdown from the observation gallery', done: (s) => s.t5.release },
  { id: 'run', text: 'RUN — the emergency stairs, east', done: (s) => s.t5.exitArea },
  { id: 'bay', text: 'Open the vehicle bay door', done: (s) => s.t5.bayOpen },
  { id: 'out', text: 'GET OUT', done: (s) => s.escaped },
];
export const ITEM_LABEL = { gateCard: 'Take the gate card', labKey: 'Take the key', b2Card: 'Take the keycard' };
export const LOCK_NAME = { gateCard: 'the gate card', labKey: 'the genetics key', b2Card: 'the B2 keycard', lockdown: 'sealed: the lockdown', pit: 'sealed', bay: 'the bay switch', never: 'the lift is dead' };
export const ENDING_TEXT = [
  'The truck came up out of the bay into a red dawn, and you drove north with the lights off until the compound was a speck in the mirror.',
  'Site 7 was filled with concrete by the state in the spring of 1994. The report lists eighteen growth tanks, ten cryo pods, and "one structure of unknown purpose (the Pit)."',
  'It lists the specimens as destroyed. It does not say how many were counted.',
];
export const ENDING = (G, timecode, notesN) => `<div class="end"><p class="kicker">Mount Harrow Research Annex &middot; Site 7, Nevada &middot; November 1993</p><h1 class="logo">END OF TESTING SITE 1</h1><p class="lede">${ENDING_TEXT.join('<br><br>')}</p><p class="kicker">Deaths ${G.deaths} &middot; Documents ${G.notes.length}/${notesN} &middot; Time ${timecode(G.t).slice(0, 8)}</p><p class="lede">Testing Site 2 is not yet recovered.</p><nav class="menu"><button onclick="location.href='?tape=5'">Replay Testing Site 1</button><button onclick="location.href='?tape=1'">Mount Harrow: Tape 1</button></nav></div>`;

// ------------------------------------------------------------------ helpers
const bar = (k) => '▮'.repeat(Math.round(k * 12)) + '▯'.repeat(12 - Math.round(k * 12));
const P3 = (x, y, h) => new V(cx(x), floorAt(cx(x), cz(y)) + h, cz(y));
const lightBody = (b, world, k = 1.2) => { b.mat.userData.uAmb.value.copy(world.lightAt(b.root.position.x, b.root.position.z)).multiplyScalar(k); };
// curled up, floating: how they wait in the tanks
function fetal(b, t, s = 0) { pose(b, 'idle', t, { calm: true }); const B = b.bones; B.spine.rotation.x = 0.6; B.chest.rotation.x = 0.3; B.neck.rotation.x = 0.4; B.Lthigh.rotation.x = -1.5; B.Rthigh.rotation.x = -1.4; B.Lshin.rotation.x = 2.0; B.Rshin.rotation.x = 1.9; B.Lupper.rotation.set(-1.0, 0, 0.3); B.Rupper.rotation.set(-1.1, 0, -0.3); B.Lfore.rotation.x = -1.6; B.Rfore.rotation.x = -1.5; B.head.rotation.z = Math.sin(t * 0.4 + s) * 0.1; }

export function setupTape5(ctx) {
  const { G, walker, plan, world, sound, horrors, doors, scene, say, caption } = ctx;
  G.t5 = {}; const s = () => G.t5;
  const S = { t: 0, beats: new Set() };
  const once = (id) => { if (S.beats.has(id)) return false; S.beats.add(id); return true; };
  const near = (x, y, r) => Math.hypot(walker.pos.x - cx(x), walker.pos.z - cz(y)) < r;
  const inRect = (x0, y0, x1, y1) => { const gx = walker.pos.x / C, gy = walker.pos.z / C; return gx >= x0 && gx <= x1 + 1 && gy >= y0 && gy <= y1 + 1; };
  const timers = []; const later = (sec, fn) => timers.push({ at: S.t + sec, fn });
  const M = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });

  // ---- sounds made once and looped (the alarm, the guard's radio)
  const loops = {};
  async function makeLoop(name, len, fn, pos, gain) {
    if (loops[name] || !sound.ctx) return; loops[name] = 'pending';
    const SR = 22050, off = new OfflineAudioContext(1, Math.floor(SR * len), SR); fn(off, len);
    const buf = await off.startRendering(); const c = sound.ctx; const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = c.createGain(); g.gain.value = 0; src.connect(g); if (pos) sound.out(g, pos, { verb: 0.4, ref: 2, roll: 1.1 }); else g.connect(sound.vipDry);
    src.start(); loops[name] = { g }; g.gain.setTargetAtTime(gain, c.currentTime, 0.4);
  }
  const loopGain = (name, v, tc = 0.3) => { const l = loops[name]; if (l && l.g) l.g.gain.setTargetAtTime(v, sound.ctx.currentTime, tc); };
  const tonePlay = (off, f, t0, dur, g, type = 'sine') => { const o = off.createOscillator(); o.type = type; o.frequency.value = f; const e = off.createGain(); e.gain.setValueAtTime(0.0001, t0); e.gain.exponentialRampToValueAtTime(g, t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(e); e.connect(off.destination); o.start(t0); o.stop(t0 + dur + 0.05); };
  const siren = (off, len) => { for (let i = 0; i < len / 2.4; i++) { const o = off.createOscillator(); o.type = 'sawtooth'; const t0 = i * 2.4; o.frequency.setValueAtTime(380, t0); o.frequency.linearRampToValueAtTime(760, t0 + 1.2); o.frequency.linearRampToValueAtTime(380, t0 + 2.4); const g = off.createGain(); g.gain.value = 0.25; const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; o.connect(lp); lp.connect(g); g.connect(off.destination); o.start(t0); o.stop(t0 + 2.4); } };
  const radio = (off, len) => { const b = off.createBuffer(1, off.sampleRate * len, off.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.sin(i / off.sampleRate * 3) > 0.7 ? 0.5 : 0.15); const n = off.createBufferSource(); n.buffer = b; const bp = off.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; n.connect(bp); bp.connect(off.destination); n.start(); for (let t = 2; t < len; t += 4) tonePlay(off, 1000, t, 0.12, 0.2, 'square'); };

  // ------------------------------------------------------------------ the tanks
  const burstAt = plan.burst || [];
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8d0c8, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const tanks = burstAt.map(([x, y]) => {
    const base = floorAt(cx(x), cz(y)); const L = world.lightAt(cx(x), cz(y));
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.0, 24, 1, true), glassMat); glass.position.set(cx(x), base + 1.33, cz(y)); scene.add(glass);
    const fm = M(0x3f9a5c, 0.1, { transparent: true, opacity: 0.34, depthWrite: false, emissive: 0x0f5a24 }); fm.emissive.multiplyScalar(1 + L.g * 4);
    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.82, 20), fm); fluid.position.set(cx(x), base + 1.26, cz(y)); scene.add(fluid);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.3, 28), M(0x1a3a22, 0.05, { transparent: true, opacity: 0.8, depthWrite: false, emissive: 0x062a10 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(cx(x), base + 0.01, cz(y) + 0.3); puddle.scale.setScalar(0.01); puddle.visible = false; scene.add(puddle);
    const shards = new THREE.Group(); for (let i = 0; i < 14; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.06 + Math.random() * 0.12, 0.08 + Math.random() * 0.2), glassMat); sh.rotation.set(-Math.PI / 2, 0, Math.random() * 6); sh.position.set((Math.random() - 0.5) * 2.2, 0.012 + i * 0.001, 0.2 + (Math.random() - 0.3) * 2); shards.add(sh); } shards.position.set(cx(x), base, cz(y)); shards.visible = false; scene.add(shards);
    return { x, y, glass, fluid, puddle, shards, broken: false, k: 0, who: null };
  });
  // the skitterers asleep in those six
  for (const h of horrors.list) if (h.kind === 'skitter' && h.opts.dormant) { let best = null, bd = 1e9; for (const tk of tanks) { const d = Math.hypot(h.home.x - cx(tk.x), h.home.z - cz(tk.y)); if (d < bd && !tk.who) { bd = d; best = tk; } } if (best) best.who = h; }
  // and things floating in the tanks that never open
  const floaters = [[55, 6], [63, 6], [51, 10], [59, 10], [70, 14], [51, 14]].map(([x, y], i) => { const b = makeBody(i % 2 ? 'naked' : 'gown', 760 + i, { face: ['sewn', 'gouged', 'smile', 'lobotomy', 'burned', 'gaunt'][i], bald: true, blood: 0.2, lean: 1, h: 1.3 + (i % 3) * 0.2 }); scene.add(b.root); return { b, x, y, i }; });

  // ------------------------------------------------------------------ the nursery: larvae
  const LARVAE = 70; const grubs = Array.from({ length: LARVAE }, () => ({ alive: false, p: new V(), v: new V(), ph: Math.random() * 6 }));
  const grubMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.09, 3, 6), M(0xd8cfb4, 0.35, { emissive: 0x1a1810 }), LARVAE); grubMesh.count = 0; grubMesh.frustumCulled = false; scene.add(grubMesh);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sc4 = new V(1, 1, 1);
  function spill() { const vats = [[83, 27], [89, 27], [83, 33], [89, 33]]; grubs.forEach((g2, i) => { const [x, y] = vats[i % 4]; g2.alive = true; g2.p.set(cx(x) + (Math.random() - 0.5) * 1.6, 0, cz(y) + (Math.random() - 0.5) * 1.6); g2.v.set(0, 0, 0); g2.life = 40 + Math.random() * 20; }); }

  // ------------------------------------------------------------------ Subject Zero, in the Pit, until the lockdown lifts
  const zeroD = makeBody('brute', 702, { h: 2.9, girth: 1.2, face: 'noseless', smile: true, skin: [0.6, 0.55, 0.52], blood: 1, scars: 1, outfit: 'rags' }); scene.add(zeroD.root);
  const surfaceSkitter = makeBody('naked', 790, { h: 1.15, girth: 0.55, lean: 1, bald: true, face: 'gouged', skin: [0.78, 0.74, 0.68] }); scene.add(surfaceSkitter.root); surfaceSkitter.root.visible = false;
  const byKind = (k) => horrors.list.filter((h) => h.kind === k);
  const mimic = byKind('mimic')[0], droppers = byKind('dropper');
  const keepAwake = new Set();
  const wake = (h, state = 'investigate') => { if (!h) return; keepAwake.add(h); h.reset(); h.active = true; h.body.root.visible = true; h.state = state; h.goal = walker.pos.clone(); h.aware = state === 'spot' ? 1.5 : 0.6; h.wait = 0.1; if (state === 'spot') h.spotT = 0; };

  // ------------------------------------------------------------------ interactions
  const inter = [];
  const add = (pos, r, label, act) => inter.push({ kind: 't3', pos, r, label, act });
  // the lockdown release in the gallery
  add(() => P3(82, 54.3, 1.1), 1.4, () => (s().b2 && !s().release ? 'LIFT THE LOCKDOWN' : ''), () => { if (!s().release) release(); });
  // the bay door switch
  add(() => P3(102.4, 20.6, 1.3), 1.3, () => (!s().exitArea || s().bayOpen ? '' : 'Open the bay door'), () => { if (s().bayOpen || !s().exitArea) return; s().bayOpen = true; const d = doors.list.find((q) => q.lock === 'bay'); if (d) { d.locked = false; doors.push(d, walker.pos.x, walker.pos.z, true); } G.power = true; sound.clang(P3(104, 19.5, 1.5), 200, 0.6, 1.4); sound.tone(P3(104, 19.5, 2), { f: 60, f2: 90, dur: 3, gain: 0.4, type: 'sawtooth' }); say('bayOpen', 0.5, true); ctx.checkpoint(); ctx.save(); });

  function burst() {
    const st = s(); if (st.burst) return; st.burst = true; say('burst', 1.2, true);
    makeLoop('siren', 4.8, siren, null, 0.2); caption('CONTAINMENT FAILURE. GROWTH ROW A. CONTAINMENT FAILURE.', 4); horrors.glitchKick(1.6);
    tanks.forEach((tk, i) => later(1.2 + i * 0.9, () => breakTank(tk)));
  }
  function breakTank(tk, quiet = false) {
    if (tk.broken) return; tk.broken = true; tk.k = quiet ? 1 : 0; tk.glass.visible = false; tk.shards.visible = true; tk.puddle.visible = true;
    if (!quiet) { const p = P3(tk.x, tk.y, 1.3); sound.burst(p, { f: 3000, q: 0.5, dur: 0.6, gain: 1.0, verb: 0.4 }); sound.burst(p, { f: 400, q: 0.6, dur: 1.2, gain: 0.8, brown: true }); for (let i = 0; i < 6; i++) sound.burst(p, { f: 4000 + Math.random() * 3000, q: 4, dur: 0.03, gain: 0.4, delay: 0.05 + i * 0.07 }); horrors.glitchKick(1.2); walker.shake = Math.max(walker.shake, 0.6); }
    if (tk.who) later(quiet ? 0 : 0.6, () => { const h = tk.who; wake(h, 'investigate'); h.pos.set(cx(tk.x), 0, cz(tk.y) + 0.9); });
  }
  function release() {
    const st = s(); st.release = true; st.zero = true; sound.clang(P3(82, 54, 1.2), 250, 0.7, 1.4); sound.jump('scare'); horrors.glitchKick(2); walker.shake = 1.2;
    makeLoop('siren', 4.8, siren, null, 0.2); loopGain('siren', 0.28, 0.2);
    caption('LOCKDOWN LIFTED. ALL DOORS. LOCKDOWN LIFTED.', 4); say('zero', 2, true);
    for (const d of doors.list) if (d.lock === 'lockdown' || d.lock === 'pit' || (d.cell && d.y === 47)) { d.locked = false; later(0.3 + Math.random() * 0.8, () => { doors.push(d, d.wx, d.wz - 1, true); sound.door(d, 'slam', d.wx, d.wz); }); }
    zeroD.root.visible = false; later(1.4, () => { const z = horrors.hunters[1]; if (z) { z.active = true; z.body.root.visible = true; z.state = 'spot'; z.spotT = 0; z.aware = 1.5; sound.voice('c:subject', 'chase', z.pos); } });
    for (const h of horrors.list) if (h.kind === 'amalgam') wake(h, 'investigate');
    ctx.checkpoint(); ctx.save();
  }

  // ------------------------------------------------------------------ the frame
  function update(dt, I) {
    const st = s(); S.t += dt; const t = S.t;
    for (let i = timers.length - 1; i >= 0; i--) if (S.t >= timers[i].at) { const f = timers[i].fn; timers.splice(i, 1); f(); }
    // the dead: dress the rest of the building a body every other frame after the first seconds
    if (S.t > 2 && ctx.dressing) { if (!S.dressed) { S.dressed = true; for (const r of ['b1', 'b2', 'exit']) ctx.dressing.dressRegion(r); } S.pf = (S.pf || 0) + 1; if (S.pf % 2 === 0) ctx.dressing.pump(); }
    // where you are
    const enter = (flag, test, line) => { if (!st[flag] && test()) { st[flag] = true; if (line) say(line, 0.5, true); ctx.checkpoint(); ctx.save(); } };
    enter('inside', () => inRect(16, 22, 32, 28), 'inside'); enter('b1', () => walker.pos.x > cx(41) && walker.pos.z < cz(41) && floorAt(walker.pos.x, walker.pos.z) < 4, 'b1');
    enter('b2', () => walker.pos.z > cz(44) && floorAt(walker.pos.x, walker.pos.z) < 1 && walker.pos.x < cx(102), 'b2'); enter('exitArea', () => inRect(102, 38, 109, 45) && floorAt(walker.pos.x, walker.pos.z) > 1, 'exitArea');
    // keep woken things awake through a death and a respawn
    for (const h of keepAwake) if (!h.active) { h.reset(); h.active = true; h.body.root.visible = true; }

    // ---- the surface
    if (!st.inside) {
      makeLoop('radio', 8, radio, P3(8, 9.5, 1), 0.3);
      if (S.t > 14 && once('skitterCross')) S.cross = { t: 0 };
      if (S.cross) { const k = (S.cross.t += dt) / 1.1; const b = surfaceSkitter; if (k < 1) { b.root.visible = true; pose(b, 'crawl', t, { speed: 6, phase: t * 16 }); b.root.position.set(cx(34 - k * 26), floorAt(cx(20), cz(16)), cz(16.5)); b.root.rotation.set(0, -Math.PI / 2, 0); lightBody(b, world, 1.4); if (S.cross.t < dt * 1.5) { sound.voice('c:skitter', 'alert', P3(30, 16, 0)); } } else b.root.visible = false; }
    } else { loopGain('radio', 0, 0.5); surfaceSkitter.root.visible = false; }
    // ---- B1: the tanks: the six that will break, and the ones that won't; one of them wakes as you pass
    const inHall = walker.pos.z < cz(18.6) && walker.pos.x > cx(47) && walker.pos.x < cx(73) && floorAt(walker.pos.x, walker.pos.z) > 2;
    const showTanks = st.b1 && !st.b2;
    for (const tk of tanks) {
      if (!tk.broken && tk.who) { const b = tk.who.body; b.root.visible = showTanks; if (showTanks) { fetal(b, t, tk.x); b.root.position.set(cx(tk.x), floorAt(cx(tk.x), cz(tk.y)) + 0.55 + Math.sin(t * 0.7 + tk.x) * 0.04, cz(tk.y)); b.root.rotation.set(0.3, t * 0.05 + tk.x, 0); b.mat.userData.uAmb.value.setRGB(0.28, 0.6, 0.34); } }
      if (tk.broken && tk.k < 1) { tk.k = Math.min(1, tk.k + dt * 2.5); tk.fluid.scale.y = Math.max(0.02, 1 - tk.k); tk.fluid.position.y = floorAt(tk.fluid.position.x, tk.fluid.position.z) + 0.35 + 0.91 * tk.fluid.scale.y; tk.puddle.scale.setScalar(tk.k); }
      if (tk.broken && tk.k >= 1) tk.fluid.visible = false;
    }
    for (const f of floaters) { f.b.root.visible = showTanks; if (!showTanks) continue; fetal(f.b, t, f.i); f.b.root.position.set(cx(f.x), floorAt(cx(f.x), cz(f.y)) + 0.6 + Math.sin(t * 0.6 + f.i) * 0.05, cz(f.y)); f.b.root.rotation.set(0.2, t * 0.04 + f.i, 0); f.b.mat.userData.uAmb.value.setRGB(0.26, 0.56, 0.32);
      if (f.i === 2 && inHall && near(f.x, f.y, 2.0) && once('tankWake')) S.wakeT = 0;
      if (f.i === 2 && S.wakeT !== undefined && S.wakeT < 1.6) { S.wakeT += dt; const k = Math.min(1, S.wakeT * 6); f.b.bones.head.rotation.set(-0.3 * k, 0, 0); f.b.bones.jaw.rotation.x = 0.8 * k; f.b.bones.Lupper.rotation.set(-2.6 * k, 0, 0.2); f.b.bones.Rupper.rotation.set(-2.6 * k, 0, -0.2); f.b.root.position.z += 0.32 * k * (1 - Math.max(0, S.wakeT - 1) / 0.6); f.b.mat.userData.uAmb.value.setRGB(0.3 * k + 0.1, 0.5 * k + 0.28, 0.3 * k + 0.14);
        if (S.wakeT < dt * 1.5) { sound.thud(P3(f.x, f.y, 1.3), 1.4); sound.jump('scare'); horrors.glitchKick(2); horrors.staticBurst(0.06); walker.shake = 1.2; } }
    }
    if (G.items.has('b2Card') && !st.burst) burst();
    // ---- the nursery: the vats tip, and they come out
    if (st.b1 && !st.spilled && inRect(80, 22, 94, 38)) { st.spilled = true; spill(); for (let i = 0; i < 8; i++) sound.burst(P3(86, 30, 0.5), { f: 300 + i * 40, q: 1, dur: 0.4, gain: 0.5, brown: true, delay: i * 0.12 }); caption('The vats are moving. Something white is pouring over the rims.', 3.5); horrors.glitchKick(1); }
    let shown = 0;
    if (st.spilled) {
      for (const g2 of grubs) {
        if (!g2.alive) continue; g2.life -= dt; if (g2.life <= 0) { g2.alive = false; continue; }
        const dx = walker.pos.x - g2.p.x, dz = walker.pos.z - g2.p.z, d = Math.hypot(dx, dz); g2.ph += dt * 12;
        if (d < 14 && walker.alive) { const sp = 1.9 + (g2.ph % 1) * 0.6; g2.v.set(dx / d * sp + Math.sin(g2.ph) * 0.6, 0, dz / d * sp + Math.cos(g2.ph * 0.7) * 0.6); } else g2.v.multiplyScalar(0.9).add(new V(Math.sin(g2.ph * 0.3) * 0.2, 0, Math.cos(g2.ph * 0.2) * 0.2));
        const nx = g2.p.clone().addScaledVector(g2.v, dt); ctx.space.collide(nx, 0.05, { doors: true }); g2.p.copy(nx);
        if (d < 0.45 && walker.alive) { if (walker.speed > 1.2 && Math.random() < 0.25) { g2.alive = false; sound.squelch(g2.p.clone().setY(0.1), 0.5); continue; } S.bite = (S.bite || 0) - dt; if (S.bite <= 0) { S.bite = 0.35; walker.hurt(3); sound.squelch(g2.p.clone().setY(0.2), 0.4); horrors.glitchKick(0.4); } }
        const y = floorAt(g2.p.x, g2.p.z) + 0.03; q4.setFromEuler(new THREE.Euler(Math.PI / 2, Math.atan2(g2.v.x, g2.v.z), Math.sin(g2.ph) * 0.4)); sc4.set(1, 1 + Math.sin(g2.ph * 1.7) * 0.25, 1); m4.compose(new V(g2.p.x, y, g2.p.z), q4, sc4); grubMesh.setMatrixAt(shown++, m4);
      }
      if (shown && Math.random() < dt * 4) sound.burst(new V(walker.pos.x, 0.1, walker.pos.z), { f: rnd(200, 600), q: 3, dur: 0.08, gain: 0.12, brown: true });
    }
    grubMesh.count = shown; grubMesh.instanceMatrix.needsUpdate = true;
    // ---- B2: the Mimic among the dead in dissection
    if (mimic && !keepAwake.has(mimic)) {
      const mp = mimic.home; const b = mimic.body; b.root.visible = st.b1;
      if (st.b1) { pose(b, 'lie', 0); b.root.rotation.order = 'YXZ'; b.root.rotation.set(-Math.PI / 2, 1.2, 0); b.root.position.set(mp.x, 0.1, mp.z); lightBody(b, world, 1.2); }
      const dist = Math.hypot(walker.pos.x - mp.x, walker.pos.z - mp.z); const fwd = new V(-Math.sin(walker.yaw), 0, -Math.cos(walker.yaw)); const to = new V(mp.x - walker.pos.x, 0, mp.z - walker.pos.z).normalize();
      if (dist < 5.5 && fwd.dot(to) < -0.1) S.turned = (S.turned || 0) + dt; else S.turned = 0;
      if (S.turned > 1.2 || (dist < 1.6 && st.b2)) { wake(mimic, 'spot'); mimic.pos.set(mp.x, 0, mp.z); sound.voice('c:hollow', 'alert', mimic.pos); horrors.glitchKick(1); }
    }
    // ---- B2: the Droppers, on the ceiling until you pass under
    for (const h of droppers) {
      if (keepAwake.has(h) || !st.b2) { if (!keepAwake.has(h)) h.body.root.visible = false; continue; }
      const b = h.body; const hp = h.home; const top = ceilOf(Math.floor(hp.x / C), Math.floor(hp.z / C)); const dist = Math.hypot(walker.pos.x - hp.x, walker.pos.z - hp.z);
      if (!h.dropT) { b.root.visible = true; pose(b, 'crawl', t, { speed: 0, phase: 0 }); b.root.rotation.set(Math.PI, 0, 0); b.root.position.set(hp.x, top - 0.05, hp.z); b.mat.userData.uAmb.value.copy(world.lightAt(hp.x, hp.z)).multiplyScalar(0.8); b.bones.head.rotation.x = -0.8 + Math.sin(t * 2 + hp.x) * 0.05; if (dist < 1.4) { h.dropT = 0.001; sound.voice('c:skitter', 'chase', P3(hp.x / C - 0.5, hp.z / C - 0.5, 2.5)); sound.jump('scare'); horrors.glitchKick(1.8); walker.shake = 1; } }
      else { h.dropT += dt; const k = Math.min(1, h.dropT / 0.35); b.root.rotation.set(Math.PI * (1 - k), 0, 0); b.root.position.set(hp.x, (top - 0.05) * (1 - k * k), hp.z); pose(b, 'crawl', t, { speed: 4, phase: t * 14 }); if (k >= 1) { sound.thud(new V(hp.x, 0.3, hp.z), 1.1); wake(h, 'chase'); h.pos.set(hp.x, 0, hp.z); h.aware = 1.5; } }
    }
    // ---- the Pit: it's in there, behind the glass, watching
    if (!st.zero && st.b2) { const b = zeroD; b.root.visible = true; pose(b, 'crawl', t, { speed: 0, phase: 0 }); b.root.position.set(cx(82), 0, cz(64)); const toMe = Math.atan2(walker.pos.x - cx(82), walker.pos.z - cz(64)); b.root.rotation.set(0, toMe, 0); b.bones.head.rotation.x = -0.5; b.bones.jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 0.6)) * 0.2; b.bones.spine.rotation.x = 0.2 + Math.sin(t * 1.1) * 0.03; lightBody(b, world, 1.5);
      if (Math.random() < dt * 0.15) sound.voice('c:subject', 'idle', new V(cx(82), 0, cz(64)));
      if (near(82, 52, 6) && once('pitLook')) { caption('Something in the Pit turns its head and watches you through the glass.', 3.5); sound.voice('c:subject', 'alert', new V(cx(82), 0, cz(64))); } }
    else zeroD.root.visible = false;
    // ---- out
    if (st.bayOpen && near(plan.exit.x, plan.exit.y, plan.exit.r) && !G.escaped) { G.escaped = true; loopGain('siren', 0, 1); sound.tone(null, { f: 50, f2: 140, dur: 1.5, gain: 0.3, type: 'sawtooth' }); later(1.5, () => ctx.ending()); }
  }

  return {
    interactables: inter, busy: () => false,
    get dev() { return { S, tanks, floaters, grubs, zeroD, burst, release, spill, breakTank }; },
    start() { setTimeout(() => say('start'), 1500); for (const d of doors.list) if (d.cell && d.y === 47) { d.locked = true; d.target = d.angle = 0; d.mesh.rotation.y = 0; } },
    serialize: () => ({ ...G.t5 }),
    stopSiren() { loopGain('siren', 0, 0.3); },
    restore(d) {
      G.t5 = { ...(d.t5 || {}) }; const st = G.t5; for (const k of Object.keys(st)) S.beats.add(k);
      for (const dd of doors.list) if (dd.cell && dd.y === 47 && !st.release) { dd.locked = true; dd.target = dd.angle = 0; dd.mesh.rotation.y = 0; }
      if (st.burst) { for (const tk of tanks) breakTank(tk, true); makeLoop('siren', 4.8, siren, null, 0.2); }
      if (st.spilled) st.spilled = true;
      if (st.release) { for (const dd of doors.list) if (dd.lock === 'lockdown' || dd.lock === 'pit' || (dd.cell && dd.y === 47)) dd.locked = false; zeroD.root.visible = false; }
      if (st.bayOpen) { const dd = doors.list.find((q) => q.lock === 'bay'); if (dd) dd.locked = false; G.power = true; }
    },
    update(dt, I) { update(dt, I); },
  };
}
function rnd(a, b) { return a + Math.random() * (b - a); }

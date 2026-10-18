// AsylumVR: boot, the render pipeline (tape composite on desktop, the
// camcorder's own render in VR), interaction, objectives, checkpoints
// and the frame loop.
import * as THREE from '../vendor/three.module.js';
import { makePlan, C, H, Z, cx, cz } from './plan.js?v=14';
import { buildSurfaces, T } from './surfaces.js?v=14';
import { buildAsylum, laydecals, LIGHT } from './mason.js?v=14';
import { Doors } from './doors.js?v=14';
import { Space } from './space.js?v=14';
import { Input } from './input.js?v=14';
import { Walker } from './walker.js?v=14';
import { Camcorder, EYE_LAYER, timecode } from './camcorder.js?v=14';
import { makeTape, makeVeil } from './tape.js?v=14';
import { Slate } from './slate.js?v=14';
import * as STORY1 from './story.js?v=14';
import * as TAPE2 from './tape2.js?v=14';
import { Sound } from './dread.js?v=14';
import { Horrors } from './horrors.js?v=14';
import { Dressing } from './dressing.js?v=14';
import { Scares } from './scares.js?v=14';
import { makeHand } from './hands.js?v=14';

const V = THREE.Vector3;
const $ = (id) => document.getElementById(id);
const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const S = { bright: 1, grain: 1, smooth: false };
try { Object.assign(S, JSON.parse(localStorage.getItem('asylumvr') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('asylumvr', JSON.stringify(S)); } catch (e) {} };
// which tape: ?tape=N, else the first one
let unlocked = 1; try { unlocked = Math.max(1, +(localStorage.getItem('asylumvr_tapes') || 1)); } catch (e) {}
const TAPE = Math.max(1, Math.min(2, +(new URLSearchParams(location.search).get('tape') || 1)));
const STORY = TAPE === 2 ? TAPE2 : STORY1; const { NOTES, MUTTER, OBJECTIVES } = STORY;

// ---------------------------------------------------------------- renderer
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(QUEST ? 1 : Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 2.2 * S.bright;
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x050403, 0.075);     // the damp, close air
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 80);
const dolly = new THREE.Group(); dolly.add(camera); scene.add(dolly);

// desktop pipeline: the scene goes to a half-float target, then through the tape
const tape = makeTape();
let rtMain = null;
function sizeRT() {
  const k = 0.7; const w = Math.max(320, Math.floor(innerWidth * k * renderer.getPixelRatio())), h = Math.max(240, Math.floor(innerHeight * k * renderer.getPixelRatio()));
  if (rtMain) rtMain.dispose(); rtMain = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }); tape.uniforms.src.value = rtMain.texture; tape.uniforms.aspect.value = innerWidth / innerHeight;
}
sizeRT();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); sizeRT(); });

// ---------------------------------------------------------------- build
$('loading').textContent = 'Rewinding tape… painting walls';
await new Promise((r) => setTimeout(r, 30));
buildSurfaces();
const plan = makePlan(TAPE);
$('loading').textContent = 'Rewinding tape… baking light';
await new Promise((r) => setTimeout(r, 30));
const world = buildAsylum(plan, scene);
laydecals(world, plan, scene);
const doors = new Doors(world, scene);
const space = new Space(plan, world, doors);
const input = new Input(canvas, renderer);
const walker = new Walker(dolly, camera, space);
const cam = new Camcorder(scene);
const sound = new Sound();
const recording = sound.record((k) => { if (!G || !G.playing) $('loading').textContent = k < 1 ? `Recording sounds… ${Math.round(k * 100)}%` : ''; });
const veil = makeVeil(); camera.add(veil.mesh); veil.mesh.visible = false;
const G = {   // game state
  leftAdmin: false, sawPanel: false, fuses: 0, power: false, gateOpen: false, escaped: false, items: new Set(), notes: [], obj: 0,
  t: 0, playing: false, paused: false, reading: null, said: new Set(), checkpoint: null, deaths: 0, chased: 0,
};
$('loading').textContent = 'Rewinding tape… waking the patients';
await new Promise((r) => setTimeout(r, 30));
const dressing = new Dressing(world, plan, scene);
const horrors = new Horrors({ scene, plan, world, space, doors, walker, cam, sound, G, camera });
const scares = new Scares({ scene, plan, world, space, doors, walker, cam, sound, G, horrors, camera, dressing });
if (TAPE === 2) scares.list = TAPE2.setPieces(scares);
const tapeLogic = TAPE === 2 ? TAPE2.setupTape2({ G, walker, plan, world, sound, horrors, cam, say: (...a) => say(...a), caption: (...a) => caption(...a), checkpoint: () => checkpoint(), ending: () => ending(), vr: () => renderer.xr.isPresenting }) : null;

// ---------------------------------------------------------------- hands
// your own hands, empty, on the controllers' grips in VR (the camcorder is the whole view, not something you hold)
const handLight = { value: new THREE.Color(0.02, 0.02, 0.02) };
const handL = makeHand('left', handLight), handR = makeHand('right', handLight);
const left = renderer.xr.getController(0), right = renderer.xr.getController(1);
const gripL = renderer.xr.getControllerGrip(0), gripR = renderer.xr.getControllerGrip(1);
dolly.add(left, right, gripL, gripR);
const hands = { left: null, right: null, gripLeft: null, gripRight: null, pads: {} };
[[left, gripL], [right, gripR]].forEach(([c, g]) => {
  c.addEventListener('connected', (e) => { const side = e.data.handedness; hands[side] = c; c.userData.side = side; hands[side === 'left' ? 'gripLeft' : 'gripRight'] = g; hands.pads[side] = e.data; attachHand(c, g, side); });
  c.addEventListener('disconnected', () => { for (const k of ['left', 'right']) if (hands[k] === c) hands[k] = null; });
});
const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(0, 0, 0), new V(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
function attachHand(c, g, side) {
  if (side === 'left') g.add(handL.root);
  else { g.add(handR.root); c.add(ray); ray.scale.z = 1.8; }
}
function updateHands(dt, vr) {
  if (!vr) return;
  if (!handLight.lock) handLight.value.copy(world.lightAt(walker.pos.x, walker.pos.z));
  for (const [side, h] of [['left', handL], ['right', handR]]) { const src = hands.pads[side]; if (src && src.gamepad) { const b = src.gamepad.buttons; h.pose(b[0] ? b[0].value : 0, b[1] ? b[1].value : 0, b[3] && b[3].touched ? 0.9 : 0.4); } }
}

// ---------------------------------------------------------------- night vision in VR
// A full-screen pass costs too much in the headset, so every material gets the
// night-vision grade at the end of its own shader: luminance lifted hard,
// green phosphor, grain. The camcorder's infrared lamp does the rest.
const NVU = { on: { value: 0 }, t: { value: 0 } };
function nvify(m) {
  if (!m || m.userData.nv || m.isShaderMaterial || m.userData.noNV) return;
  m.userData.nv = true; const prev = m.onBeforeCompile; const key = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.uNV = NVU.on; sh.uniforms.uNVt = NVU.t;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNV; uniform float uNVt;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uNV > 0.5) {
          float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          float v = clamp(pow(l * 1.7, 0.85), 0.0, 1.0);
          float g = fract(sin(dot(floor(gl_FragCoord.xy * 0.5) + floor(uNVt * 24.0) * 7.13, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
          v = clamp(v * (0.9 + g * 0.35) + g * 0.06, 0.0, 1.0);
          gl_FragColor.rgb = vec3(0.3, 1.0, 0.4) * v + vec3(0.5, 1.0, 0.6) * smoothstep(0.8, 1.0, v) * 0.3;
        }`);
  };
  m.customProgramCacheKey = () => key + '|nv';
  m.needsUpdate = true;
}
function nvifyScene() { scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(nvify); }); }

// VR slates: a reading/pause card, captions low in view, a small prompt
const card = new Slate(1024, 640, 0.9); scene.add(card.mesh);
const capSlate = new Slate(1024, 160, 0.9, {}); camera.add(capSlate.mesh); capSlate.mesh.position.set(0, -0.28, -0.9);
const promptSlate = new Slate(512, 96, 0.22); scene.add(promptSlate.mesh);
const osdHud = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.975), new THREE.MeshBasicMaterial({ map: cam.osdTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
osdHud.material.userData.noNV = true; osdHud.position.set(0, 0, -1.0); osdHud.renderOrder = 998; osdHud.visible = false; camera.add(osdHud);
for (const sl of [card, capSlate, promptSlate]) sl.mesh.material.userData.noNV = true;

// ---------------------------------------------------------------- pickups
const itemMeshes = [];
{
  const mk = (k) => {
    const g = new THREE.Group();
    const lit = (col, rough = 0.5, metal = 0) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal }); m.onBeforeCompile = (sh) => { sh.uniforms.lift = { value: 0 }; m.userData.sh = sh; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float lift;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * lift;'); }; return m; };
    if (k === 'fuse') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 14), lit(0x8a6a3a, 0.7)); body.rotation.z = Math.PI / 2; g.add(body);
      for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.025, 14), lit(0xb0a890, 0.3, 0.9)); cap.rotation.z = Math.PI / 2; cap.position.x = s * 0.07; g.add(cap); }
    } else if (k === 'card') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.002, 0.054), lit(0xd8d4c8, 0.4)));
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.0025, 0.01), lit(0x111111, 0.3)); strip.position.z = 0.015; g.add(strip);
    } else if (k === 'chapelKey' || k === 'stairKey') {
      const brass = lit(k === 'stairKey' ? 0x6a6a64 : 0x9a7a30, 0.35, 0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 14), brass); ring.rotation.x = Math.PI / 2; g.add(ring);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.07), brass); shaft.position.z = 0.05; g.add(shaft);
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.012), brass); bit.position.set(0.01, 0, 0.08); g.add(bit);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.002, 0.05), lit(0xb8a888, 0.9)); tag.position.set(-0.03, 0, -0.03); g.add(tag);
    } else if (k === 'battery') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.045), lit(0x1a1a1a, 0.5)));
      const lab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.023, 0.03), lit(0x2a5aa0, 0.4)); g.add(lab);
    } else {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), lit(0xc8bea4, 1)); p.rotation.x = -Math.PI / 2; p.material.side = THREE.DoubleSide; g.add(p);
    }
    return g;
  };
  for (const it of plan.items) {
    if (it.k === 'battery') continue;   // night vision is unlimited, so no batteries to find
    const m = mk(it.k); const x = cx(it.x), z = cz(it.y);
    // rest on whatever is under it
    let y = 0.02; for (const c of world.colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) y = Math.max(y, Math.min(1.2, c.y1) + 0.02);
    if (it.k === 'note') y = Math.max(y, 0.005);
    m.position.set(x, y, z); m.rotation.y = (it.x * 7 + it.y) % 6; scene.add(m);
    itemMeshes.push({ it, m });
  }
}
const genPos = plan.generator ? new V(cx(plan.generator.x), 1.0, cz(plan.generator.y) + 0.7) : new V();
const panelPos = plan.panel ? new V(cx(plan.panel.x), 0.9, cz(plan.panel.y)) : new V();
const gateMesh = !plan.gate ? null : (() => {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.6, metalness: 0.7 });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.05;'); };
  const [x0, y0] = plan.gate.cells[0]; const wx = x0 * C, wz = (y0 + 0.5) * C; const w = C * 2;
  for (let i = 0; i <= 14; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.9, 6), m); b.position.set(wx + 0.1 + i * (w - 0.2) / 14, 1.45, wz); g.add(b); }
  for (const y of [0.15, 1.4, 2.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.05), m); b.position.set(wx + w / 2, y, wz); g.add(b); }
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), m); chain.position.set(wx + w / 2, 1.2, wz + 0.04); g.add(chain);
  scene.add(g); space.gateBox = [wx, wz - 0.1, wx + w, wz + 0.1]; return g;
})();

// ---------------------------------------------------------------- interaction
const interactables = [];
for (const d of doors.list) interactables.push({ kind: 'door', d, pos: () => new V(d.wx, 1.1, d.wz), r: 1.0, label: () => d.locked ? (d.lock && G.items.has(d.lock) ? 'Unlock' : d.lock && TAPE2.LOCK_NAME[d.lock] ? `Locked (needs ${TAPE2.LOCK_NAME[d.lock]})` : 'Locked') : Math.abs(d.target) > 0.2 ? 'Close door' : 'Open door' });
for (const h of world.hides) interactables.push({ kind: 'hide', h, pos: () => h.k === 'locker' ? new V(h.x + h.fx * 0.3, 1.2, h.z + h.fz * 0.3) : new V(h.x, 0.45, h.z), r: h.k === 'locker' ? 0.6 : 0.9, label: () => h.k === 'locker' ? 'Hide in locker' : 'Hide under bed' });
for (const im of itemMeshes) interactables.push({ kind: 'item', im, pos: () => im.m.position, r: 0.45, label: () => ({ fuse: 'Take fuse', battery: 'Take battery', note: 'Read', ...TAPE2.ITEM_LABEL })[im.it.k], gone: () => G.items.has(im.it.id) });
if (TAPE === 1) interactables.push({ kind: 'gen', pos: () => genPos, r: 1.2, label: () => G.power ? 'Generator running' : G.fuses >= 3 ? 'Insert fuses and start' : `Generator: needs 3 fuses (${G.fuses}/3)` });
if (TAPE === 1) interactables.push({ kind: 'panel', pos: () => panelPos, r: 1.0, label: () => G.gateOpen ? 'Gate open' : G.power ? 'Open the front gate' : 'Gate panel (no power)' });

let focus = null;
function pick(origin, dir) {
  let best = null, bs = 0;
  for (const o of interactables) {
    if (o.gone && o.gone()) continue;
    const p = o.pos(); const to = new V().subVectors(p, origin); const d = to.length(); if (d > 2.3 + o.r * 0.3) continue;
    const along = to.dot(dir); if (along < 0) continue;
    const off = Math.sqrt(Math.max(0, d * d - along * along));
    if (off > o.r * 0.7 + 0.1) continue;
    if (!space.los(origin.x, origin.z, p.x - dir.x * 0.3, p.z - dir.z * 0.3, false) && o.kind !== 'door') continue;
    const score = 1 / (off + 0.15) / (d + 0.5); if (score > bs) { bs = score; best = o; }
  }
  return best;
}
function use(o) {
  if (!o) return;
  if (walker.hidden) { walker.unhide(); sound.locker(false); return; }
  if (o.kind === 'door' && o.d.locked && o.d.lock && G.items.has(o.d.lock)) { o.d.locked = false; sound.clang(new V(o.d.wx, 1.1, o.d.wz), 700, 0.25, 0.4); sound.door(o.d, 'open', o.d.wx, o.d.wz); doors.push(o.d, walker.pos.x, walker.pos.z); horrors.heard(o.d.wx, o.d.wz, 5); return; }
  if (o.kind === 'door') { const r = doors.push(o.d, walker.pos.x, walker.pos.z); if (r) sound.door(o.d, r, o.d.wx, o.d.wz); else sound.rattle(o.d.wx, o.d.wz); horrors.heard(o.d.wx, o.d.wz, r === 'close' ? 3 : 4); }
  else if (o.kind === 'hide') { horrors.sawHide(o.h); walker.hide(o.h); sound.locker(true, o.h.k); say('hide', 0.3); }
  else if (o.kind === 'item') {
    const it = o.im.it; G.items.add(it.id); o.im.m.visible = false;
    if (it.k === 'fuse') { G.fuses++; sound.pickup('fuse'); say(['', 'fuse1', 'fuse2', 'fuse3'][G.fuses], 0, true); checkpoint(); saveGame(); }
    else if (it.k === 'battery') { cam.spares = Math.min(6, cam.spares + 1); sound.pickup('battery'); say('battery', 0.4); }
    else if (it.k === 'card' || it.k === 'chapelKey' || it.k === 'stairKey') { sound.pickup('fuse'); say(it.k, 0, true); checkpoint(); saveGame(); }
    else { G.notes.push(it.id); read(it.id); sound.pickup('paper'); }
  } else if (o.kind === 'gen') {
    if (!G.power && G.fuses >= 3) { G.power = true; sound.generator(genPos); horrors.powerOn(genPos); scares.powerOn(); setTimeout(() => say('power', 0, true), 2600); checkpoint(); }
    else if (!G.power) sound.rattle(genPos.x, genPos.z);
  } else if (o.kind === 'panel') {
    G.sawPanel = true;
    if (G.power && !G.gateOpen) { G.gateOpen = true; sound.gate(); horrors.alarm(); say('gate', 0, true); }
    else if (!G.power) sound.rattle(panelPos.x, panelPos.z);
  }
}
function read(id) {
  const n = NOTES[id]; if (!n) return; G.reading = id;
  if (renderer.xr.isPresenting) { card.paper(n.t, n.b); placeCard(); }
  else { $('readerTitle').textContent = n.t; $('readerBody').innerHTML = n.b.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join(''); $('reader').hidden = false; }
}
function closeRead() { G.reading = null; $('reader').hidden = true; card.mesh.visible = false; }
function placeCard() {
  const head = camera.getWorldPosition(new V()); const f = new V(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize();
  card.mesh.position.copy(head).addScaledVector(f, 0.75); card.mesh.position.y -= 0.08; card.mesh.lookAt(head); card.mesh.visible = true;
}

// ---------------------------------------------------------------- captions + objectives
let capT = 0;
function caption(text, secs = 3.5) {
  $('caption').textContent = text; $('caption').hidden = false; capT = secs;
  capSlate.card([[text, 40, '#f0eadc']], { bg: false, top: 70 }); capSlate.mesh.visible = renderer.xr.isPresenting;
}
function say(key, delay = 0, force = false) {
  if (!key || (!force && G.said.has(key))) return; G.said.add(key);
  setTimeout(() => { caption(MUTTER[key]); sound.mutter(); }, delay * 1000);
}
let objShown = -1, objT = 0;
function objectiveText() { const o = OBJECTIVES[G.obj]; if (!o) return ''; return typeof o.text === 'function' ? o.text(G) : o.text; }
function updateObjectives(dt) {
  while (G.obj < OBJECTIVES.length && OBJECTIVES[G.obj].done(G)) G.obj++;
  if (G.obj !== lastObj) { const moved = G.obj > lastObj; lastObj = G.obj; if (moved && G.playing && G.obj < OBJECTIVES.length) { checkpoint(); saveGame(); } }
  const txt = objectiveText();
  if (objShown !== G.obj || $('objective').dataset.t !== txt) { objShown = G.obj; $('objective').dataset.t = txt; $('objective').textContent = txt; $('objective').hidden = !txt; $('objective').style.opacity = 1; objT = 7; cam.paintOSD(true, txt); }
  objT -= dt; if (objT < 0) $('objective').style.opacity = 0;
}

// ---------------------------------------------------------------- autosave
// Saved to this browser every time you collect a fuse, a key or the keycard, and whenever the objective moves on.
const SAVE_KEY = 'asylumvr_save_t' + TAPE;
function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
function saveGame() {
  if (!G.playing || !walker.alive || G.escaped) return;
  const ck = G.checkpoint || { pos: walker.pos, yaw: walker.yaw };
  const data = { v: 1, tape: TAPE, at: Date.now(), pos: [ck.pos.x, ck.pos.z], yaw: ck.yaw, items: [...G.items], notes: G.notes, fuses: G.fuses, power: G.power, gateOpen: G.gateOpen,
    leftAdmin: G.leftAdmin, sawPanel: G.sawPanel, sawStairs: !!G.sawStairs, strapped: !!G.strapped, obj: G.obj, deaths: G.deaths, t: G.t, said: [...G.said], scares: [...scares.done],
    unlocked: doors.list.filter((d) => d.lock && !d.locked).map((d) => [d.x, d.y]) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { return; }
  $('saved').classList.remove('on'); void $('saved').offsetWidth; $('saved').classList.add('on'); cam.saveFlash = cam.clock + 2.5; cam.paintOSD(true, '');
}
function applySave(d) {
  for (const k of ['fuses', 'power', 'gateOpen', 'leftAdmin', 'sawPanel', 'sawStairs', 'strapped', 'obj', 'deaths', 't']) if (d[k] !== undefined) G[k] = d[k];
  G.items = new Set(d.items || []); G.notes = d.notes || []; G.said = new Set(d.said || []);
  for (const id of d.scares || []) scares.done.add(id);
  for (const im of itemMeshes) if (G.items.has(im.it.id)) im.m.visible = false;
  for (const [x, y] of d.unlocked || []) { const dd = doors.at(x, y); if (dd) dd.locked = false; }
  if (G.power) { sound.generator(genPos); }
  if (G.gateOpen && gateMesh) { gateMesh.position.y = 2.9; space.gateBox = null; }
  walker.place(d.pos[0], d.pos[1], d.yaw); checkpoint(); horrors.reset();
}
let lastObj = 0;

// ---------------------------------------------------------------- checkpoints
function checkpoint() {
  G.checkpoint = { pos: walker.pos.clone(), yaw: walker.yaw, battery: cam.battery, spares: cam.spares, hidden: walker.hidden };
}
function respawn() {
  const ck = G.checkpoint || { pos: new V(cx(plan.start.x), 0, cz(plan.start.y)), yaw: plan.start.yaw, battery: 1, spares: 1 };
  walker.place(ck.pos.x, ck.pos.z, ck.yaw); cam.battery = Math.max(cam.battery, 0.5); cam.nv = false;
  horrors.reset(); $('dead').hidden = true; deadT = 0; fadeTo(0);
}
let deadT = 0;

// ---------------------------------------------------------------- fades / pause
let fade = 1, fadeGoal = 0;
function fadeTo(v) { fadeGoal = v; }
function setPaused(p) {
  G.paused = p; $('pause').hidden = !p || renderer.xr.isPresenting;
  if (p) { sound.duck(true); $('notesList').textContent = G.notes.length ? 'Notes: ' + G.notes.map((n) => NOTES[n].t).join(' · ') : ''; if (renderer.xr.isPresenting) { card.card([['PAUSED', 70], [objectiveText(), 34, '#c8c0b0'], ['', 20], [TAPE === 1 ? `Fuses ${G.fuses}/3   ·   Notes ${G.notes.length}/${Object.keys(NOTES).length}` : `Tape 2   ·   Notes ${G.notes.length}/${Object.keys(NOTES).length}`, 32, '#9a948a'], ['', 20], ['B resume   ·   hold trigger 2 s: last checkpoint', 30, '#9a948a']]); placeCard(); } }
  else { sound.duck(false); card.mesh.visible = false; if (!renderer.xr.isPresenting) input.wantLock = true; }
}
$('resume').onclick = () => setPaused(false);
$('restartCk').onclick = () => { setPaused(false); respawn(); };
$('toTitle').onclick = () => location.reload();
$('bright').value = S.bright; $('grain').value = S.grain; $('smooth').checked = S.smooth;
$('bright').oninput = (e) => { S.bright = +e.target.value; renderer.toneMappingExposure = 2.2 * S.bright; save(); };
$('grain').oninput = (e) => { S.grain = +e.target.value; save(); };
$('smooth').onchange = (e) => { S.smooth = e.target.checked; save(); };
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.playing && !renderer.xr.isPresenting && !G.reading && !G.paused && input.hadLock) setPaused(true); if (document.pointerLockElement) input.hadLock = true; });

// ---------------------------------------------------------------- start
async function begin(vr, cont = false) {
  if (!sound.rec) { $('loading').textContent = 'Recording sounds…'; await Promise.race([recording, new Promise((r) => { const iv = setInterval(() => { if (sound.rec) { clearInterval(iv); r(); } }, 100); })]); }
  sound.init(); await sound.ready; sound.stopMenu();
  $('screen').hidden = true; G.playing = true; fade = 1; fadeTo(0);
  walker.place(cx(plan.start.x), cz(plan.start.y), plan.start.yaw); checkpoint();
  const sv = cont ? readSave() : null;
  if (sv) { applySave(sv); lastObj = G.obj; caption('Tape resumed.', 2.5); }
  else if (tapeLogic) tapeLogic.start();
  if (!vr) { input.wantLock = true; $('dot').classList.add('on'); try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  if (!tapeLogic && !sv) setTimeout(() => say('start'), 1500);
  setTimeout(() => { if (!cam.nv && !G.strapped) caption(vr ? 'Left trigger: night vision' : 'F: night vision · right mouse: zoom'); }, 6000);
}
const hasSave = !!readSave();
$('playDesktop').onclick = () => begin(false, hasSave);
if (hasSave) {
  $('playDesktop').textContent = 'Continue on desktop'; $('enterVR').textContent = 'Continue in VR';
  const nb = document.createElement('button'); nb.textContent = 'New game'; nb.onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }; $('menu').insertBefore(nb, $('selectBtn'));
}
{
  const kick = document.querySelector('.kicker'); if (kick) kick.innerHTML = `Recovered footage &middot; Mount Harrow State Asylum &middot; Tape ${TAPE} of 4 &middot; ${TAPE === 2 ? 'The Male Ward' : 'Recovered Footage'}`;
  // the tape shelf
  const TAPES = [
    { n: 1, name: 'Tape 1: Recovered Footage', sub: 'Ground floor. Administration, the cafeteria, the morgue.' },
    { n: 2, name: 'Tape 2: The Male Ward', sub: 'The north building. Dormitory, chapel, surgical theater.' },
    { n: 3, name: 'Tape 3: The Basement', sub: 'Not yet recovered.', locked: true },
    { n: 4, name: 'Tape 4', sub: 'Not yet recovered.', locked: true },
  ];
  const status = (n) => {
    let done = false, sv = null; try { done = localStorage.getItem('asylumvr_done_t' + n) === '1'; sv = JSON.parse(localStorage.getItem('asylumvr_save_t' + n) || 'null'); } catch (e) {}
    if (sv) { const k = (sv.items || []).filter((i) => !i.startsWith('n')).length; const what = n === 1 ? `${sv.fuses || 0}/3 fuses` : `${k} key${k === 1 ? '' : 's'}`; const ago = Math.max(1, Math.round((Date.now() - sv.at) / 60000)); return ['prog', `IN PROGRESS · ${what} · saved ${ago < 60 ? ago + ' min' : Math.round(ago / 60) + ' h'} ago`]; }
    if (done) return ['done', 'COMPLETED'];
    return ['', 'NEW'];
  };
  const shelf = $('tapes');
  for (const tp of TAPES) {
    const b = document.createElement('button'); b.className = 'tape' + (tp.locked ? ' locked' : '') + (tp.n === TAPE ? ' loaded' : ''); b.disabled = !!tp.locked;
    const [cls, txt] = tp.locked ? ['', 'LOCKED'] : status(tp.n);
    b.innerHTML = `<span class="reels"><i></i><i></i></span><span class="label"><b>${tp.name}</b><small>${tp.sub}</small></span><span class="status ${tp.n === TAPE && !tp.locked ? 'now' : cls}">${tp.n === TAPE && !tp.locked ? 'LOADED · ' + txt : txt}</span>`;
    b.onclick = () => { if (tp.locked) return; if (tp.n === TAPE) { $('shelf').hidden = true; $('menu').hidden = false; document.querySelector('.vhs').classList.remove('selecting'); return; } setTimeout(() => { location.href = '?tape=' + tp.n; }, 650); };
    shelf.appendChild(b);
  }
  const vhs = document.querySelector('.vhs');
  $('selectBtn').onclick = () => { $('shelf').hidden = false; $('menu').hidden = true; $('how').hidden = true; vhs.classList.add('selecting'); };
  $('shelfBack').onclick = () => { $('shelf').hidden = true; $('menu').hidden = false; vhs.classList.remove('selecting'); };
}
$('howBtn').onclick = () => { $('how').hidden = !$('how').hidden; };
// reset progress: asks first, then wipes every save, completion flag and unlocked tape
$('resetBtn').onclick = () => { $('confirm').hidden = false; $('menu').hidden = true; $('how').hidden = true; };
$('resetNo').onclick = () => { $('confirm').hidden = true; $('menu').hidden = false; };
$('resetYes').onclick = () => {
  try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('asylumvr_')) localStorage.removeItem(k); } } catch (e) {}
  setTimeout(() => { location.href = location.pathname; }, 650);
};
// the title's sound: browsers only allow audio after you touch the page, so the theme starts on the first tap/click/key
function titleSound() { if (G.playing) return; sound.init(); sound.ready.then(() => sound.playMenu()); }
addEventListener('pointerdown', titleSound, { capture: true }); addEventListener('keydown', titleSound, { capture: true });
$('screen').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; if (b.classList.contains('tape')) sound.tapeLoad(); else sound.tapeClick(); }, true);
const vrBtn = $('enterVR');
if (!navigator.xr) { vrBtn.disabled = true; $('vrNote').textContent = 'WebXR not available here — open this page in the Meta Quest browser to play in VR.'; }
else navigator.xr.isSessionSupported('immersive-vr').then((ok) => { if (!ok) { vrBtn.disabled = true; $('vrNote').textContent = 'No VR headset found — play on desktop, or open this page on your Quest.'; } }).catch(() => {});
vrBtn.onclick = async () => {
  try {
    const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    await renderer.xr.setSession(s); veil.mesh.visible = true;
    s.addEventListener('visibilitychange', () => sound.wake && sound.wake()); s.addEventListener('selectstart', () => sound.wake && sound.wake());
    s.addEventListener('end', () => { veil.mesh.visible = false; capSlate.mesh.visible = false; });
    begin(true, hasSave);
  } catch (e) { $('vrNote').textContent = 'Could not start VR: ' + e.message; }
};
nvifyScene(); setInterval(nvifyScene, 3000);
$('loading').textContent = '';
setInterval(() => { if (!G.playing) { const s = Math.floor(performance.now() / 1000); $('titleTc').textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; } }, 250);

// ---------------------------------------------------------------- frame
const clock = new THREE.Clock();
const tmpQ = new THREE.Quaternion(), tmpV = new V(), tmpV2 = new V();
let zoomWheel = 1, readHold = 0;
let crashes = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (crashes++ < 20) console.error('frame error', e); } });
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const I = input.frame();
  const vr = renderer.xr.isPresenting;
  G.t += dt;
  if (!G.playing) { renderTitle(dt); return; }

  // menus
  if (I.pause && !G.reading) setPaused(!G.paused);
  if (G.paused) {
    if (vr) { if (I.interact) readHold = 0; if (renderer.xr.getSession()) for (const src of renderer.xr.getSession().inputSources) if (src.handedness === 'right' && src.gamepad && src.gamepad.buttons[0].pressed) readHold += dt; if (readHold > 2) { readHold = 0; setPaused(false); respawn(); } }
    draw(dt, vr, I); return;
  }
  if (G.reading) { if (I.interact || I.pause) closeRead(); draw(dt, vr, I); return; }
  if (I.notes && !vr) { setPaused(true); }
  if (I.notes && vr) { caption(objectiveText(), 4); }

  // the camcorder
  if (I.nv) { if (cam.toggleNV()) sound.nv(cam.nv); else { sound.click(); caption(cam.spares ? (vr ? 'Battery dead. X swaps a battery.' : 'Battery dead. R swaps a battery.') : 'Battery dead. Find more batteries.', 2.5); } }
  if (I.reload) { if (cam.reload()) { sound.battery(); caption('New battery.', 1.5); } else sound.click(); }
  // the camcorder is the view itself; right mouse (or the wheel) zooms on desktop
  cam.raised = true; cam.raise = 1;
  if (!vr) { if (I.zoom) zoomWheel = Math.max(1, Math.min(4, zoomWheel - I.zoom * 0.25)); const want = I.raise === true ? Math.max(2.5, zoomWheel) : zoomWheel; cam.zoom += (want - cam.zoom) * (1 - Math.exp(-dt * 6)); }
  else cam.zoom = 1;
  cam.update(dt, true);
  if (cam.battery < 0.2 && cam.nv) say('lowBattery');

  // the body
  walker.update(dt, I);
  updateHands(dt, vr);
  if (!walker.alive) {
    deadT += dt; if (deadT > 1.2) { $('dead').hidden = false; fadeTo(1); }
    if (deadT > 4.5) { G.deaths++; respawn(); }
  }
  if (tapeLogic) tapeLogic.update(dt);
  if (TAPE === 1 && !G.leftAdmin && plan.at(Math.floor(walker.pos.x / C), Math.floor(walker.pos.z / C)) !== Z.ADMIN && walker.pos.z > 0) { G.leftAdmin = true; }
  if (TAPE === 1 && G.leftAdmin && !G.said.has('dark') && G.t > 20 && !cam.nv) say('dark');
  if (TAPE === 1 && !G.sawPanel && walker.pos.distanceTo(panelPos.clone().setY(0)) < 3.5) { G.sawPanel = true; say('security'); }
  if (TAPE === 1 && !G.said.has('gateChained') && walker.pos.distanceTo(new V(cx(25.5), 0, cz(36))) < 3) say('gateChained');
  if (TAPE === 1 && G.gateOpen && walker.pos.z > cz(37.6) && !G.escaped) { G.escaped = true; ending(); }
  if (gateMesh && G.gateOpen) gateMesh.position.y = Math.min(2.9, gateMesh.position.y + dt * 0.6), space.gateBox = gateMesh.position.y > 2.2 ? null : space.gateBox;

  // interaction ray
  let origin, dir;
  if (vr && hands.right) { origin = hands.right.getWorldPosition(new V()); dir = new V(0, 0, -1).applyQuaternion(hands.right.getWorldQuaternion(tmpQ)); }
  else { origin = camera.getWorldPosition(new V()); dir = new V(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(tmpQ)); }
  const hid = walker.hidden; focus = walker.alive ? (hid ? { kind: 'unhide', label: () => walker.hidden ? (hid.k === 'locker' ? 'Leave locker' : 'Crawl out') : '' } : pick(origin, dir)) : null;
  if (walker.hidden && walker.hidden.k === 'strap') focus = { kind: 'strap', label: tapeLogic.strapLabel };
  if (G.strapped && tapeLogic && I.any) tapeLogic.struggle();
  if (I.interact && focus && focus.kind !== 'strap') { if (focus.kind === 'unhide') { walker.unhide(); sound.locker(false); } else use(focus); }
  if (walker.hidden && walker.hidden.k !== 'strap' && vr && (Math.abs(I.mx) + Math.abs(I.mz) > 1.3)) { walker.unhide(); sound.locker(false); }
  const lab = focus ? focus.label() : '';
  $('prompt').hidden = !lab || vr; $('prompt').textContent = lab ? (vr ? lab : `[E] ${lab}`) : '';
  if (vr && lab) { if (promptSlate.text !== lab) { promptSlate.text = lab; promptSlate.card([[lab, 52]], { top: 62 }); } promptSlate.mesh.visible = true; promptSlate.mesh.position.copy(origin).addScaledVector(dir, 0.35).add(tmpV.set(0, 0.06, 0)); promptSlate.mesh.lookAt(camera.getWorldPosition(tmpV2)); } else promptSlate.mesh.visible = false;

  // the world moves
  doors.update(dt);
  lights(dt);
  horrors.update(dt);
  scares.update(dt);
  dressing.update(dt, walker.pos, camera);
  updateObjectives(dt);
  if (capT > 0) { capT -= dt; if (capT <= 0) { $('caption').hidden = true; capSlate.mesh.visible = false; } }

  // sound follows your head
  camera.getWorldPosition(tmpV); camera.getWorldQuaternion(tmpQ);
  sound.listen(tmpV, tmpQ, dt, { fear: horrors.fear, chase: horrors.chase, chaseKind: horrors.chaseKind, exhaust: walker.exhaust, hurt: 1 - walker.health / 100, hidden: !!walker.hidden, pos: walker.pos, light: world.lightAt(walker.pos.x, walker.pos.z) });
  draw(dt, vr, I);
}
walker.onStep = (k, p) => { sound.step(k, plan.at(Math.floor(p.x / C), Math.floor(p.z / C))); horrors.heard(p.x, p.z, walker.noise); };

// the four light channels: S steady, A and B stutter, P comes up with the generator
let powerT = -1;
function lights(dt) {
  const t = G.t;
  const stutter = (seed) => { const n = Math.sin(t * 13.1 + seed) * Math.sin(t * 7.3 + seed * 2.1) + Math.sin(t * 31.7 + seed * 5); const off = Math.sin(t * 0.37 + seed) > 0.55 ? 0.02 : 1; return Math.max(0, Math.min(1, (n > -0.6 ? 1 : 0.05) * off * (0.85 + 0.15 * Math.sin(t * 120)))); };
  const out = horrors.lightsOut || horrors.blackout ? 0 : 1; LIGHT.S.value = horrors.blackout ? 0.02 : 1;
  LIGHT.A.value = stutter(1.3) * out; LIGHT.B.value = stutter(4.7) * out;
  if (G.power) { if (powerT < 0) powerT = 0; powerT += dt; LIGHT.P.value = powerT < 2.5 ? (Math.random() > 0.5 ? Math.min(1, powerT / 2.5) : 0.05) : 1; LIGHT.P.value *= out; }
  else LIGHT.P.value = 0;
  for (const f of Object.values(world.fixtureMats)) { const v = LIGHT[f.ch].value; f.m.color.copy(f.col).multiplyScalar(f.ch === 'S' ? 0.03 + v * 0.97 : 0.04 + v * 1.6); }
  for (const h of world.hazeCones) h.m.uniforms.k.value = LIGHT[h.ch].value;
}

let camFrame = 0;
function draw(dt, vr, I) {
  fade += (fadeGoal - fade) * (1 - Math.exp(-dt * 3));
  const t = G.t; const hurt = Math.max(0, 1 - walker.health / 100); const glitch = horrors.glitch || 0;
  if (vr) {
    // night vision: the infrared lamp rides on your head and every surface takes the green grade
    NVU.on.value = cam.nv ? 1 : 0; NVU.t.value = t;
    if (cam.nv) camera.layers.enable(EYE_LAYER); else camera.layers.disable(EYE_LAYER);
    camera.getWorldPosition(tmpV); camera.getWorldQuaternion(tmpQ); cam.aim(tmpV, tmpQ, 90); cam.setIR(cam.nv);
    for (const h of world.hazeCones) h.mesh.visible = !cam.nv;
    osdHud.visible = G.playing && !G.reading && !G.paused; cam.paintOSD(false, objT > 0 ? objectiveText() : '');
    veil.uniforms.t.value = t; veil.uniforms.hurt.value = hurt; veil.uniforms.fear.value = horrors.fear * S.grain; veil.uniforms.fade.value = fade; veil.uniforms.stat.value = horrors.static || 0;
    renderer.render(scene, camera);
    cam.setIR(false);
    return;
  }
  NVU.on.value = 0;
  // desktop: the whole view is tape
  const raised = true;
  $('osd').hidden = !G.playing;
  if (raised) {
    if (cam.nv) camera.layers.enable(EYE_LAYER); else camera.layers.disable(EYE_LAYER); camera.updateMatrixWorld();
    cam.aim(camera.getWorldPosition(tmpV), camera.getWorldQuaternion(tmpQ), 70); cam.setIR(cam.nv);
    $('tc').textContent = timecode(cam.clock); $('mode').textContent = cam.nv ? 'NIGHT SHOT' : cam.dead ? 'BATTERY EMPTY' : '';
    $('zoom').textContent = cam.zoom > 1.05 ? `ZOOM ${cam.zoom.toFixed(1)}x` : ''; $('spares').textContent = '';
    const bars = Math.ceil(cam.battery * 4); document.querySelectorAll('#osd .bat i').forEach((el, i) => el.classList.toggle('off', i >= bars)); document.querySelector('#osd .bat').classList.toggle('low', cam.battery < 0.2);
  } else { camera.layers.disable(EYE_LAYER); cam.setIR(false); }
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera); renderer.setRenderTarget(null);
  cam.setIR(false);
  const u = tape.uniforms; u.t.value = t; u.mode.value = raised ? (cam.nv ? 2 : 1) : 0; u.glitch.value = glitch; u.hurt.value = hurt; u.fear.value = horrors.fear * S.grain;
  u.battery.value = cam.battery; u.fade.value = fade; u.stat.value = horrors.static || 0; u.zoom.value = raised ? cam.zoom : 1; u.exposure.value = 2.6 * S.bright;
  renderer.render(tape.scene, tape.cam);
}

// the title: a slow drift through the dark lobby on tape
function renderTitle(dt) {
  const t = performance.now() / 1000;
  const tc = plan.titleCam || { x: 25.5, y: 31, yaw: Math.PI }; dolly.position.set(cx(tc.x) + Math.sin(t * 0.05) * 2, 0, cz(tc.y) + Math.cos(t * 0.04) * 1.5); camera.position.set(0, 1.6, 0); camera.rotation.set(-0.05, tc.yaw + Math.sin(t * 0.07) * 0.6, 0, 'YXZ');
  LIGHT.A.value = Math.sin(t * 9) > 0.3 ? 1 : 0.1;
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera); renderer.setRenderTarget(null);
  const u = tape.uniforms; u.t.value = t; u.mode.value = 1; u.fade.value = 0.1; u.glitch.value = Math.max(0, Math.sin(t * 0.7) - 0.9) * 6; u.exposure.value = 2.6 * S.bright; renderer.render(tape.scene, tape.cam);
}

function ending() {
  fadeTo(1); sound.duck(true);
  setTimeout(() => {
    G.playing = false; $('screen').hidden = false; sound.duck(false); sound.playMenu();
    document.querySelector('.osd-top .play').innerHTML = '&#9632;&#xFE0E; STOP';
    try { localStorage.removeItem(SAVE_KEY); localStorage.setItem('asylumvr_done_t' + TAPE, '1'); } catch (e) {}
    try { localStorage.setItem('asylumvr_tapes', String(Math.min(2, Math.max(unlocked, TAPE + 1)))); } catch (e) {}
    if (TAPE === 2) document.querySelector('.vhs').innerHTML = TAPE2.ENDING(G, timecode);
    else document.querySelector('.vhs').innerHTML = `<div class="end"><p class="kicker">Mount Harrow State Asylum</p><h1 class="logo">END OF TAPE 1</h1><p class="lede">The gate rose. The courtyard was full of patients, standing in the rain, waiting.<br>None of them were looking at the gate. They were looking at the north building.<br>Somebody behind you said your name.</p><p class="kicker">Deaths ${G.deaths} · Notes ${G.notes.length}/${Object.keys(NOTES).length} · Time ${timecode(G.t).slice(3, 8)}</p><nav class="menu"><button onclick="location.href='?tape=2'">Play Tape 2: The Male Ward</button><button onclick="location.href='?tape=1'">Rewind</button></nav></div>`;
    if (renderer.xr.isPresenting) renderer.xr.getSession().end();
  }, 2200);
}

// trailer / capture hook: render one frame from an arbitrary camera through the tape (dev tool only)
function renderTape(o) {
  const t = o.t; G.t = t; lights(o.dt || 1 / 30);
  dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0); camera.position.copy(o.pos);
  camera.up.set(0, 1, 0); camera.lookAt(o.look); if (o.roll) camera.rotateZ(o.roll); camera.fov = o.fov || 70; camera.aspect = o.aspect || camera.aspect; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  walker.pos.set(o.pos.x, 0, o.pos.z);
  dressing.update(o.dt || 1 / 30, walker.pos, camera);
  cam.nv = !!o.nv; if (o.nv) camera.layers.enable(EYE_LAYER); else camera.layers.disable(EYE_LAYER);
  cam.aim(camera.getWorldPosition(tmpV), camera.getWorldQuaternion(tmpQ), 70); cam.setIR(!!o.nv); if (o.nv && o.ir !== undefined) cam.ir.intensity = o.ir;
  for (const h of world.hazeCones) h.mesh.visible = true;
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera); renderer.setRenderTarget(null); cam.setIR(false);
  const u = tape.uniforms; u.t.value = t; u.mode.value = o.nv ? 2 : 1; u.glitch.value = o.glitch || 0; u.hurt.value = o.hurt || 0; u.fear.value = o.fear || 0; u.battery.value = 1; u.fade.value = o.fade || 0; u.stat.value = o.stat || 0; u.zoom.value = o.zoom || 1; u.exposure.value = 2.6 * (o.bright || 1);
  renderer.render(tape.scene, tape.cam);
}
function setCaptureSize(w, h) { renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); rtMain.dispose(); rtMain = new THREE.WebGLRenderTarget(Math.round(w * 0.85), Math.round(h * 0.85), { type: THREE.HalfFloatType }); tape.uniforms.src.value = rtMain.texture; tape.uniforms.aspect.value = w / h; }
window.__asy = { G, walker, renderTape, setCaptureSize, canvas, osdEl: $('osd'), cam, world, plan, doors, horrors, scene, camera, LIGHT, space, sound, renderer, use, interactables, scares, dressing, handL, handR, handLight, NVU,
  // test hook: step the game a few frames by hand (the pane may not be animating) and grab the picture
  snap(steps = 3, w = 560) { const I0 = { mx: 0, mz: 0, turn: 0, lookDx: 0, lookDy: 0 }; for (let i = 0; i < steps; i++) { walker.update(1 / 30, I0); doors.update(1 / 30); lights(1 / 30); horrors.update(1 / 30); dressing.update(1 / 30, walker.pos, camera);  } draw(1, false, I0);
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * canvas.height / canvas.width); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); } };

// Dread: every sound in the asylum, synthesized with Web Audio. A low
// building drone and ventilation hiss, drips, pipes, far-off screams and
// knocking, the buzz of dying tubes; your breath and heartbeat; strings
// when something chases you; voices built from formant filters (the
// brute sings, the doctor hums, patients mutter and scream); doors,
// lockers, footsteps on tile and concrete, the generator and the alarm.
import * as THREE from '../vendor/three.module.js';
import { Score } from './score.js?v=28';
import { sourceHash, keepGet, keepPut, packSound, unpackSound } from './keep.js?v=28';
import { renderMenuTheme, THEME_LOOP } from './theme.js?v=28';

const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const VOWELS = { a: [800, 1150, 2900], e: [400, 2000, 2600], i: [300, 2300, 3000], o: [450, 800, 2830], u: [325, 700, 2700], m: [250, 1000, 2200], uh: [600, 1040, 2250] };
const rnd = (a, b) => a + Math.random() * (b - a);

export class Sound {
  constructor() { this.ready = Promise.resolve(); this.on = false; this.timers = {}; this.live = 0; this.cap = QUEST ? 22 : 64; this.vip = false; this.lastResume = 0; }
  init() {
    if (this.on) return; this.on = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    // the headset's audio thread is weak: bigger buffers there, so it never runs dry
    let ctx; try { ctx = new AC({ latencyHint: QUEST ? 'playback' : 'interactive' }); } catch (e) { ctx = new AC(); } this.ctx = ctx;
    // the Quest browser suspends audio when the session or focus changes; bring it back on any input
    const wake = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend', 'visibilitychange', 'focus']) addEventListener(ev, wake, true);
    ctx.onstatechange = () => { if (ctx.state !== 'running' && ctx.state !== 'closed') setTimeout(wake, 200); };
    this.wake = wake;
    this.ready = ctx.resume ? ctx.resume() : Promise.resolve();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.duckG = ctx.createGain(); this.duckG.connect(this.master); this.vipDry = ctx.createGain(); this.vipDry.connect(this.master);
    // a long, damp hall reverb
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(QUEST ? 1.7 : 3.2, QUEST ? 2.2 : 2.6); this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.5; this.verbIn.connect(this.verb); this.verb.connect(this.duckG);
    this.dry = ctx.createGain(); this.dry.connect(this.duckG);
    this.noiseBuf = this.noise(2, 'white'); this.brownBuf = this.noise(4, 'brown');
    if (this.rec && this.rec.amb) this.ambienceLoops(); else this.ambience();
    this.body();
  }
  impulse(sec, decay) {
    const ctx = this.ctx, n = Math.floor(sec * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1); } }
    return b;
  }
  noise(sec, kind) {
    const ctx = this.ctx, n = Math.floor(sec * ctx.sampleRate), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  src(buf, loop = false) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = loop; if (!loop) s.loopStart = 0; return s; }
  // route a node out: positional (HRTF panner) or flat, with reverb send
  out(node, pos, { verb = 0.35, gain = 1, ref = 1.5, roll = 1.2 } = {}) {
    const g = this.ctx.createGain(); g.gain.value = gain; node.connect(g);
    let tail = g;
    if (pos) { const p = this.ctx.createPanner(); p.panningModel = QUEST ? 'equalpower' : 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 60; setPos(p, pos); g.connect(p); tail = p; }
    tail.connect(this.vip ? this.vipDry : this.dry); const s = this.ctx.createGain(); s.gain.value = verb * (this.vip ? 0.6 : 1); tail.connect(s); s.connect(this.verbIn);
    return g;
  }
  env(param, t, a, peak, d, end = 0.0001) { param.cancelScheduledValues(t); param.setValueAtTime(0.0001, t); param.exponentialRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(end, t + a + d); }
  get t() { return this.ctx.currentTime; }
  // a burst of filtered noise
  // a budget of simultaneous sounds; screams, hits and scares always get through
  take(dur) { if (this.live >= this.cap && !this.vip) return false; this.live++; setTimeout(() => { this.live--; }, (dur + 0.25) * 1000); return true; }
  burst(pos, { f = 800, q = 1, type = 'bandpass', dur = 0.1, gain = 0.5, a = 0.002, verb = 0.3, brown = false, sweep = 0, delay = 0 } = {}) {
    if (!this.on || !this.take(dur + delay)) return; const t = this.t + delay; const s = this.src(brown ? this.brownBuf : this.noiseBuf); const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f * sweep), t + dur);
    const g = this.ctx.createGain(); s.connect(fl); fl.connect(g); this.env(g.gain, t, a, gain, dur); this.out(g, pos, { verb }); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
  }
  tone(pos, { f = 200, type = 'sine', dur = 0.3, gain = 0.3, a = 0.004, f2 = 0, verb = 0.3, delay = 0, detune = 0 } = {}) {
    if (!this.on || !this.take(dur + delay)) return; const t = this.t + delay; const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = this.ctx.createGain(); o.connect(g); this.env(g.gain, t, a, gain, dur); this.out(g, pos, { verb }); o.start(t); o.stop(t + a + dur + 0.05);
  }
  // metallic: a few inharmonic partials
  clang(pos, f = 300, gain = 0.25, dur = 0.8) { for (const [k, gg] of [[1, 1], [1.58, 0.6], [2.74, 0.45], [4.1, 0.3], [5.4, 0.2]]) this.tone(pos, { f: f * k * rnd(0.99, 1.01), dur: dur * rnd(0.6, 1), gain: gain * gg * 0.4, verb: 0.5 }); this.burst(pos, { f: 3000, q: 0.7, dur: 0.03, gain: gain * 0.6 }); }

  // ---------------------------------------------------------- voices
  // a formant voice: f0 contour, vowels over time, breathiness, roughness
  voiceSynth(pos, { f0 = 120, f1 = null, dur = 0.6, vowels = ['a'], breath = 0.2, rough = 0, gain = 0.4, vib = 5, vibD = 0.02, verb = 0.4, jitter = 0.02, delay = 0, a = 0.04 } = {}) {
    if (!this.on || !this.take(dur + delay)) return; const ctx = this.ctx; const t = this.t + delay;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = vib; const lg = ctx.createGain(); lg.gain.value = f0 * vibD; lfo.connect(lg); lg.connect(o.frequency);
    const jit = this.src(this.brownBuf, true); const jg = ctx.createGain(); jg.gain.value = f0 * jitter * 8; jit.connect(jg); jg.connect(o.frequency);
    const mix = ctx.createGain(); mix.gain.value = 1 - breath;
    let srcNode = o;
    if (rough) { const ws = ctx.createWaveShaper(); const n = 256, cur = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; cur[i] = Math.tanh(x * (1 + rough * 8)); } ws.curve = cur; o.connect(ws); srcNode = ws;
      const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = f0 / 2; const sg = ctx.createGain(); sg.gain.value = rough * 0.4; sub.connect(sg); sg.connect(mix); sub.start(t); sub.stop(t + dur + 0.2); }
    srcNode.connect(mix);
    const nz = this.src(this.noiseBuf, true); const ng = ctx.createGain(); ng.gain.value = breath * 0.6; nz.connect(ng);
    const sum = ctx.createGain(); mix.connect(sum); ng.connect(sum);
    const outG = ctx.createGain(); outG.gain.value = 0;
    const seg = dur / vowels.length;
    for (let k = 0; k < 3; k++) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [9, 12, 14][k];
      vowels.forEach((v, i) => { const F = VOWELS[v] || VOWELS.a; const ff = F[k] * (f0 > 300 ? 1.15 : 1); if (i === 0) bp.frequency.setValueAtTime(ff, t); else bp.frequency.linearRampToValueAtTime(ff, t + seg * i); });
      const fg = ctx.createGain(); fg.gain.value = [1, 0.55, 0.3][k]; sum.connect(bp); bp.connect(fg); fg.connect(outG);
    }
    outG.gain.setValueAtTime(0.0001, t); outG.gain.exponentialRampToValueAtTime(gain, t + a); outG.gain.setValueAtTime(gain, t + Math.max(a, dur - 0.08)); outG.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    this.out(outG, pos, { verb, ref: 2 });
    o.start(t); lfo.start(t); jit.start(t, Math.random() * 3); nz.start(t, Math.random()); const end = t + dur + 0.15; o.stop(end); lfo.stop(end); jit.stop(end); nz.stop(end);
  }
  syllables(pos, n, base, opts = {}) { let d = 0; const V = Object.keys(VOWELS); for (let i = 0; i < n; i++) { const dur = rnd(0.12, 0.3); this.voiceSynth(pos, { f0: base * rnd(0.85, 1.2), f1: base * rnd(0.8, 1.1), dur, vowels: [V[(Math.random() * V.length) | 0], V[(Math.random() * V.length) | 0]], delay: d, a: 0.02, ...opts }); d += dur + rnd(0.02, 0.15); } return d; }
  voice(kind, what, pos) {
    if (!this.on) return; const p = pos.clone(); p.y = 1.6;
    if (kind === 'brute') {
      if (what === 'idle') {   // Kroft sings: a low wandering nursery tune, out of key
        const notes = [0, 2, 3, 2, 0, -2, 0, 3, 5, 3]; let d = 0; const base = 92;
        const k = (Math.random() * 4) | 0; for (let i = 0; i < 5; i++) { const n = notes[(k + i) % notes.length]; const dur = rnd(0.35, 0.7); this.voiceSynth(p, { f0: base * Math.pow(2, n / 12), dur, vowels: ['o', 'u'], breath: 0.25, rough: 0.25, gain: 0.5, vib: 4, vibD: 0.03, delay: d, a: 0.08 }); d += dur + 0.05; }
      } else if (what === 'alert') this.voiceSynth(p, { f0: 85, f1: 70, dur: 0.7, vowels: ['uh', 'o'], rough: 0.6, breath: 0.3, gain: 0.7 });
      else if (what === 'chase' || what === 'attack') { this.voiceSynth(p, { f0: 110, f1: 75, dur: what === 'chase' ? 1.4 : 0.6, vowels: ['a', 'o'], rough: 0.95, breath: 0.35, gain: 1.0, vib: 9, vibD: 0.05 }); }
      else if (what === 'pant') this.breathAt(p, 0.45, 0.9, 260);
      else if (what === 'lost') this.voiceSynth(p, { f0: 80, f1: 65, dur: 1.2, vowels: ['o', 'm'], rough: 0.4, gain: 0.6 });
    } else if (kind === 'surgeon') {
      if (what === 'idle') {   // Dr. Voss hums while he works
        const tune = [7, 5, 4, 5, 7, 7, 7, 5, 5, 5, 7, 10, 10]; let d = 0; const base = 150;
        for (let i = 0; i < 7; i++) { const dur = rnd(0.3, 0.5); this.voiceSynth(p, { f0: base * Math.pow(2, tune[i] / 12), dur, vowels: ['m'], breath: 0.15, gain: 0.35, vib: 5, vibD: 0.012, delay: d, a: 0.05, verb: 0.55 }); d += dur + 0.03; }
      } else if (what === 'alert') this.voiceSynth(p, { f0: 130, f1: 160, dur: 0.5, vowels: ['m', 'm'], gain: 0.5 });
      else if (what === 'chase') { this.syllables(p, 4, 135, { gain: 0.6, rough: 0.15 }); this.tone(p, { f: 2400, dur: 0.6, gain: 0.05, type: 'sawtooth', f2: 2200 }); }
      else if (what === 'attack') this.voiceSynth(p, { f0: 160, f1: 120, dur: 0.4, vowels: ['uh'], gain: 0.7, rough: 0.3 });
      else if (what === 'pant') this.breathAt(p, 0.25, 0.7, 500);
      else if (what === 'lost') this.syllables(p, 5, 125, { gain: 0.4 });
    } else if (kind === 'orderly') {
      if (what === 'idle' || what === 'lost') {   // Pell whistles on his rounds: a cheerful tune that never resolves
        const tune = [0, 4, 7, 12, 11, 7, 4, 5, 4, 2, 0, -1]; let d = 0;
        for (let i = 0; i < 9; i++) { const n = tune[(i + (what === 'lost' ? 4 : 0)) % tune.length]; const dur = i % 3 === 2 ? 0.42 : 0.2; const f = 1180 * Math.pow(2, n / 12); this.tone(p, { f, f2: f * 1.01, dur, gain: 0.09, type: 'sine', a: 0.03, delay: d, verb: 0.55 }); this.burst(p, { f: f * 1.02, q: 18, dur, gain: 0.04, delay: d, verb: 0.5 }); d += dur + 0.04; }
      } else if (what === 'alert') this.voiceSynth(p, { f0: 140, f1: 190, dur: 0.6, vowels: ['m', 'uh'], gain: 0.5, breath: 0.3 });
      else if (what === 'chase') {   // "rise and shine!" in a sing-song, then a laugh
        let d = 0; for (const [f0, v1, v2, dur] of [[190, 'a', 'i', 0.22], [210, 'i', 'i', 0.12], [260, 'e', 'a', 0.16], [240, 'a', 'i', 0.4]]) { this.voiceSynth(p, { f0, f1: f0 * 1.1, dur, vowels: [v1, v2], gain: 0.8, rough: 0.35, breath: 0.2, delay: d, a: 0.02 }); d += dur + 0.05; }
        for (let i = 0; i < 5; i++) this.voiceSynth(p, { f0: 230 - i * 10, dur: 0.11, vowels: ['a'], gain: 0.55, breath: 0.6, rough: 0.4, delay: d + 0.15 + i * 0.15, a: 0.01 });
      }
      else if (what === 'attack') this.voiceSynth(p, { f0: 200, f1: 150, dur: 0.4, vowels: ['a', 'uh'], gain: 0.8, rough: 0.6 });
      else if (what === 'pant') this.breathAt(p, 0.3, 0.6, 520);
    } else if (kind === 'rocker') {
      if (what === 'mutter') this.syllables(p, 4 + ((Math.random() * 5) | 0), rnd(100, 160), { gain: 0.3, breath: 0.5, verb: 0.5 });
      else if (what === 'scream') this.voiceSynth(p, { f0: rnd(500, 700), f1: rnd(800, 1000), dur: 1.3, vowels: ['a', 'i', 'e'], rough: 0.5, breath: 0.3, gain: 0.9, vib: 7, vibD: 0.04 });
    } else if (kind === 'eater') {
      if (what === 'chew') { for (let i = 0; i < 4; i++) { this.burst(p, { f: rnd(300, 900), q: 3, dur: rnd(0.05, 0.12), gain: 0.35, delay: i * rnd(0.12, 0.25), verb: 0.2 }); this.burst(p, { f: rnd(120, 220), q: 2, dur: 0.18, gain: 0.3, brown: true, delay: i * 0.2 + 0.05 }); } }
      else if (what === 'chase' || what === 'alert') this.voiceSynth(p, { f0: 300, f1: 180, dur: 0.9, vowels: ['i', 'a'], rough: 0.8, breath: 0.5, gain: 0.8 });
      else if (what === 'attack') this.voiceSynth(p, { f0: 260, dur: 0.4, vowels: ['a'], rough: 0.9, gain: 0.8 });
      else if (what === 'pant') this.breathAt(p, 0.3, 0.5, 700);
    } else if (kind === 'patient') {
      if (what === 'idle') this.syllables(p, 3 + ((Math.random() * 4) | 0), rnd(110, 150), { gain: 0.3, breath: 0.4 });
      else if (what === 'chase' || what === 'alert') this.voiceSynth(p, { f0: 220, f1: 420, dur: 1.0, vowels: ['e', 'a'], rough: 0.6, breath: 0.4, gain: 0.8 });
      else if (what === 'attack') this.voiceSynth(p, { f0: 300, dur: 0.35, vowels: ['a'], rough: 0.7, gain: 0.8 });
      else if (what === 'pant') this.breathAt(p, 0.3, 0.6, 600);
      else if (what === 'lost') this.syllables(p, 4, 130, { gain: 0.3 });
    }
  }
  farScream(p) { this.voiceSynth(p, { f0: rnd(450, 650), f1: rnd(300, 500), dur: rnd(1.2, 2.2), vowels: ['a', 'e', 'o'], rough: 0.5, breath: 0.3, gain: 0.35, verb: 0.95 }); }
  breathAt(p, gain, dur, f) { this.burst(p, { f, q: 1.2, dur, gain, a: dur * 0.3, verb: 0.2 }); }

  // ---------------------------------------------------------- the building
  ambience() {
    const ctx = this.ctx;
    // drone
    const dg = ctx.createGain(); dg.gain.value = 0.07; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.Q.value = 3; lp.connect(dg); this.out(dg, null, { verb: 0.2 });
    for (const [f, type] of [[41, 'sawtooth'], [43.6, 'sawtooth'], [61.7, 'sine'], [82.3, 'triangle']]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(lp); o.start(); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lg = ctx.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    // ventilation hiss: the muggy air moving
    const air = this.src(this.brownBuf, true); const ab = ctx.createBiquadFilter(); ab.type = 'bandpass'; ab.frequency.value = 340; ab.Q.value = 0.6; const ag = ctx.createGain(); ag.gain.value = 0.05; air.connect(ab); ab.connect(ag); this.out(ag, null, { verb: 0.3 }); air.start();
    this.droneG = dg;
    // fear bed: high strings scrape and a sub pulse rise with fear
    const fg = ctx.createGain(); fg.gain.value = 0; this.fearG = fg; const fb = ctx.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = 2400; fb.Q.value = 2; fb.connect(fg); this.out(fg, null, { verb: 0.6 });
    for (const f of [1567, 1661, 1760.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const tr = ctx.createOscillator(); tr.frequency.value = rnd(5, 8); const tg = ctx.createGain(); tg.gain.value = 6; tr.connect(tg); tg.connect(o.frequency); o.connect(fb); o.start(); tr.start(); }
  }
  body() {
    // your breath and your heart (not positional)
    this.heartT = 0; this.breathT = 0;
  }

  // ---------------------------------------------------------- per frame
  listen(pos, quat, dt, st) {
    if (!this.on) return; const L = this.ctx.listener; const t = this.t;
    if (this.ctx.state !== 'running' && performance.now() - this.lastResume > 500) { this.lastResume = performance.now(); this.wake(); }
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(quat), u = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    if (L.positionX) { L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02); L.forwardX.setTargetAtTime(f.x, t, 0.02); L.forwardY.setTargetAtTime(f.y, t, 0.02); L.forwardZ.setTargetAtTime(f.z, t, 0.02); L.upX.setTargetAtTime(u.x, t, 0.02); L.upY.setTargetAtTime(u.y, t, 0.02); L.upZ.setTargetAtTime(u.z, t, 0.02); }
    else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
    this.music(st.chaseKind, st.chase);
    this.fearG.gain.setTargetAtTime(Math.max(0, st.fear - 0.3) * (this.fearLoop ? 1.6 : 0.05), t, 0.6);
    // heart
    const fear = Math.max(st.fear, st.hurt * 0.8, st.hidden ? 0.45 : 0);
    if (fear > 0.25) { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 60 / (70 + fear * 90); const g = 0.25 + fear * 0.5; this.tone(null, { f: 58, f2: 40, dur: 0.14, gain: g, verb: 0 }); this.tone(null, { f: 52, f2: 36, dur: 0.12, gain: g * 0.7, verb: 0, delay: 0.16 }); } }
    // breath: harder after running, shaky when scared, held when hiding
    const ex = Math.max(st.exhaust, st.fear * 0.6);
    this.breathT -= dt;
    if (this.breathT <= 0) {
      const rate = 3.4 - ex * 2.2; this.breathT = rate * (st.hidden ? 1.6 : 1);
      const g = (0.04 + ex * 0.22) * (st.hidden ? 0.5 : 1);
      this.burst(null, { f: 900 + ex * 400, q: 0.8, dur: rate * 0.35, gain: g, a: rate * 0.15, verb: 0.05 });
      this.burst(null, { f: 600 + ex * 300, q: 0.8, dur: rate * 0.4, gain: g * 0.8, a: rate * 0.08, verb: 0.05, delay: rate * 0.45 });
      if (ex > 0.6 && Math.random() < 0.3) this.voiceSynth(null, { f0: 120, dur: 0.25, vowels: ['uh'], breath: 0.8, gain: 0.08, delay: rate * 0.45 });
    }
    // the building, now and then
    this.every('drip', 2, 7, () => { const p = pos.clone().add(new THREE.Vector3(rnd(-6, 6), 2.5, rnd(-6, 6))); const f0 = rnd(1200, 2600); this.tone(p, { f: f0, f2: f0 * 0.6, dur: 0.08, gain: 0.12, verb: 0.6 }); });
    this.every('groan', 12, 30, () => { const p = pos.clone().add(new THREE.Vector3(rnd(-30, 30), 3, rnd(-30, 30))); this.burst(p, { f: rnd(120, 260), q: 18, dur: rnd(1.5, 3), gain: 0.35, a: 0.6, sweep: 0.5, verb: 0.9, brown: true }); });
    this.every('scream', 35, 80, () => this.farScream(pos.clone().add(new THREE.Vector3(rnd(-35, 35), 2, rnd(-35, 35)))));
    this.every('knock', 20, 50, () => { const p = pos.clone().add(new THREE.Vector3(rnd(-15, 15), 1.5, rnd(-15, 15))); for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) this.tone(p, { f: 90, f2: 60, dur: 0.1, gain: 0.35, delay: i * rnd(0.25, 0.4), verb: 0.7 }); });
    this.every('pipe', 15, 40, () => { const p = pos.clone().add(new THREE.Vector3(rnd(-12, 12), 3, rnd(-12, 12))); this.clang(p, rnd(140, 260), 0.25, 2.2); });
    this.every('whisper', 25, 60, () => { if (st.fear < 0.2) return; const p = pos.clone().add(new THREE.Vector3(rnd(-2, 2), 1.6, rnd(-2, 2))); this.syllables(p, 5, 90, { breath: 0.95, gain: 0.25, verb: 0.3 }); });
  }
  every(k, a, b, fn) { const now = this.t; if (this.timers[k] === undefined) this.timers[k] = now + rnd(a, b) * 0.5; if (now >= this.timers[k]) { this.timers[k] = now + rnd(a, b); fn(); } }
  duck(on) { if (this.on) this.duckG.gain.setTargetAtTime(on ? 0.15 : 1, this.t, 0.2); }

  // ---------------------------------------------------------- one-shots
  step(k, zone) {
    if (!this.on) return; const hard = zone === 4 || zone === 5 ? 1 : zone === 6 || zone === 11 ? 0.5 : zone === 8 || zone === 10 ? 0.3 : 0.7;
    const g = 0.06 + k * 0.22;
    this.burst(null, { f: 180 + hard * 200, q: 1, dur: 0.06, gain: g, type: 'lowpass', brown: true, verb: 0.25 });
    // a heel on a hard floor: a short, tight click, no hiss (the old hiss sounded like rustling)
    this.burst(null, { f: 650 + hard * 450, q: 3.5, dur: 0.016, gain: g * (0.15 + hard * 0.3), delay: 0.022, verb: 0.15 });
  }
  footstep(kind, pos, speed) {
    const p = pos.clone(); p.y = 0.1; const heavy = kind === 'brute' ? 1 : kind === 'surgeon' ? 0.6 : 0.35; const run = speed > 2 ? 1.4 : 1;
    this.tone(p, { f: 70 * (1.4 - heavy * 0.4), f2: 40, dur: 0.12, gain: 0.35 * heavy * run, verb: 0.35 });
    this.burst(p, { f: 400, q: 0.8, dur: 0.07, gain: 0.25 * heavy * run, brown: true });
    if (kind === 'brute' && Math.random() < 0.7) for (let i = 0; i < 3; i++) this.tone(p.clone().setY(0.8), { f: rnd(2200, 4200), dur: 0.08, gain: 0.04, delay: 0.03 + i * 0.03 });   // chains
    if (kind === 'surgeon') this.burst(p, { f: 3500, q: 3, dur: 0.02, gain: 0.08 });   // hard shoes
  }
  door(d, kind, x, z) {
    const p = new THREE.Vector3(x, 1.1, z); const metal = d.metal;
    if (kind === 'slam') { this.tone(p, { f: 55, f2: 35, dur: 0.5, gain: 0.8, verb: 0.7 }); this.burst(p, { f: 300, q: 0.7, dur: 0.25, gain: 0.7, brown: true }); if (metal) this.clang(p, 180, 0.5, 1.4); return; }
    // creak: a rubbing, stick-slip squeal
    const ctx = this.ctx; const t = this.t; const o = ctx.createOscillator(); o.type = 'sawtooth'; const base = metal ? rnd(120, 180) : rnd(70, 130); o.frequency.setValueAtTime(base, t);
    for (let i = 1; i < 8; i++) o.frequency.linearRampToValueAtTime(base * rnd(0.7, 1.6), t + i * 0.12);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = metal ? 1400 : 900; bp.Q.value = 6; const g = ctx.createGain(); o.connect(bp); bp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.08); g.gain.setValueAtTime(0.3, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    this.out(g, p, { verb: 0.5 }); o.start(t); o.stop(t + 1.1);
    this.burst(p, { f: 2000, q: 2, dur: 0.04, gain: 0.25, delay: kind === 'close' ? 0.85 : 0 });
    if (kind === 'close') this.tone(p, { f: 80, f2: 50, dur: 0.18, gain: 0.35, delay: 0.85 });
  }
  rattle(x, z) { const p = new THREE.Vector3(x, 1.1, z); for (let i = 0; i < 4; i++) this.burst(p, { f: 1800, q: 3, dur: 0.04, gain: 0.3, delay: i * 0.07 }); this.clang(p, 420, 0.12, 0.3); }
  locker(inOut, kind = 'locker', x, z) { const p = x !== undefined ? new THREE.Vector3(x, 1.2, z) : null; if (kind === 'locker') { this.clang(p, 260, 0.2, 0.6); this.burst(p, { f: 2600, q: 3, dur: 0.08, gain: 0.2 }); } else { this.burst(p, { f: 300, q: 0.7, dur: 0.4, gain: 0.25, brown: true }); this.tone(p, { f: 300, f2: 200, dur: 0.3, gain: 0.05, type: 'sawtooth' }); } }
  lockerRip() { this.clang(null, 200, 0.7, 1.2); this.tone(null, { f: 50, f2: 30, dur: 0.6, gain: 0.8 }); this.jump('rip'); }
  pickup(k) { if (k === 'paper') { for (let i = 0; i < 6; i++) this.burst(null, { f: rnd(2000, 5000), q: 1, dur: 0.05, gain: 0.08, delay: i * 0.05 }); } else if (k === 'battery') { this.burst(null, { f: 3000, q: 2, dur: 0.02, gain: 0.2 }); this.burst(null, { f: 2500, q: 2, dur: 0.02, gain: 0.2, delay: 0.08 }); } else this.clang(null, 900, 0.12, 0.4); }
  battery() { this.burst(null, { f: 2800, q: 3, dur: 0.03, gain: 0.25 }); this.burst(null, { f: 1800, q: 3, dur: 0.04, gain: 0.25, delay: 0.25 }); this.tone(null, { f: 2000, dur: 0.06, gain: 0.08, delay: 0.5 }); }
  nv(on) { this.tone(null, { f: on ? 2200 : 1600, dur: 0.06, gain: 0.08 }); this.tone(null, { f: on ? 300 : 900, f2: on ? 900 : 300, dur: 0.35, gain: 0.03, type: 'sawtooth' }); }
  click() { this.burst(null, { f: 3000, q: 4, dur: 0.02, gain: 0.15 }); }
  mutter() { if (!this.on) return; this.syllables(null, 4, 115, { breath: 0.85, gain: 0.08, verb: 0.05 }); }
  generator(pos) {
    const p = pos.clone(); const ctx = this.ctx; const t = this.t;
    for (let i = 0; i < 3; i++) { this.tone(p, { f: 60, f2: 180, dur: 0.6, gain: 0.3, type: 'sawtooth', delay: i * 0.8 }); this.burst(p, { f: 200, q: 1, dur: 0.3, gain: 0.5, brown: true, delay: i * 0.8 + 0.5 }); }
    // the engine runs from now on
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 29; const am = ctx.createOscillator(); am.frequency.value = 14.5; const ag = ctx.createGain(); ag.gain.value = 0.5; am.connect(ag);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const g = ctx.createGain(); g.gain.value = 0.0001; ag.connect(g.gain); o.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t + 2.3); g.gain.exponentialRampToValueAtTime(0.5, t + 3);
    this.out(g, p, { verb: 0.3, ref: 3, roll: 0.8 }); o.start(t + 2.3); am.start(t + 2.3);
    // and every light on the main circuit hums
    const hum = ctx.createOscillator(); hum.type = 'square'; hum.frequency.value = 120; const hb = ctx.createBiquadFilter(); hb.type = 'bandpass'; hb.frequency.value = 240; hb.Q.value = 5; const hg = ctx.createGain(); hg.gain.value = 0.0001; hum.connect(hb); hb.connect(hg); this.out(hg, null, { verb: 0.2 }); hum.start(t + 2.5); hg.gain.setTargetAtTime(0.012, t + 2.6, 0.5);
    this.jump('power', 2.5);
  }
  gate() {
    const ctx = this.ctx; const t = this.t;
    // two-tone alarm for twenty seconds
    const o = ctx.createOscillator(); o.type = 'square'; const g = ctx.createGain(); g.gain.value = 0.07; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2; o.connect(bp); bp.connect(g); this.out(g, null, { verb: 0.7 });
    for (let i = 0; i < 40; i++) o.frequency.setValueAtTime(i % 2 ? 660 : 880, t + i * 0.5); g.gain.setValueAtTime(0.07, t + 19.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 20); o.start(t); o.stop(t + 20.1);
    for (let i = 0; i < 12; i++) this.burst(null, { f: rnd(1500, 3000), q: 2, dur: 0.05, gain: 0.15, delay: 1 + i * 0.25 });
    this.tone(null, { f: 50, f2: 90, dur: 4, gain: 0.25, type: 'sawtooth', delay: 0.5 });
  }
  hit(kind) { this.tone(null, { f: 80, f2: 40, dur: 0.3, gain: 0.9, verb: 0.2 }); this.burst(null, { f: 1200, q: 0.8, dur: 0.12, gain: 0.7 }); this.voiceSynth(null, { f0: 140, f1: 110, dur: 0.35, vowels: ['uh', 'a'], breath: 0.4, rough: 0.3, gain: 0.35, verb: 0.05 }); }
  whoosh(pos) { this.burst(pos.clone().setY(1.5), { f: 600, q: 0.8, dur: 0.25, gain: 0.4, sweep: 3, a: 0.08 }); }
  kill(kind) { this.jump('kill'); for (let i = 0; i < 4; i++) { this.tone(null, { f: 70, f2: 35, dur: 0.25, gain: 0.8, delay: 0.5 + i * 0.28 }); this.burst(null, { f: 500, q: 0.6, dur: 0.2, gain: 0.6, brown: true, delay: 0.5 + i * 0.28 }); } this.voiceSynth(null, { f0: 180, f1: 450, dur: 1.4, vowels: ['a', 'o'], breath: 0.4, rough: 0.6, gain: 0.5, delay: 0.3, verb: 0.1 }); }
  stinger() { this.jump('sting'); }
  // the jumpscare hit: screeching strings, a scream of noise, a boom
  jump(kind = 'sting', delay = 0) {
    if (!this.on) return; const big = kind === 'kill' || kind === 'rip' || kind === 'scare';
    // screeching string cluster sliding up
    for (let i = 0; i < (big ? 10 : 5); i++) { const f = rnd(500, 1500); this.tone(null, { f, f2: f * rnd(1.4, 2.4), dur: big ? 1.5 : 0.8, gain: big ? 0.16 : 0.07, type: 'sawtooth', a: 0.005, delay, detune: rnd(-50, 50), verb: 0.5 }); }
    // a slam of full-band noise and a sub drop that you feel
    this.burst(null, { f: 2500, q: 0.4, dur: big ? 0.9 : 0.4, gain: big ? 0.9 : 0.3, a: 0.002, delay, sweep: 0.3 });
    this.tone(null, { f: 55, f2: 22, dur: 1.4, gain: big ? 1.3 : 0.6, delay, verb: 0.4 });
    if (big) {
      this.tone(null, { f: 110, f2: 40, dur: 0.6, gain: 0.9, type: 'square', delay, verb: 0.2 });
      this.clang(null, rnd(90, 140), 0.6, 1.8);
      this.voiceSynth(null, { f0: rnd(700, 900), f1: rnd(400, 600), dur: 1.0, vowels: ['a', 'i', 'a'], rough: 1, breath: 0.35, gain: 1.1, vib: 11, vibD: 0.06, delay, a: 0.005, verb: 0.3 });
      this.voiceSynth(null, { f0: rnd(250, 330), f1: rnd(150, 200), dur: 1.2, vowels: ['a', 'o'], rough: 1, breath: 0.5, gain: 0.9, vib: 7, vibD: 0.05, delay: delay + 0.03, a: 0.005, verb: 0.3 });
    }
  }
  // the building goes quiet just before something happens
  hush(sec) { if (!this.on) return; const t = this.t; this.duckG.gain.cancelScheduledValues(t); this.duckG.gain.setTargetAtTime(0.06, t, 0.25); this.duckG.gain.setTargetAtTime(1, t + sec, 0.05); }
  scream(pos, k = 1) { this.voiceSynth(pos, { f0: rnd(550, 750), f1: rnd(900, 1100), dur: 1.1 * k, vowels: ['a', 'i'], rough: 0.7, breath: 0.3, gain: 1.0, vib: 8, vibD: 0.05, verb: 0.4 }); }
  thud(pos, k = 1) { this.tone(pos, { f: 70, f2: 35, dur: 0.4, gain: 0.9 * k, verb: 0.5 }); this.burst(pos, { f: 400, q: 0.6, dur: 0.25, gain: 0.7 * k, brown: true }); }
  squelch(pos, k = 1) { for (let i = 0; i < 3; i++) this.burst(pos, { f: rnd(150, 400), q: 4, dur: 0.15, gain: 0.4 * k, brown: true, delay: i * 0.09 }); }
  fliesAt(pos, k) { if (!this.on) return; if (!this.fly) { this.fly = this.flies(pos); this.flyP = this.fly.panner; } if (this.flyP) setPos(this.flyP, pos); this.fly.gain.setTargetAtTime(0.05 * k, this.t, 0.3); }
  flies(pos) { const ctx = this.ctx; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 190; const l = ctx.createOscillator(); l.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 25; l.connect(lg); lg.connect(o.frequency); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 3; const g = ctx.createGain(); g.gain.value = 0; o.connect(bp); bp.connect(g); const p = ctx.createPanner(); p.panningModel = QUEST ? 'equalpower' : 'HRTF'; p.refDistance = 0.6; p.rolloffFactor = 2.2; setPos(p, pos); g.connect(p); p.connect(this.dry); o.start(); l.start(); g.panner = p; return g; }
  buzz(pos) { const ctx = this.ctx; const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 120; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 4; const g = ctx.createGain(); g.gain.value = 0; o.connect(bp); bp.connect(g); const out = this.out(g, pos, { verb: 0.2, ref: 1, roll: 1.8 }); o.start(); return g; }
}
function setPos(p, v) { if (p.positionX) { p.positionX.value = v.x; p.positionY.value = v.y; p.positionZ.value = v.z; } else p.setPosition(v.x, v.y, v.z); }

// ---------------------------------------------------------- recording
// Every sound is synthesized from live nodes, which is too much for the
// Quest's audio thread during a chase. So at load time we render them once,
// offline, into buffers (a few variants each): chase themes as seamless
// loops, the ambience beds as loops, voices, screams, stings, steps and
// doors as one-shots. At runtime each is one buffer source and a panner.
const ORIG = {};
for (const k of ['voice', 'jump', 'scream', 'hit', 'kill', 'lockerRip', 'thud', 'squelch', 'step', 'footstep', 'door', 'syllables', 'mutter', 'farScream']) ORIG[k] = Sound.prototype[k];
const SR = 22050;
function shim(off, noiseBuf, brownBuf) {
  const s = Object.create(Sound.prototype); Object.assign(s, { ctx: off, on: true, vip: true, live: 0, cap: 1e9, timers: {}, noiseBuf, brownBuf, rec: null });
  const dest = off.createGain(); dest.connect(off.destination); s.dry = s.vipDry = s.duckG = s.master = dest;
  const verb = off.createConvolver(); verb.buffer = s.impulse(1.5, 2.4); s.verbIn = off.createGain(); s.verbIn.gain.value = 0.5; s.verbIn.connect(verb); verb.connect(dest);
  return s;
}
async function render(dur, fn, noiseBuf, brownBuf, ch = 1) {
  const off = new OfflineAudioContext(ch, Math.ceil(dur * SR), SR); const s = shim(off, noiseBuf, brownBuf); fn(s); return off.startRendering();
}
// fold the tail of a render back onto its start so the loop has no seam
function foldLoop(buf, loopLen) {
  const n = Math.floor(loopLen * buf.sampleRate); const out = new AudioBuffer({ length: n, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
  for (let c = 0; c < buf.numberOfChannels; c++) { const src = buf.getChannelData(c), dst = out.getChannelData(c); dst.set(src.subarray(0, n)); for (let i = n; i < src.length; i++) dst[i - n] += src[i]; }
  return out;
}
const V0 = new THREE.Vector3(0, 0, 0);
Sound.prototype.record = async function (onProgress) {
  if (this.rec) return this.rec;
  // recorded on an earlier run with this same sound code: just unpack it
  const hash = await sourceHash('dread.js', 'score.js', 'theme.js');
  const kept = hash && await keepGet('snd');
  if (kept && kept.hash === hash) {
    try {
      const rec = unpackSound(kept.rec); this.menuBuf = rec.menu; this.rec = rec; if (onProgress) onProgress(1);
      if (this.on && this.menuWanted) this.playMenu(); if (this.on && !this.droneLoop) this.swapAmbience();
      return rec;
    } catch (e) {}
  }
  const tmp = new OfflineAudioContext(1, 1, SR); const fake = { ctx: tmp }; const noiseBuf = Sound.prototype.noise.call(fake, 2, 'white'), brownBuf = Sound.prototype.noise.call(fake, 4, 'brown');
  const rec = { one: {}, music: {}, amb: null, fear: null }; const jobs = [];
  const one = (key, dur, n, fn) => { for (let i = 0; i < n; i++) jobs.push(async () => { const b = await render(dur, fn, noiseBuf, brownBuf); (rec.one[key] ||= []).push(b); }); };
  // music: four bars of each theme, plus the sting when a chase starts
  jobs.push(async () => { const b = await render(THEME_LOOP + 7, (s) => renderMenuTheme(s.ctx, s.dry, s.verbIn), noiseBuf, brownBuf, 2); rec.menu = this.menuBuf = foldLoop(b, THEME_LOOP); if (this.on && this.menuWanted) this.playMenu(); });
  const musicKinds = ['brute', 'surgeon', 'patient', 'eater', 'orderly'];
  for (const kind of musicKinds) jobs.push(async () => {
    const len = Score.loopSeconds(kind, 4); const b = await render(len + 2.5, (s) => { const sc = new Score(s); sc.renderLoop(kind, 4); }, noiseBuf, brownBuf, 1); rec.music[kind] = foldLoop(b, len);
  });
  jobs.push(async () => { rec.one['hitIn'] = [await render(2.2, (s) => { const sc = new Score(s); sc.bus.gain.value = 0.62; sc.hitIn(0.02); }, noiseBuf, brownBuf, 1)]; });
  // ambience beds
  jobs.push(async () => { const b = await render(14, (s) => { Sound.prototype.ambience.call(s); s.fearG.gain.value = 0; }, noiseBuf, brownBuf, 1); rec.amb = foldLoop(b, 12); });
  jobs.push(async () => { const b = await render(7, (s) => { Sound.prototype.ambience.call(s); s.droneG.gain.value = 0; s.fearG.gain.value = 0.05; }, noiseBuf, brownBuf, 1); rec.fear = foldLoop(b, 5); });
  // voices
  const VO = { orderly: ['idle', 'alert', 'chase', 'attack', 'pant', 'lost'], brute: ['idle', 'alert', 'chase', 'attack', 'pant', 'lost'], surgeon: ['idle', 'alert', 'chase', 'attack', 'pant', 'lost'], rocker: ['mutter', 'scream'], eater: ['chew', 'chase', 'alert', 'attack', 'pant'], patient: ['idle', 'chase', 'alert', 'attack', 'pant', 'lost'] };
  for (const [kind, whats] of Object.entries(VO)) for (const w of whats) one(`v:${kind}:${w}`, w === 'idle' || w === 'mutter' ? 4.6 : 2.2, w === 'idle' ? 1 : 2, (s) => ORIG.voice.call(s, kind, w, V0));
  for (const k of ['sting', 'scare']) one('j:' + k, 2.6, k === 'scare' ? 3 : 2, (s) => ORIG.jump.call(s, k));
  one('kill', 3, 2, (s) => ORIG.kill.call(s)); one('rip', 2.6, 2, (s) => ORIG.lockerRip.call(s));
  one('scream', 1.6, 3, (s) => ORIG.scream.call(s, null, 1)); one('far', 2.8, 2, (s) => ORIG.farScream.call(s, null));
  one('hit', 1, 2, (s) => ORIG.hit.call(s)); one('thud', 0.9, 2, (s) => ORIG.thud.call(s, null, 1)); one('squelch', 0.8, 2, (s) => ORIG.squelch.call(s, null, 1));
  for (const z of [1, 4, 6, 8]) one('s:' + z, 0.3, 3, (s) => ORIG.step.call(s, 1, z));
  for (const k of ['brute', 'surgeon', 'patient']) one('f:' + k, 0.5, 3, (s) => ORIG.footstep.call(s, k, V0, 1));
  for (const m of [0, 1]) for (const k of ['open', 'close', 'slam']) one(`d:${m}:${k}`, 1.4, 1, (s) => ORIG.door.call(s, { metal: !!m }, k, 0, 0));
  one('whisper', 2.2, 2, (s) => ORIG.syllables.call(s, null, 5, 95, { breath: 0.92, gain: 0.3, verb: 0.3 })); one('mutter', 1.8, 2, (s) => ORIG.mutter.call(s));
  // the beds and the music first: the game can start as soon as those exist
  // the menu theme renders alone first so the title screen has music as soon as possible
  // the menu theme renders alongside the game's core sounds, so it never holds up starting the game
  const menuJob = jobs.shift(); const menuP = menuJob().catch(() => {});
  const core = jobs.splice(0, musicKinds.length + 3); await Promise.all(core.map((j) => j().catch(() => {})));
  this.rec = rec; if (onProgress) onProgress(1);
  if (this.on && !this.droneLoop) this.swapAmbience();
  // the rest a couple at a time in the background (anything not ready yet is synthesized live)
  for (let i = 0; i < jobs.length; i += 2) await Promise.all(jobs.slice(i, i + 2).map((j) => j().catch(() => {})));
  await menuP;
  // keep it for next time
  if (hash) { try { await keepPut('snd', { hash, rec: packSound(rec) }); } catch (e) {} }
  return rec;
};
Sound.prototype.has = function (key) { return this.rec && this.rec.one[key] && this.rec.one[key].length; };
Sound.prototype.playRec = function (key, pos, { gain = 1, verb = 0.12, delay = 0, rate = 1, ref = 1.5, roll = 1.2 } = {}) {
  if (!this.on) return; const list = this.rec.one[key]; const buf = list[(Math.random() * list.length) | 0];
  const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
  this.out(s, pos, { gain, verb, ref, roll }); s.start(this.t + delay);
};
const OV = {
  voice(kind, what, pos) { const k = `v:${kind}:${what}`; if (this.has(k)) return this.playRec(k, pos && pos.clone().setY(1.6), { ref: 2 }); return ORIG.voice.call(this, kind, what, pos); },
  jump(kind = 'sting', delay = 0) { const k = 'j:' + (kind === 'kill' || kind === 'rip' ? 'scare' : kind === 'power' ? 'scare' : kind); if (this.has(k)) return this.playRec(k, null, { delay }); return ORIG.jump.call(this, kind, delay); },
  scream(pos, k = 1) { if (this.has('scream')) return this.playRec('scream', pos, { gain: Math.min(1.3, k), rate: 1 / Math.max(0.7, k) * 0.9 + 0.1 }); return ORIG.scream.call(this, pos, k); },
  kill(kind) { if (this.has('kill')) return this.playRec('kill', null); return ORIG.kill.call(this, kind); },
  lockerRip() { if (this.has('rip')) return this.playRec('rip', null); return ORIG.lockerRip.call(this); },
  hit(kind) { if (this.has('hit')) return this.playRec('hit', null); return ORIG.hit.call(this, kind); },
  thud(pos, k = 1) { if (this.has('thud')) return this.playRec('thud', pos, { gain: k }); return ORIG.thud.call(this, pos, k); },
  squelch(pos, k = 1) { if (this.has('squelch')) return this.playRec('squelch', pos, { gain: k }); return ORIG.squelch.call(this, pos, k); },
  farScream(p) { if (this.has('far')) return this.playRec('far', p, { ref: 2, roll: 1 }); return ORIG.farScream.call(this, p); },
  step(k, zone) { const z = zone === 4 || zone === 5 ? 4 : zone === 6 || zone === 11 ? 6 : zone === 8 || zone === 10 ? 8 : 1; if (this.has('s:' + z)) return this.playRec('s:' + z, null, { gain: (0.06 + k * 0.22) / 0.28, verb: 0.05 }); return ORIG.step.call(this, k, zone); },
  footstep(kind, pos, speed) { const k = 'f:' + (kind === 'brute' ? 'brute' : kind === 'surgeon' ? 'surgeon' : 'patient'); if (this.has(k)) return this.playRec(k, pos.clone().setY(0.1), { gain: speed > 2 ? 1.4 : 1 }); return ORIG.footstep.call(this, kind, pos, speed); },
  door(d, kind, x, z) { const k = `d:${d.metal ? 1 : 0}:${kind}`; if (this.has(k)) return this.playRec(k, new THREE.Vector3(x, 1.1, z)); return ORIG.door.call(this, d, kind, x, z); },
  syllables(pos, n, base, opts = {}) { if ((opts.breath || 0) >= 0.8 && this.has('whisper')) { this.playRec('whisper', pos, { gain: (opts.gain || 0.3) / 0.3 }); return 2; } return ORIG.syllables.call(this, pos, n, base, opts); },
  mutter() { if (this.has('mutter')) return this.playRec('mutter', null); return ORIG.mutter.call(this); },
  // chase music: crossfade between the recorded loops
  music(kind, chase) {
    if (!this.rec) return; const want = chase > 0.2 && kind && this.rec.music[kind] ? kind : null; const t = this.t;
    if (want === this.musicKind) return;
    if (this.musicNow) { const m = this.musicNow; m.g.gain.setTargetAtTime(0, t, want ? 0.15 : 0.6); m.s.stop(t + (want ? 1 : 4)); }
    this.musicNow = null; this.musicKind = want;
    if (!want) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.rec.music[want]; s.loop = true; const g = this.ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(1, t, 0.06);
    s.connect(g); g.connect(this.vipDry); s.start(t); this.musicNow = { s, g };
    if (this.has('hitIn')) { const h = this.ctx.createBufferSource(); h.buffer = this.rec.one.hitIn[0]; h.connect(this.vipDry); h.start(t); }
  },
  // the realtime ambience was started before the recording finished: swap it for the loops
  swapAmbience() { if (!this.rec || !this.rec.amb) return; const old = [this.droneG, this.fearG]; this.ambienceLoops(); for (const g of old) if (g) g.gain.setTargetAtTime(0, this.t, 0.5); this.droneLoop = true; },
  ambienceLoops() {
    const loop = (buf, gain) => { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(this.dry); s.start(); return g; };
    this.droneG = loop(this.rec.amb, 1); this.fearG = loop(this.rec.fear, 0); this.fearLoop = true; this.droneLoop = true;
  },
};
Object.assign(Sound.prototype, OV);
Object.assign(Sound.prototype, {
  // the main theme on the title screen
  playMenu() {
    this.menuWanted = true; if (!this.on || !this.menuBuf || this.menuNow) return;
    const t = this.t; const s = this.ctx.createBufferSource(); s.buffer = this.menuBuf; s.loop = true; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 3);
    s.connect(g); g.connect(this.vipDry); s.start(t); this.menuNow = { s, g };
    if (this.droneG) this.droneG.gain.setTargetAtTime(0.25, t, 0.5);
  },
  stopMenu() { this.menuWanted = false; if (!this.menuNow) return; const t = this.t; const { s, g } = this.menuNow; g.gain.setTargetAtTime(0.0001, t, 0.5); s.stop(t + 3); this.menuNow = null; if (this.droneG) this.droneG.gain.setTargetAtTime(1, t, 1); },
  // a VCR front-panel button: a hard plastic click, the latch, a tick of the transport
  tapeClick() {
    if (!this.on) return; const v = this.vip; this.vip = true;
    this.burst(null, { f: 4200, q: 2.5, dur: 0.012, gain: 0.35, verb: 0.02 }); this.burst(null, { f: 1300, q: 1.5, dur: 0.03, gain: 0.3, delay: 0.018, verb: 0.03 });
    this.tone(null, { f: 110, f2: 70, dur: 0.05, gain: 0.25, delay: 0.015, verb: 0 }); this.burst(null, { f: 2600, q: 4, dur: 0.01, gain: 0.15, delay: 0.07, verb: 0 });
    this.vip = v;
  },
  // a cassette going into the deck: the door, the clunk of the carriage, the heads spinning up
  tapeLoad() {
    if (!this.on) return; const v = this.vip; this.vip = true;
    this.burst(null, { f: 1800, q: 1.2, dur: 0.05, gain: 0.3, verb: 0.05 }); this.tone(null, { f: 80, f2: 50, dur: 0.12, gain: 0.5, delay: 0.12, verb: 0.05 }); this.burst(null, { f: 600, q: 0.8, dur: 0.1, gain: 0.35, brown: true, delay: 0.12 });
    this.tone(null, { f: 120, f2: 380, dur: 0.7, gain: 0.06, type: 'sawtooth', delay: 0.3, verb: 0.05 }); this.burst(null, { f: 3000, q: 3, dur: 0.02, gain: 0.2, delay: 1.0 });
    this.vip = v;
  },
});

// screams, hits and scares always get through the voice budget and the hush
for (const k of ['jump', 'scream', 'hit', 'kill', 'lockerRip', 'thud', 'squelch']) { const f = Sound.prototype[k]; Sound.prototype[k] = function (...a) { const v = this.vip; this.vip = true; try { return f.apply(this, a); } finally { this.vip = v; } }; }

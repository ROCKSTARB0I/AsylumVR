// Score: chase themes in the lo-fi 80s/90s horror-synth style (cheap drum
// machine, gated snare, detuned analog bass, warbling tape pitch, a little
// crunch). Every hunter has its own theme; the sequencer schedules sixteenth
// notes a beat ahead and fades between themes.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const N = (s) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); if (!m) return null; const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return base + (+m[3] + 1) * 12; };
const seq = (str) => str.trim().split(/\s+/).map((t) => t === '.' ? null : t === 'x' ? 1 : t === 'X' ? 2 : N(t));

// patterns are 32 sixteenths (two bars)
export const THEMES = {
  // KROFT: slow, heavy, phrygian, pounding; brass stabs on the downbeat
  brute: { bpm: 88, swing: 0,
    bass: seq('E1 E1 . E1 . . F1 . E1 . Bb0 . . E1 . . E1 E1 . E1 . . F1 . Gb1 . F1 . E1 . Eb1 D1'),
    kick: seq('X . . . x . . . X . . . x . . x X . . . x . . . X . x . x . . x'),
    snare: seq('. . . . X . . . . . . . X . . . . . . . X . . . . . . . X . x x'),
    hat: seq('x . x . x . x . x . x . x . x . x . x . x . x . x . x . x . x .'),
    stab: [[0, ['E3', 'F3', 'Bb3', 'B3']], [8, ['F3', 'Gb3', 'C4']], [16, ['E3', 'F3', 'Bb3', 'B3']], [24, ['D#3', 'E3', 'A3']], [28, ['F3', 'Gb3', 'C4', 'C#4']]],
    drone: ['E1', 'F1', 'Bb1'], screech: { every: 16, at: 12, from: 'E6', to: 'F7' }, metal: seq('. . . . . . x . . . . . . . . . . . . . . . x . . . . . . x . .'), swell: true,
    lead: seq('B4 . . . . . . . C5 . . . . . . . B4 . . . . . . . Bb4 . . . A4 . . .'), leadType: 'sawtooth', leadDur: 6, arp: null, color: { cut: 1800, drive: 0.6 } },
  // DR. VOSS: a music box and a wheezing organ playing his hum; brisk hats
  surgeon: { bpm: 112, swing: 0.12,
    bass: seq('A1 . A2 . A1 . A2 . A1 . A2 . A1 . A2 . F1 . F2 . F1 . F2 . E1 . E2 . E1 . G#1 .'),
    kick: seq('X . . . . . x . X . . . . . . . X . . . . . x . X . . . . x . .'),
    snare: seq('. . . . x . . . . . . . X . . . . . . . x . . . . . . . X . . .'),
    hat: seq('x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x'),
    stab: [[0, ['A3', 'Bb3', 'Eb4']], [16, ['F3', 'Gb3', 'B3']]],
    drone: ['A1', 'Bb1', 'Eb2'], screech: { every: 32, at: 24, from: 'A6', to: 'Eb6' }, metal: seq('. . . . . . . . . . . . . . . x . . . . . . . . . . . . . . . x'), swell: true,
    lead: seq('E5 . . . D5 . C#5 . D5 . . . E5 . E5 . E5 . . . D5 . D5 . D5 . . . E5 . G5 .'), leadType: 'organ', leadDur: 2,
    arp: seq('A5 C6 Eb6 D6 A5 C6 Eb6 F6 A5 Bb5 Eb6 D6 A5 C6 Eb6 B5 F5 Ab5 B5 Bb5 F5 Ab5 C6 Eb6 E5 F5 Bb5 D6 E5 G#5 Bb5 F6'), arpType: 'box', color: { cut: 3200, drive: 0.25 } },
  // THE PATIENTS: frantic, tritone bass, screaming arpeggio, rolls
  patient: { bpm: 152, swing: 0,
    bass: seq('C2 C2 F#2 C2 C2 F#2 C2 Eb2 C2 C2 F#2 C2 G2 F#2 Eb2 D2 C2 C2 F#2 C2 C2 F#2 C2 Eb2 Ab1 Ab1 D2 Ab1 G1 G1 B1 D2'),
    kick: seq('X . . x . . X . . . x . X . . . X . . x . . X . . . x . X . X .'),
    snare: seq('. . . . X . . . . . . . X . . . . . . . X . . . . . . . X x x x'),
    hat: seq('x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x'),
    stab: [[0, ['C4', 'C#4', 'F#4', 'G4']], [16, ['C4', 'C#4', 'F#4', 'G4']], [24, ['Ab3', 'A3', 'D4', 'Eb4']]],
    drone: ['C2', 'C#2', 'F#2'], screech: { every: 8, at: 6, from: 'C7', to: 'F#6' }, metal: seq('. . x . . . . . . . x . . . . . . . x . . . . . . . x . . x . x'), swell: false,
    lead: null, arp: seq('C5 Eb5 G5 B5 C6 B5 G5 Eb5 C5 Eb5 G5 B5 C6 B5 G5 F#5 C5 Eb5 G5 B5 C6 B5 G5 Eb5 Ab4 C5 Eb5 G5 B4 D5 F5 B5'), arpType: 'saw', color: { cut: 2600, drive: 0.7 } },
};
THEMES.eater = { ...THEMES.patient, bpm: 140, drone: ['Bb1', 'B1', 'E2'], bass: THEMES.patient.bass.map((n) => n && n - 2), arp: THEMES.patient.arp.map((n) => n && n - 2) };

export class Score {
  constructor(sound) {
    this.S = sound; const ctx = this.ctx = sound.ctx;
    // the music bus: a bit of drive, then lowpass like a worn tape
    this.bus = ctx.createGain(); this.bus.gain.value = 0;
    this.drive = ctx.createWaveShaper(); this.setDrive(0.4);
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 5500; this.lp.Q.value = 0.5;
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 35;
    this.bus.connect(this.drive); this.drive.connect(this.lp); this.lp.connect(this.hp); this.hp.connect(sound.dry);
    const sendR = ctx.createGain(); sendR.gain.value = 0.18; this.hp.connect(sendR); sendR.connect(sound.verbIn);
    // gated snare room
    this.room = ctx.createConvolver(); this.room.buffer = sound.impulse(0.9, 1.2); this.room.connect(this.bus);
    // tape wow: every oscillator's detune listens to this
    this.wow = ctx.createOscillator(); this.wow.frequency.value = 0.55; this.wowG = ctx.createGain(); this.wowG.gain.value = 14; this.wow.connect(this.wowG); this.wow.start();
    this.flutter = ctx.createOscillator(); this.flutter.frequency.value = 7.5; this.flG = ctx.createGain(); this.flG.gain.value = 4; this.flutter.connect(this.flG); this.flutter.start();
    this.theme = null; this.want = null; this.step = 0; this.next = 0; this.level = 0;
  }
  setDrive(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; c[i] = Math.tanh(x * (1 + k * 4)) / Math.tanh(1 + k * 4); } this.drive.curve = c; }
  osc(type, f, t) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); this.wowG.connect(o.detune); this.flG.connect(o.detune); return o; }
  amp(t, a, peak, hold, rel) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); return g; }
  // ---- instruments
  bass(t, m, dur, cut) {
    const f = mtof(m); const g = this.amp(t, 0.005, 0.32, dur * 0.6, 0.08); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
    lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(140, t + dur * 0.9);
    for (const [type, mul, det, gg] of [['sawtooth', 1, -9, 0.5], ['sawtooth', 1, 9, 0.5], ['square', 0.5, 0, 0.45]]) { const o = this.osc(type, f * mul, t); o.detune.value = det; const og = this.ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.15); }
    lp.connect(g); g.connect(this.bus);
  }
  lead(t, m, dur, type) {
    const f = mtof(m); const g = this.amp(t, type === 'organ' ? 0.03 : 0.02, 0.11, dur * 0.85, 0.12); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = type === 'organ' ? 2200 : 3000;
    const vib = this.ctx.createOscillator(); vib.frequency.value = 5.5; const vg = this.ctx.createGain(); vg.gain.value = 18; vib.connect(vg);
    const parts = type === 'organ' ? [['square', 1, 0.5], ['sine', 2, 0.4], ['triangle', 0.5, 0.5], ['sine', 3, 0.15]] : [['sawtooth', 1, 0.5], ['sawtooth', 1.005, 0.5], ['square', 0.5, 0.3]];
    for (const [ty, mul, gg] of parts) { const o = this.osc(ty, f * mul, t); vg.connect(o.detune); const og = this.ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.2); }
    vib.start(t); vib.stop(t + dur + 0.2); lp.connect(g); g.connect(this.bus);
  }
  arp(t, m, type) {
    const f = mtof(m);
    if (type === 'box') { const g = this.amp(t, 0.002, 0.13, 0.01, 0.45); for (const [ty, mul, gg] of [['triangle', 1, 0.7], ['sine', 2.01, 0.3], ['sine', 4.2, 0.1]]) { const o = this.osc(ty, f * mul, t); const og = this.ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.6); } g.connect(this.bus); }
    else { const g = this.amp(t, 0.003, 0.085, 0.03, 0.09); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.12); lp.Q.value = 4; for (const det of [-12, 12]) { const o = this.osc('sawtooth', f, t); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + 0.2); } lp.connect(g); g.connect(this.bus); }
  }
  stab(t, notes) {
    const g = this.amp(t, 0.004, 0.16, 0.05, 0.5); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.5);
    for (const n of notes) for (const det of [-14, 0, 14]) { const o = this.osc('sawtooth', mtof(N(n)), t); o.detune.value = det; const og = this.ctx.createGain(); og.gain.value = 0.12; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 0.7); }
    lp.connect(g); g.connect(this.bus); const s = this.ctx.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.room);
  }
  kick(t, v) { const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); const g = this.amp(t, 0.002, 0.75 * v, 0.02, 0.28); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4); this.noiseHit(t, 3500, 0.006, 0.12 * v, 'highpass'); }
  snare(t, v) {
    this.noiseHit(t, 1900, 0.13, 0.38 * v, 'bandpass', 0.8, true);
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); const g = this.amp(t, 0.002, 0.3 * v, 0.01, 0.09); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.2);
  }
  hat(t, v) { this.noiseHit(t, 8000, 0.03, 0.06 * v, 'highpass'); }
  noiseHit(t, f, dur, gain, type, q = 1, gated = false) {
    const s = this.S.src(this.S.noiseBuf); const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = this.amp(t, 0.001, gain, 0.005, dur); s.connect(fl); fl.connect(g); g.connect(this.bus);
    if (gated) { const send = this.ctx.createGain(); send.gain.setValueAtTime(0.9, t); send.gain.setValueAtTime(0.9, t + 0.22); send.gain.linearRampToValueAtTime(0, t + 0.25); g.connect(send); send.connect(this.room); }
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // ---- sequencing
  update(kind, chase) {
    const ctx = this.ctx, now = ctx.currentTime;
    const want = chase > 0.2 && kind && THEMES[kind] ? kind : null;
    if (want && want !== this.theme) { this.theme = want; this.step = 0; this.next = now + 0.05; const th = THEMES[want]; this.lp.frequency.setTargetAtTime(th.color.cut * 1.8, now, 0.1); this.setDrive(th.color.drive); this.hitIn(this.next); if (th.drone) this.startDrone(th.drone); }
    this.bus.gain.setTargetAtTime(want ? 0.62 : 0, now, want ? 0.08 : 1.6);
    if (!want && this.droneN) this.stopDrone();
    if (!want && this.bus.gain.value < 0.01) this.theme = null;
    if (!this.theme) return;
    const th = THEMES[this.theme]; const sx = 60 / th.bpm / 4;
    while (this.next < now + 0.15) {
      const i = this.step % 32, t = this.next + (i % 2 ? th.swing * sx : 0);
      const b = th.bass[i]; if (b) this.bass(t, b, sx * 0.95, th.color.cut);
      if (th.kick[i]) this.kick(t, th.kick[i] === 2 ? 1 : 0.7);
      if (th.snare[i]) this.snare(t, th.snare[i] === 2 ? 1 : 0.55);
      if (th.hat[i]) this.hat(t, i % 4 === 2 ? 1 : 0.6);
      for (const [at, ch] of th.stab) if (at === i) this.stab(t, ch);
      if (th.lead && th.lead[i]) this.lead(t, th.lead[i], sx * th.leadDur, th.leadType);
      if (th.arp && th.arp[i]) this.arp(t, th.arp[i], th.arpType);
      if (th.metal && th.metal[i]) this.metal(t);
      if (th.screech && (this.step % th.screech.every) === th.screech.at % th.screech.every && Math.random() < 0.8) this.screech(t, N(th.screech.from), N(th.screech.to), sx * 6);
      if (th.swell && i % 16 === 12) this.swell(t, sx * 4);
      this.step++; this.next += sx;
    }
  }
  // string glissando that screams up (or down) a long way
  screech(t, from, to, dur) {
    const g = this.amp(t, 0.04, 0.07, dur * 0.7, dur * 0.3); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = mtof(to) * 0.8; bp.Q.value = 0.8;
    for (const det of [-25, 0, 18, 33]) { const o = this.osc('sawtooth', mtof(from), t); o.detune.value = det; o.frequency.exponentialRampToValueAtTime(mtof(to), t + dur); const tr = this.ctx.createOscillator(); tr.frequency.value = 13 + Math.random() * 4; const tg = this.ctx.createGain(); tg.gain.value = 40; tr.connect(tg); tg.connect(o.detune); o.connect(bp); o.start(t); tr.start(t); o.stop(t + dur + 0.1); tr.stop(t + dur + 0.1); }
    bp.connect(g); g.connect(this.bus); const sr = this.ctx.createGain(); sr.gain.value = 0.5; g.connect(sr); sr.connect(this.room);
  }
  // a struck pipe: inharmonic partials, long ring
  metal(t) { const f0 = 140 + Math.random() * 90; const g = this.amp(t, 0.001, 0.22, 0.01, 1.4); for (const [k, gg] of [[1, 1], [2.76, 0.6], [5.4, 0.4], [8.93, 0.25]]) { const o = this.ctx.createOscillator(); o.frequency.value = f0 * k; const og = this.ctx.createGain(); og.gain.value = gg * 0.3; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.6); } g.connect(this.bus); this.noiseHit(t, 5000, 0.04, 0.25, 'highpass', 1, true); }
  // reversed-noise swell into the next bar
  swell(t, dur) { const s = this.S.src(this.S.noiseBuf); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(5000, t + dur); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.01); s.connect(bp); bp.connect(g); g.connect(this.bus); s.start(t); s.stop(t + dur + 0.05); }
  // a low cluster under everything while the theme plays
  startDrone(notes) {
    this.stopDrone(); const g = this.ctx.createGain(); g.gain.value = 0; const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2; lp.connect(g); g.connect(this.bus);
    const os = notes.map((n) => { const o = this.osc('sawtooth', mtof(N(n)), this.ctx.currentTime); o.connect(lp); o.start(); return o; });
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.3; const lg = this.ctx.createGain(); lg.gain.value = 200; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    g.gain.setTargetAtTime(0.16, this.ctx.currentTime, 0.3); this.droneN = { g, os: [...os, lfo] };
  }
  stopDrone() { if (!this.droneN) return; const { g, os } = this.droneN; const t = this.ctx.currentTime; g.gain.setTargetAtTime(0, t, 0.5); for (const o of os) o.stop(t + 3); this.droneN = null; }
  // the orchestra-hit sting when a chase begins
  hitIn(t) { this.stab(t, ['C3', 'C#3', 'F#3', 'G4', 'C#5']); this.screech(t, N('C6'), N('C#7'), 1.2); this.metal(t); this.kick(t, 1); this.noiseHit(t, 1200, 0.5, 0.4, 'bandpass', 0.5, true); }
}

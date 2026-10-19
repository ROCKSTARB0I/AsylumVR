// The Testing Site theme: "Site 7". Where Mount Harrow's theme is a violin lament, this one is the
// lab: cold 1980s analog synths in E Phrygian. A resonant bass arpeggio pulses in sixteenths under a
// heartbeat kick and a gated snare, detuned pads breathe underneath, and a theremin sings the melody
// with a long slide into every note. Around it: Geiger-counter clicks, a sonar ping, a far-off klaxon
// and something low breathing in a tank. Rendered once, offline, into a loop (see dread.js record()).

const M = (n) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const F = (m) => 440 * Math.pow(2, (m - 69) / 12);
const BEAT = 60 / 104;
export const SITE_LOOP = BEAT * 80;   // 20 bars

function noise(ctx, sec) { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }

// the room: a dotted-eighth ping-pong delay and a long, metallic hall, then a gentle squash
function effects(ctx, out) {
  const bus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  const master = ctx.createGain(); master.gain.value = 1.2; comp.connect(master); master.connect(out);
  bus.connect(comp);
  const send = ctx.createGain(); send.gain.value = 0.28; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const dL = ctx.createDelay(2), dR = ctx.createDelay(2); dL.delayTime.value = dR.delayTime.value = BEAT * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.45;
  const pL = ctx.createStereoPanner(), pR = ctx.createStereoPanner(); pL.pan.value = -0.85; pR.pan.value = 0.85;
  const echo = ctx.createGain(); echo.gain.value = 0; echo.connect(send);   // instruments that want echoes plug in here
  send.connect(hp); hp.connect(lp); lp.connect(dL); dL.connect(pL); pL.connect(comp); dL.connect(dR); dR.connect(pR); pR.connect(comp); dR.connect(fb); fb.connect(dL);
  // the hall: long and bright-ish, with a metallic ring (a concrete bunker with steel in it)
  const n = Math.floor(ctx.sampleRate * 4.5), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp1 = 0; for (let i = 0; i < n; i++) { const tt = i / n; lp1 = lp1 * 0.35 + (Math.random() * 2 - 1) * 0.65; d[i] = (lp1 + 0.25 * Math.sin(i * 0.071 + c) * Math.random()) * Math.pow(1 - tt, 3) * (i < 400 ? i / 400 : 1); } }
  const hall = ctx.createConvolver(); hall.buffer = ir; const hallIn = ctx.createGain(); hallIn.gain.value = 0.5; hallIn.connect(hall); const hallOut = ctx.createGain(); hallOut.gain.value = 0.55; hall.connect(hallOut); hallOut.connect(comp);
  pL.connect(hallIn); pR.connect(hallIn);
  return { bus, hall: hallIn, echo: send };
}

export function renderSiteTheme(ctx, outRaw) {
  const fx = effects(ctx, outRaw); const out = fx.bus, verb = fx.hall, echo = fx.echo;
  const T = (b) => 0.05 + b * BEAT; const nz = noise(ctx, 2);
  const send = (node, v, e = 0) => { node.connect(out); if (v) { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); } if (e) { const g = ctx.createGain(); g.gain.value = e; node.connect(g); g.connect(echo); } };

  // ---- the chords: one per bar (root, minor?)
  const BARS = [['E2', 1], ['E2', 1], ['E2', 1], ['E2', 1], ['E2', 1], ['E2', 1], ['F2', 0], ['E2', 1], ['C2', 0], ['C2', 0], ['B1', 0], ['B1', 0], ['F2', 0], ['F2', 0], ['E2', 1], ['E2', 1], ['G2', 0], ['F2', 0], ['E2', 1], ['E2', 1]];

  // ---- the bass arpeggio: two detuned saws through a resonant lowpass that snaps open on every note
  const arpOut = ctx.createStereoPanner(); arpOut.pan.value = -0.1; send(arpOut, 0.12, 0.25);
  const PAT = [0, 12, 7, 12, 'm', 12, 7, 0, 0, 12, 7, 19, 'm', 12, 7, 'm2'];
  for (let bar = 0; bar < 20; bar++) {
    const [root, minor] = BARS[bar]; const r = M(root); const third = minor ? 3 : 4;
    // the intro opens the filter a little more each bar; the last two bars close it back down for the loop
    const open = bar < 4 ? 0.25 + bar * 0.18 : bar >= 18 ? 0.8 - (bar - 18) * 0.25 : 1;
    for (let k = 0; k < 16; k++) {
      const p = PAT[k]; const st = p === 'm' ? third + 12 : p === 'm2' ? third : p; const t = T(bar * 4 + k / 4); const f = F(r + st);
      const g = ctx.createGain(); const acc = k % 4 === 0 ? 1 : 0.7; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13 * acc, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 0.24);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 9; lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(180 + 2400 * open * acc, t + 0.008); lp.frequency.exponentialRampToValueAtTime(200, t + BEAT * 0.22);
      for (const [type, det] of [['sawtooth', -7], ['square', 6]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + BEAT * 0.3); }
      lp.connect(g); g.connect(arpOut);
    }
  }

  // ---- the pads: wide detuned saws, slow attack, a filter that breathes
  const pad = (b, notes, len, gain = 0.035) => {
    const t = T(b), d = len * BEAT; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1600, t + d * 0.6); lp.frequency.linearRampToValueAtTime(700, t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 1.4); g.gain.setValueAtTime(gain, t + d - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.2);
    for (const n of notes) for (const [det, pan] of [[-12, -0.6], [0, 0], [11, 0.6]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = F(M(n)); o.detune.value = det; const p = ctx.createStereoPanner(); p.pan.value = pan; o.connect(p); p.connect(lp); o.start(t); o.stop(t + d + 1.4); }
    lp.connect(g); send(g, 0.6);
  };
  const VOICE = { E: ['E3', 'B3', 'G4'], F: ['F3', 'C4', 'A4'], C: ['C3', 'G3', 'E4'], B: ['B2', 'F#3', 'D#4'], G: ['G3', 'D4', 'B4'] };
  for (let bar = 4; bar < 18; bar += 2) { const a = BARS[bar][0][0], b2 = BARS[bar + 1][0][0]; if (a === b2) pad(bar * 4, VOICE[a], 8); else { pad(bar * 4, VOICE[a], 4); pad(bar * 4 + 4, VOICE[b2], 4); } }
  pad(72, ['E3', 'B3', 'F4'], 8, 0.028);   // the last chord leans on the flat second: it doesn't resolve

  // ---- the heartbeat kick (lub-dub on 1, again on 3) and a big gated snare on 4
  const kick = (b, gain = 0.5) => { const t = T(b); const o = ctx.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16); const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42); o.connect(g); send(g, 0.05); o.start(t); o.stop(t + 0.45); };
  const snare = (b, gain = 0.22) => {
    const t = T(b); const s = ctx.createBufferSource(); s.buffer = nz; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.setValueAtTime(gain * 0.6, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);   // gated: it stops dead
    s.connect(bp); bp.connect(g); send(g, 0.9); s.start(t, Math.random()); s.stop(t + 0.3);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); const og = ctx.createGain(); og.gain.setValueAtTime(gain * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(og); send(og, 0.4); o.start(t); o.stop(t + 0.15);
  };
  for (let bar = 4; bar < 18; bar++) { const b = bar * 4; kick(b); kick(b + 0.4, 0.32); kick(b + 2); kick(b + 2.4, 0.32); snare(b + 3); }
  for (const b of [12, 13, 14, 15]) kick(b, 0.18);   // the heart starting up in the intro
  snare(71, 0.3); snare(71.5, 0.25); snare(71.75, 0.3);

  // ---- the theremin: a sine (and a little triangle) sliding into every note, vibrato that wobbles wider as it holds
  const lead = ctx.createGain(); lead.gain.value = 1; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lead.connect(lp); const lpan = ctx.createStereoPanner(); lpan.pan.value = 0.12; lp.connect(lpan); send(lpan, 0.55, 0.6);
  const sing = (line, b0, gain) => {
    let b = b0, last = null;
    for (const [n, len] of line) {
      if (n !== '.') {
        const t = T(b), d = len * BEAT * 0.96, f = F(M(n)); const from = last || f * 0.94;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.12); if (d > 1) g.gain.linearRampToValueAtTime(gain * 1.15, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25); g.connect(lead);
        for (const [type, mul, gg] of [['sine', 1, 1], ['triangle', 2, 0.12], ['sine', 3, 0.05]]) {
          const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(from * mul, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + Math.min(0.28, d * 0.4));
          const vib = ctx.createOscillator(); vib.frequency.value = 5.8; const vg = ctx.createGain(); vg.gain.setValueAtTime(4, t); vg.gain.linearRampToValueAtTime(d > 1 ? 38 : 16, t + d); vib.connect(vg); vg.connect(o.detune);
          const og = ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(g); o.start(t); vib.start(t); o.stop(t + d + 0.3); vib.stop(t + d + 0.3);
        }
        last = f;
      }
      b += len;
    }
  };
  const A1 = [['B4', 3], ['C5', 1], ['B4', 2], ['A4', 1], ['G4', 1], ['F4', 4], ['E4', 4]];
  const A2 = [['E5', 3], ['F5', 1], ['E5', 2], ['D5', 1], ['C5', 1], ['B4', 2], ['C5', 1], ['A4', 1], ['B4', 4]];
  const B1 = [['F5', 2], ['E5', 2], ['C5', 2], ['B4', 2], ['A#4', 4], ['B4', 4]];
  const B2 = [['E5', 2], ['G5', 2], ['F5', 4]];
  sing(A1, 16, 0.075); sing(A2, 32, 0.075); sing(B1, 48, 0.08); sing(B2, 64, 0.085);
  // a ghost of the opening phrase, an octave down, under the second half
  sing([['B3', 3], ['C4', 1], ['B3', 4]], 56, 0.03);

  // ---- the lab around it
  // Geiger clicks: a scatter that thickens toward the alarm
  for (let b = 0; b < 80; b += 0.125) {
    const rate = b < 16 ? 0.12 : b < 60 ? 0.07 : b < 72 ? 0.07 + (b - 60) * 0.03 : 0.1; if (Math.random() > rate) continue;
    const t = T(b) + Math.random() * BEAT * 0.12; const s = ctx.createBufferSource(); s.buffer = nz; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006); const p = ctx.createStereoPanner(); p.pan.value = 0.55;
    s.connect(hp); hp.connect(g); g.connect(p); send(p, 0.1); s.start(t, Math.random()); s.stop(t + 0.01);
  }
  // sonar ping
  const ping = (b, gain = 0.06) => { const t = T(b); const o = ctx.createOscillator(); o.frequency.value = 1240; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g); send(g, 0.8, 0.9); o.start(t); o.stop(t + 1.7); };
  for (const b of [0, 8, 40, 76]) ping(b);
  // steel struck somewhere in the dark: FM bells on the bar lines of the B section
  const bell = (b, n, gain = 0.05) => { const t = T(b), f = F(M(n)); const m = ctx.createOscillator(); m.frequency.value = f * 3.51; const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 4, t); mg.gain.exponentialRampToValueAtTime(1, t + 2); m.connect(mg); const o = ctx.createOscillator(); o.frequency.value = f; mg.connect(o.frequency); const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5); o.connect(g); const p = ctx.createStereoPanner(); p.pan.value = -0.5; g.connect(p); send(p, 0.9); o.start(t); m.start(t); o.stop(t + 2.6); m.stop(t + 2.6); };
  for (const [b, n] of [[48, 'E5'], [52, 'F5'], [56, 'E5'], [60, 'A#4'], [64, 'E5'], [68, 'F5']]) bell(b, n);
  // the klaxon: two tones, far away down a corridor, swelling over the last section
  { const t0 = T(62), t1 = T(74); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.03, t1 - 1); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    const o = ctx.createOscillator(); o.type = 'square'; for (let t = t0, k = 0; t < t1; t += 0.45, k++) o.frequency.setValueAtTime(k % 2 ? 587 : 698, t);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2; o.connect(bp); bp.connect(g); const p = ctx.createStereoPanner(); p.pan.value = 0.6; g.connect(p); send(p, 1.4); o.start(t0); o.stop(t1 + 0.1); }
  // something big breathing in a tank: filtered noise, slowly in and out, with a wet bubble
  const breathe = (b, len) => { const t = T(b), d = len * BEAT; const s = ctx.createBufferSource(); s.buffer = nz; s.loop = true; const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 260; lpf.Q.value = 4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const am = ctx.createOscillator(); am.frequency.value = 23; const amg = ctx.createGain(); amg.gain.value = 0.06; am.connect(amg); amg.connect(g.gain);
    s.connect(lpf); lpf.connect(g); send(g, 0.7); s.start(t); am.start(t); s.stop(t + d + 0.1); am.stop(t + d + 0.1);
    for (let k = 0; k < 6; k++) { const tb = t + d * (0.3 + Math.random() * 0.6); const o = ctx.createOscillator(); o.frequency.setValueAtTime(300 + Math.random() * 300, tb); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 600, tb + 0.04); const og = ctx.createGain(); og.gain.setValueAtTime(0.02, tb); og.gain.exponentialRampToValueAtTime(0.0001, tb + 0.05); o.connect(og); send(og, 0.5); o.start(tb); o.stop(tb + 0.06); } };
  breathe(2, 5); breathe(22, 6); breathe(74, 5);
  // the sub drone under everything: E, and a slow beating fifth
  for (const [n, det, gain] of [['E1', 0, 0.09], ['B1', 6, 0.035]]) { const o = ctx.createOscillator(); o.frequency.value = F(M(n)); o.detune.value = det; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(0)); g.gain.exponentialRampToValueAtTime(gain, T(2)); g.gain.setValueAtTime(gain, T(78)); g.gain.exponentialRampToValueAtTime(0.0001, T(82)); o.connect(g); send(g, 0); o.start(T(0)); o.stop(T(82)); }
}

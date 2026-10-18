// The main theme: "Mount Harrow". A solo violin lament in D minor over a
// low cello drone, a second violin that harmonizes and then sours, glassy
// sul ponticello scrapes and col legno taps. Bowed strings are synthesized:
// a jittered sawtooth through the resonances of a violin body, bow noise,
// slides between notes, and a vibrato that blooms as the note sustains.
// It is rendered once, offline, into a loop (see dread.js record()).

const M = (n) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; };
const F = (m) => 440 * Math.pow(2, (m - 69) / 12);

// one bowed instrument; returns note(t, midi, dur, opts)
function strings(ctx, out, verb, kind) {
  const body = ctx.createGain();
  // the body: wooden resonances that make a sawtooth sound like a violin (or a cello)
  const peaks = kind === 'cello' ? [[110, 6, 3], [220, 5, 2.5], [520, 4, 2], [1300, 3, 2]] : [[280, 7, 3], [460, 5, 2.4], [1000, 3, 2], [2600, 6, 2.2], [3800, 3, 3]];
  let node = body;
  for (const [f, g, q] of peaks) { const p = ctx.createBiquadFilter(); p.type = 'peaking'; p.frequency.value = f; p.gain.value = g; p.Q.value = q; node.connect(p); node = p; }
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'cello' ? 50 : 180; node.connect(hp);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'cello' ? 3000 : 6500; lp.Q.value = 0.4; hp.connect(lp);
  const pan = ctx.createStereoPanner(); pan.pan.value = kind === 'cello' ? -0.25 : kind === 'violin2' ? 0.35 : 0.1; lp.connect(pan);
  pan.connect(out); const sv = ctx.createGain(); sv.gain.value = 0.55; pan.connect(sv); sv.connect(verb);
  const noiseBuf = (() => { const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; })();
  let lastF = null;
  return (t, midi, dur, o = {}) => {
    const f = F(midi) * (o.detune ? Math.pow(2, o.detune / 1200) : 1); const gain = o.gain ?? 0.2; const att = o.attack ?? 0.18; const rel = o.release ?? 0.35;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + att);
    // a bow swell in the middle of longer notes
    if (dur > 1.2) { g.gain.linearRampToValueAtTime(gain * (o.swell ?? 1.25), t + dur * 0.55); g.gain.linearRampToValueAtTime(gain * 0.9, t + dur); } else g.gain.setValueAtTime(gain, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); g.connect(body);
    for (const [mul, det, gg] of [[1, -4, 0.55], [1, 5, 0.45], [2, 2, 0.12]]) {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      const from = o.slide && lastF ? lastF : f;
      osc.frequency.setValueAtTime(from * mul, t); if (from !== f) osc.frequency.exponentialRampToValueAtTime(f * mul, t + Math.min(0.22, dur * 0.3));
      osc.detune.value = det;
      // vibrato that arrives a little after the note starts, and widens
      const vib = ctx.createOscillator(); vib.frequency.value = o.vibRate ?? 5.4; const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(o.vib ?? 16, t + Math.min(0.9, dur * 0.6)); vib.connect(vg); vg.connect(osc.detune);
      const og = ctx.createGain(); og.gain.value = gg; osc.connect(og); og.connect(g);
      osc.start(t); vib.start(t); osc.stop(t + dur + rel + 0.1); vib.stop(t + dur + rel + 0.1);
    }
    // bow hair on the string
    const nz = ctx.createBufferSource(); nz.buffer = noiseBuf; nz.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(9000, f * 3); bp.Q.value = 1.4; const ng = ctx.createGain(); ng.gain.value = (o.bow ?? 0.06) * gain * 4; nz.connect(bp); bp.connect(ng); ng.connect(g); nz.start(t, Math.random()); nz.stop(t + dur + rel + 0.1);
    lastF = f;
  };
}

// glassy, near-the-bridge scraping: high, thin, unstable
function ponticello(ctx, out, verb, t, midi, dur, gain = 0.05) {
  const f = F(midi); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [mul, gg] of [[3, 0.5], [5, 0.35], [7, 0.25], [9.02, 0.2]]) { const o = ctx.createOscillator(); o.frequency.value = f * mul; const tr = ctx.createOscillator(); tr.frequency.value = 11 + Math.random() * 5; const tg = ctx.createGain(); tg.gain.value = 30; tr.connect(tg); tg.connect(o.detune); const og = ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(g); o.start(t); tr.start(t); o.stop(t + dur + 0.1); tr.stop(t + dur + 0.1); }
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; g.connect(hp); hp.connect(out); const sv = ctx.createGain(); sv.gain.value = 0.9; hp.connect(sv); sv.connect(verb);
}
// col legno: the wood of the bow tapping the strings
function legno(ctx, out, verb, t, midi, gain = 0.15) {
  const f = F(midi); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  for (const mul of [1, 2.01, 3.03]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f * mul; o.connect(g); o.start(t); o.stop(t + 0.2); }
  g.connect(out); const sv = ctx.createGain(); sv.gain.value = 0.6; g.connect(sv); sv.connect(verb);
}

export const THEME_LOOP = 0.88 * 56;   // 56 beats

// schedule the whole theme into an (offline) context; out / verb are its destinations
// the effects: everything plays into a bus that runs through a tape-wow chorus, a stereo
// ping-pong delay (a dotted-eighth echo thrown left and right) and a long, dark hall
function effects(ctx, out) {
  const bus = ctx.createGain();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(out);
  // tape wow: a slowly wandering short delay, mixed under the dry signal
  bus.connect(master);
  const wow = ctx.createDelay(0.05); wow.delayTime.value = 0.014; const wl = ctx.createOscillator(); wl.frequency.value = 0.31; const wg = ctx.createGain(); wg.gain.value = 0.0035; wl.connect(wg); wg.connect(wow.delayTime); wl.start();
  const wmix = ctx.createGain(); wmix.gain.value = 0.38; bus.connect(wow); wow.connect(wmix); wmix.connect(master);
  // ping-pong delay, darkened and thinned so the echoes sit behind the violin
  const beat = 0.88; const dt = beat * 0.75;
  const send = ctx.createGain(); send.gain.value = 0.32; bus.connect(send);
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600; const thin = ctx.createBiquadFilter(); thin.type = 'highpass'; thin.frequency.value = 320; send.connect(thin); thin.connect(tone);
  const dL = ctx.createDelay(2), dR = ctx.createDelay(2); dL.delayTime.value = dt; dR.delayTime.value = dt;
  const fb = ctx.createGain(); fb.gain.value = 0.42; const pL = ctx.createStereoPanner(), pR = ctx.createStereoPanner(); pL.pan.value = -0.8; pR.pan.value = 0.8;
  tone.connect(dL); dL.connect(pL); pL.connect(master); dL.connect(dR); dR.connect(pR); pR.connect(master); dR.connect(fb); fb.connect(dL);
  // the hall: long, dark, stereo
  const n = Math.floor(ctx.sampleRate * 5.5), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const tt = i / n; lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - tt, 2.6) * (i < 600 ? i / 600 : 1); } }
  const hall = ctx.createConvolver(); hall.buffer = ir; const hallIn = ctx.createGain(); hallIn.gain.value = 0.55; hallIn.connect(hall); const hallOut = ctx.createGain(); hallOut.gain.value = 0.7; hall.connect(hallOut); hallOut.connect(master);
  const hs = ctx.createGain(); hs.gain.value = 0.35; bus.connect(hs); hs.connect(hallIn);   // some of everything into the hall
  pL.connect(hallIn); pR.connect(hallIn);                                                      // and the echoes too
  return { bus, hall: hallIn };
}

export function renderMenuTheme(ctx, outRaw, verbRaw) {
  const fx = effects(ctx, outRaw); const out = fx.bus, verb = fx.hall;
  const beat = 0.88; const T = (b) => 0.05 + b * beat;
  const vln = strings(ctx, out, verb, 'violin'), vln2 = strings(ctx, out, verb, 'violin2'), cel = strings(ctx, out, verb, 'cello');
  // the melody: [note, beats]; '.' is a rest
  const A = [['A4', 2], ['D5', 1], ['C5', 1], ['Bb4', 1.5], ['A4', 0.5], ['G4', 1], ['A4', 1], ['F4', 2], ['E4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 3]];
  const B = [['D5', 1.5], ['E5', 0.5], ['F5', 2], ['E5', 1], ['D5', 1], ['C#5', 2], ['Bb4', 1], ['A4', 1], ['G4', 1], ['F4', 1], ['E4', 2], ['D4', 4]];
  const A2 = [['A5', 2], ['D6', 1], ['C6', 1], ['Bb5', 1.5], ['A5', 0.5], ['G5', 1], ['A5', 1], ['F5', 2], ['E5', 1], ['F5', 0.5], ['G5', 0.5], ['C#5', 4]];
  let b = 2;
  const play = (line, inst, opts, harm) => {
    for (const [n, len] of line) {
      if (n !== '.') inst(T(b), M(n), len * beat * 0.98, { slide: len >= 1, gain: opts.gain, vib: opts.vib, detune: opts.detune });
      if (harm) { const h = harm(n, b); if (h) vln2(T(b), M(h.n), len * beat * 0.98, { gain: h.gain ?? opts.gain * 0.55, detune: h.detune ?? 0, vib: 10 }); }
      b += len;
    }
  };
  const third = { 'A4': 'F4', 'D5': 'A4', 'C5': 'A4', 'Bb4': 'G4', 'G4': 'E4', 'F4': 'D4', 'E4': 'C#4', 'A5': 'F5', 'D6': 'A5', 'C6': 'A5', 'Bb5': 'G5', 'G5': 'E5', 'F5': 'D5', 'E5': 'C#5', 'C#5': 'A4', 'D4': 'A3' };
  // first statement: the violin alone over the drone
  play(A, vln, { gain: 0.19, vib: 14 });
  // second: a second violin joins in thirds
  play(B, vln, { gain: 0.2, vib: 17 }, (n) => third[n] ? { n: third[n] } : null);
  // third: up an octave, and the harmony sours a semitone flat — the place is wrong
  const ab = b;
  play(A2, vln, { gain: 0.17, vib: 20 }, (n) => third[n] ? { n: third[n], detune: -100, gain: 0.07 } : null);
  // hold, then nothing resolves
  b += 1;
  // the cello: a slow walk under it all, D minor with the flat-six dread
  const cellos = [['D2', 8], ['Bb1', 4], ['A1', 4], ['D2', 4], ['G1', 4], ['A1', 4], ['D2', 6], ['Bb1', 4], ['G1', 4], ['A1', 4], ['C#2', 4], ['D2', 6]];
  let cb = 0; for (const [n, len] of cellos) { cel(T(cb), M(n), len * beat, { gain: 0.16, attack: 0.6, release: 1.2, vib: 6, swell: 1.4, bow: 0.1 }); cel(T(cb), M(n) + 7, len * beat, { gain: 0.06, attack: 0.9, release: 1.2, vib: 5 }); cb += len; }
  // scares: scrapes rising behind the melody, taps in the gaps
  ponticello(ctx, out, verb, T(13), M('D5'), beat * 4, 0.035);
  ponticello(ctx, out, verb, T(31), M('Eb5'), beat * 5, 0.045);
  ponticello(ctx, out, verb, T(ab + 9), M('A5'), beat * 6, 0.06);
  for (const k of [6.5, 7, 7.25, 22.5, 23, 23.25, 23.5, 47, 47.5, 48, 48.25]) legno(ctx, out, verb, T(k), M(k > 40 ? 'Eb5' : 'D5'), 0.12);
  // a low, wrong cluster swells under the last phrase
  for (const n of ['D3', 'Eb3', 'A3']) cel(T(ab + 6), M(n), beat * 8, { gain: 0.05, attack: 2.5, release: 2, vib: 3, detune: -15 });
}

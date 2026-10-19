// The Testing Site logo: a biohazard seal, "TESTING SITE" in military stencil with a sick green glow,
// the AsylumVR mark riding on top, and a hazard-striped placard underneath. Drawn on a canvas so the
// title screen and the headset menu show the same thing. Only the Testing Site tapes (5-7) use it.

export const LOGO_W = 1200, LOGO_H = 420;
const GREEN = '#7fe09a', GLOW = 'rgba(80,255,140,0.55)';

// draws the logo with its top-left at (x, y), s = scale (1 = 1200 x 420)
export function drawSiteLogo(c, x, y, s = 1, sub = 'SITE 7 · NYE COUNTY, NEVADA · AUTHORIZED PERSONNEL ONLY') {
  c.save(); c.translate(x, y); c.scale(s, s); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  // the seal
  seal(c, 150, 190, 138);
  // ASYLUM VR, small, riding above the big word
  c.font = '64px "Special Elite", serif'; c.fillStyle = '#e4dccb'; c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 10;
  c.fillText('ASYLUM', 318, 92); const aw = c.measureText('ASYLUM').width;
  c.font = '34px "Special Elite", serif'; c.fillStyle = '#c8221a'; c.fillText('VR', 324 + aw, 66);
  c.font = '34px VT323, monospace'; c.fillStyle = '#8fb59a'; c.fillText('PRESENTS FOOTAGE FROM', 330 + aw + 70, 82);
  // TESTING SITE: stencil, chromatic split, green glow
  c.font = '148px "Black Ops One", "Special Elite", sans-serif';
  const big = (t, ty) => {
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,0,60,0.45)'; c.fillText(t, 318 + 4, ty);
    c.fillStyle = 'rgba(0,200,255,0.35)'; c.fillText(t, 318 - 4, ty);
    const g = c.createLinearGradient(0, ty - 120, 0, ty); g.addColorStop(0, '#f2fff5'); g.addColorStop(0.55, '#b9f5c9'); g.addColorStop(1, GREEN);
    c.shadowColor = GLOW; c.shadowBlur = 34; c.fillStyle = g; c.fillText(t, 318, ty);
    c.shadowBlur = 0;
  };
  // squeeze the word to the space it has
  c.save(); const tw = c.measureText('TESTING').width; const fit = Math.min(1, 860 / tw); c.translate(318, 0); c.scale(fit, 1); c.translate(-318, 0);
  big('TESTING', 222); big('SITE', 352); c.restore();
  // a specimen tag beside SITE: the series number
  c.font = '40px VT323, monospace'; c.fillStyle = GREEN; c.shadowColor = GLOW; c.shadowBlur = 12;
  c.fillText('SPECIMEN', 790, 290); c.fillText('FOOTAGE', 790, 326); c.shadowBlur = 0;
  c.strokeStyle = GREEN; c.lineWidth = 3; c.strokeRect(778, 258, 168, 80);
  // the placard: hazard stripes with a black slot for the location
  const py = 372, ph = 44, px = 20, pw = LOGO_W - 40;
  c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
  c.fillStyle = '#f0c419'; c.fillRect(px, py, pw, ph); c.fillStyle = '#111';
  for (let k = -ph; k < pw + ph; k += 44) { c.beginPath(); c.moveTo(px + k, py + ph); c.lineTo(px + k + 22, py + ph); c.lineTo(px + k + 22 + ph, py); c.lineTo(px + k + ph, py); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle = '#060806'; c.fillRect(px + 70, py + 6, pw - 140, ph - 12);
  c.font = '34px VT323, monospace'; c.fillStyle = '#e8e2d4'; c.textAlign = 'center'; c.fillText(sub, LOGO_W / 2, py + 32, pw - 170); c.textAlign = 'left';
  c.restore();
}

// a biohazard trefoil in a ring, glowing
function seal(c, cx, cy, R) {
  const off = document.createElement('canvas'); off.width = off.height = Math.ceil(R * 2 + 80); const o = off.getContext('2d'); const k = off.width / 2;
  o.translate(k, k);
  // the ring
  o.strokeStyle = GREEN; o.lineWidth = R * 0.07; o.beginPath(); o.arc(0, 0, R, 0, 6.283); o.stroke();
  o.lineWidth = R * 0.025; o.beginPath(); o.arc(0, 0, R * 0.9, 0, 6.283); o.stroke();
  // three lobes: a big disc pushed out from the middle, with a smaller disc cut from its far side
  o.fillStyle = GREEN;
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.0944; o.beginPath(); o.arc(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34, R * 0.42, 0, 6.283); o.fill(); }
  o.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.0944; o.beginPath(); o.arc(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46, R * 0.3, 0, 6.283); o.fill(); }
  o.beginPath(); o.arc(0, 0, R * 0.14, 0, 6.283); o.fill();
  // the gaps where the lobes meet the middle
  o.lineWidth = R * 0.05; for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2.0944; o.beginPath(); o.moveTo(0, 0); o.lineTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); o.stroke(); }
  o.globalCompositeOperation = 'source-over';
  // the inner ring that ties the lobes together, broken by the lobes' cutouts
  o.lineWidth = R * 0.06; o.beginPath(); o.arc(0, 0, R * 0.36, 0, 6.283); o.stroke();
  o.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.0944; o.beginPath(); o.arc(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46, R * 0.3, 0, 6.283); o.fill(); }
  o.globalCompositeOperation = 'source-over';
  c.save(); c.shadowColor = GLOW; c.shadowBlur = 30; c.drawImage(off, cx - k, cy - k); c.shadowBlur = 0; c.drawImage(off, cx - k, cy - k); c.restore();
}

// waits for the logo's fonts (the canvas draws with fallbacks until they arrive)
export function siteFonts() {
  try { return Promise.all(['148px "Black Ops One"', '64px "Special Elite"', '34px VT323'].map((f) => document.fonts.load(f))).catch(() => {}); } catch (e) { return Promise.resolve(); }
}

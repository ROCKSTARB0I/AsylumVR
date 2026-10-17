// Slates: text panels for VR (notes, the pause card, captions, prompts),
// painted on canvases and floated in front of you.
import * as THREE from '../vendor/three.module.js';

export class Slate {
  constructor(w = 1024, h = 640, size = 0.9, opts = {}) {
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: opts.depthTest ?? false, fog: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * h / w), m); this.mesh.renderOrder = 1000; this.mesh.visible = false;
    this.opts = opts;
  }
  paper(title, body) {
    const c = this.cv.getContext('2d'), w = this.cv.width, h = this.cv.height;
    c.clearRect(0, 0, w, h); c.fillStyle = '#cdc4aa'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.7, h * 0.8, 10, w * 0.7, h * 0.8, w * 0.6); g.addColorStop(0, 'rgba(110,60,20,0.3)'); g.addColorStop(1, 'rgba(110,60,20,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d1a14'; c.font = '34px "Special Elite", "Courier New", serif'; c.fillText(title, 40, 60);
    c.fillRect(40, 76, w - 80, 2);
    c.font = '25px "Special Elite", "Courier New", serif'; wrap(c, body, 40, 118, w - 80, 32);
    c.fillStyle = '#5a4c34'; c.font = '24px "VT323", monospace'; c.fillText('[trigger] close', w - 200, h - 22);
    this.tex.needsUpdate = true;
  }
  card(lines, opts = {}) {
    const c = this.cv.getContext('2d'), w = this.cv.width, h = this.cv.height;
    c.clearRect(0, 0, w, h); if (opts.bg !== false) { c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(0, 0, w, h); }
    c.textAlign = 'center'; let y = opts.top ?? 90;
    for (const L of lines) { const [txt, size = 36, col = '#e6e1d6'] = Array.isArray(L) ? L : [L]; c.font = `${size}px "VT323", "Courier New", monospace`; c.fillStyle = col; c.shadowColor = '#000'; c.shadowBlur = 6; y = wrap(c, txt, w / 2, y, w - 60, size * 1.1, true) + size * 0.5; }
    c.textAlign = 'left'; c.shadowBlur = 0; this.tex.needsUpdate = true;
  }
}
function wrap(c, text, x, y, maxW, lh, center = false) {
  for (const para of String(text).split('\n')) {
    const words = para.split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = t; }
    c.fillText(line, x, y); y += lh;
  }
  return y;
}

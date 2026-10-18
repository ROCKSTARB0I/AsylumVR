// VRMenu: the title screen inside the headset. A tape-label panel hangs in the dark lobby in front of
// you; both controllers cast a pointer and the trigger clicks. The pages (main, tape shelf, how to play,
// reset) come from main.js as plain data: { title, kicker, logo, text: [..], items: [{ label, sub, status, locked, danger, act }] }.
import * as THREE from '../vendor/three.module.js';

const PW = 1024, PH = 1000;
const INK = '#e8e2d4', DIM = '#8f897d', RED = '#c0352b';

export class VRMenu {
  constructor({ dolly, controllers, sound, pages }) {
    this.pages = pages; this.sound = sound; this.page = 'main'; this.on = false; this.dirty = true; this.items = []; this.sec = -1;
    this.cv = document.createElement('canvas'); this.cv.width = PW; this.cv.height = PH; this.cx = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    const w = 1.3, h = w * PH / PW;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, depthTest: false }));
    this.panel.material.userData.noNV = true; this.panel.renderOrder = 990; this.panel.visible = false;
    this.panel.position.set(0, 1.42, -1.5); dolly.add(this.panel);
    this.caster = new THREE.Raycaster();
    // a pointer and a cursor dot for each hand
    this.pointers = controllers.map((c) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xe8e2d4, transparent: true, opacity: 0.6, depthTest: false }));
      line.material.userData.noNV = true; line.renderOrder = 991; line.visible = false; c.add(line);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.009, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      dot.material.userData.noNV = true; dot.renderOrder = 992; dot.visible = false; dot.position.z = 0.002; this.panel.add(dot);
      const p = { c, line, dot, hover: -1 };
      c.addEventListener('select', () => { if (this.on) this.click(p); });
      return p;
    });
  }
  open(page = 'main') { this.on = true; this.page = page; this.panel.visible = true; this.dirty = true; for (const p of this.pointers) p.line.visible = true; }
  close() { this.on = false; this.panel.visible = false; for (const p of this.pointers) { p.line.visible = false; p.dot.visible = false; p.hover = -1; } }
  go(page) { this.page = page; this.dirty = true; for (const p of this.pointers) p.hover = -1; }
  refresh() { this.dirty = true; }

  update() {
    if (!this.on) return;
    // where each pointer lands on the panel
    const m = new THREE.Matrix4();
    for (const p of this.pointers) {
      p.c.updateMatrixWorld(); m.identity().extractRotation(p.c.matrixWorld);
      this.caster.ray.origin.setFromMatrixPosition(p.c.matrixWorld); this.caster.ray.direction.set(0, 0, -1).applyMatrix4(m);
      const hit = this.caster.intersectObject(this.panel, false)[0];
      let hov = -1;
      if (hit && hit.uv) {
        p.line.scale.z = hit.distance; p.dot.visible = true; p.dot.position.set((hit.uv.x - 0.5) * this.panel.geometry.parameters.width, (hit.uv.y - 0.5) * this.panel.geometry.parameters.height, 0.002);
        const x = hit.uv.x * PW, y = (1 - hit.uv.y) * PH;
        hov = this.items.findIndex((it) => !it.locked && x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h);
      } else { p.line.scale.z = 3; p.dot.visible = false; }
      if (hov !== p.hover) { if (hov >= 0) this.buzz(p); p.hover = hov; this.dirty = true; }
    }
    const s = Math.floor(performance.now() / 1000); if (s !== this.sec) { this.sec = s; this.dirty = true; }
    if (this.dirty) { this.dirty = false; this.draw(); }
  }
  // a tiny tick in the controller when the pointer moves onto a button
  buzz(p) { try { const src = p.c.userData.src; const a = src && src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0]; if (a && a.pulse) a.pulse(0.25, 18); } catch (e) {} }
  click(p) {
    const it = this.items[p.hover]; if (!it || it.locked) return;
    if (it.tape) this.sound.tapeLoad(); else this.sound.tapeClick();
    if (it.page) this.go(it.page); else if (it.act) it.act();
  }

  draw() {
    const c = this.cx, P = this.pages[this.page](); c.clearRect(0, 0, PW, PH);
    // the slab: black glass with a thin cream frame, like the camcorder's viewfinder
    c.fillStyle = 'rgba(4,4,5,0.88)'; round(c, 8, 8, PW - 16, PH - 16, 26); c.fill();
    c.strokeStyle = 'rgba(232,226,212,0.35)'; c.lineWidth = 3; round(c, 8, 8, PW - 16, PH - 16, 26); c.stroke();
    // viewfinder corners
    c.strokeStyle = INK; c.lineWidth = 4; for (const [x, y, sx, sy] of [[40, 40, 1, 1], [PW - 40, 40, -1, 1], [40, PH - 40, 1, -1], [PW - 40, PH - 40, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * 46); c.lineTo(x, y); c.lineTo(x + sx * 46, y); c.stroke(); }
    // top line: ▶ PLAY ... SP 0:00:00
    c.font = '44px VT323, monospace'; c.fillStyle = INK; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText('▶︎ PLAY', 70, 62);
    const s = Math.max(0, this.sec); c.textAlign = 'right'; c.fillText(`SP ${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, PW - 70, 62);
    c.textAlign = 'left';
    let y = 140;
    if (P.kicker) { c.font = '30px VT323, monospace'; c.fillStyle = DIM; y = wrap(c, P.kicker.toUpperCase(), 70, y, PW - 140, 32) + 10; }
    if (P.logo) {
      c.font = '150px "Special Elite", serif'; c.fillStyle = '#e4dccb'; c.fillText('ASYLUM', 64, y); const lw = c.measureText('ASYLUM').width;
      c.font = '78px "Special Elite", serif'; c.fillStyle = RED; c.fillText('VR', 70 + lw, y + 8); y += 178;
    }
    if (P.title) { c.font = '58px VT323, monospace'; c.fillStyle = '#fff'; c.fillText(P.title, 70, y); y += 76; }
    if (P.text) { c.font = '34px "Special Elite", serif'; c.fillStyle = '#cfc8ba'; for (const t of P.text) y = wrap(c, t, 70, y, PW - 140, 42) + 18; y += 6; }
    // the buttons
    const hovered = new Set(this.pointers.map((p) => p.hover));
    this.items = [];
    for (const it of P.items) {
      const tall = !!it.sub; const h = tall ? 112 : 74; const box = { ...it, x: 56, y, w: PW - 112, h }; this.items.push(box);
      const on = hovered.has(this.items.length - 1) && !it.locked;
      if (it.tape) {
        // a cassette on the shelf: reels, a paper label, a status tag
        c.fillStyle = on ? '#24221f' : '#121212'; round(c, box.x, y, box.w, h - 10, 10); c.fill(); c.strokeStyle = on ? INK : 'rgba(232,226,212,0.25)'; c.lineWidth = on ? 4 : 2; round(c, box.x, y, box.w, h - 10, 10); c.stroke();
        for (const rx of [box.x + 44, box.x + 104]) { c.beginPath(); c.arc(rx, y + (h - 10) / 2, 22, 0, 6.283); c.fillStyle = '#2a2a2a'; c.fill(); c.strokeStyle = '#555'; c.lineWidth = 3; c.stroke(); }
        c.fillStyle = it.locked ? '#4a4740' : '#d9d0bc'; round(c, box.x + 150, y + 10, box.w - 170, h - 30, 6); c.fill();
        c.fillStyle = '#111'; c.font = '38px "Special Elite", serif'; c.fillText(it.label, box.x + 166, y + 16, box.w - 210);
        c.font = '26px VT323, monospace'; c.fillStyle = '#3b372f'; c.fillText(it.sub, box.x + 168, y + 58, box.w - 210);
        if (it.status) { c.font = '28px VT323, monospace'; c.textAlign = 'right'; c.fillStyle = it.statusColor || '#7a2a22'; c.fillText(it.status, box.x + box.w - 30, y + 18); c.textAlign = 'left'; }
      } else {
        if (on) { c.fillStyle = it.danger ? RED : INK; c.fillRect(box.x, y, box.w, h - 8); }
        c.font = (it.small ? '46px' : '62px') + ' VT323, monospace'; c.fillStyle = on ? '#000' : it.danger ? '#d0675b' : it.locked ? '#55514a' : INK;
        if (on) c.fillText('▶︎', box.x + 14, y + 4);
        c.fillText(it.label.toUpperCase(), box.x + 64, y + 4);
      }
      y += h + (it.tape ? 4 : 6);
    }
    // how to point
    c.font = '30px VT323, monospace'; c.fillStyle = DIM; c.textAlign = 'center'; c.fillText('POINT AND PULL THE TRIGGER', PW / 2, PH - 92); c.textAlign = 'left';
    this.tex.needsUpdate = true;
  }
}

function round(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrap(c, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = word; } else line = t; }
  if (line) { c.fillText(line, x, y); y += lh; }
  return y;
}

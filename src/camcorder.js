// The camcorder: your only light. Night vision lights the dark with an
// infrared lamp only the lens can see, and eats batteries. On desktop you
// raise it to your eye (right mouse / Q); in VR it is in your left hand
// with its flip-out screen showing what it sees.
import * as THREE from '../vendor/three.module.js';
import { makeScreenMaterial } from './tape.js?v=26';

export const EYE_LAYER = 5;   // things only the camcorder sees (eye-shine)

export class Camcorder {
  constructor(scene) {
    this.battery = 1; this.spares = 1; this.nv = false; this.raised = false; this.raise = 0; this.zoom = 1; this.clock = 0; this.drain = 0;   // night vision never runs out
    this.cam = new THREE.PerspectiveCamera(52, 4 / 3, 0.05, 90); this.cam.layers.enable(EYE_LAYER);
    this.ir = new THREE.SpotLight(0xffffff, 0, 0, 0.78, 0.8, 1.7); this.ir.layers.enableAll();
    scene.add(this.ir, this.ir.target);
    this.rt = new THREE.WebGLRenderTarget(400, 300, { type: THREE.HalfFloatType, depthBuffer: true });
    // on-screen display painted on a canvas
    this.osdCv = document.createElement('canvas'); this.osdCv.width = 400; this.osdCv.height = 300;
    this.osdTex = new THREE.CanvasTexture(this.osdCv); this.osdT = 0;
    this.screenMat = makeScreenMaterial(this.rt.texture, this.osdTex);
    this.model = this.buildModel();
    this.irOn = false;
  }
  buildModel() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.55, metalness: 0.2 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.4, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.8 });
    for (const m of [body, trim, glass]) m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.15;'); };
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
    add(new THREE.BoxGeometry(0.065, 0.085, 0.16), body, 0, 0, 0);
    add(new THREE.CylinderGeometry(0.03, 0.032, 0.07, 20), trim, 0, 0.008, -0.11, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.024, 0.024, 0.005, 20), glass, 0, 0.008, -0.147, Math.PI / 2);
    add(new THREE.BoxGeometry(0.03, 0.03, 0.05), body, 0, 0.055, 0.04);                     // top handle / mic
    add(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 10), new THREE.MeshBasicMaterial({ color: 0x220000 }), 0.018, 0.05, -0.06, Math.PI / 2).name = 'tally';
    // IR emitter beside the lens
    add(new THREE.BoxGeometry(0.018, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0x220806 }), -0.022, -0.028, -0.081).name = 'irled';
    // the flip-out screen, hinged on the left side, turned to face you
    // hinged at the front-left edge; open, it swings out to the left and faces back at you
    const hinge = new THREE.Group(); hinge.position.set(-0.034, 0.004, -0.065); hinge.rotation.y = 0.25; g.add(hinge); this.hinge = hinge;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.105, 0.008), body); bezel.position.set(-0.075, 0, 0); hinge.add(bezel);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.138, 0.0935), this.screenMat); scr.position.set(-0.075, 0, 0.0045); hinge.add(scr);
    this.screen = scr; this.tally = g.getObjectByName('tally'); this.irled = g.getObjectByName('irled');
    // strap over the back of your hand
    add(new THREE.BoxGeometry(0.012, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 }), 0.038, 0, 0.0);
    return g;
  }
  get dead() { return this.battery <= 0; }
  toggleNV() { if (this.dead && !this.nv) return false; this.nv = !this.nv; return true; }
  reload() { if (this.spares <= 0) return false; this.spares--; this.battery = 1; return true; }
  update(dt, recording) {
    this.clock += dt;
    if (this.nv && recording) { this.battery = Math.max(0, this.battery - this.drain * dt); if (this.battery <= 0) this.nv = false; }
    this.tally.material.color.setHex(recording && Math.sin(this.clock * 6) > 0 ? 0xff1a00 : 0x220000);
    this.irled.material.color.setHex(this.nv && recording ? 0x661010 : 0x150605);
  }
  // point the lens + IR lamp from a world pose
  aim(pos, quat, fov = 52) {
    this.cam.position.copy(pos); this.cam.quaternion.copy(quat); this.cam.fov = fov / this.zoom; this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    this.ir.position.copy(pos); const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    this.ir.target.position.copy(pos).addScaledVector(fwd, 5); this.ir.target.updateMatrixWorld();
  }
  setIR(on) { this.irOn = on; this.ir.intensity = on ? 22 : 0; }
  // the camcorder display (VR screen) — REC, time code, battery, mode
  paintOSD(force, objective) {
    this.osdT -= 1; if (this.osdT > 0 && !force) return; this.osdT = 6;
    const c = this.osdCv.getContext('2d'); const w = 400, h = 300; c.clearRect(0, 0, w, h);
    c.font = 'bold 22px "Courier New", monospace'; c.textBaseline = 'top'; c.shadowColor = '#000'; c.shadowBlur = 3;
    const blink = Math.sin(this.clock * 6) > 0;
    c.fillStyle = '#fff'; c.fillText('REC', 46, 18); if (blink) { c.fillStyle = '#ff2010'; c.beginPath(); c.arc(30, 30, 9, 0, 6.28); c.fill(); }
    c.fillStyle = '#fff'; c.fillText(timecode(this.clock), w - 150, 18);
    // battery
    const bx = w - 70, by = h - 40; c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(bx, by, 50, 20); c.fillStyle = '#fff'; c.fillRect(bx + 50, by + 6, 4, 8);
    c.fillStyle = this.battery < 0.2 ? (blink ? '#ff3020' : 'transparent') : '#fff';
    const bars = Math.ceil(this.battery * 4); for (let i = 0; i < bars; i++) c.fillRect(bx + 3 + i * 12, by + 3, 9, 14);
    c.fillStyle = '#fff'; c.font = '16px "Courier New", monospace';
    c.fillText(this.nv ? 'NIGHT SHOT' : (this.dead ? 'BATTERY EMPTY' : ''), 22, h - 36);
    if (this.zoom > 1.05) c.fillText(`ZOOM ${this.zoom.toFixed(1)}x`, w / 2 - 50, h - 36);
    // corner brackets
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; const m = 14, L = 22;
    for (const [x, y, sx, sy] of [[m, m + 44, 1, 1], [w - m, m + 44, -1, 1], [m, h - m - 46, 1, -1], [w - m, h - m - 46, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke(); }
    if (this.saveFlash && this.clock < this.saveFlash) { c.font = 'bold 18px "Courier New", monospace'; c.fillStyle = '#fff'; c.fillText('\u25CF SAVED', w / 2 - 50, 22); }
    if (objective) { c.font = '14px "Courier New", monospace'; c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillText(objective.slice(0, 44), 22, 50); }
    this.osdTex.needsUpdate = true;
  }
}
export function timecode(t) { const s = Math.floor(t) + 2 * 3600 + 13 * 60; const hh = Math.floor(s / 3600) % 24, mm = Math.floor(s / 60) % 60, ss = s % 60, ff = Math.floor((t % 1) * 30); const p = (n) => String(n).padStart(2, '0'); return `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`; }

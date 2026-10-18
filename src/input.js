// Input: desktop keys and mouse, and Quest controllers, folded into one
// set of intents the player reads each frame.
export class Input {
  constructor(canvas, renderer) {
    this.canvas = canvas; this.renderer = renderer;
    this.keys = new Set(); this.edges = new Set();
    this.look = { dx: 0, dy: 0 }; this.wheel = 0; this.rmb = false; this.lmb = false; this.locked = false; this.drag = null;
    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys.add(e.code); this.edges.add(e.code); if (['Tab', 'Space'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.rmb = true;
      if (e.button === 0) { this.lmb = true; this.edges.add('Mouse0'); }
      if (!this.locked && this.wantLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) {} }
      this.drag = { x: e.clientX, y: e.clientY };
    });
    addEventListener('mouseup', (e) => { if (e.button === 2) this.rmb = false; if (e.button === 0) this.lmb = false; this.drag = null; });
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.look.dx += e.movementX; this.look.dy += e.movementY; }
      else if (this.drag) { this.look.dx += (e.clientX - this.drag.x) * 1.2; this.look.dy += (e.clientY - this.drag.y) * 1.2; this.drag.x = e.clientX; this.drag.y = e.clientY; }   // drag-look when pointer lock is refused
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    this.pads = { left: null, right: null }; this.prevBtn = { left: [], right: [] };
    this.snapReady = true;
  }
  edge(code) { return this.edges.has(code); }
  // read the controllers; returns intents
  frame() {
    const k = this.keys; const I = { mx: 0, mz: 0, turn: 0, snap: 0, run: false, crouch: false, interact: false, nv: false, raise: this.rmb, reload: false, pause: false, notes: false, zoom: 0, freecam: false, up: 0 };
    if (k.has('KeyW') || k.has('ArrowUp')) I.mz += 1; if (k.has('KeyS') || k.has('ArrowDown')) I.mz -= 1;
    if (k.has('KeyD')) I.mx += 1; if (k.has('KeyA')) I.mx -= 1;
    if (k.has('ArrowLeft')) I.turn -= 1; if (k.has('ArrowRight')) I.turn += 1;
    I.run = k.has('ShiftLeft') || k.has('ShiftRight');
    I.crouch = this.edge('KeyC') || this.edge('ControlLeft');
    I.interact = this.edge('KeyE') || this.edge('Mouse0') && !this.rmb;
    I.nv = this.edge('KeyF') || this.edge('KeyN');
    if (this.edge('KeyQ')) I.raise = 'toggle';
    I.reload = this.edge('KeyR'); I.pause = this.edge('Escape') || this.edge('KeyP'); I.notes = this.edge('Tab') || this.edge('KeyJ');
    I.freecam = this.edge('KeyV');
    if (k.has('Space')) I.up += 1; if (k.has('KeyZ')) I.up -= 1;
    I.any = [...this.edges].some((c) => c !== 'Escape' && c !== 'KeyP');
    I.pick = this.edge('Digit1') || this.edge('Numpad1') ? 1 : this.edge('Digit2') || this.edge('Numpad2') ? 2 : 0;   // dialogue replies   // any key or click this frame (for struggling)
    I.zoom = this.wheel; this.wheel = 0;
    I.lookDx = this.look.dx; I.lookDy = this.look.dy; this.look.dx = this.look.dy = 0;
    this.edges.clear();
    // controllers
    const s = this.renderer.xr.getSession && this.renderer.xr.getSession();
    I.vr = !!(s && this.renderer.xr.isPresenting);
    if (I.vr) {
      for (const src of s.inputSources) {
        if (!src.gamepad || !src.handedness) continue;
        const side = src.handedness === 'left' ? 'left' : 'right'; const gp = src.gamepad; const b = gp.buttons.map((x) => x.pressed); const pb = this.prevBtn[side];
        const down = (i) => b[i] && !pb[i];
        if (b.some((x, i) => x && !pb[i] && i !== 5)) I.any = true;
        const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
        if (side === 'left') {
          if (Math.hypot(ax[0], ax[1]) > 0.15) { I.mx += ax[0]; I.mz -= ax[1]; }
          if (down(3)) this.sprint = !this.sprint;
          if (Math.hypot(ax[0], ax[1]) < 0.2) this.sprint = false;
          I.run = I.run || this.sprint;
          if (down(0)) I.nv = true;              // left trigger: night vision
          if (down(4)) I.reload = true;          // X: swap battery
          if (down(5)) I.notes = true;           // Y: notes / objective
          I.zoomHold = b[1] ? 1 : 0;             // left grip: zoom in
        } else {
          if (Math.abs(ax[0]) > 0.7) { if (this.snapReady) { I.snap = Math.sign(ax[0]); this.snapReady = false; } } else if (Math.abs(ax[0]) < 0.3) this.snapReady = true;
          if (down(0) || down(1)) I.interact = true;   // trigger or grip: use
          if (down(4)) I.crouch = true;          // A: crouch
          if (down(5)) I.pause = true;           // B: menu
          if (down(3)) I.notes = true;
        }
        this.prevBtn[side] = b;
      }
    }
    return I;
  }
}

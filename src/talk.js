// Talk: conversations with the people in the building. Walk up, press E (or pull the trigger), they
// turn to you and speak; when it's your turn you get two replies, and what you pick decides what they
// say next and is remembered (G.flags) for later.
// A tree is { start: 'id', nodes: { id: { say, who?, choices?: [{ t, next, set? }], next?, set?, end? } } }.
// On desktop: 1 / 2 picks a reply (or W/S then E). In VR: the left stick picks, the trigger says it.
const CPS = 48;   // characters per second as a line comes out

export class Talk {
  constructor({ G, sound, vr, card, placeCard, onLine }) {
    Object.assign(this, { G, sound, vr, placeCard, onLine }); this._card = card; this.active = null;
    const el = document.createElement('div'); el.id = 'talk'; el.hidden = true;
    el.innerHTML = '<p class="who"></p><p class="line"></p><ol class="replies"></ol><p class="hint"></p>';
    document.body.appendChild(el); this.el = el;
    this.$who = el.querySelector('.who'); this.$line = el.querySelector('.line'); this.$replies = el.querySelector('.replies'); this.$hint = el.querySelector('.hint');
  }
  get busy() { return !!this.active; }
  get card() { return typeof this._card === 'function' ? this._card() : this._card; }
  open(npc, tree, onEnd) {
    this.active = { npc, tree, onEnd, node: null, shown: 0, t: 0, sel: 0, wait: 0.35 };
    this.go(tree.start);
  }
  go(id) {
    const A = this.active; const n = A.tree.nodes[id];
    if (!n) return this.close();
    A.node = n; A.id = id; A.shown = 0; A.sel = 0; A.wait = 0.25; this.dirty = true;
    if (n.set) Object.assign(this.G.flags, n.set);
    if (n.act) n.act(this.G);
    this.sound.mutter(); if (this.onLine) this.onLine(A.npc, n);
  }
  close() {
    const A = this.active; this.active = null; this.el.hidden = true; if (this.card) this.card.mesh.visible = false;
    if (A && A.onEnd) A.onEnd(A.id);
  }
  // returns true while a conversation is running (the caller freezes the player)
  update(dt, I) {
    const A = this.active; if (!A) return false;
    A.t += dt; A.wait -= dt; const n = A.node; const full = n.say.length;
    const before = Math.floor(A.shown); A.shown = Math.min(full, A.shown + dt * CPS);
    if (Math.floor(A.shown) !== before) this.dirty = true;
    const done = A.shown >= full; const ch = n.choices || null;
    if (A.wait <= 0) {
      if (!done && (I.interact || I.pick)) { A.shown = full; this.dirty = true; }
      else if (done && ch) {
        // pick a reply
        if (I.pick && ch[I.pick - 1]) return this.choose(ch[I.pick - 1]), true;
        const up = I.mz > 0.6, down = I.mz < -0.6, left = I.mx < -0.6, right = I.mx > 0.6;
        if (!A.stickHeld && (up || left)) { A.sel = 0; this.dirty = true; } else if (!A.stickHeld && (down || right)) { A.sel = 1; this.dirty = true; }
        A.stickHeld = up || down || left || right;
        if (I.interact) return this.choose(ch[A.sel]), true;
      } else if (done && I.interact) {
        if (n.end || !n.next) this.close(); else this.go(n.next);
        return true;
      }
    }
    if (this.dirty) { this.dirty = false; this.draw(); }
    return true;
  }
  choose(c) { if (c.set) Object.assign(this.G.flags, c.set); this.sound.click && this.sound.click(); if (c.next) this.go(c.next); else this.close(); }
  draw() {
    const A = this.active; const n = A.node; const who = n.who || A.npc.name; const text = n.say.slice(0, Math.floor(A.shown)); const done = A.shown >= n.say.length; const ch = done ? n.choices : null;
    const hint = !done ? '' : ch ? (this.vr() ? 'Stick to choose · trigger to say it' : 'Press 1 or 2 (or W/S and E)') : (this.vr() ? 'Trigger to continue' : 'E to continue');
    if (this.vr()) {
      this.el.hidden = true;
      const lines = [[who.toUpperCase(), 34, '#d2483c'], [text || ' ', 30, '#f0eadc']];
      if (ch) { lines.push(['', 8]); ch.forEach((c, i) => lines.push([`${i === A.sel ? '▶︎ ' : '   '}${i + 1}. ${c.t}`, 28, i === A.sel ? '#ffffff' : '#9a948a'])); }
      lines.push(['', 6], [hint, 22, '#7d776c']);
      this.card.card(lines, { top: 56 }); this.placeCard();
      return;
    }
    const cap = document.getElementById('caption'); if (cap) cap.hidden = true;
    this.el.hidden = false; this.$who.textContent = who; this.$line.textContent = text;
    this.$replies.innerHTML = ''; if (ch) ch.forEach((c, i) => { const li = document.createElement('li'); li.textContent = c.t; if (i === A.sel) li.className = 'sel'; this.$replies.appendChild(li); });
    this.$hint.textContent = hint;
  }
}

// Tape 3: The Fall. The same ground floor as Tape 1, four years earlier: 14 October 1989, the night
// it all came apart. Clean, lit, staffed. The mains are channel 'P' (white, on until the alarm); the
// alarm beacons are channel 'S' (red, dark until the alarm, then pulsing). Cells start locked.

import { W, Z } from './plan.js?v=24';

export function makePlan3(base) {
  const p = base;
  p.tape = 3;
  // ---- the grounds: the yard east of Administration, the courtyard, the south fence, the staff car park
  const g = p.g; const rect = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = z; };
  rect(40, 29, 47, 37, Z.OUT);        // the side yard you drop into from the Administration window
  rect(1, 38, 47, 54, Z.OUT);         // the courtyard
  rect(23, 55, 27, 55, Z.OUT);        // the main gate through the south fence
  rect(15, 56, 35, 63, Z.OUT);        // the staff car park
  p.W = W;
  p.fence = { x0: 23, x1: 27, y: 55 };
  // grass on the grounds, tarmac in the car park and through the gate
  p.floorOf = (x, y, z) => (z === Z.OUT ? (y >= 55 ? 'asphalt' : 'grass') : null);
  // the open perimeter: solid cells around the grounds that aren't part of the building get a chain-link fence, not a wall
  const indoor = (x, y) => { const z = g[y * W + x]; return z && z !== Z.OUT; };
  const building = new Set();
  for (let y = 0; y < g.length / W; y++) for (let x = 0; x < W; x++) { if (g[y * W + x]) continue; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy * W + xx < g.length && indoor(xx, yy)) building.add(y * W + x); } }
  p.perimeter = (x, y) => !(x >= 0 && y >= 0 && x < W && y * W + x < g.length) || !building.has(y * W + x);
  p.car = { x: 25, y: 58.6 };
  p.windowOut = { x: 40.6, y: 31 };   // where you land outside
  p.breaker = { x: 45.6, y: 22.2 };   // on the generator room's east wall
  p.adminDoor = { x: 32, y: 31 };
  p.groundsman = { x: 6.5, y: 47.5 };
  // tidy: nothing tipped over yet, no blood, no bodies, nobody has written on the walls
  for (const pr of p.props) pr.tipped = false;
  p.gore = [];

  // lights: the working hospital (white, all on the mains) and the red alarm beacons
  const lamps = []; const L = (x, y, ch, o = {}) => lamps.push({ x, y, ch, ...o });
  for (const l of base.lamps) {
    if (l.kind === 'tube' || l.kind === 'bulb') L(l.x, l.y, 'P', { col: 0xf2f6ff, i: (l.i || 1) * 1.05, r: l.r, kind: l.kind });
  }
  // a working hospital: more tubes, every room lit
  for (const [x, y] of [[8, 4], [18, 4], [13, 8.6], [4, 8.6], [21, 8.6], [30, 10], [34, 14], [40, 12], [44, 9], [30, 23], [36, 23.5], [35, 30], [16, 33.5], [42, 26.5], [6, 29], [10, 33],
    [2, 18.5], [7, 18.5], [13, 18.5], [22, 18.5], [27, 18.5], [35, 18.5], [44, 18.5], [1.5, 14], [1.5, 22], [1.5, 30], [24.5, 13], [28, 4.5], [41, 4.5], [25.5, 21], [25.5, 26.5], [21, 33], [30, 33]]) {
    L(x, y, 'P', { col: 0xf2f6ff, i: 0.85, r: 7, kind: 'tube' });
  }
  L(16, 31, 'P', { col: 0x8fff9a, i: 0.3, r: 4, kind: 'monitor' }); L(36, 31.5, 'P', { col: 0xffb060, i: 0.6, r: 5, kind: 'lamp' });
  for (const [x, y] of [[25, 18.5], [9, 18.5], [40, 18.5], [18, 18.5], [31, 18.5], [25.5, 33], [1.5, 10], [1.5, 26], [24.5, 9], [24.5, 15], [36, 4.5], [13, 6], [32, 12],
    [33, 23.5], [16, 31], [42, 12], [42.5, 24], [25.5, 23], [8, 30.5], [35.5, 31.5], [46, 4.5], [5, 14.5], [13, 14.5], [21, 22.5]]) {
    L(x, y, 'S', { col: 0xff1408, i: 1.15, r: 9, kind: 'cage' });
  }
  // outside: moonlight, and floodlights on the walls (channel A: it stays on, it isn't on the mains)
  for (const [x, y] of [[44, 32], [44, 36], [8, 42], [18, 46], [30, 42], [40, 48], [12, 52], [36, 52], [25, 58], [18, 61], [32, 61]]) L(x, y, 'A', { col: 0x8fa4d0, i: 0.55, r: 11, kind: 'none' });
  for (const [x, y] of [[20, 38.6], [31, 38.6], [25, 54.4], [44, 29.6], [3, 46]]) L(x, y, 'A', { col: 0xffe2b0, i: 0.9, r: 10, kind: 'cage' });
  p.lamps = lamps;

  // what's lying about: Voss's tray on the kitchen counter, three documents
  // the escaped patients in the courtyard, out when you get there; every one of them can chase you
  p.packOn = (G) => !!G.inYard;
  p.items = [
    { k: 'tray', x: 13.0, y: 1.78, id: 'tray' },   // on the serving counter (it sits back against the wall)
    { k: 'note', x: 13.9, y: 1.78, id: 'n3_tray' },
    { k: 'note', x: 16.6, y: 29.3, id: 'n3_rota' },
    { k: 'note', x: 35.2, y: 30.8, id: 'n3_memo' },
    { k: 'file', x: 11.6, y: 33.5, id: 'file' },                  // Records: on a crate in the storage room
    { k: 'fencekey', x: 7.4, y: 47.6, id: 'fencekey' },          // by the groundskeeper
    { k: 'note', x: 34.6, y: 23.9, id: 'n3_iso' },               // the morgue, after
  ];
  p.start = { x: 25.5, y: 33.2, yaw: 0 };                 // the lobby, facing the reception desk
  p.titleCam = { x: 25.5, y: 35, h: 1.6, yaw: 0 };
  p.clock = { x: 16, y: 29.4 };                            // the time clock on the security desk
  p.exit = { x: 38.3, y: 31, r: 1.3 };                     // the east window in Administration
  p.voss = { x: 33, y: 23.2 };                             // waiting in the morgue
  // the cells you count: [door x, door y, inside x, inside y, who]
  p.count = [[13, 17, 13, 14.6, 'kroft'], [9, 20, 9, 23, 'rourke'], [5, 17, 5, 14.6, 'a'], [21, 20, 21, 23, 'b']];

  // Kroft, behind a locked door until the alarm; then the building is his
  const route = [[13, 15], [13, 18.5], ...base.brute.route];
  p.hunters = [{ kind: 'brute', x: 13, y: 14.6, seed: 11, route }];
  p.segment = (G) => (G.inYard ? 99 : G.alarm ? 0 : 99);
  // patients in their cells (they stay put when the doors open; not everyone runs)
  p.inmates = [{ x: 9, y: 23, kind: 'rocker', facing: Math.PI }, { x: 5, y: 14.4, kind: 'rocker', facing: 0 }, { x: 21, y: 23, kind: 'rocker', facing: Math.PI }, { x: 17, y: 14.4, kind: 'rocker', facing: 0 }];
  // the pack: loose in the courtyard, wandering until they see you
  const bloody = { blood: 1, dirt: 0.9, stare: true };
  for (const [i, r] of [[[10, 41], [20, 44], [12, 50], [4, 44]], [[30, 40], [38, 45], [30, 51], [22, 47]], [[18, 52], [8, 52], [6, 41], [16, 40]], [[42, 42], [44, 52], [34, 50], [36, 41]], [[26, 45], [20, 50], [30, 47], [26, 41]]].entries()) {
    p.inmates.push({ x: r[0][0], y: r[0][1], kind: 'stalker', pack: true, dormant: true, route: [...r, r[0]], look: { ...bloody, face: ['smile', 'gouged', 'sewn', 'burned', 'random'][i] } });
  }
  p.brute = { ...base.brute, x: 13, y: 14.6 };
  return p;
}

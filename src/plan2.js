// Tape 2: the Male Ward, the north building's upper floor. You wake up
// strapped down in the restraint room. The dormitory, padded cells, nurses'
// station and hydrotherapy sit off one long corridor; the chapel and the
// surgical theater are locked away to the north; the stairwell down to the
// basement is chained shut at the east end.
import { C, W, D, Z, cx, cz } from './plan.js?v=35';

export function makePlan2() {
  const g = new Uint8Array(W * D); const win = new Uint8Array(W * D);
  const rect = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = z; };
  const doors = []; const door = (x, y, o = {}) => { g[y * W + x] = Z.DOOR; doors.push({ x, y, ...o }); };

  rect(1, 16, 46, 17, Z.HALL);                 // the long ward corridor
  rect(1, 2, 2, 36, Z.HALL);                   // west stair-side corridor (a loop)
  rect(24, 2, 25, 15, Z.HALL);                 // north corridor to the theater and chapel
  rect(4, 19, 22, 28, Z.DORM);                 // dormitory
  rect(9, 30, 13, 34, Z.CELL);                 // restraint room (you wake here)
  rect(26, 19, 31, 24, Z.NURSE);               // nurses' station
  rect(33, 19, 42, 27, Z.SHOWER);              // hydrotherapy
  rect(44, 19, 46, 26, Z.STAIR);               // stairwell
  for (const x of [4, 8, 12, 16, 20]) { rect(x, 11, x + 2, 14, Z.PADDED); door(x + 1, 15, { cell: true }); }
  rect(27, 3, 46, 14, Z.CHAPEL);               // chapel
  rect(4, 2, 22, 8, Z.SURGERY);                // surgical theater
  rect(1, 37, 3, 38, Z.HALL); rect(4, 37, 12, 38, Z.STORE);   // a dead-end linen store at the bottom of the west corridor

  door(8, 18); door(18, 18);                   // dorm <- corridor
  door(3, 24);                                 // dorm <- west corridor
  door(11, 29);                                // restraint room -> dorm
  door(28, 18);                                // nurses' station
  door(37, 18);                                // hydrotherapy
  door(45, 18, { lock: 'stairKey', heavy: true });   // the stairwell, chained
  door(32, 15, { lock: 'card' }); door(42, 15, { lock: 'card' });   // chapel
  door(26, 8, { lock: 'card' });               // chapel from the north corridor
  door(23, 5, { lock: 'chapelKey' }); door(3, 6, { lock: 'chapelKey' });   // surgical theater

  for (const x of [5, 17, 21]) win[29 * W + x] = 1;          // dorm south windows
  for (const x of [31, 36, 41, 45]) win[2 * W + x] = 1;      // chapel north windows

  const lamps = []; const L = (x, y, ch, o = {}) => lamps.push({ x, y, ch, ...o });
  for (const x of [6, 20, 34]) L(x, 16.5, 'S', { col: 0xff2a10, i: 0.6, r: 6, kind: 'cage' });
  L(45, 21, 'S', { col: 0xff2a10, i: 0.7, r: 6, kind: 'cage' });
  L(1.5, 9, 'S', { col: 0xff2a10, i: 0.5, r: 6, kind: 'cage' }); L(1.5, 30, 'S', { col: 0xff2a10, i: 0.5, r: 6, kind: 'cage' });
  L(24.5, 9, 'B', { col: 0xcfe8ff, i: 0.9, r: 8, kind: 'tube' });
  L(8, 23, 'A', { col: 0xcfe8ff, i: 1.0, r: 9, kind: 'tube' }); L(17, 25, 'B', { col: 0xcfe8ff, i: 1.0, r: 9, kind: 'tube' });
  for (const x of [5, 17, 21]) L(x, 28.8, 'S', { col: 0x7088c0, i: 0.8, r: 8, kind: 'none', dir: [0, -0.5, -1] });
  L(13, 24, 'S', { col: 0xff2a10, i: 0.45, r: 7, kind: 'cage' });
  L(9.7, 32.6, 'S', { col: 0xe6f0ff, i: 0.7, r: 5, kind: 'bulb' });                    // the bare bulb over your bed
  L(29, 24, 'S', { col: 0xffb060, i: 0.55, r: 5, kind: 'lamp' });                   // desk lamp, nurses' station
  L(37, 23, 'A', { col: 0xcfe8ff, i: 0.7, r: 7, kind: 'tube' });
  for (const x of [5, 13, 21]) L(x, 12.5, 'S', { col: 0xe6f0ff, i: 0.3, r: 4, kind: 'bulb' });
  for (const x of [31, 36, 41, 45]) L(x, 2.2, 'S', { col: 0x7088c0, i: 0.7, r: 8, kind: 'none', dir: [0, -0.5, 1] });
  for (const [x, y] of [[34, 4.2], [35.5, 4], [37, 3.9], [39, 3.9], [40.5, 4], [42, 4.2], [30, 12.5], [46, 12.5]]) L(x, y, 'S', { col: 0xff9a40, i: 0.55, r: 5.5, kind: 'candle', h: 0.95 });
  L(12, 5, 'S', { col: 0xf4f8ff, i: 2.6, r: 9, kind: 'bulb' });                     // the operating lamp, always on
  L(19, 3, 'B', { col: 0xcfe8ff, i: 0.7, r: 6, kind: 'tube' });

  const props = []; const P = (k, x, y, r = 0, o = {}) => props.push({ k, x, y, r, ...o });
  for (let x = 5; x <= 21; x += 2) { P('bed', x, 19.9, 0); if (x !== 11) P('bed', x, 27.9, 2); }   // (no bed in front of the restraint room door)
  P('chair', 9, 24, 1, { tipped: true }); P('wheelchair', 15, 24.5, 2); P('trolley', 20, 23.6, 1, { tipped: true });
  P('bed', 9.4, 32.6, 0);                                                        // your restraint bed, against the west wall
  P('trolley', 12.6, 33.6, 0); P('ivstand', 10.3, 31.3, 0);
  for (const x of [4, 8, 12, 16, 20]) { P('bucket', x + 2.2, 11.4, 0); }
  P('secdesk', 29.7, 24.35, 2); P('filing', 26.4, 24.4, 2); P('filing', 27.4, 24.4, 2); P('shelf', 31.6, 21, 3); P('chair', 29.7, 23.3, 0);   // the monitor desk against the back wall, clear of the door
  for (const x of [34.5, 37.5, 40.5]) { P('tub', x, 20.8, 0); P('tub', x, 25.6, 0); }
  P('stall', 42.6, 23, 3);
  for (let y = 6.5; y <= 12; y += 1.5) { P('bench', 33, y, 1); P('bench', 41, y, 1); }
  P('table', 38.5, 4.2, 0, { small: true }); P('cross', 38.5, 3, 0); P('piano', 28, 4.2, 1);
  P('slab', 12, 5, 0); P('trolley', 10, 3.2, 0); P('trolley', 14.5, 3.4, 0); P('sinkrow', 5, 4.5, 1); P('drawers', 17, 2.2, 0); P('ivstand', 13.5, 6.2, 0); P('gurney', 19.5, 7, 1);
  P('crate', 45.5, 25.6, 0);
  for (const [x, y, r] of [[1, 12, 1], [1, 28, 1], [6.5, 15.6, 2], [14.5, 15.6, 2], [22.6, 16.5, 3], [33.5, 15.6, 2], [40, 15.6, 2], [46.6, 16.8, 3], [4.3, 25, 1], [22.6, 22, 3], [42.6, 26.5, 3], [24, 12, 1], [36, 12.8, 2], [26.4, 21, 1]]) P('locker', x, y, r);

  const gore = []; const G = (k, x, y, o = {}) => gore.push({ k, x, y, ...o });
  G('corpse', 7, 19.6, { on: 'bed' }); G('corpse', 15, 27.4, { on: 'bed', open: true }); G('corpse', 19, 19.6, { on: 'bed', sheet: true });
  G('hanged', 37, 9); G('corpse', 39, 25.4, { tub: true }); G('corpse', 12, 4.6, { on: 'slab', open: true }); G('corpse', 45, 24.5, { slump: true });
  G('pile', 41.5, 21); G('pile', 6, 6.5);
  for (const [x, y] of [[12, 17], [8, 22], [20, 26], [28, 21], [37, 22], [12, 6], [38, 6], [45, 22], [1.5, 20], [24.5, 6]]) G('pool', x, y, { s: 0.6 + ((x * 7 + y * 3) % 5) * 0.2 });
  for (const [x, y, w] of [[10, 16.3, 'n'], [30, 17.6, 's'], [22.6, 24, 'e'], [4.4, 21, 'w'], [42.6, 20, 'e'], [9, 2.4, 'n'], [46.6, 21, 'e']]) G('smear', x, y, { wall: w });
  for (const [x, y, w, t] of [[16, 16.3, 'n', 'RISE AND SHINE'], [26.4, 23, 'w', 'PELL STILL DOES ROUNDS'], [4.4, 26, 'w', 'HE TAKES THEM TO THE TABLE'], [46.6, 12, 'e', 'GOD LEFT IN 1989'],
    [1.5, 33, 'w', 'DOWN IS WORSE'], [44.4, 25, 'w', 'THE STAIRS DO NOT END'], [33.4, 26, 'w', 'DROWN THE NOISE'], [9, 33.6, 's', 'YOU SIGNED THE FORM']]) G('scrawl', x, y, { wall: w, t });

  const items = [
    { k: 'note', x: 12.4, y: 33.6, id: 'n2_wake' },
    { k: 'card', x: 30.4, y: 24.15, id: 'card' },
    { k: 'chapelKey', x: 38.5, y: 4.2, id: 'chapelKey' },
    { k: 'stairKey', x: 14.5, y: 3.5, id: 'stairKey' },
    { k: 'note', x: 29.0, y: 24.15, id: 'n2_pell' }, { k: 'note', x: 15, y: 25, id: 'n2_dorm' }, { k: 'note', x: 13, y: 12.4, id: 'n2_padded' },
    { k: 'note', x: 40.5, y: 25.6, id: 'n2_hydro' }, { k: 'note', x: 34, y: 6.5, id: 'n2_chapel' }, { k: 'note', x: 10, y: 3.2, id: 'n2_surgery' },
    { k: 'note', x: 45.5, y: 25.4, id: 'n2_stairs' }, { k: 'note', x: 8, y: 37.6, id: 'n2_kroft' },
  ];
  const start = { x: 9.4, y: 32.6, yaw: Math.PI, strapped: true };
  const exit = { x: 45, y: 25.5, r: 1.6 };
  // one hunter per segment: Pell until the keycard, Kroft until the chaplain's key, then Voss to the end
  const hunters = [
    { kind: 'orderly', x: 28.5, y: 16.5, seed: 61, route: [[28.5, 16.5], [18, 16.5], [18, 23], [8, 23], [8, 16.5], [1.5, 16.5], [1.5, 30], [1.5, 16.5], [37, 16.5], [37, 23], [37, 16.5], [44, 16.5], [28.5, 16.5], [28.5, 21]] },
    { kind: 'brute', x: 38, y: 8, seed: 11, route: [[38, 8], [30, 10], [38, 5], [45, 10], [42, 15], [42, 16.5], [24.5, 16.5], [18, 16.5], [18, 24], [8, 24], [8, 16.5], [24.5, 16.5], [32, 16.5], [32, 13], [38, 8]] },
    { kind: 'surgeon', x: 12, y: 6.5, seed: 23, route: [[12, 6.5], [6, 4], [18, 4], [12, 6.5], [24.5, 5], [24.5, 16.5], [12, 16.5], [1.5, 16.5], [1.5, 6], [12, 6.5], [24.5, 12], [36, 16.5], [24.5, 16.5]] },
  ];
  const segment = (Gs) => Gs.items.has('chapelKey') ? 2 : Gs.items.has('card') ? 1 : 0;
  const inmates = [
    { x: 5, y: 12.6, kind: 'rocker', facing: 0 }, { x: 17, y: 13, kind: 'rocker', facing: Math.PI },
    { x: 13, y: 22, kind: 'stalker', route: [[13, 22], [6, 25], [13, 26], [20, 22], [13, 22]] },
    { x: 34, y: 11, kind: 'rocker', facing: Math.PI },
  ];
  const titleCam = { x: 13, y: 24, h: 1.6, yaw: Math.PI * 0.5 };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= D) ? 0 : g[y * W + x];
  return { tape: 2, g, win, at, doors, gate: null, lamps, props, gore, items, start, exit, hunters, segment, inmates, titleCam };
}

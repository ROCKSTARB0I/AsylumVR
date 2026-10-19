// Testing Site 1: Containment. Site 7, the Mount Harrow Research Annex, under the desert in Nye County,
// Nevada. Where the asylum sent the protocol's "successes" to be grown on. Three storeys:
//   the surface (6.4 m): a walled compound in the sand, the guard shack, the entry building
//   B1 (3.2 m), Intake & Genetics: the tank hall, the genetics lab, offices, specimen storage, the nursery
//   B2 (0 m), Containment: holding cells behind glass, dissection, cryo, the observation gallery over the Pit
// and the way out: the emergency stairs up two storeys to the vehicle bay, and the desert road at dawn.
import { H, Z, setGrid, setLevels } from './plan.js?v=38';

export function makePlan5() {
  const W = 110, D = 82; setGrid(W, D);
  const g = new Uint8Array(W * D), win = new Uint8Array(W * D);
  const L = { base: new Float32Array(W * D), rise: new Float32Array(W * D), dir: new Uint8Array(W * D), ceil: new Float32Array(W * D).fill(H) };
  let lvl = 0;
  const set = (x, y, z) => { const i = y * W + x; g[i] = z; L.base[i] = lvl; L.rise[i] = 0; L.dir[i] = 0; L.ceil[i] = lvl + H; };
  const rect = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, z); };
  const solid = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = 0; };
  const doors = []; const door = (x, y, o = {}) => { set(x, y, Z.DOOR); doors.push({ x, y, ...o }); };
  const ramp = (x, y, base, rise, dir, ceil) => { const i = y * W + x; g[i] = Z.STAIR; L.base[i] = base; L.rise[i] = rise; L.dir[i] = dir; L.ceil[i] = ceil; };
  const flat = (x, y, base, ceil) => { const i = y * W + x; g[i] = Z.STAIR; L.base[i] = base; L.rise[i] = 0; L.dir[i] = 0; L.ceil[i] = ceil; };
  const dirOf = (vx, vy) => (vx === 1 ? 1 : vx === -1 ? 2 : vy === 1 ? 3 : 4);
  const stairwells = [];
  const stairwell = (ox, oy, [ux, uy], [vx, vy], base) => {
    const at = (c, v) => [ox + c * ux + v * vx, oy + c * uy + v * vy]; const ceil = base + 2 * H, half = H / 2;
    flat(...at(0, 0), base, ceil); flat(...at(2, 0), base + H, ceil);
    ramp(...at(0, 1), base, half / 2, dirOf(vx, vy), ceil); ramp(...at(0, 2), base + half / 2, half / 2, dirOf(vx, vy), ceil);
    ramp(...at(2, 2), base + half, half / 2, dirOf(-vx, -vy), ceil); ramp(...at(2, 1), base + half * 1.5, half / 2, dirOf(-vx, -vy), ceil);
    for (const c of [0, 1, 2]) flat(...at(c, 3), base + half, ceil);
    for (const v of [0, 1, 2]) { const [x, y] = at(1, v); g[y * W + x] = 0; }
    stairwells.push({ base, bottom: at(0, 0), topL: at(2, 0), mid: at(1, 3), lower: at(-1, 0), upper: at(3, 0) });
  };

  // ======================================================== THE SURFACE (6.4 m)
  lvl = 2 * H;
  rect(2, 2, 40, 19, Z.OUT);                   // the compound, in the sand
  solid(5, 7, 11, 12); rect(6, 8, 10, 11, Z.SEC); door(8, 12);   // the guard shack (its walls stand in the sand)
  solid(26, 4, 36, 9); rect(27, 5, 35, 8, Z.STORE); door(31, 9);   // the generator hut (dead)
  rect(16, 22, 32, 28, Z.LOBBY); door(24, 21, { lock: 'gateCard', heavy: true });   // Site 7: the entry hall
  rect(18, 20, 30, 20, Z.OUT);                 // the apron in front of the doors
  rect(10, 23, 14, 27, Z.SEC); door(15, 25);    // the security office
  rect(34, 24, 37, 24, Z.LOBBY); door(33, 24, { heavy: true });
  // down to B1
  stairwell(40, 24, [-1, 0], [0, 1], H);

  // ======================================================== B1, INTAKE & GENETICS (3.2 m)
  lvl = H;
  rect(41, 24, 44, 24, Z.HALL);
  rect(45, 4, 46, 38, Z.HALL);                 // the long corridor
  rect(45, 19, 96, 20, Z.HALL);                // the cross corridor
  rect(48, 4, 72, 17, Z.LAB); door(60, 18, { heavy: true }); door(47, 10);   // the tank hall
  rect(74, 4, 94, 17, Z.LAB); door(84, 18, { lock: 'labKey' });              // genetics
  rect(48, 22, 58, 32, Z.ADMIN); door(53, 21); door(47, 28);                 // offices
  rect(60, 21, 61, 39, Z.HALL); door(60, 40, { lock: 'b2Card', heavy: true });   // the connector down to the B2 stairs (keycard)
  rect(63, 22, 78, 38, Z.STORE); door(62, 30); door(70, 21);                 // specimen storage
  rect(80, 22, 94, 38, Z.LAB); door(87, 21);                                // the nursery (incubation)
  rect(95, 19, 97, 20, Z.HALL); door(98, 19, { lock: 'never', heavy: true }); // the lift: dead
  stairwell(60, 43, [0, -1], [1, 0], 0);       // down to B2 (the bottom landing is the south end)

  // ======================================================== B2, CONTAINMENT (0 m)
  lvl = 0;
  rect(60, 44, 60, 44, Z.HALL);
  rect(44, 45, 94, 46, Z.HALL);                // the gallery corridor
  rect(66, 47, 67, 78, Z.HALL);                // the spine south
  for (const [i, x] of [44, 49, 54, 59].entries()) { rect(x, 48, x + 3, 54, Z.CELL); door(x + 1 + (i % 2), 47, { cell: true, heavy: true }); }   // holding cells
  rect(70, 48, 94, 55, Z.SEC); door(72, 47); door(90, 47);                  // the observation gallery (glass along its south side)
  rect(69, 56, 94, 76, Z.GEN); door(68, 66, { lock: 'pit', heavy: true });  // the Pit
  rect(44, 57, 64, 66, Z.SURGERY); door(65, 61);                            // dissection
  rect(44, 68, 64, 76, Z.MORGUE); door(65, 72);                             // cryo
  rect(95, 45, 97, 46, Z.HALL); door(98, 45, { lock: 'lockdown', heavy: true }); rect(99, 45, 102, 45, Z.HALL);   // the emergency exit, sealed
  stairwell(103, 45, [1, 0], [0, -1], 0);     // up to the B1 service landing (103..105 x, 42..45 y)
  lvl = H; rect(106, 45, 107, 45, Z.HALL); rect(107, 42, 107, 44, Z.HALL);
  stairwell(107, 41, [0, -1], [-1, 0], H);    // and up to the vehicle bay (104..107 x, 39..41 y)
  lvl = 2 * H;
  rect(100, 20, 108, 35, Z.GEN); rect(107, 36, 107, 38, Z.HALL);            // the vehicle bay
  door(104, 19, { lock: 'bay', heavy: true });
  rect(98, 4, 108, 18, Z.OUT);                 // the desert road, and morning

  // ------------------------------------------------------ surfaces
  const floorOf = (x, y, z) => (z === Z.OUT ? (x > 97 ? 'asphalt' : 'sand') : z === Z.LAB || z === Z.CELL || z === Z.SEC || z === Z.LOBBY || z === Z.ADMIN || z === Z.SURGERY || z === Z.MORGUE ? 'floorLab' : z === Z.GEN || z === Z.STORE ? 'floorSteel' : z === Z.HALL ? 'floorLab' : z === Z.STAIR ? 'floorConcrete' : null);
  const wallOf = (x, y, z) => (z === Z.OUT || z === Z.STAIR || z === Z.GEN ? 'wallBunker' : 'wallLab');

  // ------------------------------------------------------ lights
  const lamps = []; const Lm = (x, y, ch, o = {}) => lamps.push({ x, y, ch, ...o });
  const tube = (x, y, ch = 'S', i = 0.9, col = 0xe8f4ff) => Lm(x, y, ch, { col, i, r: 8, kind: 'tube' });
  const red = (x, y, i = 0.6) => Lm(x, y, 'S', { col: 0xff2010, i, r: 8, kind: 'cage' });
  const tankGlow = (x, y, i = 0.5) => Lm(x, y, 'S', { col: 0x50ff90, i, r: 5, kind: 'none', y2: 1.3 });
  // the surface: the moon on the sand, a floodlight on a pole, the hut's bulb
  for (let x = 4; x <= 38; x += 6) for (let y = 3; y <= 18; y += 5) Lm(x + (y % 2), y, 'S', { col: 0xa8bce0, i: 1.1, r: 11, kind: 'none', y2: 2.6 });   // a bright desert moon on pale sand
  for (const [x, y] of [[100, 6], [106, 6], [100, 13], [106, 13], [103, 17]]) Lm(x, y, 'S', { col: 0xe0b8a0, i: 1.0, r: 11, kind: 'none', y2: 2.6 });   // dawn on the road
  Lm(24, 19.4, 'S', { col: 0xffe2b0, i: 1.1, r: 11, kind: 'cage' }); Lm(8, 9.5, 'S', { col: 0xffd8a0, i: 0.5, r: 5, kind: 'bulb' }); Lm(31, 6.5, 'A', { col: 0xcfe8ff, i: 0.6, r: 6, kind: 'tube' });
  for (const x of [19, 25, 30]) for (const y of [23.5, 27]) tube(x, y, x === 25 && y > 25 ? 'A' : 'S', 1.0); tube(12, 25, 'B', 0.9); tube(35.5, 24, 'S', 0.5); red(37, 24, 0.4);
  // B1: cold tubes, a red beacon at each junction, the tanks glowing
  for (let y = 6; y <= 36; y += 5) tube(45.5, y, y % 3 ? 'S' : 'A', 1.0);
  for (let x = 50; x <= 94; x += 6) tube(x, 19.5, x % 18 ? 'S' : 'B', 1.0);
  red(45.5, 19.5); red(60.5, 19.5); red(84, 19.5); red(60.5, 38);
  for (const x of [49, 53, 57, 61, 65, 69]) for (const y of [8, 12, 16]) tube(x, y, 'S', 0.6); for (const [x, y] of [[51, 6], [59, 6], [67, 10], [55, 14], [63, 14], [70, 6], [55, 6], [63, 6], [51, 10], [59, 10], [70, 14], [51, 14]]) tankGlow(x, y, 0.45);
  for (const x of [78, 84, 90]) for (const y of [6, 11, 15]) tube(x, y, (x + y) % 3 ? 'S' : 'A', 0.85);
  for (const [x, y] of [[50, 25], [56, 25], [50, 30], [56, 30]]) tube(x, y, 'S', 0.75); Lm(51, 24, 'S', { col: 0xffb060, i: 0.5, r: 5, kind: 'lamp' });
  for (const [x, y] of [[67, 26], [74, 26], [67, 34], [74, 34], [70, 30]]) tube(x, y, (x + y) % 2 ? 'B' : 'S', 0.75);
  for (const [x, y] of [[84, 25], [90, 25], [84, 31], [90, 31], [86, 36]]) Lm(x, y, 'S', { col: 0x80ffa0, i: 0.6, r: 7, kind: 'bulb' });
  // B2: emergency red, the cells lit white, the gallery's screens, the Pit dark but for its own work lights
  for (let x = 46; x <= 92; x += 6) red(x, 45.5, 0.75); for (let y = 50; y <= 76; y += 6) red(66.5, y, 0.7); for (const x of [50, 62, 78, 88]) tube(x, 45.5, 'A', 0.6);
  for (const x of [45.5, 50.5, 55.5, 60.5]) Lm(x + 0.5, 51, 'S', { col: 0xf0f4ff, i: 0.55, r: 5, kind: 'bulb' });
  for (const x of [74, 82, 90]) Lm(x, 49.5, 'S', { col: 0x60ff90, i: 0.35, r: 5, kind: 'monitor' }); tube(76, 52, 'A', 0.8); tube(88, 52, 'S', 0.7);
  for (const [x, y] of [[74, 62], [90, 62], [82, 70]]) Lm(x, y, 'S', { col: 0xfff0d0, i: 0.9, r: 9, kind: 'cage' }); red(68, 66, 0.5);
  tube(47, 61.5, 'S', 0.9); tube(61, 61.5, 'S', 0.9); Lm(54, 61.5, 'S', { col: 0xf4f8ff, i: 1.8, r: 8, kind: 'bulb' }); tube(48, 72, 'B', 0.8); tube(60, 72, 'S', 0.7); for (const x of [46, 50, 54, 58, 62]) Lm(x, 75.6, 'S', { col: 0x80c0ff, i: 0.3, r: 4, kind: 'none', y2: 1.6 });
  red(98, 45.5, 0.7); red(107, 43.5, 0.5);
  // the bay and the road: dawn coming up
  tube(104, 25, 'P', 1.0); tube(104, 31, 'P', 1.0); red(104, 21, 0.5);
  for (const [x, y] of [[102, 8], [106, 14], [104, 4]]) Lm(x, y, 'S', { col: 0xd8b8a0, i: 0.8, r: 14, kind: 'none', y2: 5 });
  for (const s of stairwells) { Lm(s.bottom[0], s.bottom[1], 'S', { col: 0xff3a20, i: 0.6, r: 7, kind: 'cage', drop: 3.4 }); Lm(s.topL[0], s.topL[1], 'S', { col: 0xe8f0ff, i: 0.6, r: 7, kind: 'cage', drop: 0.4 }); Lm(s.mid[0], s.mid[1], 'S', { col: 0xff3a20, i: 0.6, r: 7, kind: 'cage', drop: 1.9 }); }

  // ------------------------------------------------------ props (doorways are kept clear by mason)
  const props = []; const P = (k, x, y, r = 0, o = {}) => props.push({ k, x, y, r, ...o });
  const locker = (x, y, r) => P('locker', x, y, r);
  // the surface
  P('desk', 8, 9, 0); P('chair', 8, 10, 2); P('filing', 6.4, 11, 1); P('barrel', 14, 5, 0); P('barrel', 15, 5.6, 0); P('barrel', 37, 17, 0); P('crate', 21, 8, 0); P('crate', 22, 9, 0); P('generator', 31, 6.5, 0);
  P('reception', 24, 23.4, 0); P('bench', 18, 26, 1); P('bench', 30, 26, 3); P('plant', 17, 22.5, 0); P('plant', 31, 22.5, 0);
  for (const x of [18, 19, 20]) locker(x, 27.6, 2);
  P('secdesk', 12, 23.4, 0); P('chair', 12, 24.6, 2); P('filing', 10.4, 27, 1);
  // B1: the tank hall: three rows of tanks
  const BURST = [[51, 6], [59, 6], [67, 10], [55, 14], [63, 14], [70, 6]];   // these six break when the alarm goes
  for (const y of [6, 10, 14]) for (const x of [51, 55, 59, 63, 67, 70]) P(BURST.some(([bx, by]) => bx === x && by === y) ? 'tankBase' : 'tank', x, y, 0);
  P('console', 49, 4.3, 0); P('console', 71, 16.7, 2);
  // genetics
  for (const y of [7, 11]) { P('labbench', 78, y, 0); P('labbench', 84, y, 0); } P('console', 90, 4.3, 0); for (const x of [76, 79, 82, 85, 88, 91]) P('cryopod', x, 16.6, 2); P('glasswall', 74.5, 14, 1); locker(93.6, 10, 3);
  // offices
  for (const [x, y] of [[50, 25], [54, 25], [50, 29], [54, 29]]) { P('desk', x, y, 0); P('chair', x, y + 1, 2); } P('filing', 57.6, 24, 3); P('filing', 57.6, 25, 3); P('shelf', 48.4, 32, 1); locker(57.6, 31, 3);
  // specimen storage
  for (const [x, y] of [[66, 26], [70, 26], [74, 26]]) P('cage', x, y, 0); for (const [x, y] of [[66, 35], [71, 35]]) P('vat', x, y, 0); P('shelf', 77.6, 30, 3); P('shelf', 77.6, 33, 3); for (const x of [64, 65]) P('barrel', x, 31, 0); locker(63.6, 37, 1);
  // the nursery
  for (const [x, y] of [[83, 27], [89, 27], [83, 33], [89, 33]]) P('vat', x, y, 0); P('console', 93.6, 30, 3); P('labbench', 86, 37, 2);
  for (const [x, y, r] of [[45.5, 14, 1], [46.4, 31, 3], [61, 34, 3], [94, 20.2, 2], [74, 18.6, 0]]) locker(x, y, r);
  P('gurney', 45.6, 8, 0, { tipped: true }); P('trolley', 66, 19.6, 1); P('barrel', 52, 20.3, 0);
  // B2
  for (const x of [44, 49, 54, 59]) { P('bed', x + 1.5, 52.4, 1); P('bucket', x + 0.4, 53.6, 0); }
  for (let x = 69; x <= 94; x += 1) P('glasswall', x, 55.5, 0);   // the gallery looks into the Pit through glass
  for (const x of [74, 82, 90]) { P('console', x, 54.3, 2); P('chair', x, 53.2, 0); }
  for (const [x, y] of [[75, 62], [89, 62], [75, 71], [89, 71]]) P('cage', x, y, 0); P('vat', 82, 66, 0); P('generator', 82, 75, 0);
  for (const [x, y] of [[48, 59.5], [54, 59.5], [60, 59.5]]) P('slab', x, y, 0); P('labbench', 48, 64.6, 2); P('labbench', 54, 64.6, 2); P('sinkrow', 63.6, 58, 3); P('drawers', 54, 57.1, 0); P('trolley', 57, 62, 1);
  for (const x of [45, 47, 49, 51, 53, 55, 57, 59, 61, 63]) P('cryopod', x, 68.4, 0); P('console', 54, 75.6, 2);
  for (const [x, y, r] of [[44.5, 45.5, 1], [93.5, 45.5, 3], [66.5, 70, 1], [69.5, 50, 1], [44.4, 61, 1]]) locker(x, y, r);
  P('gurney', 66.5, 60, 0, { tipped: true }); P('barrel', 92, 46, 0); P('trolley', 50, 46, 1);
  // the bay
  P('crate', 101, 22, 0); P('crate', 101, 23.2, 0); P('barrel', 107, 30, 0); P('barrel', 107, 31, 0); P('shelf', 108.6, 26, 3); P('trolley', 101, 33, 0);

  // ------------------------------------------------------ the dead, the mess, the writing
  const gore = []; const Gd = (k, x, y, o = {}) => gore.push({ k, x, y, ...o });
  Gd('corpse', 7, 10.6, { slump: true }); Gd('pool', 8, 11);                                            // the guard, in his shack
  Gd('corpse', 23, 24.5, { slump: true }); Gd('pool', 22, 25); Gd('smear', 32.6, 25, { wall: 'e' });
  Gd('corpse', 45.5, 12, { slump: true }); Gd('pool', 45.5, 12.5); Gd('pool', 60, 19);
  Gd('corpse', 53, 10, { open: true }); Gd('pile', 57, 12); Gd('pool', 62, 8); Gd('corpse', 68, 4.5, { slump: true });
  Gd('corpse', 86, 9, { slump: true }); Gd('pool', 80, 13);
  Gd('corpse', 52, 27, { slump: true }); Gd('pool', 55, 31);
  Gd('pile', 72, 30); Gd('corpse', 68, 33, { open: true }); Gd('pool', 73, 36);
  Gd('pile', 86, 30); Gd('pool', 90, 30);
  Gd('corpse', 51, 59.5, { on: 'slab', open: true }); Gd('corpse', 57, 59.5, { on: 'slab', sheet: true }); Gd('pile', 49, 62);
  Gd('corpse', 46.5, 51, { slump: true }); Gd('corpse', 56, 49.5, { open: true }); Gd('pool', 61, 50);
  Gd('corpse', 78, 50.5, { slump: true }); Gd('hanged', 86, 52); Gd('pool', 92, 53);
  Gd('pile', 80, 64); Gd('pile', 85, 70); Gd('pool', 76, 66); Gd('corpse', 66.5, 66, { slump: true }); Gd('pool', 98, 46);
  for (const [x, y] of [[46, 34], [70, 21], [88, 21], [50, 45.5], [80, 45.5], [66.5, 58]]) Gd('pool', x, y, { s: 0.8 });
  for (const [x, y, w, t] of [[16.6, 25, 'w', 'SITE 7'], [44.6, 26, 'w', 'B1'], [47.6, 6, 'e', 'THEY GROW BACK'], [73.6, 10, 'e', 'NOT FOR RELEASE'], [62.6, 36, 'w', 'B2 ↓'], [94.6, 50, 'e', 'IT KNOWS THE DOORS'], [64.6, 74, 'e', 'DONT WAKE THEM'], [101.4, 44, 'w', 'EXIT ↑']]) Gd('scrawl', x, y, { wall: w, t });

  // ------------------------------------------------------ things you can pick up
  const items = [
    { k: 'note', x: 8, y: 9, id: 'n5_guard' }, { k: 'gateCard', x: 8.4, y: 9.1, id: 'gateCard' },
    { k: 'note', x: 24, y: 23.4, id: 'n5_reception' }, { k: 'note', x: 12, y: 23.4, id: 'n5_security' },
    { k: 'note', x: 49, y: 4.3, id: 'n5_tanks' }, { k: 'note', x: 50, y: 25, id: 'n5_memo' }, { k: 'labKey', x: 54, y: 29, id: 'labKey' },
    { k: 'note', x: 78, y: 7, id: 'n5_genetics' }, { k: 'b2Card', x: 84, y: 11, id: 'b2Card' }, { k: 'note', x: 70, y: 26.6, id: 'n5_storage' }, { k: 'note', x: 93.6, y: 30, id: 'n5_nursery' },
    { k: 'note', x: 54, y: 64.6, id: 'n5_dissection' }, { k: 'note', x: 54, y: 75.6, id: 'n5_cryo' }, { k: 'note', x: 82, y: 54.3, id: 'n5_gallery' }, { k: 'note', x: 104, y: 22, id: 'n5_bay' },
  ];

  // ------------------------------------------------------ what's loose down there
  // the hunters: the Longarm walks B1; Subject Zero, once the Pit is open
  const hunters = [
    { kind: 'longarm', x: 45.5, y: 30, seed: 701, route: [[45.5, 30], [45.5, 19.5], [60, 19.5], [60, 16], [60, 19.5], [84, 19.5], [94, 19.5], [87, 21], [87, 30], [87, 21], [70, 19.5], [70, 30], [70, 19.5], [45.5, 19.5], [45.5, 6], [50, 10], [45.5, 6], [45.5, 30], [53, 22], [53, 28], [53, 22]] },
    { kind: 'subject', x: 82, y: 66, seed: 702, route: [[82, 66], [80, 56], [80, 45.5], [66.5, 45.5], [66.5, 60], [66.5, 72], [66.5, 45.5], [94, 45.5], [98, 45.5], [66.5, 45.5], [50, 45.5], [66.5, 45.5]] },
  ];
  const segment = (G) => (G.t5 && G.t5.zero ? 1 : 0);
  const packOn = () => true;   // everything grown down here hunts: they all come at once
  const inmates = [
    // B1: the hollowhead pacing the cross corridor, the bloater asleep in storage, six skitterers still in the tanks
    { x: 75, y: 19.5, kind: 'hollow', pack: true, route: [[75, 19.5], [94, 19.5], [87, 22], [87, 30], [87, 22], [60, 19.5], [75, 19.5]] },
    { x: 72, y: 31, kind: 'bloater', pack: true, facing: 1 },
    ...[[51, 6], [59, 6], [67, 10], [55, 14], [63, 14], [70, 6]].map(([x, y]) => ({ x, y: y + 1.1, kind: 'skitter', pack: true, dormant: true, route: [[x, y + 1.1], [x, 18.5], [45.5, 19.5], [60, 19.5], [x, 18.5]] })),
    // B2: two hollowheads, the Twins in cell 3, skitterers in the gallery corridor, the Mimic among the dead in dissection, two Droppers
    { x: 50, y: 45.5, kind: 'hollow', pack: true, route: [[50, 45.5], [64, 45.5], [66.5, 56], [66.5, 74], [66.5, 45.5], [50, 45.5]], look: { face: 'bandaged' } },
    { x: 88, y: 45.5, kind: 'hollow', pack: true, route: [[88, 45.5], [72, 45.5], [72, 52], [90, 52], [88, 45.5]], look: { face: 'sewn' } },
    { x: 56, y: 51, kind: 'amalgam', pack: true, facing: Math.PI },
    { x: 58, y: 45.5, kind: 'skitter', pack: true, route: [[58, 45.5], [44.5, 45.5], [58, 45.5], [66.5, 50]] }, { x: 76, y: 45.5, kind: 'skitter', pack: true, route: [[76, 45.5], [93, 45.5], [76, 45.5], [66.5, 52]] },
    { x: 60, y: 62, kind: 'mimic', pack: true, dormant: true },
    { x: 66.5, y: 64, kind: 'dropper', pack: true, dormant: true }, { x: 50, y: 72, kind: 'dropper', pack: true, dormant: true },
  ];

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= D) ? 0 : g[y * W + x];
  setLevels(L);
  const noNav = []; for (let x = 69; x <= 94; x++) noNav.push([x, 55], [x, 56]);   // the glass between the gallery and the Pit
  const regions = { surface: [2, 2, 37, 29], b1: [41, 3, 98, 40], b2: [43, 44, 101, 78], exit: [99, 3, 109, 41] };
  const regOf = (x, y) => { for (const [k, [x0, y0, x1, y1]] of Object.entries(regions)) if (x >= x0 && x <= x1 + 1 && y >= y0 && y <= y1 + 1) return k; return 'surface'; };
  for (const gd of gore) gd.reg = regOf(gd.x, gd.y);
  return {
    tape: 5, W, g, win, at, doors, noNav, burst: BURST, gate: null, lamps, props, gore, items, hunters, segment, packOn, inmates, levels: L, stairwells, floorOf, wallOf, regions, lazyGore: 'surface',
    start: { x: 21, y: 4, yaw: Math.PI },
    titleCam: { x: 60, y: 18.6, h: 1.6, yaw: Math.PI, drift: 0.5 },
    exit: { x: 104, y: 8, r: 3 },
    labels: [[8, 9.5, 'GUARD SHACK'], [31, 6.5, 'GENERATOR HUT'], [24, 25, 'ENTRY HALL'], [35, 25, 'LOCKERS'], [12, 25, 'SECURITY'], [21, 12, 'THE COMPOUND'], [39, 25.5, 'STAIRS DOWN'],
      [60, 10.5, 'TANK HALL'], [84, 10.5, 'GENETICS'], [53, 27.5, 'OFFICES'], [70.5, 30.5, 'SPECIMEN STORAGE'], [87, 30.5, 'THE NURSERY'], [62, 42, 'STAIRS TO B2'], [97, 20.5, 'LIFT'],
      [52, 51, 'HOLDING CELLS'], [82, 51, 'OBSERVATION'], [82, 66, 'THE PIT'], [54, 61.5, 'DISSECTION'], [54, 72, 'CRYO'], [104.5, 43.5, 'EMERGENCY STAIRS'], [104, 27, 'VEHICLE BAY'], [104, 10, 'THE ROAD']].map(([x, y, t]) => ({ x, y, t })),
  };
}

// Tape 4: The End. The biggest building on any tape, and the only one with storeys: real stairwells
// (closed-well stairs: two flights either side of a spine wall, a landing between, a double-height
// shaft) carry you from floor to floor. In order:
//   Ward C, the basement under the basement (0 m)      -> stairwell up ->
//   the Women's Ward (3.2 m)                            -> stairwell up ->
//   the Disturbed Ward, the refractories (6.4 m)        -> stairwell down ->
//   the staff offices (3.2 m)                           -> corridor ->
//   the examining rooms (3.2 m)                         -> stairwell down ->
//   the boiler house and the power plant (0 m), and out through the coal yard.
// "Refractory" / "disturbed": what asylums called the wards for patients who couldn't be managed —
// strong rooms, padded cells, canvas strong-clothing, locked airing courts, attendants behind glass.
import { C, H, Z, setGrid, setLevels } from './plan.js?v=34';

export const GW = 100, GD = 106;

export function makePlan4() {
  setGrid(GW, GD); const W = GW, D = GD;
  const g = new Uint8Array(W * D), win = new Uint8Array(W * D);
  const L = { base: new Float32Array(W * D), rise: new Float32Array(W * D), dir: new Uint8Array(W * D), ceil: new Float32Array(W * D).fill(H) };
  let lvl = 0;   // the storey the next rooms are carved on
  const set = (x, y, z) => { const i = y * W + x; g[i] = z; L.base[i] = lvl; L.rise[i] = 0; L.dir[i] = 0; L.ceil[i] = lvl + H; };
  const rect = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, z); };
  const doors = []; const door = (x, y, o = {}) => { set(x, y, Z.DOOR); doors.push({ x, y, ...o }); };
  const ramp = (x, y, base, rise, dir, ceil) => { const i = y * W + x; g[i] = Z.STAIR; L.base[i] = base; L.rise[i] = rise; L.dir[i] = dir; L.ceil[i] = ceil; };
  const flat = (x, y, base, ceil, z = Z.STAIR) => { const i = y * W + x; g[i] = z; L.base[i] = base; L.rise[i] = 0; L.dir[i] = 0; L.ceil[i] = ceil; };
  const dirOf = (vx, vy) => (vx === 1 ? 1 : vx === -1 ? 2 : vy === 1 ? 3 : 4);
  const stairwells = [];
  // A closed-well stairwell. (ox, oy) is the bottom landing; u points across the shaft (bottom landing ->
  // spine -> top landing), v along it (landings -> flights -> the mid landing). The lower floor comes in on
  // the -u side of the bottom landing, the upper floor leaves on the +u side of the top landing.
  const stairwell = (ox, oy, [ux, uy], [vx, vy], base, name) => {
    const at = (c, v) => [ox + c * ux + v * vx, oy + c * uy + v * vy]; const top = base + H, ceil = base + 2 * H;   // the shaft runs from the lower floor to the upper floor's ceiling
    const half = H / 2;
    flat(...at(0, 0), base, ceil); flat(...at(2, 0), base + H, ceil);
    // flight A climbs along +v from the bottom landing to the mid landing; flight B climbs back along -v to the top
    ramp(...at(0, 1), base, half / 2, dirOf(vx, vy), ceil); ramp(...at(0, 2), base + half / 2, half / 2, dirOf(vx, vy), ceil);
    ramp(...at(2, 2), base + half, half / 2, dirOf(-vx, -vy), ceil); ramp(...at(2, 1), base + half * 1.5, half / 2, dirOf(-vx, -vy), ceil);
    for (const c of [0, 1, 2]) flat(...at(c, 3), base + half, ceil);
    // the spine wall stays solid: (1,0) (1,1) (1,2)
    for (const v of [0, 1, 2]) { const [x, y] = at(1, v); g[y * W + x] = 0; }
    stairwells.push({ name, base, top, bottom: at(0, 0), topL: at(2, 0), mid: at(1, 3), lower: at(-1, 0), upper: at(3, 0), u: [ux, uy], v: [vx, vy] });
  };

  // ======================================================== 1. WARD C (0 m)
  lvl = 0;
  // the stairs you came down at the end of Tape 2: a wide flight up to the gate that locked behind you
  flat(3, 2, 1.6, 1.6 + H); flat(4, 2, 1.6, 1.6 + H); flat(5, 2, 1.6, 1.6 + H);
  for (const x of [3, 4, 5]) { ramp(x, 3, 0.8, 0.8, 4, 1.6 + H); ramp(x, 4, 0, 0.8, 4, 1.6 + H); }
  door(4, 1, { lock: 'never', heavy: true }); L.base[1 * W + 4] = 1.6; L.ceil[1 * W + 4] = 1.6 + H;
  rect(2, 5, 8, 9, Z.STORE);                   // the foot of the stairs
  rect(2, 11, 44, 12, Z.STORE);                // the main tunnel
  door(5, 10);
  rect(7, 13, 8, 31, Z.STORE);                 // the west tunnel
  rect(10, 2, 18, 9, Z.SURGERY); door(14, 10); // Voss's workroom: a light on, a radio playing
  rect(20, 2, 28, 9, Z.CAFE); door(24, 10);    // the tray kitchen: forty trays a day for Ward C
  rect(30, 2, 38, 9, Z.MORGUE); door(34, 10);  // the cold room
  rect(40, 2, 44, 9, Z.STORE); door(42, 10);   // the meter room
  rect(7, 18, 44, 19, Z.STORE);                // Ward C's corridor
  for (const x of [10, 14, 18, 22, 26, 30, 34, 38]) { rect(x, 14, x + 2, 16, Z.CELL); door(x + 1, 17, { cell: true }); }
  for (const x of [10, 14, 18, 22, 26, 30]) { rect(x, 21, x + 2, 23, Z.CELL); door(x + 1, 20, { cell: true }); }
  rect(35, 21, 44, 25, Z.GEN); door(39, 20);   // the pump room
  rect(10, 26, 32, 31, Z.SHOWER); door(9, 28); // the cistern, flooded, on pillars
  for (const [x, y] of [[13, 28], [17, 28], [21, 28], [25, 28], [29, 28], [13, 29], [21, 29], [29, 29]]) g[y * W + x] = 0;
  rect(33, 27, 44, 28, Z.STORE);               // the drain out of the cistern
  rect(43, 11, 44, 30, Z.STORE);               // the east tunnel
  rect(45, 12, 47, 12, Z.STORE); door(46, 12, { lock: 'stairKey', heavy: true });
  stairwell(48, 12, [1, 0], [0, 1], 0, 'S1');

  // ======================================================== 2. THE WOMEN'S WARD (3.2 m)
  lvl = H;
  rect(51, 12, 54, 12, Z.HALL); door(52, 12);
  rect(55, 3, 56, 30, Z.HALL);                 // west corridor
  rect(55, 15, 96, 16, Z.HALL);                // the ward corridor
  rect(58, 3, 74, 13, Z.DORM); door(62, 14); door(70, 14); door(57, 8);   // the dormitory
  rect(76, 3, 84, 13, Z.DAY); door(80, 14);    // the sewing room
  rect(86, 3, 96, 13, Z.DAY); door(91, 14); door(85, 8);    // the nursery
  rect(58, 18, 66, 27, Z.SHOWER); door(62, 17);             // the bathroom
  rect(68, 18, 74, 23, Z.ADMIN); door(71, 17, { lock: 'officeKey' });   // Matron's office
  rect(68, 25, 74, 30, Z.STORE); door(71, 24);              // her store, through the office
  rect(76, 18, 83, 27, Z.STORE); door(79, 17);              // linen and laundry
  for (const x of [87, 91, 95]) { rect(x, 18, x + 2, 21, Z.PADDED); door(x + 1, 17, { cell: true }); }
  rect(85, 17, 85, 32, Z.HALL); door(85, 33, { lock: 'wardKeys', heavy: true });
  for (const x of [60, 64, 68, 72]) win[2 * W + x] = 1;
  for (const x of [88, 92, 95]) win[2 * W + x] = 1;
  stairwell(85, 34, [0, 1], [1, 0], H, 'S2');

  // ======================================================== 3. THE DISTURBED WARD (6.4 m)
  lvl = 2 * H;
  rect(85, 37, 85, 38, Z.HALL); door(85, 39, { heavy: true });
  rect(83, 40, 87, 42, Z.SEC); door(85, 43, { heavy: true });   // the sally port: two gates
  rect(56, 44, 95, 45, Z.HALL);                // corridor A
  rect(56, 61, 95, 62, Z.HALL);                // corridor B
  rect(56, 44, 57, 62, Z.HALL); rect(94, 44, 95, 62, Z.HALL);
  for (const x of [58, 62, 66, 70, 74, 78, 89]) { rect(x, 39, x + 2, 42, Z.PADDED); door(x + 1, 43, { cell: true }); }   // strong rooms
  rect(66, 47, 84, 59, Z.DAY); door(70, 46); door(80, 46); door(75, 60);   // the day hall
  rect(59, 48, 64, 53, Z.SEC); door(58, 50, { lock: 'boothKey' });         // the attendants' booth
  for (const y of [49, 51]) win[y * W + 65] = 1;
  rect(59, 55, 64, 59, Z.PADDED); door(61, 60);                            // the hole
  rect(87, 48, 92, 57, Z.NURSE); door(93, 52);                             // the restraint room
  for (const x of [58, 62, 66, 70, 74, 78, 82, 86, 90]) { rect(x, 64, x + 2, 67, Z.CELL); door(x + 1, 63, { cell: true, strong: true }); }   // the refractories
  rect(52, 52, 55, 52, Z.HALL); door(54, 52, { lock: 'release', heavy: true });
  stairwell(49, 52, [1, 0], [0, 1], H, 'S3');   // (the offices are the floor below: this one goes down)

  // ======================================================== 4. THE STAFF OFFICES (3.2 m)
  lvl = H;
  rect(45, 52, 48, 52, Z.HALL); door(46, 52);
  rect(4, 52, 44, 53, Z.HALL);                 // the main corridor
  rect(4, 39, 44, 40, Z.HALL); rect(4, 65, 44, 66, Z.HALL); rect(3, 39, 4, 66, Z.HALL); rect(43, 39, 44, 66, Z.HALL);
  rect(6, 42, 22, 50, Z.ADMIN); door(14, 41); door(14, 51);                // the typing pool
  rect(24, 42, 33, 50, Z.STORE); door(28, 51); door(28, 41);               // records
  rect(35, 42, 41, 50, Z.ADMIN); door(38, 51, { lock: 'directorKey' });    // the director's office
  rect(6, 55, 14, 63, Z.DAY); door(10, 54);    // the doctors' lounge
  rect(16, 55, 22, 63, Z.SEC); door(19, 54);   // the switchboard
  rect(24, 55, 33, 63, Z.STORE); door(28, 54); door(28, 64);   // personnel files
  rect(35, 55, 41, 63, Z.SHOWER); door(38, 54);                // staff washroom
  for (const x of [8, 12, 18, 30, 38]) win[38 * W + x] = 1;
  rect(20, 67, 21, 73, Z.HALL); door(20, 67, { lock: 'examCard', heavy: true }); door(21, 67, { lock: 'examCard', heavy: true });

  // ======================================================== 5. THE EXAMINING ROOMS (3.2 m)
  rect(4, 74, 44, 75, Z.HALL);                 // north corridor
  rect(22, 74, 23, 99, Z.HALL);                // the central corridor
  rect(4, 98, 44, 99, Z.HALL);                 // south corridor
  rect(5, 77, 20, 83, Z.NURSE); door(21, 80);  // electroshock
  rect(5, 85, 20, 96, Z.SHOWER); door(21, 90); // hydrotherapy
  rect(25, 77, 33, 83, Z.NURSE); door(24, 80); // x-ray
  rect(35, 77, 44, 90, Z.SURGERY); door(40, 76); door(34, 87);   // the theater (and through from x-ray's corridor)
  rect(25, 85, 33, 96, Z.NURSE); door(24, 90); // dental
  rect(35, 92, 44, 96, Z.STORE); door(40, 91); door(34, 94); door(40, 97);   // instruments
  rect(45, 86, 48, 86, Z.HALL); door(46, 86, { lock: 'chain', heavy: true });
  stairwell(51, 86, [-1, 0], [0, 1], 0, 'S4');  // down to the boiler house

  // ======================================================== 6. THE BOILER HOUSE AND THE POWER PLANT (0 m)
  lvl = 0;
  rect(52, 86, 55, 86, Z.STORE);
  rect(56, 72, 57, 99, Z.STORE);               // the west passage
  rect(59, 72, 76, 85, Z.GEN); door(58, 78); door(68, 86);   // the boiler hall
  rect(78, 72, 87, 80, Z.GEN); door(77, 76);   // the furnace
  rect(89, 72, 96, 85, Z.STORE); door(88, 76); door(92, 86); // the coal store
  rect(56, 87, 96, 88, Z.STORE);               // the service corridor
  rect(59, 90, 76, 99, Z.GEN); door(68, 89);   // the turbine hall
  rect(78, 90, 84, 95, Z.SEC); door(81, 89);   // the control room
  rect(86, 90, 96, 96, Z.STORE); door(91, 89); // the workshop
  door(91, 97, { lock: 'power', heavy: true });
  rect(80, 98, 97, 103, Z.OUT);                // the coal yard, and the morning

  // ------------------------------------------------------ lights
  const lamps = []; const Lm = (x, y, ch, o = {}) => lamps.push({ x, y, ch, ...o });
  const tube = (x, y, ch = 'S', i = 0.8, col = 0xcfe8ff) => Lm(x, y, ch, { col, i, r: 8, kind: 'tube' });
  const cage = (x, y, i = 0.6, col = 0xff2a10) => Lm(x, y, 'S', { col, i, r: 7, kind: 'cage' });
  const bulb = (x, y, i = 0.55, col = 0xffd8a0, ch = 'S') => Lm(x, y, ch, { col, i, r: 6, kind: 'bulb' });
  const candle = (x, y, h = 0.9, i = 0.5) => Lm(x, y, 'S', { col: 0xff9a40, i, r: 4.5, kind: 'candle', h });
  const desk = (x, y, i = 0.55) => Lm(x, y, 'S', { col: 0xffb060, i, r: 5, kind: 'lamp' });
  const moon = (x, y, dir, i = 0.5) => Lm(x, y, 'S', { col: 0x7088c0, i, r: 7, kind: 'none', dir });
  // Ward C: bare bulbs, a few red cages, one room lit like day
  bulb(4, 3, 0.5, 0xffd0a0); bulb(5, 7, 0.4); cage(8, 11.5); cage(20, 11.5, 0.5); cage(33, 11.5, 0.45); cage(43.5, 14, 0.5); cage(43.5, 24, 0.5);
  Lm(14, 5.5, 'S', { col: 0xf4f8ff, i: 2.4, r: 9, kind: 'bulb' }); tube(12, 3, 'A', 0.7); desk(17, 3, 0.7);   // Voss's room: the operating lamp, the radio's dial
  tube(24, 5, 'B', 0.7); bulb(34, 5, 0.35, 0xcfe8ff); bulb(31.6, 6.6, 0.55, 0xe8f0ff);   // a bulb over the slab, so the key shows bulb(42, 5, 0.3);
  for (const x of [11, 19, 27, 35, 41]) bulb(x, 18.5, 0.4, 0xffc890);
  for (const [x, y] of [[11, 15], [19, 15], [31, 15], [35, 15], [15, 22.2], [23, 22.2], [27, 22.2], [31, 22.2]]) bulb(x, y, 0.42, 0xffc890);   // a bulb over every chair
  tube(39, 23, 'A', 0.7); cage(7.5, 25, 0.45);
  for (const [x, y] of [[11, 27], [19, 30], [27, 27], [31, 30]]) Lm(x, y, 'S', { col: 0x7a9a8a, i: 0.35, r: 6, kind: 'none', y2: 2.8 });   // grey light down a drain shaft
  cage(39, 27.5, 0.5);
  // the women's ward: candles everywhere (she likes candles), a few dim bulbs
  for (const x of [58, 66, 74, 82, 90]) bulb(x, 15.5, 0.35, 0xffd8a0);
  bulb(55.5, 6, 0.3); bulb(55.5, 24, 0.3);
  for (const [x, y] of [[60, 4.5], [64, 4.5], [68, 4.5], [72, 4.5], [60, 11.6], [66, 11.6], [72, 11.6]]) candle(x, y, 0.85, 0.45);
  for (const x of [60, 64, 68, 72]) moon(x, 3.0, [0, -0.5, 1], 0.45);
  candle(80, 8, 0.8, 0.6); bulb(80, 5, 0.3); candle(88, 5, 0.85, 0.5); candle(94, 11, 0.85, 0.5); candle(91, 8, 0.8, 0.55); moon(92, 3.0, [0, -0.5, 1], 0.4);
  tube(62, 22, 'A', 0.7, 0xdfe8ff); candle(65, 26, 0.85, 0.45); desk(71, 19.5, 0.65); bulb(71, 27, 0.25); bulb(79, 22, 0.3); cage(85, 25, 0.5);
  for (const x of [88, 92, 96]) bulb(x, 19.5, 0.2);
  // the disturbed ward: hard stuttering tubes, red cages, the booth's green monitors
  for (const x of [60, 70, 80, 90]) { tube(x, 44.5, x % 20 ? 'A' : 'B', 0.85); tube(x, 61.5, x % 20 ? 'B' : 'A', 0.8); }
  cage(56.5, 53, 0.6); cage(94.5, 53, 0.6); cage(85, 41, 0.6); cage(85, 37.5, 0.5);
  tube(70, 50, 'A', 0.9); tube(80, 55, 'B', 0.9); cage(75, 52.5, 0.45);
  Lm(62, 49, 'S', { col: 0x8fff9a, i: 0.35, r: 4, kind: 'monitor' }); bulb(62, 52, 0.3);
  bulb(61.5, 57, 0.12, 0xff4020); tube(89.5, 52, 'A', 0.8);
  for (const x of [59, 63, 67, 71, 75, 79, 90]) bulb(x + 0.5, 40.5, 0.14, 0xffe0c0);
  for (const x of [58, 66, 74, 82, 90]) bulb(x + 1, 65.5, 0.16, 0xff3a20);
  // the offices: moonlight, desk lamps left on, a corridor tube or two that still works
  for (const x of [8, 20, 32, 40]) tube(x, 52.5, x === 20 ? 'A' : 'S', 0.55, 0xf0e8d8);
  for (const x of [10, 30]) { bulb(x, 39.5, 0.3); bulb(x, 65.5, 0.3); }
  bulb(3.5, 46, 0.3); bulb(43.5, 58, 0.3);
  for (const x of [8, 12, 18]) moon(x, 38.9, [0, -0.5, 1], 0.5); moon(30, 38.9, [0, -0.5, 1], 0.45); moon(38, 38.9, [0, -0.5, 1], 0.55);
  desk(10, 46, 0.5); desk(18, 48, 0.45); desk(38, 46, 0.7); desk(19, 59, 0.5); bulb(28, 46, 0.3); bulb(28, 59, 0.25); bulb(10, 59, 0.3); tube(38, 59, 'B', 0.6);
  // the examining rooms: cold, white, and the theater's lamp
  for (const y of [78, 86, 94]) tube(22.5, y, 'S', 0.75, 0xe8f0ff);
  for (const x of [10, 30, 40]) { tube(x, 74.5, 'A', 0.6, 0xe8f0ff); tube(x, 98.5, 'B', 0.5, 0xe8f0ff); }
  tube(12, 80, 'A', 0.8, 0xe8f0ff); tube(12, 91, 'S', 0.6, 0xd8e8ff); bulb(29, 80, 0.4, 0xb0ffb0); tube(29, 90, 'B', 0.7);
  Lm(39.5, 83, 'S', { col: 0xf4f8ff, i: 2.6, r: 9, kind: 'bulb' }); tube(42, 88, 'A', 0.6); bulb(40, 94, 0.35); bulb(46.5, 86, 0.3, 0xff2a10);
  // the stairwells: a cage on every landing
  for (const s of stairwells) { Lm(s.bottom[0], s.bottom[1], 'S', { col: 0xffc8a0, i: 0.7, r: 7, kind: 'cage', drop: 3.4 }); Lm(s.topL[0], s.topL[1], 'S', { col: 0xffc8a0, i: 0.7, r: 7, kind: 'cage', drop: 0.4 }); Lm(s.mid[0], s.mid[1], 'S', { col: 0xff3a20, i: 0.75, r: 7, kind: 'cage', drop: 1.9 }); bulb(s.lower[0], s.lower[1], 0.35, 0xffd8a0); bulb(s.upper[0], s.upper[1], 0.35, 0xffd8a0); }
  // the boiler house: firelight, red cages; the turbine hall is dark until the power comes up (channel P)
  cage(56.5, 80, 0.5); cage(56.5, 94, 0.5); cage(70, 87.5, 0.5); cage(90, 87.5, 0.5);
  for (const [x, y] of [[63, 78], [68, 82], [73, 78]]) Lm(x, y, 'S', { col: 0xff5a10, i: 0.7, r: 6, kind: 'none', y2: 0.6 });   // fireboxes
  Lm(82.5, 74.5, 'S', { col: 0xff6a18, i: 1.8, r: 10, kind: 'none', y2: 0.9 }); cage(82, 78, 0.35);   // the furnace mouth
  bulb(92, 78, 0.25); bulb(92, 84, 0.2);
  for (const [x, y] of [[62, 94], [68, 94], [74, 94]]) tube(x, y, 'P', 1.0); cage(67.5, 91, 0.3);
  Lm(81, 92, 'S', { col: 0x8fff9a, i: 0.4, r: 4, kind: 'monitor' }); tube(81, 94, 'P', 0.9); bulb(91, 93, 0.35);
  for (const [x, y] of [[84, 101], [93, 101], [88, 99]]) Lm(x, y, 'S', { col: 0x9ab0d8, i: 0.7, r: 12, kind: 'none', y2: 4 });   // first light over the yard

  // ------------------------------------------------------ props (nothing in a doorway: mason moves anything that would be)
  const props = []; const P = (k, x, y, r = 0, o = {}) => props.push({ k, x, y, r, ...o });
  const locker = (x, y, r) => P('locker', x, y, r);
  // Ward C
  P('crate', 2.6, 8.4, 0); P('crate', 7.4, 5.6, 0); P('shelf', 8.4, 7, 3); locker(2, 7, 1);
  P('slab', 14, 6, 0); P('trolley', 12, 4, 0); P('trolley', 16.3, 6.5, 1); P('ivstand', 15.6, 4.4, 0); P('sinkrow', 10.6, 3, 1); P('desk', 17, 3, 2); P('drawers', 14, 2.1, 0, { short: true }); locker(18.6, 8.5, 3);
  P('counter', 24, 2.3, 0); for (const y of [4.5, 7]) P('table', 24, y, 0); P('shelf', 20.4, 5, 1); P('shelf', 27.6, 5, 3); P('trolley', 21, 8.5, 0); P('trolley', 27, 8.3, 1);
  P('drawers', 34, 2.1, 0); P('slab', 31.6, 6.5, 0); P('gurney', 36.8, 7, 0); locker(38.6, 8.6, 3);
  P('generator', 42, 5, 0); P('pipes', 44.6, 6, 3);
  for (const x of [10, 14, 18, 22, 26, 30, 34, 38]) { P('chairR', x + 1, 15, 2); P('bucket', x + 2.3, 14.3, 0); }
  for (const x of [10, 14, 18, 22, 26, 30]) { P('chairR', x + 1, 22.2, 0); P('bucket', x + 0.2, 23.6, 0); }
  for (const [x, r] of [[12, 0], [20, 0], [28, 0], [36, 0]]) locker(x, 18, r);
  P('generator', 40, 23, 0); P('pipes', 44.6, 23, 3); P('crate', 36, 24.6, 0); P('crate', 43.4, 21.4, 0); locker(35, 21, 1);
  P('gurney', 7.5, 15, 0, { tipped: true }); P('wheelchair', 7.6, 23, 2); P('trolley', 30, 11.4, 1); P('gurney', 43.5, 18.5, 1);
  P('pipes', 20, 11, 0); P('pipes', 34, 11, 0); P('pipes', 30, 27, 0);
  // the women's ward
  for (let x = 59; x <= 73; x += 2) { P('bed', x, 4.1, 0); P('bed', x, 12.4, 2); }
  for (const [x, y] of [[66, 8], [61, 8.3]]) P('table', x, y, 0, { small: true }); P('chair', 64, 7.6, 1); P('chair', 68, 9, 3, { tipped: true });
  locker(58, 8.6, 1); locker(74.6, 6, 3);
  P('table', 80, 7, 0); for (const [x, y, r] of [[78, 6, 0], [82, 6, 0], [78, 8.4, 2], [82, 8.4, 2]]) P('chair', x, y, r); P('shelf', 76.4, 10, 1); P('piano', 83.6, 4, 3); P('sofa', 79, 12.4, 2);
  for (const [x, y] of [[88, 5], [92, 5], [95, 5], [88, 11], [95, 11]]) P('crib', x, y, 0); P('sofa', 91.5, 12.4, 2); P('shelf', 96.6, 8, 3); P('chair', 92, 8.6, 0);
  for (const y of [19.4, 22, 24.6]) P('tub', 60, y, 1); for (const y of [19.4, 22]) P('tub', 65, y, 1); P('sinkrow', 66.6, 26, 3); P('stall', 58.3, 26.5, 1);
  P('desk', 71, 19.5, 0); P('filing', 68.4, 18.4, 0); P('filing', 69.4, 18.4, 0); P('shelf', 74.6, 21, 3); P('chair', 71, 20.6, 2); locker(68, 22.5, 1);
  P('shelf', 68.4, 26, 1); P('shelf', 74.6, 26, 3); P('crate', 70, 29.6, 0); P('crate', 73, 29.4, 0);
  P('shelf', 76.4, 20, 1); P('shelf', 76.4, 24, 1); P('tub', 81, 21, 0); P('tub', 81, 25, 0); P('trolley', 78.6, 26.4, 0); locker(83.6, 19, 3);
  for (const x of [88, 92, 96]) P('bucket', x + 0.6, 18.4, 0);
  P('wheelchair', 56, 20, 0); P('trolley', 75, 15.4, 1); P('gurney', 55.5, 26, 0); locker(55, 11, 1); locker(96.6, 15.5, 3); locker(85.5, 28, 3);
  // the disturbed ward
  for (const x of [58, 62, 66, 70, 74, 78, 89]) P('bucket', x + 2.2, 39.4, 0);
  for (const [x, y] of [[69, 49], [74, 49], [79, 49]]) P('bench', x, y, 1); P('tv', 75, 47.3, 0); P('table', 70, 53, 0); P('table', 79, 53, 0); for (const [x, y] of [[68, 56.6], [73, 56.6], [82, 56.6]]) P('chairR', x, y, 2); P('wheelchair', 83, 50, 3);
  P('secdesk', 61.5, 48.4, 0); P('chair', 61.5, 49.6, 2); P('filing', 64.4, 52.6, 3); locker(59, 52.6, 1);
  for (const y of [49.5, 52.5, 55.5]) P('bed', 89.6, y, 1, { straps: true }); P('chairR', 91.6, 49, 3); P('trolley', 91.6, 56, 0); locker(92.6, 53.5, 3);
  for (const x of [58, 62, 66, 70, 74, 78, 82, 86, 90]) P('bucket', x + 2.3, 67.4, 0);
  P('gurney', 56.5, 50, 0, { tipped: true }); P('trolley', 75, 44.4, 0, { tipped: true }); P('wheelchair', 66, 61.4, 1); locker(57.5, 58, 1); locker(94, 47, 3); locker(66, 44, 0); locker(84, 62.5, 2); locker(57.5, 46, 1);
  // the offices
  for (const y of [44, 46.5, 49]) for (const x of [8, 11, 14, 17, 20]) P('desk', x, y, 0, { typewriter: true });
  for (const y of [43.5, 46.5, 49.5]) { P('shelf', 26, y, 0); P('shelf', 29, y, 0); P('shelf', 32, y, 0); }
  P('desk', 38, 45, 2); P('chair', 38, 43.8, 0); P('shelf', 35.4, 44, 1); P('shelf', 35.4, 47, 1); P('filing', 41.6, 43, 3); P('filing', 41.6, 44, 3); P('sofa', 38, 49.6, 0); P('plant', 41.4, 49.6, 0);
  P('sofa', 7, 59, 1); P('sofa', 10, 62.6, 2); P('table', 10, 59, 0, { small: true }); P('tv', 13.6, 57, 3); P('counter', 10, 55.4, 2); P('chair', 12.6, 61, 3);
  P('secdesk', 19, 55.6, 0); P('chair', 19, 56.8, 2); P('filing', 16.4, 61, 1); P('filing', 16.4, 62, 1); P('desk', 21, 62, 3);
  for (const y of [57, 60]) for (const x of [26, 29, 32]) P('filing', x, y, 0); P('filing', 24.4, 63, 1); P('filing', 33.6, 56, 3);
  P('sinkrow', 41.6, 57, 3); for (const y of [60, 62]) P('stall', 35.3, y, 1);
  locker(4, 46, 1); locker(4, 60, 1); locker(43.5, 47, 3); locker(43.5, 61, 3); locker(24, 40.4, 0); locker(16, 65.4, 2); P('plant', 6, 52.4, 0); P('bench', 33, 53.6, 0); P('trolley', 4, 55, 0); P('wheelchair', 30, 65.5, 1);
  // the examining rooms
  P('bed', 8, 80, 1, { straps: true }); P('ect', 8, 78, 0); P('bed', 15, 80, 1, { straps: true }); P('ect', 15, 78, 0); P('trolley', 19, 82, 0); P('chair', 11, 82.5, 0); locker(5, 82.6, 1);
  for (const [x, y] of [[8, 87.5], [12, 87.5], [16, 87.5], [8, 94], [12, 94], [16, 94]]) P('tub', x, y, 0); P('sinkrow', 19.6, 92, 3);
  P('xray', 29, 79, 0); P('slab', 29, 81.6, 0); P('secdesk', 31.4, 82.4, 2); locker(25, 82.6, 1);
  P('slab', 39.5, 83, 0); P('slab', 39.5, 87.2, 0); P('trolley', 37.4, 83, 1); P('trolley', 41.8, 85, 1); P('ivstand', 41.6, 82, 0); P('sinkrow', 44.6, 80, 3); P('drawers', 39.5, 77.1, 0, { short: true }); P('bench', 36, 89.6, 0);
  for (const y of [88, 92, 95]) { P('dentalchair', 29, y, 1); P('trolley', 31.6, y, 0); } P('sinkrow', 25.4, 94, 1); locker(33, 85.4, 2);
  for (const x of [36.6, 39, 41.4]) P('shelf', x, 92.4, 0); P('crate', 43.6, 95.6, 0); P('trolley', 37, 95.5, 1);
  P('gurney', 22.5, 84, 0, { tipped: true }); P('wheelchair', 23, 96, 0); locker(4.5, 74.5, 0); locker(44, 99, 2); locker(22, 76.5, 1); P('bench', 13, 98.6, 0); P('trolley', 30, 74.5, 1);
  // the boiler house
  for (const x of [63, 68, 73]) P('boiler', x, 77, 0); P('pipes', 61, 72.4, 0); P('pipes', 70, 72.4, 0); P('pipes', 76.6, 80, 3); P('crate', 60, 84.4, 0); P('shelf', 59.4, 81, 1); locker(76.6, 84.4, 3);
  P('furnace', 82.5, 72.6, 0); P('trolley', 80, 77, 1); P('gurney', 85.4, 78, 0); P('crate', 86.8, 72.8, 0);
  P('crate', 93, 74, 0); P('crate', 95.4, 79, 0); P('crate', 90, 84.4, 0); P('shelf', 96.6, 82, 3);
  for (const x of [63, 72]) P('turbine', x, 95, 1); P('pipes', 59.4, 93, 1); P('pipes', 76.6, 93, 3); P('crate', 60, 98.6, 0);
  P('secdesk', 81, 90.4, 0); P('chair', 81, 91.6, 2); P('filing', 83.6, 94.6, 3); P('shelf', 78.4, 94, 1);
  P('table', 91, 93, 0); P('shelf', 86.4, 92, 1); P('shelf', 96.6, 92, 3); P('crate', 87, 95.6, 0); P('generator', 94.6, 95.6, 0);
  locker(57.5, 76, 1); locker(57.5, 97, 1); locker(62, 87.4, 0); locker(86, 87.4, 0); P('trolley', 74, 88, 1);
  P('crate', 83, 101, 0); P('crate', 85, 102.6, 0); P('crate', 95, 100, 0);

  // ------------------------------------------------------ the dead, the leavings, what's written on the walls
  const gore = []; const Gd = (k, x, y, o = {}) => gore.push({ k, x, y, ...o });
  // Ward C: the cold room is a larder
  for (const [x, y] of [[31, 3.5], [33, 3.5], [35, 3.5], [37, 3.5], [32, 8], [36, 8]]) Gd('hanged', x, y);
  Gd('corpse', 31.6, 6.5, { on: 'slab', open: true }); Gd('pile', 35, 6); Gd('pile', 30.8, 8.8); Gd('pile', 12.5, 7.5);
  Gd('corpse', 2.6, 6.5, { slump: true }); Gd('corpse', 26, 11.6, { slump: true }); Gd('corpse', 44, 16, { slump: true }); Gd('corpse', 8, 29, { slump: true }); Gd('pile', 22, 22.6); Gd('pile', 41, 26);
  for (const [x, y] of [[14, 8], [24, 9], [34, 6], [8, 12], [20, 19], [30, 19], [42, 22], [15, 27], [24, 30], [40, 28], [44, 12]]) Gd('pool', x, y, { s: 0.7 + ((x * 7 + y * 3) % 5) * 0.2 });
  for (const [x, y, w] of [[9.6, 15, 'w'], [18, 9.6, 's'], [28.6, 6, 'e'], [44.6, 20, 'e'], [9.5, 27, 'w'], [32, 26, 'n']]) Gd('smear', x, y, { wall: w });
  for (const [x, y, w, t] of [[2.4, 8, 'w', 'WARD C'], [8.4, 22, 'e', 'THEY ARE ALL STILL ALIVE'], [20.6, 8, 'w', 'FORTY A DAY'], [44.6, 15, 'e', 'UP IS NOT OUT'], [12, 25.6, 'n', 'DONT DRINK IT'], [47.6, 12, 'e', 'B']]) Gd('scrawl', x, y, { wall: w, t });
  // the women's ward
  Gd('corpse', 67, 4.6, { on: 'bed', sheet: true }); Gd('corpse', 63, 11.8, { on: 'bed' }); Gd('corpse', 71, 4.6, { on: 'bed', open: true }); Gd('corpse', 60, 19.4, { tub: true }); Gd('corpse', 81, 25, { tub: true }); Gd('hanged', 79, 22); Gd('corpse', 74, 29.4, { slump: true }); Gd('pile', 93, 8);
  for (const [x, y] of [[62, 15.5], [79, 15.8], [61, 23], [71, 21], [91, 10], [85, 26], [56, 18]]) Gd('pool', x, y, { s: 0.6 + ((x * 7 + y * 3) % 5) * 0.2 });
  for (const [x, y, w] of [[57.6, 12, 'w'], [74.6, 10, 'e'], [66.6, 21, 'e'], [96.6, 6, 'e'], [85.4, 30, 'e']]) Gd('smear', x, y, { wall: w });
  for (const [x, y, w, t] of [[55.4, 14, 'w', 'HUSH NOW'], [57.6, 5, 'w', 'MOTHER IS LISTENING'], [96.6, 10, 'e', 'GOOD GIRLS SLEEP'], [66.6, 24, 'e', 'SHE WASHES US'], [84.6, 22, 'e', 'KELLY STAYED'], [50, 12.2, 'n', '1']]) Gd('scrawl', x, y, { wall: w, t });
  // the disturbed ward
  Gd('corpse', 89.6, 52.5, { on: 'bed', open: true }); Gd('corpse', 57, 56, { slump: true }); Gd('corpse', 95, 59, { slump: true }); Gd('corpse', 62, 57.6, { open: true }); Gd('hanged', 75, 53); Gd('pile', 70, 57); Gd('pile', 90, 56.6); Gd('pile', 61, 41);
  for (const [x, y] of [[60, 44.6], [72, 61.6], [86, 61.6], [76, 50], [56.5, 48], [94.5, 50], [91, 50], [85, 44.6]]) Gd('pool', x, y, { s: 0.8 + ((x * 7 + y * 3) % 5) * 0.25 });
  for (const [x, y, w] of [[65.4, 46, 'n'], [84.6, 50, 'e'], [57.6, 60, 'w'], [93.4, 58, 'e'], [80, 63.4, 's'], [66, 47.4, 'n']]) Gd('smear', x, y, { wall: w });
  for (const [x, y, w, t] of [[58.4, 45.6, 'w', 'NO STAFF'], [66.4, 52, 'w', 'WE ARE THE DISTURBED'], [84.6, 54, 'e', 'THEY LOCKED THE GLASS'], [94.4, 47, 'e', 'BITE'], [86, 62.6, 's', 'LET US OUT LET US OUT'], [53, 52.2, 'n', '2']]) Gd('scrawl', x, y, { wall: w, t });
  // the offices: nobody came in on Monday
  Gd('corpse', 19, 56.2, { slump: true }); Gd('corpse', 38, 44.6, { slump: true }); Gd('corpse', 14, 46.6, { slump: true }); Gd('hanged', 30, 45); Gd('corpse', 39, 61, { slump: true });
  for (const [x, y] of [[10, 52.5], [28, 53], [43.5, 50], [14, 41]]) Gd('pool', x, y, { s: 0.6 });
  for (const [x, y, w, t] of [[4.4, 50, 'w', 'TRANSFERRED'], [24.4, 58, 'w', 'NOBODY WAS FIRED'], [42.6, 64, 'e', 'THE DIRECTOR KNEW'], [22.6, 68, 'e', 'EXAMINATIONS']]) Gd('scrawl', x, y, { wall: w, t });
  // the examining rooms
  Gd('corpse', 12, 94, { tub: true }); Gd('corpse', 16, 87.5, { tub: true }); Gd('corpse', 29, 81.6, { on: 'slab', sheet: true }); Gd('corpse', 39.5, 87.2, { on: 'slab', open: true }); Gd('pile', 43, 89); Gd('pile', 31, 95); Gd('corpse', 4.5, 98.5, { slump: true });
  for (const [x, y] of [[22.5, 80], [22.5, 92], [39, 85], [13, 90], [30, 90], [40, 98.5]]) Gd('pool', x, y, { s: 0.7 + ((x * 7 + y * 3) % 5) * 0.2 });
  for (const [x, y, w, t] of [[4.6, 80, 'w', 'HOLD STILL'], [33.6, 79, 'e', 'WHERE IS IT KEPT'], [44.6, 83, 'e', 'FRONT OR BACK'], [4.4, 92, 'w', 'DROWNED QUIET'], [47.6, 86.2, 'n', '1']]) Gd('scrawl', x, y, { wall: w, t });
  // the boiler house: where everyone goes in the end
  Gd('pile', 84, 74.4); Gd('pile', 81, 75); Gd('corpse', 85.4, 78, { on: 'bed', open: true }); for (const [x, y] of [[93, 80], [95, 82], [91, 77], [94, 76]]) Gd('corpse', x, y); Gd('pile', 92.6, 82.4); Gd('hanged', 66, 83); Gd('corpse', 74, 91.6, { slump: true });
  for (const [x, y] of [[82, 77], [93, 79], [68, 87.5], [57, 86], [91, 91]]) Gd('pool', x, y, { s: 1.0 });
  for (const [x, y, w, t] of [[56.4, 84, 'w', 'ALL OF THEM GO IN THE FIRE'], [87.6, 75, 'e', 'KEEP IT HOT'], [96.6, 93, 'e', 'THE YARD GATE IS ELECTRIC'], [52, 86.2, 'n', 'B']]) Gd('scrawl', x, y, { wall: w, t });

  // ------------------------------------------------------ what you can pick up
  const items = [
    { k: 'note', x: 13.4, y: 6.6, id: 'n4_radio' }, { k: 'note', x: 24, y: 2.6, id: 'n4_trays' }, { k: 'note', x: 23, y: 15.4, id: 'n4_wardc' }, { k: 'note', x: 40, y: 24.4, id: 'n4_pump' },
    { k: 'stairKey', x: 31.6, y: 6.95, id: 'stairKey' },   // on the slab in the cold room, at the feet of the man on it
    { k: 'note', x: 71, y: 19.4, id: 'n4_kelly' }, { k: 'note', x: 61, y: 8.3, id: 'n4_dorm' }, { k: 'note', x: 82, y: 21, id: 'n4_laundry' }, { k: 'note', x: 92, y: 8.6, id: 'n4_nursery' },
    { k: 'wardKeys', x: 71.8, y: 27.6, id: 'wardKeys' },
    { k: 'note', x: 61.5, y: 48.4, id: 'n4_booth' }, { k: 'note', x: 89.6, y: 55.5, id: 'n4_restraint' }, { k: 'note', x: 61.6, y: 58.2, id: 'n4_hole' },
    { k: 'boothKey', x: 91.6, y: 56, id: 'boothKey' },
    { k: 'note', x: 14, y: 49, id: 'n4_typing' }, { k: 'note', x: 29, y: 46.5, id: 'n4_records' }, { k: 'note', x: 29, y: 60, id: 'n4_marsh' }, { k: 'note', x: 38, y: 45, id: 'n4_director' }, { k: 'note', x: 10, y: 59, id: 'n4_lounge' },
    { k: 'directorKey', x: 21, y: 62, id: 'directorKey' }, { k: 'examCard', x: 37.6, y: 45.2, id: 'examCard' },
    { k: 'note', x: 12, y: 82.5, id: 'n4_ect' }, { k: 'note', x: 31.4, y: 82.4, id: 'n4_xray' }, { k: 'note', x: 14, y: 96, id: 'n4_hydro' }, { k: 'note', x: 37.4, y: 83, id: 'n4_theater' },
    { k: 'cutters', x: 41, y: 92.4, id: 'cutters' },
    { k: 'note', x: 81, y: 90.4, id: 'n4_control' }, { k: 'note', x: 80, y: 77, id: 'n4_furnace' }, { k: 'note', x: 91, y: 93, id: 'n4_last' },
  ];

  // ------------------------------------------------------ who's in the building
  // one hunter per stretch of the tape (see segment)
  const hunters = [
    { kind: 'surgeon', x: 14, y: 7, seed: 23, route: [[14, 7], [14, 11.5], [24, 11.5], [24, 6], [24, 11.5], [34, 11.5], [34, 6], [34, 11.5], [43.5, 11.5], [43.5, 18.5], [25, 18.5], [7.5, 18.5], [7.5, 28], [20, 28.5], [31, 27], [43.5, 27.5], [43.5, 18.5], [39, 23], [43.5, 18.5], [7.5, 18.5], [7.5, 11.5], [5, 7], [7.5, 11.5]] },
    { kind: 'matron', x: 71, y: 15.5, seed: 74, route: [[71, 15.5], [62, 15.5], [62, 8], [66, 4.5], [72, 8], [70, 15.5], [80, 15.5], [80, 8], [91, 8], [91, 15.5], [85, 15.5], [85, 28], [85, 15.5], [79, 15.5], [79, 22], [79, 15.5], [62, 15.5], [62, 22], [62, 15.5], [55.5, 15.5], [55.5, 4], [55.5, 28], [55.5, 15.5]] },
    { kind: 'eater', x: 75, y: 52, seed: 31, route: [[75, 52], [70, 44.5], [58, 44.5], [56.5, 53], [56.5, 61.5], [75, 61.5], [94.5, 61.5], [94.5, 52], [90, 52], [94.5, 52], [94.5, 44.5], [80, 44.5], [80, 50], [75, 52]], look: { face: 'lobotomy', blood: 1, scars: 1, lean: 1 } },
    { kind: 'orderly', x: 28, y: 52.5, seed: 61, route: [[28, 52.5], [14, 52.5], [14, 46], [14, 52.5], [3.5, 52.5], [3.5, 39.5], [28, 39.5], [28, 46], [28, 39.5], [43.5, 39.5], [43.5, 65.5], [28, 65.5], [28, 59], [28, 65.5], [3.5, 65.5], [3.5, 52.5], [19, 52.5], [19, 59], [19, 52.5], [10, 52.5], [10, 59], [10, 52.5], [38, 52.5]] },
    { kind: 'surgeon', x: 39.5, y: 85, seed: 23, route: [[39.5, 85], [40, 75], [22.5, 75], [22.5, 80], [12, 80], [22.5, 80], [22.5, 90], [12, 90], [22.5, 90], [29, 90], [22.5, 90], [22.5, 98.5], [40, 98.5], [40, 94], [40, 85], [29, 80], [22.5, 80], [22.5, 75], [10, 75], [40, 75]] },
    { kind: 'brute', x: 82, y: 76, seed: 11, route: [[82, 76], [77, 76], [68, 78], [60, 80], [56.5, 80], [56.5, 87.5], [68, 87.5], [68, 95], [68, 87.5], [81, 87.5], [81, 92], [81, 87.5], [91, 87.5], [91, 93], [91, 87.5], [92, 80], [88, 76], [82, 76]] },
    { kind: 'surgeon', x: 56.5, y: 86, seed: 23, route: [[56.5, 86], [68, 87.5], [81, 87.5], [91, 87.5], [91, 94], [81, 92], [68, 95], [56.5, 92], [56.5, 80], [68, 80], [82, 76], [68, 80], [56.5, 86]] },
  ];
  // which stretch of the tape you're in decides who hunts you
  const segment = (G) => { const s = G.t4 || {}; return s.finale ? 6 : s.boiler ? 5 : s.exam ? 4 : s.offices ? 3 : s.disturbed ? 2 : s.female ? 1 : 0; };
  // the refractories, out of their strong rooms the moment the doors release; every one of them hunts
  const packOn = (G) => !!(G.t4 && G.t4.release && !G.t4.offices);
  const fem = (o) => ({ female: true, outfit: 'gown', h: 1.62, girth: 0.72, hair: [0.18, 0.13, 0.09], bald: false, ...o });
  const inmates = [
    // Ward C: the transferred, strapped into chairs in their cells (tape4 dresses them), and a few who rock
    { x: 11, y: 22.6, kind: 'rocker', facing: Math.PI }, { x: 27, y: 15, kind: 'rocker', facing: 0 }, { x: 39, y: 15.4, kind: 'rocker', facing: 0.5 },
    // the women's ward: they wander, they don't hurt you; they hush you
    { x: 66, y: 8, kind: 'stalker', route: [[66, 8], [60, 8], [72, 8], [66, 8]], look: fem({ face: 'sewn', blood: 0.3 }) },
    { x: 81, y: 22, kind: 'rocker', facing: Math.PI, look: fem({ face: 'gaunt', hair: [0.5, 0.48, 0.44] }) },
    { x: 96, y: 20, kind: 'rocker', facing: Math.PI, look: fem({ face: 'smile', blood: 0.6 }) },
    { x: 90, y: 6, kind: 'rocker', facing: 0, look: fem({ face: 'sewn', hair: [0.08, 0.05, 0.03] }) },
    // (the disturbed ward's strong rooms are shut: you only hear them)
    // the offices: someone still doing their rounds of the filing
    { x: 30, y: 59, kind: 'stalker', route: [[30, 59], [26, 61], [32, 61], [30, 57]], look: { outfit: 'orderly', face: 'lobotomy', blood: 0.4 } },
  ];
  // the refractories themselves
  const bloody = { blood: 1, dirt: 1, stare: true, outfit: 'straitjacket', scars: 1 };
  [58, 62, 66, 70, 74, 78, 82, 86, 90].forEach((x, i) => {
    const home = [x + 1, 65.5];
    inmates.push({ x: home[0], y: home[1], kind: 'stalker', pack: true, dormant: true, route: [home, [x + 1, 61.5], [i % 2 ? 56.5 : 94.5, 61.5], [i % 2 ? 56.5 : 94.5, 52], [75, 52], [x + 1, 61.5]], look: { ...bloody, face: ['smile', 'gouged', 'sewn', 'burned', 'random', 'noseless', 'gaunt', 'smile', 'gouged'][i], ...(i % 3 === 1 ? { female: true, h: 1.66, hair: [0.12, 0.08, 0.05] } : {}) } });
  });

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= D) ? 0 : g[y * W + x];
  setLevels(L);
  // every corpse belongs to an area, and only Ward C's are laid out before you start (the rest as you get near)
  const regions = { basement: [2, 1, 47, 32], female: [51, 2, 97, 33], disturbed: [52, 37, 97, 68], offices: [2, 38, 48, 73], exam: [2, 74, 48, 100], boiler: [52, 70, 98, 104] };
  const regOf = (x, y) => { for (const [k, [x0, y0, x1, y1]] of Object.entries(regions)) if (x >= x0 && x <= x1 + 1 && y >= y0 && y <= y1 + 1) return k; return 'basement'; };
  for (const gd of gore) gd.reg = regOf(gd.x, gd.y);
  // grass? no: the coal yard is cinders and tarmac
  const floorOf = (x, y, z) => (z === Z.OUT ? 'asphalt' : z === Z.SHOWER && y < 34 && x < 47 ? 'floorShower' : null);
  return {
    tape: 4, W, g, win, at, doors, lazyGore: 'basement', gate: null, lamps, props, gore, items, hunters, segment, packOn, inmates, levels: L, stairwells, floorOf,
    start: { x: 4, y: 5.6, yaw: Math.PI },
    titleCam: { x: 14, y: 8.4, h: 1.6, yaw: 0.2, drift: 0.6 },
    exit: { x: 88.5, y: 102.5, r: 2.5 },
    regions,
    // names on the minimap
    labels: [
      [4, 7.5, 'FOOT OF THE STAIRS'], [14, 5.5, 'VOSS\u2019S WORKROOM'], [24, 5.5, 'TRAY KITCHEN'], [34, 5.5, 'COLD ROOM'], [42, 5.5, 'METER ROOM'], [24, 15, 'WARD C CELLS'], [20, 22.5, 'WARD C CELLS'], [39.5, 23, 'PUMP ROOM'], [21, 28.5, 'THE CISTERN'], [48.5, 12.5, 'STAIRS UP'],
      [66, 8, 'DORMITORY'], [80, 8, 'SEWING ROOM'], [91, 8, 'NURSERY'], [62, 22.5, 'BATHROOM'], [71, 20.5, 'MATRON\u2019S OFFICE'], [71, 27.5, 'MATRON\u2019S STORE'], [79.5, 22.5, 'LINEN & LAUNDRY'], [92, 19.5, 'SECLUSION'], [85, 35, 'STAIRS UP'],
      [85, 41, 'SALLY PORT'], [69, 40.6, 'STRONG ROOMS'], [75, 53, 'DAY HALL'], [61.5, 50.5, 'ATTENDANTS\u2019 BOOTH'], [61.5, 57, 'THE HOLE'], [89.5, 52.5, 'RESTRAINT ROOM'], [74, 65.5, 'REFRACTORIES'], [50, 53.5, 'STAIRS DOWN'],
      [14, 46, 'TYPING POOL'], [28.5, 46, 'RECORDS'], [38, 46, 'DIRECTOR\u2019S OFFICE'], [10, 59, 'DOCTORS\u2019 LOUNGE'], [19, 59, 'SWITCHBOARD'], [28.5, 59, 'PERSONNEL FILES'], [38, 59, 'WASHROOM'],
      [12.5, 80, 'ELECTROSHOCK'], [12.5, 90.5, 'HYDROTHERAPY'], [29, 80, 'X-RAY'], [39.5, 83.5, 'OPERATING THEATER'], [29, 90.5, 'DENTAL'], [39.5, 94, 'INSTRUMENTS'], [50, 87.5, 'STAIRS DOWN'],
      [67.5, 78.5, 'BOILER HALL'], [82.5, 76, 'FURNACE'], [92.5, 78.5, 'COAL STORE'], [67.5, 94.5, 'TURBINE HALL'], [81, 92.5, 'CONTROL ROOM'], [91, 93, 'WORKSHOP'], [88.5, 100.5, 'COAL YARD'],
    ].map(([x, y, t]) => ({ x, y, t })),
  };
}

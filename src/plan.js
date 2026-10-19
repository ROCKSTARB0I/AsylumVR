// AsylumVR floor plan. Mount Harrow State Asylum, ground floor, carved
// cell by cell into a solid block. Everything else (walls, light, the
// creatures' paths) is derived from this grid.
export const C = 1.5;          // metres per cell
export const H = 3.2;          // ceiling height
export let W = 49, D = 64;     // grid size (x, y). y grows south (+z). Tape 4 is bigger (setGrid)
export function setGrid(w, d) { W = w; D = d; }

// Floors at different heights (Tape 4: real stairwells between storeys). LEVELS is null on the flat tapes.
// Everything in the game's logic stays relative to the floor you're on; only drawing and sound add the
// floor's height. A cell has a floor base, an optional ramp (a flight of stairs: rise over the cell along
// dir 1 +x, 2 -x, 3 +y, 4 -y) and a ceiling height.
export let LEVELS = null;
export function setLevels(L) { LEVELS = L; }
const _cell = (x, z) => [Math.floor(x / C), Math.floor(z / C)];
// the floor's height under a world point (continuous: walking up a flight lifts you smoothly)
export function floorAt(x, z) {
  if (!LEVELS) return 0; const [gx, gy] = _cell(x, z); if (gx < 0 || gy < 0 || gx >= W || gy >= D) return 0; const i = gy * W + gx;
  const r = LEVELS.rise[i]; if (!r) return LEVELS.base[i];
  const fx = x / C - gx, fy = z / C - gy; const d = LEVELS.dir[i]; const t = d === 1 ? fx : d === 2 ? 1 - fx : d === 3 ? fy : 1 - fy;
  return LEVELS.base[i] + r * Math.min(1, Math.max(0, t));
}
// a cell's own height at a point (clamped into that cell)
export function cellFloorAt(gx, gy, x, z) { return floorAt(Math.min((gx + 1) * C - 1e-4, Math.max(gx * C + 1e-4, x)), Math.min((gy + 1) * C - 1e-4, Math.max(gy * C + 1e-4, z))); }
export function ceilOf(gx, gy) { if (!LEVELS || gx < 0 || gy < 0 || gx >= W || gy >= D) return H; return LEVELS.ceil[gy * W + gx]; }
// how far things fixed to a cell's ceiling (lamps) or floor (props, doors) are raised
export function liftOf(gx, gy) { return ceilOf(gx, gy) - H; }
export function baseOf(gx, gy) { if (!LEVELS || gx < 0 || gy < 0 || gx >= W || gy >= D) return 0; return LEVELS.base[gy * W + gx]; }
export const liftAt = (x, z) => { if (!LEVELS) return 0; const [gx, gy] = _cell(x, z); return baseOf(gx, gy); };

// zone codes. 0 is solid wall.
export const Z = { SOLID: 0, HALL: 1, CELL: 2, CAFE: 3, SHOWER: 4, MORGUE: 5, ADMIN: 6, LOBBY: 7, GEN: 8, DAY: 9, STORE: 10, SEC: 11, DOOR: 12, OUT: 13, CHAPEL: 14, PADDED: 15, SURGERY: 16, DORM: 17, NURSE: 18, STAIR: 19, LAB: 20 };
export const ZNAME = ['', 'Corridor', 'Patient Cell', 'Cafeteria', 'Showers', 'Morgue', 'Administration', 'Lobby', 'Generator Room', 'Day Room', 'Storage', 'Security', 'Door', 'Courtyard', 'Chapel', 'Padded Cell', 'Surgical Theater', 'Dormitory', 'Nurses\' Station', 'Stairwell', 'Laboratory'];

export const cx = (x) => (x + 0.5) * C;
export const cz = (y) => (y + 0.5) * C;
import { makePlan2 } from './plan2.js?v=38';
import { makePlan3 } from './plan3.js?v=38';
import { makePlan4 } from './plan4.js?v=38';
import { makePlan5 } from './plan5.js?v=38';

export function makePlan(tape = 1) {
  if (tape === 2) return makePlan2();
  if (tape === 3) return makePlan3(makePlan1());
  if (tape === 4) return makePlan4();
  if (tape === 5) return makePlan5();
  return makePlan1();
}
function makePlan1() {
  const g = new Uint8Array(W * D);
  const win = new Uint8Array(W * D);          // window in this wall cell
  const rect = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = z; };
  const doors = [];
  const door = (x, y, o = {}) => { g[y * W + x] = Z.DOOR; doors.push({ x, y, ...o }); };

  // corridors
  rect(1, 18, 47, 19, Z.HALL);                 // the spine, west to east
  rect(1, 2, 2, 31, Z.HALL);                   // west service corridor
  rect(24, 2, 25, 17, Z.HALL);                 // north corridor
  rect(26, 4, 47, 5, Z.HALL);                  // north-east corridor
  rect(24, 20, 27, 27, Z.HALL);                // hall down to the lobby
  // rooms
  rect(4, 2, 22, 10, Z.CAFE);                  // cafeteria
  for (const x of [4, 8, 12, 16, 20]) {        // patient cells, north and south of the spine
    rect(x, 13, x + 2, 16, Z.CELL); door(x + 1, 17, { cell: true });
    rect(x, 21, x + 2, 24, Z.CELL); door(x + 1, 20, { cell: true });
  }
  rect(28, 8, 36, 16, Z.DAY);                  // day room
  rect(38, 8, 46, 16, Z.SHOWER);               // showers
  rect(29, 21, 37, 26, Z.MORGUE);              // morgue
  rect(39, 21, 46, 27, Z.GEN);                 // generator room
  rect(20, 28, 31, 36, Z.LOBBY);               // lobby
  rect(14, 29, 18, 34, Z.SEC);                 // security office
  rect(4, 27, 12, 34, Z.STORE);                // storage
  rect(33, 29, 38, 34, Z.ADMIN);               // administration (you climb in here)
  rect(1, 38, 47, 40, Z.OUT);                  // courtyard beyond the gate
  rect(25, 37, 26, 37, Z.LOBBY);               // the gate opening

  // doors between rooms (cell on the wall line between two floors)
  door(23, 6); door(23, 7);                    // cafeteria double doors to the north corridor
  door(3, 6);                                  // cafeteria to the west corridor
  door(32, 17); door(32, 7);                   // day room, south and north
  door(42, 17); door(42, 7);                   // showers
  door(33, 20);                                // morgue
  door(42, 20, { heavy: true });               // generator room
  door(28, 23);                                // morgue side door into the lobby hall
  door(19, 31);                                // security office to the lobby
  door(13, 31);                                // security office to storage
  door(3, 31);                                 // storage to the west corridor
  door(32, 31);                                // administration to the lobby

  // windows (moonlight comes through these)
  for (const x of [6, 10, 14, 18]) win[1 * W + x] = 1;   // cafeteria north wall
  win[31 * W + 39] = 1; win[33 * W + 39] = 1;               // admin east wall (one is broken, you came in that way)
  for (const x of [21, 30]) win[37 * W + x] = 1;            // lobby south wall
  win[12 * W + 47] = 1;                                     // showers east

  const gate = { cells: [[25, 37], [26, 37]], open: false };

  // light fixtures: ch 'S' always (emergency / moon / candles), 'A' 'B' broken flicker,
  // 'P' only once the generator runs.
  const lamps = [];
  const L = (x, y, ch, o = {}) => lamps.push({ x, y, ch, ...o });
  // the emergency circuit: dim red cages, very few
  L(25, 18.5, 'S', { col: 0xff2a10, i: 0.7, r: 7, kind: 'cage' });
  L(9, 18.5, 'S', { col: 0xff2a10, i: 0.55, r: 6, kind: 'cage' });
  L(40, 18.5, 'S', { col: 0xff2a10, i: 0.55, r: 6, kind: 'cage' });
  L(25.5, 33, 'S', { col: 0xff3a18, i: 0.8, r: 9, kind: 'cage' });
  L(16, 31, 'S', { col: 0x8fff9a, i: 0.25, r: 4, kind: 'monitor' });   // security monitors glow
  L(36, 31.5, 'S', { col: 0xffb060, i: 0.55, r: 5, kind: 'lamp' });    // desk lamp on a battery
  // moonlight in through the windows
  for (const x of [6, 10, 14, 18]) L(x, 2.2, 'S', { col: 0x7088c0, i: 0.6, r: 7, kind: 'none', dir: [0, -0.5, 1] });
  L(38.2, 31, 'S', { col: 0x7088c0, i: 0.55, r: 6, kind: 'none', dir: [-1, -0.5, 0] });
  L(38.2, 33, 'S', { col: 0x7088c0, i: 0.45, r: 6, kind: 'none', dir: [-1, -0.5, 0] });
  L(21, 36.2, 'S', { col: 0x7088c0, i: 0.4, r: 6, kind: 'none', dir: [0, -0.5, -1] });
  L(30, 36.2, 'S', { col: 0x7088c0, i: 0.4, r: 6, kind: 'none', dir: [0, -0.5, -1] });
  L(46.2, 12, 'S', { col: 0x7088c0, i: 0.35, r: 6, kind: 'none', dir: [-1, -0.5, 0] });
  // candles the patients keep
  L(5, 15.5, 'S', { col: 0xff9a40, i: 0.45, r: 3.5, kind: 'candle', h: 0.25 });
  L(21, 22, 'S', { col: 0xff9a40, i: 0.45, r: 3.5, kind: 'candle', h: 0.25 });
  L(30, 25.4, 'S', { col: 0xff9a40, i: 0.5, r: 4, kind: 'candle', h: 0.9 });
  // broken fluorescents that stutter
  L(13, 18.5, 'A', { col: 0xcfe8ff, i: 1.0, r: 8, kind: 'tube' });
  L(24.5, 10, 'B', { col: 0xcfe8ff, i: 1.0, r: 8, kind: 'tube' });
  L(13, 6, 'A', { col: 0xcfe8ff, i: 1.1, r: 9, kind: 'tube' });
  L(32, 12, 'B', { col: 0xcfe8ff, i: 1.0, r: 8, kind: 'tube' });
  L(33, 23.5, 'A', { col: 0xcfe8ff, i: 0.9, r: 7, kind: 'tube' });
  L(42.5, 24, 'B', { col: 0xcfe8ff, i: 0.8, r: 6, kind: 'tube' });
  // the main circuit (dead until the generator runs)
  for (const x of [4, 18, 31, 36, 44]) L(x, 18.5, 'P', { col: 0xe6f0ff, i: 1.0, r: 9, kind: 'tube' });
  for (const y of [5, 26]) L(1.5, y, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  for (const y of [4]) L(24.5, y, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  for (const x of [31, 39, 46]) L(x, 4.5, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  L(25.5, 23.5, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  for (const [x, y] of [[8, 6], [18, 6]]) L(x, y, 'P', { col: 0xe6f0ff, i: 1.0, r: 9, kind: 'tube' });
  for (const [x, y] of [[42, 10], [42, 14.5]]) L(x, y, 'P', { col: 0xe6f0ff, i: 0.9, r: 7, kind: 'tube' });
  L(33, 25, 'P', { col: 0xe6f0ff, i: 0.9, r: 7, kind: 'tube' });
  L(42.5, 22, 'P', { col: 0xe6f0ff, i: 1.0, r: 7, kind: 'tube' });
  for (const [x, y] of [[23, 30], [28, 30], [23, 35], [28, 35]]) L(x, y, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  L(8, 30.5, 'P', { col: 0xe6f0ff, i: 0.9, r: 8, kind: 'tube' });
  L(16, 32.5, 'P', { col: 0xe6f0ff, i: 0.9, r: 6, kind: 'tube' });
  for (const x of [5, 13, 21]) { L(x, 14.5, 'P', { col: 0xe6f0ff, i: 0.6, r: 5, kind: 'bulb' }); L(x, 22.5, 'P', { col: 0xe6f0ff, i: 0.6, r: 5, kind: 'bulb' }); }

  // props: k = kind, x/y cell (fractional ok), r = rotation (quarter turns), plus extras
  const props = [];
  const P = (k, x, y, r = 0, o = {}) => props.push({ k, x, y, r, ...o });
  // cafeteria: long tables, tipped chairs, the serving counter
  for (const y of [4, 7.5]) for (const x of [7, 12, 17]) P('table', x, y, 0);
  P('table', 9, 9.4, 1, { tipped: true });
  P('counter', 13, 2.3, 0);
  for (const [x, y, r] of [[6, 5.2, 0], [8, 3, 2], [11, 6, 1], [15, 8.6, 3], [19, 5, 1], [20, 9, 0], [10, 8.7, 2]]) P('chair', x, y, r, { tipped: (x * y) % 3 === 0 });
  // patient cells: bed + bucket each, some lockers
  for (const x of [4, 8, 12, 16, 20]) {
    P('bed', x + 0.5, 15.2, 1); P('bed', x + 0.5, 22.8, 1);
    P('bucket', x + 2.2, 13.4, 0); P('bucket', x + 2.2, 24.6, 0);
  }
  // lockers to hide in
  for (const [x, y, r] of [[1, 9, 1], [1, 23, 1], [10.3, 17.6, 0], [30.3, 19.4, 2], [35, 17.6, 0], [46.6, 18.5, 3], [24, 13, 1], [27.4, 26, 3],
    [28.3, 13, 1], [38.3, 15.6, 1], [44, 26.6, 2], [26.6, 4.4, 0], [14.6, 33.6, 2], [4.3, 33, 1], [36.6, 21.4, 0], [20.5, 33, 1]]) P('locker', x, y, r);
  // day room: sofas, tv, wheelchairs, a piano
  P('sofa', 30, 11, 1); P('sofa', 34, 14.6, 2); P('tv', 34, 8.4, 0); P('wheelchair', 31, 15, 1); P('wheelchair', 35.5, 10, 3);
  P('table', 31.5, 13.3, 0, { small: true }); P('piano', 28.6, 15, 1);
  // showers: stalls, drains, tiles; the bath full of something
  for (const y of [9, 11, 13]) P('stall', 45.6, y, 3);
  P('tub', 40, 14.5, 0); P('tub', 40, 10, 0);
  // morgue: drawer wall, slabs, gurneys, a body under a sheet
  P('drawers', 33, 21.1, 0); P('slab', 31, 24, 0); P('slab', 35, 24, 0); P('gurney', 29.6, 22, 1); P('sinkrow', 37.6, 25, 3);
  // generator room
  P('generator', 43, 24, 0); P('pipes', 46.5, 23, 3); P('crate', 40, 26.6, 0); P('crate', 39.6, 21.5, 0); P('shelf', 46.6, 26, 3);
  // storage
  for (const y of [28.5, 30.5]) for (const x of [6, 9]) P('shelf', x, y, 0);
  P('crate', 11.6, 33.5, 0); P('crate', 10.4, 33.6, 0); P('crate', 4.6, 28, 0); P('gurney', 7, 33.2, 0);
  // security office: desk + monitors + gate panel, filing
  P('secdesk', 16, 29.4, 0); P('filing', 18.6, 34.4, 2); P('filing', 17.6, 34.4, 2);
  // lobby: reception desk, benches, the chained gate
  P('reception', 25.5, 30.2, 0); P('bench', 21, 34, 1); P('bench', 30.6, 34, 3); P('plant', 20.6, 28.6, 0); P('plant', 30.4, 28.6, 0);
  // administration
  P('desk', 35.5, 31, 0); P('filing', 33.4, 29.4, 0); P('filing', 34.4, 29.4, 0); P('chair', 35.5, 32, 2, { tipped: true }); P('shelf', 37.6, 34.5, 3);
  // corridors: wheelchairs, gurneys, overturned trolleys
  P('gurney', 6, 18.7, 0, { tipped: true }); P('wheelchair', 21.6, 19.2, 0); P('trolley', 38, 19.3, 1); P('gurney', 24.7, 15.5, 1); P('wheelchair', 1.5, 13, 2);
  P('trolley', 44, 4.7, 0, { tipped: true });

  // the dead and the leavings
  const gore = [];
  const G = (k, x, y, o = {}) => gore.push({ k, x, y, ...o });
  G('corpse', 31, 24, { on: 'slab', sheet: true }); G('corpse', 35, 24, { on: 'slab', open: true });
  G('corpse', 2, 20.5, { slump: true }); G('corpse', 14, 9.3, { open: true }); G('hanged', 42, 12); G('corpse', 40, 14.5, { tub: true });
  G('corpse', 22, 23, { slump: true }); G('hanged', 25, 9); G('corpse', 45, 26, { open: true }); G('corpse', 7.5, 31.5, { slump: true });
  G('pile', 30.5, 25); G('pile', 13.3, 2.8);
  for (const [x, y] of [[25, 18.6], [5, 18], [14, 8], [31, 24.5], [35.3, 24.5], [41, 12], [42.5, 19.8], [33, 18.8], [22, 23.5], [44, 26], [25.6, 25], [2, 20], [30, 33]]) G('pool', x, y, { s: 0.6 + ((x * 7 + y * 3) % 5) * 0.2 });
  for (const [x, y, w] of [[12, 17.4, 's'], [19.6, 18, 'e'], [28.6, 9, 'w'], [37.6, 13, 'e'], [23.6, 26, 'e'], [3.4, 12, 'w'], [36.6, 25, 'e'], [47.4, 19, 'e']]) G('smear', x, y, { wall: w });
  for (const [x, y, w, t] of [[24, 16.6, 'w', 'HE SEES YOU IN THE DARK'], [27.6, 18, 'n', 'NO GOD HERE'], [12, 12.4, 'n', 'LET US OUT'], [46.6, 9, 'e', 'THE DOCTOR HUMS WHEN HE WORKS'],
    [20.4, 31, 'w', 'TURN BACK'], [42, 20.4, 's', 'POWER = NOISE'], [3.4, 26, 'w', 'DR. VOSS LIES'], [37.6, 31, 'e', 'WELCOME HOME']]) G('scrawl', x, y, { wall: w, t });

  // pickups
  const items = [
    { k: 'fuse', x: 9, y: 9.3, id: 'fuse1' },                 // cafeteria, under the tipped table
    { k: 'fuse', x: 44.3, y: 13.4, id: 'fuse2' },             // showers, back stall
    { k: 'fuse', x: 10, y: 16.2, id: 'fuse3' },               // a patient cell
    { k: 'battery', x: 35.8, y: 30.6, id: 'b1' }, { k: 'battery', x: 6, y: 28.5, id: 'b2' }, { k: 'battery', x: 17, y: 29.4, id: 'b3' },
    { k: 'battery', x: 31.5, y: 13.3, id: 'b4' }, { k: 'battery', x: 39.6, y: 21.5, id: 'b5' }, { k: 'battery', x: 13.5, y: 2.6, id: 'b6' },
    { k: 'battery', x: 22, y: 15.6, id: 'b7' }, { k: 'battery', x: 33, y: 22, id: 'b8' },
    { k: 'note', x: 35.2, y: 30.8, id: 'n_tip' }, { k: 'note', x: 16.3, y: 29.3, id: 'n_guard' }, { k: 'note', x: 26, y: 30.3, id: 'n_intake' },
    { k: 'note', x: 17, y: 4, id: 'n_cook' }, { k: 'note', x: 35, y: 24, id: 'n_autopsy' }, { k: 'note', x: 30, y: 11.6, id: 'n_dayroom' },
    { k: 'note', x: 6, y: 22.5, id: 'n_patient' }, { k: 'note', x: 43.5, y: 25.6, id: 'n_gen' }, { k: 'note', x: 41, y: 9.4, id: 'n_shower' },
  ];
  const generator = { x: 43, y: 24 };
  const panel = { x: 16, y: 29.4 };     // gate controls in the security office
  const start = { x: 36.2, y: 32.6, yaw: Math.PI * 0.5 };   // facing west into the office

  // creature spawns and patrol routes
  const brute = { x: 13, y: 6, route: [[13, 6], [23.5, 6.5], [24.5, 18.5], [8, 18.5], [1.5, 18.5], [1.5, 6], [13, 6], [24.5, 4.5], [45, 4.5], [42, 12], [42, 18.5], [24.5, 18.5], [25.5, 25]] };
  // Dr. Voss wakes when the first fuse is taken and walks the east wing, humming
  const surgeon = { x: 33, y: 23.5, route: [[33, 23.5], [33, 19], [42, 18.5], [42, 12], [42, 4.5], [32, 4.5], [32, 12], [32, 18.5], [24.5, 18.5], [13, 18.5], [9, 15], [5, 18.5], [1.5, 18.5], [1.5, 25], [1.5, 18.5], [13, 18.5], [17, 22], [24.5, 18.5], [24.5, 6], [24.5, 18.5], [28.5, 23], [33, 23.5]] };
  const inmates = [
    { x: 9, y: 22.6, kind: 'rocker' }, { x: 17, y: 14.3, kind: 'rocker', facing: Math.PI }, { x: 33.5, y: 12.5, kind: 'rocker', facing: 0 },
    { x: 30.6, y: 25.0, kind: 'eater', facing: Math.PI / 2, look: { face: 'smile', blood: 1, stare: true, h: 1.82 }, huntRoute: [[33, 19], [42, 18.5], [42, 23], [42, 18.5], [25.5, 18.5], [25.5, 25], [25.5, 32], [16, 31.5], [25.5, 32], [25.5, 18.5], [12, 18.5], [33, 19]] }, { x: 5.5, y: 32.5, kind: 'rocker', facing: 2 },
    // a patient who walks the west cells and the cafeteria in a loop
    { x: 2, y: 25, kind: 'stalker', route: [[1.5, 25], [1.5, 12], [1.5, 6], [8, 6], [1.5, 6], [1.5, 18.5], [12, 18.5], [1.5, 18.5]] },
  ];

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= D) ? 0 : g[y * W + x];
  return { tape: 1, g, win, at, doors, gate, lamps, props, gore, items, generator, panel, start, brute, surgeon, inmates };
}

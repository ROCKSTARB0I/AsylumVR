// Tape 3: The Fall. The same ground floor as Tape 1, four years earlier: 14 October 1989, the night
// it all came apart. Clean, lit, staffed. The mains are channel 'P' (white, on until the alarm); the
// alarm beacons are channel 'S' (red, dark until the alarm, then pulsing). Cells start locked.

export function makePlan3(base) {
  const p = base;
  p.tape = 3;
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
  p.lamps = lamps;

  // what's lying about: Voss's tray on the kitchen counter, three documents
  p.items = [
    { k: 'tray', x: 13.2, y: 2.4, id: 'tray' },
    { k: 'note', x: 14.3, y: 2.4, id: 'n3_tray' },
    { k: 'note', x: 16.6, y: 29.3, id: 'n3_rota' },
    { k: 'note', x: 35.2, y: 30.8, id: 'n3_memo' },
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
  p.segment = (G) => (G.alarm ? 0 : 99);
  // patients in their cells (they stay put when the doors open; not everyone runs)
  p.inmates = [{ x: 9, y: 23, kind: 'rocker', facing: Math.PI }, { x: 5, y: 14.4, kind: 'rocker', facing: 0 }, { x: 21, y: 23, kind: 'rocker', facing: Math.PI }, { x: 17, y: 14.4, kind: 'rocker', facing: 0 }];
  p.brute = { ...base.brute, x: 13, y: 14.6 };
  return p;
}

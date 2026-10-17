// Story: the documents you find, what you mutter to the camera, and the
// chain of objectives for Tape 1 (the ground floor).
export const NOTES = {
  n_tip: { t: 'Printed email, folded in quarters', b: `To: E. Ward\n\nYou wrote about the Hollis Home closure in '97, so you know how the state buries things. Mount Harrow was "decommissioned" in 1989. It wasn't. Patients who were declared dead are still on the meal rosters. Dr. Adler Voss signs everything.\n\nThe night staff are gone. I don't know where. Come after dark, come alone, and bring a camera, because nobody will believe you without one.\n\nThe east window in Administration doesn't latch.\n\n— a friend` },
  n_guard: { t: 'Security log, last page', b: `23:10  Mains failed. Generator room says breakers are fine. Somebody pulled the fuses. All three.\n23:25  Locked the front gate from the panel before the board died. Gate stays shut till the panel gets power. Good. Nothing gets out.\n23:40  Kroft is out of his cell. I heard him in the cafeteria. He's singing.\n23:52  Whoever finds this: the generator takes three cartridge fuses. Put them back and the panel will come up. Then RUN. The noise brings them.` },
  n_intake: { t: 'Intake form, stamped DECEASED', b: `Patient: Rourke, Daniel. Age 34.\nAdmitted: 03/11/1987. Diagnosis: (blacked out)\nTreatment: Morphogenic protocol, Dr. Voss.\nStatus: DECEASED 02/02/1988\n\nHandwritten under the stamp: "fed him on the 14th. he asked for his mother. he is not dead."` },
  n_cook: { t: 'Kitchen order, greasy', b: `Ward B: 40 portions. Ward C: 40 portions. Isolation: see Dr. Voss.\n\nWe have not had 40 patients in Ward C in years. I asked where the trays go. Orderly said "downstairs". There is no downstairs on the plans.\n\nKroft took the cleaver again. Nobody is going to take it off him.` },
  n_autopsy: { t: 'Autopsy notes', b: `Subject 22. Cause of death recorded as cardiac.\nObserved: sutures at the scalp line, healed over months. Subject was operated on repeatedly while alive. Tissue at the frontal lobe absent. Stomach contents: paper. Subject had eaten his own file.\n\nI am not signing this.` },
  n_dayroom: { t: 'Patient drawing, crayon on a menu', b: `A tall man with no face, drawn over and over. Under it, in neat adult handwriting:\n\n"The Doctor walks at night. He hums. If you hear him humming, get in a locker and don't breathe. He opens one or two to check. Never all of them."` },
  n_patient: { t: 'Scratched into a cell wall, copied on paper', b: `DAY 400 SOMETHING\nthey say I died.\nthere's a man in the next cell who eats his fingers when he's hungry.\nKROFT DOESN'T SEE WELL IN THE DARK. HE LISTENS.\nwalk slow. walk slow. walk slow.` },
  n_gen: { t: 'Maintenance tag on the generator', b: `DIESEL STANDBY — 3 x 60A CARTRIDGE FUSES REQUIRED (SLOTS 1-3)\n\nSomebody has written underneath in marker: "I hid them where the doctor won't go. Showers. Cafeteria. Cell 3." ` },
  n_shower: { t: 'Wet note, ink running', b: `They hose them down in here twice a week. The drains back up. Whatever's in the tub has been in there since summer.\n\nOne of the patients hides things in the last stall. I let him. Everyone needs something.` },
};

export const MUTTER = {
  start: "Okay. Okay... I'm in. Tape's rolling.",
  dark: "Can't see a thing. Night vision... it's going to eat the battery.",
  gateChained: "The gate's locked from inside. There has to be a control room.",
  firstBody: "Oh God. Oh God, that's... that's a person.",
  security: "Security office. The gate panel's dead. No power.",
  fuse1: "A fuse. That's one.",
  fuse2: "Two. One more.",
  fuse3: "That's all three. The generator room.",
  power: "Lights. Thank God... no. No, they'll have heard that.",
  gate: "Come on, come on, open!",
  brute: "Who the hell is that...",
  hide: "Don't breathe. Don't breathe.",
  battery: "Battery. Good.",
  lowBattery: "Battery's nearly dead.",
  doctor: "He's humming. Jesus Christ, he's humming.",
};

// objective chain: each step has a text and a test against game state
export const OBJECTIVES = [
  { id: 'admin', text: 'Find a way out of Administration', done: (s) => s.leftAdmin },
  { id: 'gate', text: 'The front gate is chained. Find the gate controls', done: (s) => s.sawPanel },
  { id: 'fuses', text: (s) => `Restore power: find the generator fuses (${s.fuses}/3)`, done: (s) => s.fuses >= 3 },
  { id: 'gen', text: 'Put the fuses in the generator (east wing)', done: (s) => s.power },
  { id: 'panel', text: 'Get to Security and open the gate', done: (s) => s.gateOpen },
  { id: 'out', text: 'GET OUT through the front gate', done: (s) => s.escaped },
];

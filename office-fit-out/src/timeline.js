// Fitted: the single timeline (seconds). Picture, voice, score, subtitles and checks all read this file.
// 96 BPM, 4/4: one beat = 0.625 s, one bar = 2.5 s. Landings sit on beats.
export const BPM = 96;
export const BEAT = 60 / BPM, BAR = 4 * BEAT;
export const b = (bar, beat = 0) => +(bar * BAR + beat * BEAT).toFixed(4);   // bar 0 beat 0 = 0.0 s

export const T = {
  sil1: 4.4, stackIn: b(2),                 // 5.0: the stack slides down into frame (first hit after the near-silence)
  carpet: b(2, 1.5),                        // 5.94: carpet tiles land in a wave
  labelsIn: b(3, 0), labelsOut: b(4, 3.5),  // 7.5 … 12.19
  desk: b(5),                               // 12.5: desks land
  rise: b(5, 3), riseEnd: b(6, 3),          // 14.375 → 16.875: the hero desk rises
  chair: b(8),                              // 20.0: chairs land
  acc: b(11),                               // 27.5: screens, plants, booth, lounge
  lights: b(12, 1),                         // 30.625: lights on inside
  sil2: b(13),                              // 32.5: near-silence
  people: b(13, 2),                         // 33.75: people take their seats (the biggest hit)
  ceil: b(14, 2),                           // 36.25: the ceiling layer lands
  dims: b(16),                              // 40.0: dimensions drawn on the closed office
  title: b(16, 2),                          // 41.25: title
  end: b(18),                               // 45.0
};
export const DUR = T.end;

// layers, bottom to top. land = the time it touches down; the stack holds the not-yet-landed layers apart, GAP metres each
export const LAYERS = ['carpet', 'desk', 'chair', 'acc', 'people', 'ceil'];
export const LAND = { carpet: T.carpet + 1.4, desk: T.desk, chair: T.chair, acc: T.acc, people: T.people, ceil: T.ceil };
export const DROP = 1.0;        // seconds a landing layer takes to come down
export const GAP = 2.7;         // metres between held layers
export const WAVE = { carpet: 1.4, acc: .55 };   // wave spread for repeated parts (seconds)

// narration (Kokoro, English). `say` is spoken, `en` is shown
export const VO = [
  { id: 'v1', t: 0.6, say: 'An empty floor. Concrete, columns, glass.', en: 'An empty floor. Concrete, columns, glass.' },
  { id: 'v2', t: 5.55, say: 'The fit-out arrives in layers, held apart on one axis.', en: 'The fit-out arrives in layers, held apart on one axis.' },
  { id: 'v3', t: 13.0, say: 'Desks that travel from seated to standing height.', en: 'Desks that travel from seated to standing height.' },
  { id: 'v4', t: 20.6, say: 'Chairs built to fit nearly everyone.', en: 'Chairs built to fit nearly everyone.' },
  { id: 'v5', t: 27.9, say: 'Screens, light, a quiet booth, something green.', en: 'Screens, light, a quiet booth, something green.' },
  { id: 'v6', t: 34.2, say: 'Then, the people.', en: 'Then, the people.' },
  { id: 'v7', t: 37.3, say: "A model, built to the guideline's own ranges.", en: "A model, built to the guideline's own ranges." },
];

// labels: [t0, t1]
export const LBL = {
  layers: { t0: T.labelsIn, step: .18, t1: T.labelsOut },
  desk: [b(5, 2), b(7, 2)],          // 13.75 … 18.75
  deskDim: [b(5, 3.2), b(7, 2)],
  chair: [b(8, 2.5), b(10, 3)],      // 21.56 … 26.875
  chairDim: [b(8, 3.5), b(10, 3)],
  dimSeat: [T.dims + .3, T.end - .1], dimKnee: [T.dims, T.end - .1],
};

// camera: orbit keys [t, az°, el°, dist m, target [x, y, z], fov, shiftX px]
export const CAM = [
  [0.0, 22, 27, 25, [0, 0.9, 0], 30, 0],
  [4.4, 34, 25, 23.5, [0, 1.0, 0], 30, 0],
  [5.0, 35, 24, 25, [0, 2.0, 0], 30, 40],
  [7.5, 26, 16, 43, [0, 7.6, 0], 30, 300],
  [12.0, 14, 13, 45, [0, 8.0, 0], 30, 300],
  [13.6, 30, 16, 6.4, [-1.6, 0.8, 0.5], 32, 0],
  [17.6, 42, 13, 5.8, [-1.6, 0.92, 0.5], 32, 0],
  [19.4, 102, 10, 2.7, [0, 0.55, 1.25], 34, 0],
  [26.0, 78, 13, 2.5, [0, 0.55, 1.25], 34, 0],
  [27.6, 48, 22, 22, [0.4, 3.4, 0], 30, 0],
  [32.4, 40, 20, 23.5, [0.2, 3.9, 0], 30, 0],
  [33.75, 38, 21, 22, [0.2, 3.4, 0], 30, 0],
  [36.25, 34, 24, 18, [0, 1.6, 0], 30, 0],
  [38.6, 26, 33, 23, [0, 0.8, 0], 30, 0],
  [40.0, 30, 30, 15.5, [-1.3, 0.7, 0.5], 30, 0],
  [45.0, 44, 27, 15, [-1.0, 0.7, 0.5], 30, -380],
];

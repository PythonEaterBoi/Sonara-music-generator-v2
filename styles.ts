/* ------------------------------------------------------------------
   SONARA · styles — genre presets, moods, prompt analysis, titling
-------------------------------------------------------------------*/

import {
  Analysis,
  MoodId,
  Rng,
  ScaleName,
  StyleId,
  Tag,
  chance,
  int,
  pick,
} from "./core";

export type BassMode = "pump8" | "off" | "drive16" | "sustain" | "octave8" | "glide808" | "walk" | "none";
export type LeadTimbre = "pluck" | "stab" | "seq" | "bell" | "flute";

export interface StylePreset {
  label: string;
  bpm: [number, number];
  swing: number;
  scales: ScaleName[];
  progs: number[][];
  sev: number; // probability of 7th chords
  add9: number;
  drums: boolean;
  kick: string[];
  snare: string[];
  hat: string[];
  ohat: string[];
  clap: string[];
  perc: string[];
  fills: Partial<Record<"k" | "s" | "h" | "t", string>>;
  bassMode: BassMode;
  arpOn: boolean;
  arpRate: number; // steps between arp notes (1 = 16ths, 2 = 8ths)
  arpProb: number;
  leadOct: number;
  leadDensity: number; // 0..1 base
  leadTimbre: LeadTimbre;
  rev: number; // reverb wet 0..1
  dly: number; // delay wet 0..1
  bright: number; // filter brightness 0..1
  duck: number; // sidechain depth 0..1
  drive: number; // saturation
  padGain: number;
  crackle?: boolean;
}

export const STYLES: Record<StyleId, StylePreset> = {
  lofi: {
    label: "LO-FI",
    bpm: [70, 86],
    swing: 0.36,
    scales: ["dorian", "minor", "majPent"],
    progs: [
      [0, 3, 4, 3],
      [0, 5, 3, 4],
      [1, 4, 0, 5],
      [0, 2, 3, 4],
    ],
    sev: 0.85,
    add9: 0.5,
    drums: true,
    kick: ["x.........", "x.........x...", "x..........x.."],
    snare: ["....x.......", "....x.......o"],
    hat: ["x.x.x.xox.xxx.x.", "xoxox.x.x.xxxox."],
    ohat: ["................"],
    clap: ["................"],
    perc: ["............x...", "......x........."],
    fills: { h: "x.xxx.x.xxxxxxxx" },
    bassMode: "walk",
    arpOn: false,
    arpRate: 2,
    arpProb: 0.3,
    leadOct: 1,
    leadDensity: 0.42,
    leadTimbre: "pluck",
    rev: 0.42,
    dly: 0.55,
    bright: 0.34,
    duck: 0.25,
    drive: 0.35,
    padGain: 0.9,
    crackle: true,
  },
  synthwave: {
    label: "SYNTHWAVE",
    bpm: [96, 112],
    swing: 0.06,
    scales: ["minor", "dorian"],
    progs: [
      [0, 5, 3, 6],
      [0, 3, 5, 4],
      [0, 6, 5, 6],
    ],
    sev: 0.5,
    add9: 0.35,
    drums: true,
    kick: ["x...x...x...x..."],
    snare: ["....x......."],
    hat: ["x.x.x.x.x.x.x.x.", "x.xxx.x.x.xxx.x."],
    ohat: ["......x........."],
    clap: ["................"],
    perc: ["................"],
    fills: { t: "t...t...t.t.tttt", h: "x.x.x.x.xxxxxxxx" },
    bassMode: "octave8",
    arpOn: true,
    arpRate: 1,
    arpProb: 0.82,
    leadOct: 1,
    leadDensity: 0.5,
    leadTimbre: "pluck",
    rev: 0.5,
    dly: 0.5,
    bright: 0.62,
    duck: 0.65,
    drive: 0.3,
    padGain: 0.85,
  },
  techno: {
    label: "TECHNO",
    bpm: [128, 138],
    swing: 0,
    scales: ["minor", "phrygian"],
    progs: [
      [0, 0, 5, 3],
      [0, 0, 0, 5],
      [0, 5, 0, 6],
    ],
    sev: 0.1,
    add9: 0,
    drums: true,
    kick: ["x...x...x...x..."],
    snare: ["................"],
    hat: ["xoxxxoxxxoxxxoxx", "xxxxxxxxoxxxxxxx"],
    ohat: ["..o...o...o...o."],
    clap: ["....x......."],
    perc: ["......o......o.."],
    fills: { h: "xxxxxxxxxxxxxxxx", s: "....o.o.....o.oo" },
    bassMode: "drive16",
    arpOn: false,
    arpRate: 1,
    arpProb: 0.5,
    leadOct: 1,
    leadDensity: 0.55,
    leadTimbre: "seq",
    rev: 0.35,
    dly: 0.4,
    bright: 0.55,
    duck: 0.7,
    drive: 0.55,
    padGain: 0.55,
  },
  house: {
    label: "HOUSE",
    bpm: [120, 126],
    swing: 0.14,
    scales: ["minor", "dorian", "majPent"],
    progs: [
      [0, 3, 4, 3],
      [0, 5, 3, 4],
      [1, 3, 0, 4],
    ],
    sev: 0.65,
    add9: 0.4,
    drums: true,
    kick: ["x...x...x...x..."],
    snare: ["................"],
    hat: ["..x...x...x...x.", "x.xx.xxxx.xx.xxx"],
    ohat: ["..o...o...o...o."],
    clap: ["....x......."],
    perc: ["x..x..x..x..x..x"],
    fills: { s: "....o..o....o.oo" },
    bassMode: "off",
    arpOn: true,
    arpRate: 2,
    arpProb: 0.4,
    leadOct: 1,
    leadDensity: 0.5,
    leadTimbre: "stab",
    rev: 0.34,
    dly: 0.42,
    bright: 0.6,
    duck: 0.72,
    drive: 0.3,
    padGain: 0.8,
  },
  trap: {
    label: "TRAP",
    bpm: [132, 150],
    swing: 0.08,
    scales: ["minor", "phrygian", "harmMinor"],
    progs: [
      [0, 0, 5, 3],
      [0, 3, 0, 4],
      [0, 5, 6, 5],
    ],
    sev: 0.4,
    add9: 0.25,
    drums: true,
    kick: ["x......x..x.....", "x.........x.....", "x....x....x....."],
    snare: ["........x......."],
    hat: ["x.xxx.x.xxx.x.xx", "xxxx.xxxxxxx.xxx", "x.x.x.x.x.x.xxxx"],
    ohat: ["................"],
    clap: ["........x......."],
    perc: ["................"],
    fills: { h: "xxxxxxxxxxxxxxxx", s: "........o...o.oo" },
    bassMode: "glide808",
    arpOn: true,
    arpRate: 2,
    arpProb: 0.45,
    leadOct: 2,
    leadDensity: 0.4,
    leadTimbre: "bell",
    rev: 0.4,
    dly: 0.45,
    bright: 0.5,
    duck: 0.5,
    drive: 0.6,
    padGain: 0.7,
  },
  ambient: {
    label: "AMBIENT",
    bpm: [60, 78],
    swing: 0,
    scales: ["majPent", "lydian", "minor"],
    progs: [
      [0, 5, 3, 4],
      [0, 3, 5, 4],
      [0, 2, 5, 3],
    ],
    sev: 0.6,
    add9: 0.7,
    drums: false,
    kick: [],
    snare: [],
    hat: [],
    ohat: [],
    clap: [],
    perc: [],
    fills: {},
    bassMode: "sustain",
    arpOn: true,
    arpRate: 2,
    arpProb: 0.4,
    leadOct: 2,
    leadDensity: 0.3,
    leadTimbre: "bell",
    rev: 0.85,
    dly: 0.6,
    bright: 0.48,
    duck: 0,
    drive: 0.12,
    padGain: 1.0,
  },
  cinematic: {
    label: "CINEMATIC",
    bpm: [84, 100],
    swing: 0,
    scales: ["minor", "harmMinor", "dorian"],
    progs: [
      [0, 5, 3, 4],
      [0, 3, 1, 4],
      [0, 6, 5, 4],
    ],
    sev: 0.35,
    add9: 0.2,
    drums: true,
    kick: ["x...........x...", "x.......x......."],
    snare: ["................", "....x..........."],
    hat: ["................"],
    ohat: ["................"],
    clap: ["................"],
    perc: ["x.x.x.x.x.x.x.x."], // ostinato pulse
    fills: { t: "t.t.t.t.tttttttt", s: "o.oo.o.ooooooooo" },
    bassMode: "sustain",
    arpOn: true,
    arpRate: 1,
    arpProb: 0.5,
    leadOct: 1,
    leadDensity: 0.45,
    leadTimbre: "seq",
    rev: 0.7,
    dly: 0.35,
    bright: 0.58,
    duck: 0.15,
    drive: 0.4,
    padGain: 1.0,
  },
  dnb: {
    label: "DRUM & BASS",
    bpm: [170, 178],
    swing: 0.1,
    scales: ["minor", "dorian", "minPent"],
    progs: [
      [0, 0, 5, 3],
      [0, 3, 4, 3],
      [0, 5, 6, 5],
    ],
    sev: 0.55,
    add9: 0.3,
    drums: true,
    kick: ["x.............", "x.........x....."],
    snare: ["....x......."],
    hat: ["x.x.x.x.x.x.x.x.", "xxxx.xxxxxxx.xxx"],
    ohat: ["......o........."],
    clap: ["................"],
    perc: ["..o.........o..."],
    fills: { s: "....o..o....ooo.", h: "xxxxxxxxxxxxxxxx" },
    bassMode: "sustain",
    arpOn: false,
    arpRate: 2,
    arpProb: 0.3,
    leadOct: 1,
    leadDensity: 0.38,
    leadTimbre: "bell",
    rev: 0.4,
    dly: 0.4,
    bright: 0.58,
    duck: 0.45,
    drive: 0.5,
    padGain: 0.75,
  },
};

export const STYLE_LIST = Object.keys(STYLES) as StyleId[];

/* ------------------------------- moods ------------------------------- */

export interface MoodPreset {
  label: string;
  scaleBias: ScaleName[];
  bpmMul: number;
  energyMul: number;
  brightShift: number;
  revShift: number;
  nouns: string[];
}

export const MOODS: Record<MoodId, MoodPreset> = {
  dreamy: {
    label: "DREAMY",
    scaleBias: ["majPent", "lydian", "major"],
    bpmMul: 0.92,
    energyMul: 0.8,
    brightShift: 0.02,
    revShift: 0.15,
    nouns: ["Reverie", "Afterglow", "Drift", "Halo", "Bloom", "Mirage"],
  },
  dark: {
    label: "DARK",
    scaleBias: ["minor", "phrygian", "harmMinor"],
    bpmMul: 1.0,
    energyMul: 0.95,
    brightShift: -0.18,
    revShift: 0.05,
    nouns: ["Descent", "Umbra", "Static", "Void", "Mirror", "Ruins"],
  },
  euphoric: {
    label: "EUPHORIC",
    scaleBias: ["major", "lydian", "mixolydian"],
    bpmMul: 1.06,
    energyMul: 1.15,
    brightShift: 0.12,
    revShift: 0,
    nouns: ["Horizon", "Ignition", "Skyline", "Sunrise", "Empire", "Anthem"],
  },
  melancholy: {
    label: "MELANCHOLY",
    scaleBias: ["minor", "dorian", "harmMinor"],
    bpmMul: 0.92,
    energyMul: 0.85,
    brightShift: -0.08,
    revShift: 0.12,
    nouns: ["November", "Hourglass", "Letters", "Fading", "Rainfall", "Departure"],
  },
  aggressive: {
    label: "AGGRESSIVE",
    scaleBias: ["phrygian", "harmMinor", "minor"],
    bpmMul: 1.12,
    energyMul: 1.2,
    brightShift: 0.05,
    revShift: -0.1,
    nouns: ["Overdrive", "Voltage", "Siege", "Riot", "Impact", "Furnace"],
  },
  calm: {
    label: "CALM",
    scaleBias: ["majPent", "major", "dorian"],
    bpmMul: 0.87,
    energyMul: 0.72,
    brightShift: -0.04,
    revShift: 0.1,
    nouns: ["Meadow", "Tide", "Willow", "Ember", "Pines", "Harbor"],
  },
};

export const MOOD_LIST = Object.keys(MOODS) as MoodId[];

/* --------------------------- prompt analysis --------------------------- */

const STYLE_WORDS: Array<[RegExp, StyleId]> = [
  [/lo[\s-]?fi|chillhop|chill beats|study|boom\s?bap|jazz\s?hop/i, "lofi"],
  [/synthwave|retrowave|outrun|vaporwave|neon|night drive|80s|eighties/i, "synthwave"],
  [/techno|berlin|warehouse|rave|industrial|acid/i, "techno"],
  [/house|deep house|disco|garage|club|groove|beach|sunset set/i, "house"],
  [/trap|drill|808|hip[\s-]?hop|rap\b/i, "trap"],
  [/ambient|drone|atmospher|meditat|sleep|soundscape|ether/i, "ambient"],
  [/cinematic|orchestr|epic|trailer|soundtrack|film score|hans zimmer|battle/i, "cinematic"],
  [/dnb|drum\s?(?:and|&|n)\s?bass|jungle|liquid|breakbeat/i, "dnb"],
];

const MOOD_WORDS: Array<[RegExp, MoodId]> = [
  [/dark|noir|night|shadow|gloom|haunt|cold/i, "dark"],
  [/sad|melancho|lonely|tears|heartbreak|nostalg|rain|autumn|emo/i, "melancholy"],
  [/dream|cloud|float|sleep|stars|space|cosmic|haze|angels|heaven/i, "dreamy"],
  [/happy|uplift|euphori|sun|summer|joy|bright|festival|anthem/i, "euphoric"],
  [/aggress|hard\b|angry|rage|intense|heavy|fierce|brutal|workout|gym/i, "aggressive"],
  [/calm|peace|soft|gentle|quiet|relax|morning|coffee/i, "calm"],
];

const STOPWORDS = new Set(
  `the a an and or of to in on for with at by from up about into over after again
   beat beats track song music vibe vibes sound sounds like make want need some
   this that these those very more most other out your you are was were will
   through during before between under around good great best slow fast deep`.split(/\s+/)
);

const generify = (re: RegExp, s: string) => re.test(s);

export function analyzePrompt(prompt: string): Analysis {
  const p = prompt.trim();
  const tags: Tag[] = [];
  let style: StyleId | null = null;
  let mood: MoodId | null = null;
  let bpm: number | null = null;
  let root: number | null = null;
  let scaleHint: ScaleName | null = null;
  let energy: number | null = null;

  for (const [re, s] of STYLE_WORDS) {
    if (generify(re, p)) {
      style = s;
      break;
    }
  }
  for (const [re, m] of MOOD_WORDS) {
    if (generify(re, p)) {
      mood = m;
      break;
    }
  }

  const bpmMatch = p.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch && bpmMatch[1]) {
    const v = parseInt(bpmMatch[1], 10);
    if (v >= 50 && v <= 200) bpm = v;
  }

  const keyMatch = p.match(/\bin\s+([A-Ga-g])(#|♯|b|♭)?\s*(minor|min|major|maj)\b/i);
  if (keyMatch && keyMatch[1]) {
    const letter = keyMatch[1].toUpperCase();
    const acc = keyMatch[2] ?? "";
    const names: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let r = names[letter] ?? 0;
    if (acc === "#" || acc === "♯") r = (r + 1) % 12;
    if (acc === "b" || acc === "♭") r = (r + 11) % 12;
    root = r;
    const q = (keyMatch[3] ?? "").toLowerCase();
    scaleHint = q.startsWith("maj") ? "major" : "minor";
  }

  if (/harder|heavy|maximal|intense|fast|energetic/i.test(p)) energy = 0.85;
  if (/minimal|sparse|gentle|slow|soft|calm/i.test(p)) energy = 0.38;

  const keywords = p
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    .slice(0, 6);

  const finalMood: MoodId = mood ?? "dreamy";
  if (style) tags.push({ label: `STYLE → ${STYLES[style].label}`, kind: "style" });
  tags.push({ label: `MOOD → ${MOODS[finalMood].label}`, kind: "mood" });
  if (bpm) tags.push({ label: `TEMPO → ${bpm} BPM`, kind: "bpm" });
  if (root !== null && scaleHint) {
    const NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    tags.push({
      label: `KEY → ${NOTE[root]} ${scaleHint === "major" ? "MAJOR" : "MINOR"}`,
      kind: "key",
    });
  }

  return { style, mood: finalMood, bpm, root, scaleHint, energy, keywords, tags };
}

/* ------------------------------ titling ------------------------------ */

const ADJECTIVES = [
  "Neon", "Violet", "Midnight", "Velvet", "Solar", "Lunar", "Analog", "Ghost",
  "Golden", "Crimson", "Silver", "Hollow", "Electric", "Amber", "Silent", "Liquid",
];

const PLACES = [
  "Highway", "Terminal", "Garden", "Station", "Cassette", "Signal", "Circuit",
  "Orbit", "Harbor", "Avenue", "Cathedral", "Observatory",
];

export function makeTitle(rng: Rng, mood: MoodId, keywords: string[]): string {
  const kw = keywords.length
    ? pick(rng, keywords)
    : null;
  const keywordTitle = kw ? kw[0]!.toUpperCase() + kw.slice(1) : null;
  const noun = pick(rng, MOODS[mood].nouns);
  const adj = pick(rng, ADJECTIVES);
  const place = pick(rng, PLACES);

  const forms: Array<() => string> = [
    () => (keywordTitle ? `${adj} ${keywordTitle}` : `${adj} ${noun}`),
    () => `${noun} ${place}`,
    () => (keywordTitle ? `${keywordTitle} ${noun}` : `${noun}`),
    () => `${adj} ${noun}`,
    () => (keywordTitle ? `${keywordTitle} / ${place}` : `${noun} ${place}`),
    () => (chance(rng, 0.5) ? `The ${noun}` : `${place} ${int(rng, 2, 99)}`),
  ];
  return pick(rng, forms)();
}

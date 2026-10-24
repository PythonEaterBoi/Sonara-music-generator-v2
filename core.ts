/* ------------------------------------------------------------------
   SONARA · core — seeded randomness, music theory, shared types
-------------------------------------------------------------------*/

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const hashSeed = (s: string): number => xmur3(s)();
export const rand = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
export const int = (rng: Rng, a: number, b: number) => Math.floor(rand(rng, a, b + 1));
export const pick = <T,>(rng: Rng, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)] as T;
export const chance = (rng: Rng, p: number) => rng() < p;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ------------------------------ theory ------------------------------ */

export type ScaleName =
  | "minor"
  | "major"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "harmMinor"
  | "minPent"
  | "majPent";

export const SCALES: Record<ScaleName, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
  minPent: [0, 3, 5, 7, 10],
  majPent: [0, 2, 4, 7, 9],
};

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const midiName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const keyName = (root: number) => NOTE_NAMES[((root % 12) + 12) % 12] as string;
export const m2f = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** midi pitch of a scale degree (wraps across octaves, negatives ok) */
export function degMidi(root: number, scaleName: ScaleName, deg: number): number {
  const sc = SCALES[scaleName];
  const n = sc.length;
  const oct = Math.floor(deg / n);
  const idx = ((deg % n) + n) % n;
  return root + (sc[idx] as number) + 12 * (oct + 4);
}

/** snap an arbitrary midi to nearest scale tone */
export function snap(root: number, scaleName: ScaleName, midi: number): number {
  let best = midi;
  let bestD = Infinity;
  for (let o = -2; o < 3; o++) {
    for (const s of SCALES[scaleName]) {
      const cand = root + s + 12 * o + 60;
      const d = Math.abs(cand - midi);
      if (d < bestD) {
        bestD = d;
        best = cand;
      }
    }
  }
  return best;
}

export interface ChordOpts {
  seventh?: boolean;
  add9?: boolean;
  inversion?: number;
  voicingCenter?: number; // target midi region
}

/** build a chord on a scale degree, voiced near voicingCenter */
export function buildChord(
  root: number,
  scaleName: ScaleName,
  degree: number,
  opts: ChordOpts = {}
): number[] {
  const { seventh = false, add9 = false, inversion = 0, voicingCenter = 60 } = opts;
  const degs = [0, 2, 4];
  if (seventh) degs.push(6);
  if (add9) degs.push(8);
  let tones = degs.map((d) => degMidi(root, scaleName, degree + d));
  // fold into a sensible octave band around voicingCenter
  tones = tones.map((m) => {
    let x = m;
    while (x < voicingCenter - 7) x += 12;
    while (x > voicingCenter + 9) x -= 12;
    return x;
  });
  for (let i = 0; i < inversion && i < tones.length; i++) {
    const t = tones.shift();
    if (t !== undefined) tones.push(t + 12);
  }
  return tones.sort((a, b) => a - b);
}

/* ------------------------------ shared types ------------------------------ */

export type StyleId =
  | "lofi"
  | "synthwave"
  | "techno"
  | "house"
  | "trap"
  | "ambient"
  | "cinematic"
  | "dnb";

export type MoodId = "dreamy" | "dark" | "euphoric" | "melancholy" | "aggressive" | "calm";

export interface NoteEvent {
  t: number; // seconds from start
  d: number; // duration seconds
  m: number; // midi
  v: number; // velocity 0..1
  c?: number; // per-note cutoff multiplier 0..1 (filter openness)
}

export type DrumKind = "k" | "s" | "h" | "o" | "c" | "p" | "t" | "r";

export interface DrumEvent {
  t: number;
  k: DrumKind;
  v: number;
  d?: number; // for risers / toms length
  p?: number; // pitch param (toms)
}

export interface Song {
  seed: number;
  title: string;
  style: StyleId;
  mood: MoodId;
  bpm: number;
  root: number; // 0..11 pitch class
  scaleName: ScaleName;
  bars: number;
  duration: number; // seconds
  pad: NoteEvent[];
  bass: NoteEvent[];
  lead: NoteEvent[];
  arp: NoteEvent[];
  drums: DrumEvent[];
  duck: number[]; // kick times for sidechain pump
  crackle: boolean;
  prompt: string;
}

export interface Tag {
  label: string;
  kind: "style" | "mood" | "bpm" | "key" | "energy";
}

export interface Analysis {
  style: StyleId | null;
  mood: MoodId;
  bpm: number | null;
  root: number | null;
  scaleHint: ScaleName | null;
  energy: number | null;
  keywords: string[];
  tags: Tag[];
}

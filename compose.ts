/* ------------------------------------------------------------------
   SONARA · compose — turns a text prompt into a full song structure
-------------------------------------------------------------------*/

import {
  Analysis,
  DrumEvent,
  MoodId,
  NoteEvent,
  Rng,
  Song,
  StyleId,
  buildChord,
  chance,
  clamp,
  degMidi,
  hashSeed,
  int,
  mulberry32,
  pick,
  rand,
} from "./core";
import { MOODS, STYLES, analyzePrompt, makeTitle } from "./styles";

export interface ComposeOpts {
  prompt: string;
  style: StyleId | null;
  mood: MoodId | null;
  bpm: number | null;
  root: number | null;
  energy: number; // 0..1
  targetSec: number;
  salt: number;
}

const STYLE_BY_MOOD: Record<MoodId, StyleId[]> = {
  dreamy: ["lofi", "ambient", "synthwave"],
  dark: ["synthwave", "techno", "trap", "cinematic"],
  euphoric: ["house", "dnb", "synthwave"],
  melancholy: ["lofi", "ambient", "cinematic"],
  aggressive: ["techno", "trap", "dnb"],
  calm: ["ambient", "lofi", "house"],
};

type Section = 0 | 1 | 2 | 3; // intro, verse, chorus, outro

const LEAD_PATTERNS: Record<string, number[]> = {
  sing: [0, 4, 8, 10, 14, 16, 20, 24, 26, 30],
  sparse: [0, 6, 12, 16, 24],
  syncop: [2, 7, 12, 15, 18, 23, 28, 31],
  busy: [0, 2, 4, 6, 10, 12, 14, 16, 18, 22, 24, 26, 28, 30],
};
const PATTERN_NAMES = Object.keys(LEAD_PATTERNS);

export function composeSong(opts: ComposeOpts): { song: Song; analysis: Analysis } {
  const analysis = analyzePrompt(opts.prompt);
  const seed = (hashSeed(opts.prompt || "sonara") + opts.salt * 7919) >>> 0;
  const rng = mulberry32(seed);

  /* ---------- decide global params ---------- */
  const mood: MoodId = opts.mood ?? analysis.mood;
  const style: StyleId =
    opts.style ?? analysis.style ?? pick(rng, STYLE_BY_MOOD[mood]);
  const P = STYLES[style];
  const M = MOODS[mood];

  const energy = clamp((analysis.energy ?? opts.energy) * M.energyMul, 0.15, 1);
  const explicitBpm = opts.bpm ?? analysis.bpm;
  const bpm = explicitBpm
    ? clamp(Math.round(explicitBpm), 55, 182)
    : clamp(Math.round(int(rng, P.bpm[0], P.bpm[1]) * M.bpmMul), 55, 182);

  const root = opts.root ?? analysis.root ?? int(rng, 0, 11);
  const biased = P.scales.filter((s) => M.scaleBias.includes(s));
  const scaleName =
    analysis.scaleHint && P.scales.includes(analysis.scaleHint)
      ? analysis.scaleHint
      : biased.length
        ? pick(rng, biased)
        : pick(rng, P.scales);

  const spb = (4 * 60) / bpm; // seconds per bar
  const stepDur = spb / 16;
  const bars = Math.max(12, Math.round(opts.targetSec / spb / 4) * 4);
  const duration = bars * spb;

  const barRng = (bar: number): Rng => mulberry32((seed ^ ((bar + 1) * 0x9e3779b9)) >>> 0);

  /* ---------- section map ---------- */
  const introBars = bars >= 20 ? 2 : 1;
  const outroBars = bars >= 20 ? 2 : 1;
  const sections: Section[] = [];
  for (let b = 0; b < bars; b++) {
    if (b < introBars) sections.push(0);
    else if (b >= bars - outroBars) sections.push(3);
    else {
      const blk = Math.floor((b - introBars) / 4) % 2;
      sections.push(blk === 0 ? 1 : 2);
    }
  }
  const cutOf = (s: Section) => [0.42, 0.72, 1.0, 0.5][s];

  /* ---------- chord track ---------- */
  const prog = pick(rng, P.progs);
  const chords: number[][] = [];
  for (let b = 0; b < bars; b++) {
    const rb = barRng(b * 31 + 7);
    const degree = prog[b % prog.length] as number;
    chords.push(
      buildChord(root, scaleName, degree, {
        seventh: chance(rb, P.sev),
        add9: chance(rb, P.add9),
        inversion: int(rb, 0, 2),
        voicingCenter: style === "trap" || style === "techno" ? 57 : 60,
      })
    );
  }

  const pad: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const lead: NoteEvent[] = [];
  const arp: NoteEvent[] = [];
  const drums: DrumEvent[] = [];
  const duck: number[] = [];

  const human = (r: Rng, amt: number) => (r() - 0.5) * 2 * amt;

  /* ---------- pads ---------- */
  for (let b = 0; b < bars; b++) {
    const s = sections[b] as Section;
    const rb = barRng(b * 17 + 3);
    const chord = chords[b] as number[];
    const longChord = style === "ambient" && b % 2 === 1; // hold ambient chords 2 bars
    if (longChord) continue;
    const dur = style === "ambient" ? spb * 2.05 : spb * 1.02;
    const c = cutOf(s);
    for (const m of chord) {
      pad.push({
        t: b * spb + human(rb, 0.02),
        d: dur,
        m,
        v: 0.42 + rb() * 0.2,
        c,
      });
    }
    // low foundation for big styles
    if (style === "cinematic" || style === "ambient" || style === "synthwave") {
      let rootM = chord[0] as number;
      while (rootM > 48) rootM -= 12;
      pad.push({ t: b * spb, d: dur, m: rootM, v: 0.5, c: c * 0.8 });
    }
  }

  /* ---------- bass ---------- */
  const bassAt = (t: number, d: number, m: number, v: number, c: number) =>
    bass.push({ t: t + human(rng, 0.004), d, m, v, c });
  const clampBass = (m: number, lo = 31, hi = 45) => {
    let x = m;
    while (x < lo) x += 12;
    while (x > hi) x -= 12;
    return x;
  };

  for (let b = 0; b < bars; b++) {
    const s = sections[b] as Section;
    if (s === 0 && chance(barRng(b + 51), 0.5)) continue; // drop bass in some intro bars
    const rb = barRng(b * 13 + 11);
    const degree = prog[b % prog.length] as number;
    const chord = chords[b] as number[];
    const rootM = clampBass(chord[0] as number);
    const c = cutOf(s);
    const T = b * spb;

    switch (P.bassMode) {
      case "none":
        break;
      case "sustain": {
        bassAt(T, spb * 1.02, rootM, 0.8, c);
        if (style === "dnb" && chance(rb, 0.5))
          bassAt(T + spb / 2, spb * 0.5, rootM + pick(rb, [0, 7, -2]), 0.5, c);
        break;
      }
      case "pump8":
        for (let st = 0; st < 16; st += 2) {
          const oct = st === 6 || st === 14 ? (chance(rb, 0.35) ? 12 : 0) : 0;
          bassAt(T + st * stepDur, stepDur * 1.7, rootM + oct, st % 4 === 0 ? 0.9 : 0.7, c);
        }
        break;
      case "off":
        for (const st of [2, 6, 10, 14]) {
          const fifth = chance(rb, 0.22) ? 7 : 0;
          bassAt(T + st * stepDur, stepDur * 1.15, rootM + fifth, 0.85, c);
        }
        break;
      case "drive16":
        for (let st = 0; st < 16; st++) {
          if (st % 2 === 1 && chance(rb, 0.4)) continue;
          const oct = st === 6 || st === 14 ? 12 : 0;
          bassAt(T + st * stepDur, stepDur * 0.95, rootM + oct, st % 4 === 0 ? 0.9 : 0.62, c);
        }
        break;
      case "octave8":
        for (let st = 0; st < 16; st += 2)
          bassAt(T + st * stepDur, stepDur * 1.6, rootM + (st % 4 === 2 ? 12 : 0), 0.82, c);
        break;
      case "glide808": {
        const hits = [0, 6, 10];
        for (const st of hits) {
          if (st > 0 && chance(rb, 0.35)) continue;
          bassAt(T + st * stepDur, spb * rand(rb, 0.18, 0.45), clampBass(rootM, 28, 38), 0.95, c);
        }
        break;
      }
      case "walk": {
        const cur = degree;
        const nxt = prog[(b + 1) % prog.length] as number;
        const walk = [cur, cur + 4, cur + pick(rb, [2, 4]), nxt + pick(rb, [-1, 1])];
        for (let q = 0; q < 4; q++) {
          const m = clampBass(degMidi(root, scaleName, walk[q] as number) - 24, 33, 45);
          bassAt(T + q * 4 * stepDur, stepDur * 3.4, m, q === 0 ? 0.85 : 0.66, c);
        }
        break;
      }
    }
  }

  /* ---------- arp ---------- */
  if (P.arpOn) {
    for (let b = 0; b < bars; b++) {
      const s = sections[b] as Section;
      const rb = barRng(b * 19 + 5);
      const chord = (chords[b] as number[]).map((m) => m + 12);
      const seq = [...chord, ...chord.map((m) => m + 12)];
      const mode = int(rb, 0, 2); // 0 up, 1 down, 2 updown
      const order: number[] = [];
      for (let st = 0; st < 16; st += P.arpRate) {
        const pos = st / P.arpRate;
        let idx =
          mode === 0 ? pos % seq.length : mode === 1 ? seq.length - 1 - (pos % seq.length)
          : Math.abs((pos % (2 * seq.length - 2)) - (seq.length - 1));
        order.push(seq[clamp(idx, 0, seq.length - 1)] as number);
      }
      const dens = P.arpProb * (s === 2 ? 1 : s === 0 ? 0.45 : 0.75) * (0.55 + energy * 0.6);
      order.forEach((m, i) => {
        if (!chance(rb, dens)) return;
        const up = s === 2 && chance(rb, 0.2) && m <= 88;
        arp.push({
          t: b * spb + i * P.arpRate * stepDur + human(rb, 0.003),
          d: stepDur * P.arpRate * 0.92,
          m: up ? m + 12 : m > 100 ? m - 12 : m,
          v: 0.3 + rb() * 0.25,
          c: cutOf(s),
        });
      });
    }
  }

  /* ---------- lead melody ---------- */
  {
    let curDeg = 7 + int(rng, 0, 3); // scale-degree position of the walker
    const twoBar = bars / 2;
    for (let ph = 0; ph < twoBar; ph++) {
      const s = sections[ph * 2] as Section;
      const rb = mulberry32((seed ^ (ph * 0x85ebca6b + 27)) >>> 0);
      const isLast = ph === twoBar - 1;

      let active = false;
      if (s === 2) active = true;
      else if (s === 1) active = chance(rb, 0.35 + P.leadDensity * 0.65 * energy);
      else if (s === 3) active = chance(rb, 0.4);
      else active = style === "ambient" ? chance(rb, 0.5) : chance(rb, 0.12);
      if (!active && !isLast) continue;

      const patName = P.leadTimbre === "stab" ? "sparse" : pick(rb, PATTERN_NAMES);
      const grid = LEAD_PATTERNS[patName] as number[];
      const dens = clamp(P.leadDensity * (s === 2 ? 1.25 : 0.9) * (0.5 + energy * 0.7), 0.2, 1);

      for (let gi = 0; gi < grid.length; gi++) {
        const step = grid[gi] as number;
        if (!isLast && !chance(rb, dens)) continue;
        const isFinal = isLast && gi === grid.length - 1;
        const bar = ph * 2 + Math.floor(step / 16);
        if (bar >= bars) break;
        const chord = chords[bar] as number[];
        const degree = prog[bar % prog.length] as number;

        // random-walk in scale degrees, snap to chord tones on strong steps
        if (step % 8 === 0 || isFinal) {
          const chordDegs = [0, 2, 4, 6];
          const target = degree + pick(rb, chordDegs) + 7 * P.leadOct + (s === 2 ? 7 : 0);
          curDeg = target + int(rb, -2, 2);
        } else {
          curDeg += int(rb, -2, 2) + (chance(rb, 0.08) ? pick(rb, [-7, 7]) : 0);
        }
        let m = degMidi(root, scaleName, curDeg);
        m = clamp(m, style === "trap" ? 62 : 55, 96);
        if (isFinal) m = degMidi(root, scaleName, 7 * P.leadOct); // resolve to tonic

        const t = ph * 2 * spb + step * stepDur + human(rb, 0.008);
        const d = isFinal
          ? spb * 1
          : stepDur * (P.leadTimbre === "stab" || P.leadTimbre === "seq" ? rand(rb, 0.8, 1.6) : pick(rb, [2, 3, 4, 6]) * 0.92);
        const v = 0.5 + rb() * 0.3 + (step % 8 === 0 ? 0.12 : 0);

        if (P.leadTimbre === "stab") {
          for (const cm of chord.slice(0, 3))
            lead.push({ t, d: stepDur * 1.3, m: cm + 12, v: v * 0.62, c: cutOf(s) });
        } else {
          lead.push({ t, d, m, v, c: cutOf(s) });
        }
      }
    }
  }

  /* ---------- drums ---------- */
  if (P.drums) {
    const push = (r: Rng, t0: number, k: DrumEvent["k"], v: number, extra?: Partial<DrumEvent>) => {
      if (v <= 0.01) return;
      drums.push({ t: t0 + human(r, k === "k" || k === "s" ? 0.003 : 0.005), k, v, ...extra });
      if (k === "k") duck.push(t0);
    };

    for (let b = 0; b < bars; b++) {
      const s = sections[b] as Section;
      const rb = barRng(b * 23 + 41);
      const isFill = b % 8 === 7 && s !== 0 && b < bars - 1;
      const pats = {
        k: isFill && P.fills.k ? P.fills.k : pick(rb, P.kick),
        s: isFill && P.fills.s ? P.fills.s : pick(rb, P.snare),
        h: isFill && P.fills.h ? P.fills.h : pick(rb, P.hat),
        o: pick(rb, P.ohat),
        c: pick(rb, P.clap),
        p: pick(rb, P.perc),
      } as Record<string, string>;

      const gate = (kind: string): number => {
        if (s === 0) return kind === "k" ? (b % 2 === 0 ? 0.8 : 0) : kind === "p" && style === "lofi" ? 0.5 : 0.25;
        if (s === 3) return kind === "h" || kind === "o" ? 0.4 : 0.85;
        if (s === 1 && (kind === "o" || kind === "c")) return 0.45;
        return 1;
      };

      // marker open-hat at block starts
      if (b % 8 === 0 && s !== 0 && P.ohat.length && style !== "cinematic")
        drums.push({ t: b * spb, k: "o", v: 0.5 });

      // riser into chorus
      if (s === 2 && (b - introBars) % 4 === 0 && b > 0 && energy > 0.45)
        drums.push({ t: b * spb - spb, k: "r", v: 0.55, d: spb });

      for (let st = 0; st < 16; st++) {
        const swingShift = st % 2 === 1 ? P.swing * stepDur : 0;
        const t = b * spb + st * stepDur + swingShift;
        for (const kind of ["k", "s", "h", "o", "c", "p"] as const) {
          const pat = pats[kind];
          if (!pat || st >= pat.length) continue;
          const ch = pat[st];
          if (ch !== "x" && ch !== "o") continue;
          const g = gate(kind);
          if (g === 0) continue;
          const ghost = ch === "o";
          if (ghost && !chance(rb, 0.55 + energy * 0.45)) continue;
          if (!chance(rb, g)) continue;
          const baseV = kind === "k" ? 0.95 : kind === "s" ? 0.8 : kind === "c" ? 0.55 : kind === "h" ? 0.42 : kind === "o" ? 0.4 : 0.3;
          push(rb, t, kind, baseV * (ghost ? 0.45 : 1) * (0.85 + rb() * 0.3));
        }
      }

      // tom fills (synthwave / cinematic)
      if (isFill && P.fills.t) {
        const tp = P.fills.t;
        let n = 0;
        const total = tp.split("").filter((c) => c === "t").length;
        for (let st = 0; st < 16 && st < tp.length; st++) {
          if (tp[st] !== "t") continue;
          n++;
          push(rb, b * spb + st * stepDur, "t", 0.6, { p: 220 * Math.pow(0.94, n) + (total - n) * 8 });
        }
      }

      // trap hi-hat rolls on fill bars
      if (style === "trap" && isFill) {
        for (let r = 0; r < 8; r++)
          push(rb, b * spb + 12 * stepDur + r * stepDur * 0.5, "h", 0.3 + r * 0.03);
      }
      // cinematic snare build at chorus transitions
      if (style === "cinematic" && b % 8 === 7 && b < bars - 2) {
        for (let r = 0; r < 16; r++)
          push(rb, b * spb + r * stepDur, "s", 0.15 + (r / 16) * 0.5);
      }
    }
  }

  /* ---------- sanitize: no negative times, cap tails ---------- */
  const maxT = duration + spb;
  const cleanNote = (n: NoteEvent): NoteEvent => ({ ...n, t: Math.max(0, Math.min(n.t, maxT)) });
  const padC = pad.map(cleanNote);
  const bassC = bass.map(cleanNote);
  const leadC = lead.map(cleanNote);
  const arpC = arp.map(cleanNote);
  const drumsC = drums
    .map((e) => ({ ...e, t: Math.max(0, Math.min(e.t, maxT)) }))
    .filter((e) => e.t <= duration + 0.01);
  const duckC = duck.filter((t) => t >= 0 && t <= duration).map((t) => Math.max(0, t));

  /* ---------- assemble ---------- */
  const title = makeTitle(mulberry32((seed ^ 0x27d4eb2f) >>> 0), mood, analysis.keywords);
  const song: Song = {
    seed,
    title,
    style,
    mood,
    bpm,
    root,
    scaleName,
    bars,
    duration,
    pad: padC,
    bass: bassC,
    lead: leadC,
    arp: arpC,
    drums: drumsC,
    duck: duckC,
    crackle: !!P.crackle,
    prompt: opts.prompt,
  };
  return { song, analysis };
}

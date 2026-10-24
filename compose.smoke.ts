import { composeSong, ComposeOpts } from "@/lib/audio/compose";

const cases: Array<Partial<ComposeOpts> & { prompt: string }> = [
  { prompt: "lo-fi beats to study at 2AM, vinyl crackle", targetSec: 45 },
  { prompt: "dark synthwave for a neon night drive", targetSec: 75 },
  { prompt: "berlin warehouse techno, 134 bpm, aggressive", targetSec: 75 },
  { prompt: "cinematic trailer tension in D minor", targetSec: 110 },
  { prompt: "hard trap with eerie bells, 145 bpm", targetSec: 45 },
  { prompt: "ambient soundscape for stargazing, calm", targetSec: 110 },
  { prompt: "drum & bass liquid roller, euphoric", targetSec: 75 },
  { prompt: "melodic house sunset beach", targetSec: 75 },
  { prompt: "", targetSec: 45 },
];

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error("  FAIL:", msg);
  }
};

for (const c of cases) {
  const opts: ComposeOpts = {
    prompt: c.prompt,
    style: c.style ?? null,
    mood: c.mood ?? null,
    bpm: c.bpm ?? null,
    root: c.root ?? null,
    energy: c.energy ?? 0.62,
    targetSec: c.targetSec ?? 75,
    salt: c.salt ?? 0,
  };
  const { song, analysis } = composeSong(opts);
  const { song: again } = composeSong(opts);

  console.log(
    `\n# "${c.prompt || "(empty)"}" -> ${song.style}/${song.mood} · ${song.bpm}bpm · root ${song.root} · ${song.scaleName} · ${song.bars} bars · "${song.title}"`
  );
  const counts = {
    pad: song.pad.length,
    bass: song.bass.length,
    lead: song.lead.length,
    arp: song.arp.length,
    drums: song.drums.length,
    duck: song.duck.length,
  };
  console.log("  events:", JSON.stringify(counts), "· tags:", analysis.tags.length);

  ok(Number.isFinite(song.bpm) && song.bpm >= 55 && song.bpm <= 182, `bpm in range (got ${song.bpm})`);
  ok(song.bars % 4 === 0 && song.bars >= 12, "bars multiple of 4");
  ok(Number.isFinite(song.duration) && song.duration > 10, "duration sane");
  ok(counts.pad + counts.bass + counts.lead + counts.arp + counts.drums > 20, "has musical content");

  let bad = 0;
  const checkNote = (t: number, d: number, m: number, v: number, tag: string) => {
    const fail =
      !Number.isFinite(t) || !Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(v)
        ? "non-finite"
        : t < -0.01 || t > song.duration + 5
          ? "out-of-time"
          : d <= 0 || d > 12
            ? `bad-dur ${d}`
            : m < 12 || m > 110
              ? `bad-midi ${m}`
              : v <= 0 || v > 1.6
                ? `bad-vel ${v}`
                : null;
    if (fail) {
      bad++;
      console.error(`    [${tag}] ${fail} t=${t} d=${d} m=${m} v=${v}`);
    }
  };
  for (const n of song.pad) checkNote(n.t, n.d, n.m, n.v, "pad");
  for (const n of song.bass) checkNote(n.t, n.d, n.m, n.v, "bass");
  for (const n of song.lead) checkNote(n.t, n.d, n.m, n.v, "lead");
  for (const n of song.arp) checkNote(n.t, n.d, n.m, n.v, "arp");
  for (const e of song.drums) {
    if (!Number.isFinite(e.t) || !Number.isFinite(e.v) || e.t < -5 || e.t > song.duration + 5) bad++;
  }
  ok(bad === 0, `${bad} malformed events`);

  // determinism
  ok(again.title === song.title && JSON.stringify(again.pad) === JSON.stringify(song.pad), "deterministic");

  // keyboard claim: D minor detection
  if (c.prompt.includes("D minor")) ok(song.root === 2, `D minor root detected (got ${song.root})`);
  if (c.prompt.includes("134")) ok(song.bpm === 134 || Math.abs(song.bpm - 134) < 12, `bpm ~134 (got ${song.bpm})`);
}

console.log(failures === 0 ? "\nSMOKE OK — all cases passed" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

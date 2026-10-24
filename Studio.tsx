import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dices, Loader2, Sparkles } from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import { analyzePrompt } from "@/lib/audio/styles";
import { MOOD_LIST, MOODS, STYLES, STYLE_LIST } from "@/lib/audio/styles";
import { MoodId, StyleId } from "@/lib/audio/core";
import { SUGGESTIONS, SURPRISE } from "@/lib/prompts";
import PlayerDock from "@/components/PlayerDock";

/* ----------------------------- primitives ----------------------------- */

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 font-mono text-[10px] tracking-[0.32em] text-dim">{children}</p>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] tracking-[0.14em] transition-all duration-200 active:scale-95 ${
        active
          ? "border-acid bg-acid text-bg"
          : "border-line text-dim hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Fader({
  label,
  value,
  min,
  max,
  onChange,
  display,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  display: string;
  disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.28em] text-dim">{label}</span>
        <span className="font-mono text-[11px] text-acid">{display}</span>
      </div>
      <input
        type="range"
        className="fader"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}

const KIND_COLOR: Record<string, string> = {
  style: "border-acid text-acid",
  mood: "border-vio text-vio",
  bpm: "border-ink/50 text-ink",
  key: "border-ink/50 text-ink",
  energy: "border-ink/50 text-ink",
};

/* ------------------------------- studio ------------------------------- */

export default function Studio() {
  const { generate, status, progress, logs } = usePlayer();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleId | null>(null);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [root, setRoot] = useState<number | null>(null);
  const [energy, setEnergy] = useState(0.62);
  const [brightness, setBrightness] = useState(0.5);
  const [targetSec, setTargetSec] = useState(75);
  const [salt, setSalt] = useState(0);
  const [phIdx, setPhIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  /* cycling placeholder */
  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % SUGGESTIONS.length), 3200);
    return () => clearInterval(id);
  }, []);

  /* live analysis preview */
  const live = useMemo(() => {
    if (prompt.trim().length < 6) return [];
    return analyzePrompt(prompt).tags.filter((t) => t.kind === "style" || t.kind === "bpm" || t.kind === "key");
  }, [prompt]);

  /* autoscroll log */
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const working = status === "working";
  const doGenerate = () => {
    const p = prompt.trim() || (SURPRISE[Math.floor(Math.random() * SURPRISE.length)] as string);
    if (!prompt.trim()) setPrompt(p);
    void generate({ prompt: p, style, mood, bpm, root, energy, targetSec, salt, brightness });
  };

  const NOTE_NAMES_FULL = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  return (
    <section id="studio" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-10 pt-24 md:px-10 md:pt-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-mono text-[10px] tracking-[0.4em] text-acid">01 — THE DESK</p>
        <h2 className="mt-4 font-display text-4xl font-700 tracking-tight md:text-6xl">
          DESCRIBE IT.
          <span className="text-outline ml-4">RENDER IT.</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, delay: 0.1 }}
        className="mt-12 overflow-hidden rounded-3xl border border-line bg-panel/70 backdrop-blur-xl"
      >
        <div className="grid gap-10 p-6 md:p-10 lg:grid-cols-12">
          {/* ---------------- prompt column ---------------- */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <SectionLabel>PROMPT — WHAT SHOULD IT FEEL LIKE?</SectionLabel>
              <span className="font-mono text-[10px] text-dim">{prompt.length}/280</span>
            </div>
            <textarea
              ref={taRef}
              value={prompt}
              maxLength={280}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={`e.g. ${SUGGESTIONS[phIdx]}`}
              className="w-full resize-none rounded-2xl border border-line bg-bg/60 p-5 text-lg leading-relaxed text-ink placeholder:text-ink/25 focus:border-acid/50 focus:outline-none md:text-xl"
            />

            {/* live detected chips */}
            <div className="mt-3 flex min-h-[30px] flex-wrap items-center gap-2">
              <AnimatePresence mode="popLayout">
                {live.map((t) => (
                  <motion.span
                    key={t.label}
                    initial={{ opacity: 0, scale: 0.85, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className={`rounded-md border-l-2 bg-ink/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] ${KIND_COLOR[t.kind]}`}
                  >
                    {t.label}
                  </motion.span>
                ))}
              </AnimatePresence>
              {prompt.trim().length >= 6 && live.length === 0 && (
                <span className="font-mono text-[10px] tracking-[0.14em] text-dim">
                  NO EXPLICIT LOCKS — ENGINE WILL DECIDE
                </span>
              )}
            </div>

            {/* suggestions */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPrompt(s);
                    taRef.current?.focus();
                  }}
                  className="text-left font-mono text-[11px] italic text-dim/80 underline decoration-line underline-offset-4 transition-colors hover:text-acid"
                >
                  “{s}”
                </button>
              ))}
            </div>

            {/* style lock */}
            <div className="mt-9">
              <SectionLabel>STYLE LOCK · OPTIONAL</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip active={style === null} onClick={() => setStyle(null)}>
                  AUTO
                </Chip>
                {STYLE_LIST.map((s) => (
                  <Chip key={s} active={style === s} onClick={() => setStyle(style === s ? null : s)}>
                    {STYLES[s].label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* mood lock */}
            <div className="mt-7">
              <SectionLabel>MOOD LOCK · OPTIONAL</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Chip active={mood === null} onClick={() => setMood(null)}>
                  AUTO
                </Chip>
                {MOOD_LIST.map((m) => (
                  <Chip key={m} active={mood === m} onClick={() => setMood(mood === m ? null : m)}>
                    {MOODS[m].label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------- controls column ---------------- */}
          <div className="flex flex-col lg:col-span-5">
            <SectionLabel>PERFORMANCE</SectionLabel>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Fader
                label="ENERGY"
                value={energy}
                min={0}
                max={1}
                onChange={setEnergy}
                display={`${Math.round(energy * 100)}%`}
              />
              <Fader
                label="BRIGHTNESS"
                value={brightness}
                min={0}
                max={1}
                onChange={setBrightness}
                display={brightness < 0.35 ? "DARK" : brightness > 0.68 ? "BRIGHT" : "NEUTRAL"}
              />
              <div>
                <Fader
                  label="TEMPO"
                  value={bpm ?? 120}
                  min={60}
                  max={180}
                  onChange={(v) => setBpm(Math.round(v))}
                  display={bpm ? `${bpm} BPM` : "AUTO"}
                  disabled={bpm === null}
                />
                <button
                  onClick={() => setBpm(bpm === null ? 124 : null)}
                  className={`mt-1 rounded-full border px-3 py-1 font-mono text-[9px] tracking-[0.18em] transition-colors ${
                    bpm === null
                      ? "border-acid/60 text-acid"
                      : "border-line text-dim hover:text-ink"
                  }`}
                >
                  {bpm === null ? "● AUTO-DECIDE" : "○ LOCK MANUAL"}
                </button>
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-[0.28em] text-dim">ROOT KEY</span>
                  <span className="font-mono text-[11px] text-acid">
                    {root === null ? "AUTO" : NOTE_NAMES_FULL[root]}
                  </span>
                </div>
                <select
                  value={root === null ? "auto" : root}
                  onChange={(e) => setRoot(e.target.value === "auto" ? null : parseInt(e.target.value, 10))}
                  className="mt-1.5 w-full appearance-none rounded-lg border border-line bg-bg/60 px-3 py-2.5 font-mono text-xs text-ink focus:border-acid/50 focus:outline-none"
                >
                  <option value="auto">AUTO — LET ENGINE DECIDE</option>
                  {NOTE_NAMES_FULL.map((n, i) => (
                    <option key={n} value={i}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSalt((s) => s + 1)}
                  className="mt-3 flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-dim transition-colors hover:border-acid/60 hover:text-acid"
                >
                  <Dices size={11} />
                  RE-ROLL SEED {salt > 0 ? `#${salt}` : ""}
                </button>
              </div>
            </div>

            <div className="mt-7">
              <SectionLabel>ARRANGEMENT LENGTH</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { s: 45, l: "~0:45", d: "SKETCH" },
                  { s: 75, l: "~1:15", d: "SINGLE" },
                  { s: 110, l: "~1:50", d: "EXTENDED" },
                ].map((o) => (
                  <button
                    key={o.s}
                    onClick={() => setTargetSec(o.s)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      targetSec === o.s
                        ? "border-acid bg-acid/10"
                        : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span className="block font-mono text-xs text-ink">{o.l}</span>
                    <span className="block font-mono text-[9px] tracking-[0.18em] text-dim">{o.d}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={doGenerate}
              disabled={working}
              className={`group mt-9 flex h-16 w-full items-center justify-center gap-3 rounded-2xl font-mono text-sm font-semibold tracking-[0.22em] transition-all duration-300 active:scale-[0.98] ${
                working
                  ? "cursor-wait bg-ink/10 text-dim"
                  : "glow-acid bg-acid text-bg hover:scale-[1.015]"
              }`}
            >
              {working ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  SYNTHESIZING {Math.round(progress * 100)}%
                </>
              ) : (
                <>
                  <Sparkles size={17} className="transition-transform duration-300 group-hover:rotate-12" />
                  GENERATE TRACK
                </>
              )}
            </button>
          </div>
        </div>

        {/* ---------------- console log ---------------- */}
        <div className="border-t border-line bg-[#050506]">
          <div ref={logRef} className="h-40 overflow-y-auto px-6 py-4 md:px-10">
            {logs.length === 0 ? (
              <p className="font-mono text-xs leading-6 text-ink/30">
                {">"} sonara engine idle — awaiting prompt
                <span className="caret" />
              </p>
            ) : (
              logs.map((l, i) => (
                <motion.p
                  key={`${i}-${l}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`font-mono text-xs leading-6 ${
                    l.includes("ready") ? "text-acid" : "text-ink/60"
                  }`}
                >
                  {l}
                  {working && i === logs.length - 1 && <span className="caret" />}
                </motion.p>
              ))
            )}
          </div>
          <div className="h-[3px] w-full bg-ink/5">
            <div
              className="h-full bg-acid transition-[width] duration-300 ease-out"
              style={{ width: `${(working ? Math.max(progress, 0.04) : progress) * 100}%`, boxShadow: "0 0 12px rgba(205,255,61,0.6)" }}
            />
          </div>
        </div>
      </motion.div>

      <PlayerDock />
    </section>
  );
}

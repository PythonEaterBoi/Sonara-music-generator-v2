import { motion } from "framer-motion";
import { AudioLines, Braces, FileAudio, Languages } from "lucide-react";

const STEPS = [
  {
    icon: Languages,
    num: "01",
    title: "PARSE",
    body: "Your sentence is scanned for genre signals, moods, tempo markings and keys — the engine decides whatever you leave open.",
  },
  {
    icon: Braces,
    num: "02",
    title: "COMPOSE",
    body: "A seeded composition engine writes the chord progression, walking bass, lead phrases and drum patterns — same prompt, same song.",
  },
  {
    icon: FileAudio,
    num: "03",
    title: "RENDER",
    body: "Every voice is synthesized with the Web Audio API — oscillators, filters, convolution reverb, sidechain pump — then mastered to WAV.",
  },
];

export default function Footer() {
  return (
    <>
      {/* engine explainer */}
      <section id="engine" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-mono text-[10px] tracking-[0.4em] text-acid">03 — THE ENGINE</p>
          <h2 className="mt-4 font-display text-4xl font-700 tracking-tight md:text-6xl">
            HOW IT THINKS
            <span className="text-outline ml-4">IN SOUND.</span>
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="group rounded-2xl border border-line bg-panel/50 p-7 backdrop-blur transition-colors duration-500 hover:border-acid/40"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line text-dim transition-colors duration-500 group-hover:border-acid/50 group-hover:text-acid">
                  <s.icon size={17} />
                </span>
                <span className="font-display text-3xl font-900 text-ink/10 transition-colors duration-500 group-hover:text-acid/25">
                  {s.num}
                </span>
              </div>
              <h3 className="mt-6 font-display text-lg font-600 tracking-wide">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-dim">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-acid text-bg">
                <AudioLines size={16} strokeWidth={2.4} />
              </span>
              <div>
                <p className="font-display text-xs tracking-[0.3em]">SONARA</p>
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.2em] text-dim">
                  WORDS IN — WORLDS OUT
                </p>
              </div>
            </div>
            <div className="max-w-md">
              <p className="font-mono text-[10px] leading-relaxed tracking-[0.14em] text-dim">
                EVERY SOUND IS SYNTHESIZED LIVE IN YOUR BROWSER — NO SAMPLES, NO
                SERVERS, NO ACCOUNTS. A SINGLE STATIC FILE: SHIPS ANYWHERE,
                RUNS EVERYWHERE.
              </p>
            </div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-dim">
              MMXXV — BUILT ON WEB AUDIO
            </p>
          </div>
          <p className="text-outline mt-12 select-none text-center font-display text-[18vw] font-900 leading-none opacity-[0.35] md:text-[13rem]">
            SONARA
          </p>
        </div>
      </footer>
    </>
  );
}

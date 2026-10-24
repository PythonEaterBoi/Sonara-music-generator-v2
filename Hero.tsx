import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDown, Dices, Radio } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { usePlayer } from "@/hooks/usePlayer";
import { SURPRISE } from "@/lib/prompts";
import { scrollToId } from "@/lib/scroll";

const rise = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: { delay: 0.12 + i * 0.13, duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function EqBars({ color = "bg-acid" }: { color?: string }) {
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={`eq-bar w-[3px] rounded-sm ${color}`}
          style={{
            height: "100%",
            animationDuration: `${0.55 + (i % 4) * 0.17}s`,
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const { generate, status } = usePlayer();
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 120, damping: 16 });
  const rY = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 120, damping: 16 });

  const surprise = () => {
    const prompt = SURPRISE[Math.floor(Math.random() * SURPRISE.length)] as string;
    if (status !== "working") {
      void generate({
        prompt,
        style: null,
        mood: null,
        bpm: null,
        root: null,
        energy: 0.62,
        targetSec: 75,
        salt: Math.floor(Math.random() * 9999),
        brightness: 0.5,
      });
    }
    scrollToId("#studio");
  };

  return (
    <section id="top" className="relative z-10 mx-auto max-w-[1440px] px-5 pt-28 md:px-10 md:pt-36">
      <div className="grid items-end gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8">
        {/* ---------------- left / copy ---------------- */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-line bg-panel/60 px-4 py-2 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-acid" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.28em] text-dim">
              BROWSER-NATIVE ENGINE · NO SAMPLES · NO SERVERS
            </span>
          </motion.div>

          <h1 className="font-display font-900 leading-[0.98] tracking-tight">
            <span className="block overflow-hidden text-[13.5vw] sm:text-[11vw] lg:text-[6.4rem]">
              <motion.span custom={0} variants={rise} initial="hidden" animate="show" className="block">
                TYPE A MOOD.
              </motion.span>
            </span>
            <span className="block overflow-hidden text-[13.5vw] sm:text-[11vw] lg:text-[6.4rem]">
              <motion.span custom={1} variants={rise} initial="hidden" animate="show" className="text-outline-acid block">
                HEAR A WORLD.
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-8 max-w-md text-base leading-relaxed text-dim md:text-lg"
          >
            SONARA composes, synthesizes and masters original music from a single
            sentence — harmony, melody, drums and space, rendered live by the
            Web Audio engine in front of you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => scrollToId("#studio")}
              className="group glow-acid flex items-center gap-3 rounded-full bg-acid px-7 py-4 font-mono text-xs font-semibold tracking-[0.2em] text-bg transition-transform duration-300 hover:scale-[1.03] active:scale-95"
            >
              OPEN THE STUDIO
              <ArrowDown size={15} className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>
            <button
              onClick={surprise}
              className="flex items-center gap-3 rounded-full border border-line px-7 py-4 font-mono text-xs tracking-[0.2em] text-ink transition-all duration-300 hover:border-acid hover:text-acid active:scale-95"
            >
              <Dices size={15} />
              SURPRISE ME
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 1 }}
            className="mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6"
          >
            {["8 ENGINE STYLES", "9 SCALE MODES", "∞ UNIQUE SEEDS", "0 AUDIO SAMPLES"].map((s) => (
              <span key={s} className="font-mono text-[10px] tracking-[0.28em] text-dim">
                {s}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ---------------- right / signal card ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 2 }}
          transition={{ delay: 0.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <motion.div
            ref={cardRef}
            style={{ rotateX: rX, rotateY: rY, transformPerspective: 900 }}
            onMouseMove={(e) => {
              const r = cardRef.current?.getBoundingClientRect();
              if (!r) return;
              mx.set((e.clientX - r.left) / r.width);
              my.set((e.clientY - r.top) / r.height);
            }}
            onMouseLeave={() => {
              mx.set(0.5);
              my.set(0.5);
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden rounded-3xl border border-line shadow-2xl shadow-black"
          >
            <img src={heroImg} alt="Synthesized waveform sculpture" className="block aspect-[4/5] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-ink/15 bg-bg/50 px-3 py-1.5 backdrop-blur">
              <Radio size={12} className="text-acid" />
              <span className="font-mono text-[9px] tracking-[0.25em] text-ink/80">LIVE SIGNAL</span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <div>
                <p className="font-mono text-[9px] tracking-[0.25em] text-acid">CHANNEL A — OUT</p>
                <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-ink/50">
                  44.1 KHZ · FP32 · STEREO
                </p>
              </div>
              <EqBars />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

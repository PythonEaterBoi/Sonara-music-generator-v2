import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Download,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { formatTime, usePlayer } from "@/hooks/usePlayer";
import { keyName } from "@/lib/audio/core";
import { MOODS, STYLES } from "@/lib/audio/styles";

const SCALE_LABEL: Record<string, string> = {
  minor: "MINOR",
  major: "MAJOR",
  dorian: "DORIAN",
  phrygian: "PHRYGIAN",
  lydian: "LYDIAN",
  mixolydian: "MIXOLYDIAN",
  harmMinor: "HARM. MINOR",
  minPent: "MIN PENT",
  majPent: "MAJ PENT",
};

function Waveform() {
  const { peaks, time, duration, status, seekFrac, progress } = usePlayer();
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const draw = useCallback(() => {
    const cv = ref.current;
    const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== W * dpr || cv.height !== H * dpr) {
      cv.width = W * dpr;
      cv.height = H * dpr;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const working = status === "working";
    const n = peaks.length || 240;
    const frac = duration > 0 ? Math.min(time / duration, 1) : 0;
    const bw = W / n;
    const t = performance.now() / 1000;

    for (let i = 0; i < n; i++) {
      let pk: number;
      if (working) {
        pk = 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(i * 0.24 + t * 5)) * (0.4 + progress);
      } else {
        pk = peaks[i] ?? 0.05;
      }
      const idle = !working && peaks.length === 0;
      if (idle) pk = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(i * 0.3));
      const h = Math.max(2, pk * H * 0.92);
      const x = i * bw;
      const played = !working && i / n <= frac;
      g.fillStyle = working
        ? "rgba(138,136,127,0.35)"
        : played
          ? "#cdff3d"
          : "rgba(237,235,228,0.18)";
      const wBar = Math.max(1.2, bw - 1.4);
      g.beginPath();
      g.roundRect(x, (H - h) / 2, wBar, h, 2);
      g.fill();
    }

    if (!working && duration > 0) {
      const px = frac * W;
      g.fillStyle = "#cdff3d";
      g.fillRect(px - 0.75, 0, 1.5, H);
      g.beginPath();
      g.arc(px, H / 2, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }, [peaks, time, duration, status, progress]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const fracFromEvent = (e: React.PointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-20 w-full cursor-crosshair select-none md:h-24"
      onPointerDown={(e) => {
        draggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekFrac(fracFromEvent(e));
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) seekFrac(fracFromEvent(e));
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
    >
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

export default function PlayerDock() {
  const {
    status,
    song,
    cover,
    isPlaying,
    toggle,
    time,
    duration,
    volume,
    setVolume,
    downloadWav,
    library,
    currentId,
    playItem,
  } = usePlayer();

  const show = status !== "idle" && song;
  const working = status === "working";

  const idx = library.findIndex((l) => l.id === currentId);
  const step = (dir: 1 | -1) => {
    if (library.length < 2) return;
    const next = library[(idx + dir + library.length) % library.length];
    if (next) void playItem(next.id);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 overflow-hidden rounded-3xl border border-line bg-panel/70 backdrop-blur-xl"
        >
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
            {/* cover */}
            <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-2xl md:mx-0 md:h-44 md:w-44">
              {cover && <img src={cover} alt="Generative cover art" className="h-full w-full object-cover" />}
              {working && (
                <div className="absolute inset-0 grid place-items-center bg-bg/60 backdrop-blur-sm">
                  <span className="font-mono text-[10px] tracking-[0.3em] text-acid">
                    RENDERING
                  </span>
                </div>
              )}
              {!working && (
                <button
                  onClick={toggle}
                  className="absolute inset-0 grid place-items-center bg-bg/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 hover:opacity-100"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-acid text-bg">
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </span>
                </button>
              )}
            </div>

            {/* transport */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-xl font-600 tracking-tight md:text-2xl">
                    {song.title}
                  </h3>
                  <p className="mt-1.5 truncate font-mono text-[10px] tracking-[0.2em] text-dim">
                    {STYLES[song.style].label} · {keyName(song.root)}{" "}
                    {SCALE_LABEL[song.scaleName]} · {song.bpm} BPM · {MOODS[song.mood].label} ·
                    SEED #{song.seed.toString(16).toUpperCase().padStart(8, "0").slice(0, 8)}
                  </p>
                </div>
                <span className="hidden items-center gap-1.5 rounded-full border border-acid/40 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-acid sm:flex">
                  <Check size={11} />
                  SAVED TO SESSIONS
                </span>
              </div>

              <div className="mt-5">
                <Waveform />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => step(-1)}
                    disabled={library.length < 2}
                    className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-all hover:border-acid hover:text-acid disabled:opacity-30"
                    aria-label="Previous track"
                  >
                    <SkipBack size={15} />
                  </button>
                  <button
                    onClick={toggle}
                    disabled={working}
                    className="grid h-14 w-14 place-items-center rounded-full bg-acid text-bg transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-40"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => step(1)}
                    disabled={library.length < 2}
                    className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-all hover:border-acid hover:text-acid disabled:opacity-30"
                    aria-label="Next track"
                  >
                    <SkipForward size={15} />
                  </button>
                </div>

                <span className="font-mono text-xs text-dim">
                  {formatTime(time)} <span className="text-ink/25">/ {formatTime(duration)}</span>
                  <span className="ml-3 hidden font-mono text-[9px] tracking-[0.15em] text-ink/30 lg:inline">
                    [SPACE]
                  </span>
                </span>

                <div className="flex items-center gap-3">
                  <Volume2 size={14} className="text-dim" />
                  <input
                    type="range"
                    className="fader"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={{ width: 96, "--fill": `${volume * 100}%` } as React.CSSProperties}
                  />
                </div>

                <button
                  onClick={downloadWav}
                  disabled={working}
                  className="ml-auto flex items-center gap-2.5 rounded-full border border-line px-5 py-2.5 font-mono text-[10px] tracking-[0.2em] text-ink transition-all hover:border-acid hover:text-acid disabled:opacity-30"
                >
                  <Download size={13} />
                  EXPORT .WAV
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

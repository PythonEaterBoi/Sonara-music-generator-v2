import { motion } from "framer-motion";
import { Music4, Play, Trash2 } from "lucide-react";
import { formatTime, usePlayer } from "@/hooks/usePlayer";
import { keyName } from "@/lib/audio/core";
import { STYLES } from "@/lib/audio/styles";

export default function Library() {
  const { library, playItem, removeItem, currentId, isPlaying } = usePlayer();

  return (
    <section id="library" className="relative z-10 mx-auto max-w-[1440px] px-5 py-24 md:px-10 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="flex flex-wrap items-end justify-between gap-6"
      >
        <div>
          <p className="font-mono text-[10px] tracking-[0.4em] text-acid">02 — SESSIONS</p>
          <h2 className="mt-4 font-display text-4xl font-700 tracking-tight md:text-6xl">
            YOUR RENDERS
            <span className="text-outline ml-4">STAY HERE.</span>
          </h2>
        </div>
        <p className="max-w-xs font-mono text-[10px] leading-relaxed tracking-[0.14em] text-dim">
          EVERY GENERATION IS STORED LOCALLY IN YOUR BROWSER. RE-SYNTHESIZED ON
          DEMAND — NOTHING LEAVES THIS PAGE.
        </p>
      </motion.div>

      {library.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 grid place-items-center rounded-3xl border border-dashed border-line py-24 text-center"
        >
          <Music4 size={22} className="text-dim" />
          <p className="mt-4 font-mono text-[11px] tracking-[0.25em] text-dim">
            NO SESSIONS YET — SCROLL UP AND RENDER YOUR FIRST TRACK
          </p>
        </motion.div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {library.map((item, i) => {
            const active = item.id === currentId;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.4) }}
                className={`group relative overflow-hidden rounded-2xl border bg-panel/60 backdrop-blur transition-colors ${
                  active ? "border-acid/70" : "border-line hover:border-ink/25"
                }`}
              >
                <button
                  onClick={() => void playItem(item.id)}
                  className="relative block w-full text-left"
                  aria-label={`Play ${item.song.title}`}
                >
                  <div className="relative aspect-square overflow-hidden">
                    {item.cover && (
                      <img
                        src={item.cover}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent" />
                    <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-acid text-bg shadow-lg">
                        <Play size={17} className="ml-0.5" />
                      </span>
                    </div>
                    {active && (
                      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-bg/70 px-2.5 py-1 backdrop-blur">
                        <span className="flex h-2.5 items-end gap-[2px]">
                          {[0, 1, 2].map((b) => (
                            <span
                              key={b}
                              className={`w-[2px] rounded-sm bg-acid ${isPlaying ? "eq-bar" : ""}`}
                              style={{ height: "100%", animationDelay: `${b * 0.12}s`, animationDuration: `${0.5 + b * 0.14}s` }}
                            />
                          ))}
                        </span>
                        <span className="font-mono text-[8px] tracking-[0.2em] text-acid">
                          {isPlaying ? "PLAYING" : "LOADED"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="truncate font-display text-sm font-600">{item.song.title}</p>
                    <p className="mt-1 truncate font-mono text-[9px] tracking-[0.16em] text-dim">
                      {STYLES[item.song.style].label} · {keyName(item.song.root)} ·{" "}
                      {item.song.bpm} BPM · {formatTime(item.song.duration)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  aria-label="Delete track"
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-line bg-bg/60 text-dim opacity-0 backdrop-blur transition-all hover:border-red-400/60 hover:text-red-300 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const ITEMS = [
  "LO-FI", "SYNTHWAVE", "TECHNO", "HOUSE", "TRAP", "AMBIENT", "CINEMATIC", "DRUM & BASS",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative z-10 mt-24 overflow-hidden border-y border-line py-5 md:mt-32">
      <div className="mask-fade-x">
        <div className="animate-marquee flex w-max items-center gap-10 pr-10">
          {row.map((item, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className="whitespace-nowrap font-display text-lg font-500 tracking-wide text-ink/70 md:text-xl">
                {item}
              </span>
              <span className="font-mono text-xs text-acid">//</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

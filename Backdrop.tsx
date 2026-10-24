/* ------------------------------------------------------------------
   SONARA · backdrop — audio-reactive ribbons + particles canvas
-------------------------------------------------------------------*/

import { useEffect, useRef } from "react";
import { getSharedAnalyser } from "@/hooks/usePlayer";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  hue: number;
}

export default function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const NP = 90;
    const parts: P[] = Array.from({ length: NP }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.02,
      vy: -0.01 - Math.random() * 0.03,
      s: 0.6 + Math.random() * 1.8,
      hue: Math.random(),
    }));

    const freq = new Uint8Array(256);
    let t = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // energy + spectrum
      let energy = 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.5));
      const an = getSharedAnalyser();
      let bass = 0;
      let treble = 0;
      if (an) {
        an.getByteFrequencyData(freq);
        let sum = 0;
        let bSum = 0;
        for (let i = 0; i < freq.length; i++) {
          sum += freq[i] as number;
          if (i < 12) bSum += freq[i] as number;
        }
        const avg = sum / freq.length / 255;
        bass = bSum / 12 / 255;
        let tSum = 0;
        for (let i = 120; i < 200; i++) tSum += freq[i] as number;
        treble = tSum / 80 / 255;
        energy = Math.max(energy * 0.4, avg * 1.2);
      }

      g.fillStyle = "rgba(7,7,8,0.34)";
      g.fillRect(0, 0, w, h);

      /* ribbons */
      g.globalCompositeOperation = "lighter";
      const ribbons = [
        { base: 0.82, amp: 26, color: "rgba(205,255,61,", alpha: 0.14 + bass * 0.22, speed: 0.35, f1: 1.6, f2: 3.1 },
        { base: 0.62, amp: 34, color: "rgba(139,92,255,", alpha: 0.1 + energy * 0.2, speed: 0.22, f1: 2.2, f2: 4.4 },
        { base: 0.4, amp: 22, color: "rgba(237,235,228,", alpha: 0.05 + treble * 0.16, speed: 0.5, f1: 3.4, f2: 6.2 },
      ];
      for (const r of ribbons) {
        g.beginPath();
        for (let x = 0; x <= w; x += 14) {
          const p = x / w;
          const bin = (freq[Math.floor(p * 60) % freq.length] as number) / 255;
          const y =
            h * r.base +
            Math.sin(p * Math.PI * r.f1 + t * r.speed) * r.amp * (0.5 + energy) +
            Math.sin(p * Math.PI * r.f2 - t * r.speed * 1.7) * r.amp * 0.5 * (0.4 + energy) -
            bin * 46 * (0.4 + energy);
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokeStyle = `${r.color}${r.alpha})`;
        g.lineWidth = 1.2;
        g.stroke();
      }

      /* particles */
      const boost = 1 + energy * 5 + bass * 4;
      for (const p of parts) {
        p.x += p.vx * dt * boost + Math.sin(t + p.y * 8) * 0.0002;
        p.y += p.vy * dt * boost;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        const a = (0.06 + energy * 0.35) * (p.hue > 0.85 ? 1.7 : 1);
        g.fillStyle =
          p.hue > 0.85 ? `rgba(205,255,61,${a})` : `rgba(237,235,228,${a * 0.8})`;
        g.beginPath();
        g.arc(p.x * w, p.y * h, p.s * (0.7 + energy * 0.8), 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-vio/10 blur-[140px]" />
        <div className="absolute -right-40 top-2/3 h-[30rem] w-[30rem] rounded-full bg-acid/[0.07] blur-[140px]" />
      </div>
      <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-90" />
    </>
  );
}

/* ------------------------------------------------------------------
   SONARA · cover — paints a unique generative cover per track
-------------------------------------------------------------------*/

import { StyleId, mulberry32 } from "./core";

const PALETTES: Record<StyleId, string[]> = {
  lofi: ["#c98f4e", "#7a5c3e", "#e4c98f", "#3d2f22"],
  synthwave: ["#ff2e88", "#7b3dff", "#00e0ff", "#12021f"],
  techno: ["#cdff3d", "#1a1a1a", "#6b6b6b", "#0a0a0a"],
  house: ["#ffb03a", "#ff5c28", "#7b3dff", "#1c0b02"],
  trap: ["#8b5cff", "#2b1245", "#ff2e55", "#12081f"],
  ambient: ["#5ce1e6", "#8b9dff", "#d8f4ff", "#0a1020"],
  cinematic: ["#e6b45c", "#8a2e2e", "#3d3d5c", "#0c0a08"],
  dnb: ["#3dff9e", "#123d2b", "#cdff3d", "#04120b"],
};

export function makeCover(seed: number, style: StyleId, size = 384): string {
  const rng = mulberry32(seed ^ 0xc0ffee);
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d");
  if (!g) return "";
  const pal = PALETTES[style] ?? PALETTES.lofi;
  const bg = pal[pal.length - 1] as string;
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);

  // large soft blobs
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = size * (0.25 + rng() * 0.45);
    const col = pal[Math.floor(rng() * (pal.length - 1))] as string;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, col + "e6");
    grad.addColorStop(1, col + "00");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }

  // waveform streak
  g.globalAlpha = 0.9;
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = size * 0.006;
  g.beginPath();
  const mid = size * (0.35 + rng() * 0.3);
  const amp = size * (0.05 + rng() * 0.12);
  const freq = 2 + Math.floor(rng() * 4);
  for (let x = 0; x <= size; x += 4) {
    const y =
      mid +
      Math.sin((x / size) * Math.PI * 2 * freq + rng() * 0.6) * amp * Math.sin((x / size) * Math.PI);
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 1;

  // grain
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rng() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, (d[i] as number) + noise));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] as number) + noise));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] as number) + noise));
  }
  g.putImageData(img, 0, 0);

  // vignette
  const vg = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vg;
  g.fillRect(0, 0, size, size);

  return cv.toDataURL("image/jpeg", 0.82);
}

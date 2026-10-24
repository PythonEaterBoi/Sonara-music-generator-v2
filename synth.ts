/* ------------------------------------------------------------------
   SONARA · synth — renders a Song to an AudioBuffer (offline)
   Kick/snare/hats, 808s, pads, plucks, bells, stabs, FX buses,
   sidechain ducking, vinyl crackle, soft-clip mastering.
-------------------------------------------------------------------*/

import { Song, clamp, m2f, mulberry32 } from "./core";
import { MOODS, STYLES } from "./styles";

export interface RenderResult {
  buffer: AudioBuffer;
  peaks: number[];
  duration: number;
}

const SR = 44100;

function makeCurve(drive: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = 1 + drive * 3;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) * 0.92;
  }
  return curve;
}

export async function renderSong(
  song: Song,
  opts: { brightness?: number } = {},
  onProgress?: (p: number) => void
): Promise<RenderResult> {
  const P = STYLES[song.style];
  const M = MOODS[song.mood];
  const bright = clamp(P.bright + M.brightShift + (opts.brightness ?? 0.5 - 0.5), 0.08, 1);
  const tail = 2.8;
  const total = Math.min(song.duration + tail, 300);
  const spb = (4 * 60) / song.bpm;

  const Ctor: typeof OfflineAudioContext =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const ctx = new Ctor(2, Math.ceil(total * SR), SR);

  /* ----------------------- master & buses ----------------------- */
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const preClip = ctx.createGain();
  preClip.gain.value = 1 + P.drive * 0.9;
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeCurve(P.drive);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 18;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  master.connect(preClip);
  preClip.connect(shaper);
  shaper.connect(comp);
  comp.connect(ctx.destination);

  const duckBus = ctx.createGain(); // harmonic content (sidechained)
  duckBus.connect(master);
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.95;
  bassBus.connect(master);
  const drumBus = ctx.createGain();
  drumBus.gain.value = 1;
  drumBus.connect(master);

  /* reverb */
  const revIn = ctx.createGain();
  const conv = ctx.createConvolver();
  {
    const len = Math.floor(SR * 3.0);
    const imp = ctx.createBuffer(2, len, SR);
    const rng = mulberry32(1234567);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
    }
    conv.buffer = imp;
  }
  const revWet = ctx.createGain();
  revWet.gain.value = clamp(P.rev + M.revShift, 0, 1.2) * 0.9;
  const revLp = ctx.createBiquadFilter();
  revLp.type = "lowpass";
  revLp.frequency.value = 3600;
  revIn.connect(conv);
  conv.connect(revWet);
  revWet.connect(revLp);
  revLp.connect(master);

  /* tempo-synced delay */
  const dlyIn = ctx.createGain();
  const dly = ctx.createDelay(2);
  dly.delayTime.value = clamp(spb * 0.375, 0.08, 1.5);
  const dlyFb = ctx.createGain();
  dlyFb.gain.value = 0.34;
  const dlyLp = ctx.createBiquadFilter();
  dlyLp.type = "lowpass";
  dlyLp.frequency.value = 2600;
  const dlyWet = ctx.createGain();
  dlyWet.gain.value = P.dly * 0.55;
  dlyIn.connect(dly);
  dly.connect(dlyFb);
  dlyFb.connect(dlyLp);
  dlyLp.connect(dly);
  dly.connect(dlyWet);
  dlyWet.connect(master);

  /* per-instrument send taps */
  const tap = (target: AudioNode, v: number) => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(target);
    return g;
  };
  const sends = {
    padRev: tap(revIn, 0.85),
    leadRev: tap(revIn, 0.4),
    leadDly: tap(dlyIn, 0.85),
    arpRev: tap(revIn, 0.3),
    arpDly: tap(dlyIn, 0.45),
    snRev: tap(revIn, song.style === "synthwave" ? 0.9 : 0.45),
    clRev: tap(revIn, 0.7),
    boomRev: tap(revIn, 0.9),
  };

  /* sidechain ducking */
  if (P.duck > 0.01) {
    const depth = P.duck * 0.5;
    for (const t of song.duck) {
      const g = duckBus.gain;
      g.setValueAtTime(1, Math.max(0, t - 0.012));
      g.linearRampToValueAtTime(1 - depth, t + 0.014);
      g.setTargetAtTime(1, t + 0.05, 0.1);
    }
  }

  /* shared white-noise buffer */
  const noiseBuf = ctx.createBuffer(1, SR * 2, SR);
  {
    const d = noiseBuf.getChannelData(0);
    const rng = mulberry32(song.seed ^ 0xabcdef);
    for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
  }

  /* --------------------------- helpers --------------------------- */
  const envGain = (
    t: number,
    a: number,
    d: number,
    peak: number,
    end = 0.0001
  ): GainNode => {
    const g = ctx.createGain();
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + Math.max(a, 0.0015));
    p.exponentialRampToValueAtTime(end, t + a + d);
    return g;
  };

  const noiseSrc = (t: number, dur: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.1);
    return s;
  };

  const osc = (type: OscillatorType, f: number, t: number, dur: number, det = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (det) o.detune.setValueAtTime(det, t);
    o.start(t);
    o.stop(t + dur + 0.6);
    return o;
  };

  /* --------------------------- drums --------------------------- */
  const isTrap = song.style === "trap";
  const isCine = song.style === "cinematic";

  function kick(t: number, v: number) {
    const p0 = isTrap ? 130 : isCine ? 90 : 150;
    const p1 = isTrap ? 38 : 48;
    const len = isCine ? 0.65 : isTrap ? 0.5 : song.style === "lofi" ? 0.22 : 0.3;
    const o = osc("sine", p0, t, len);
    o.frequency.setValueAtTime(p0, t);
    o.frequency.exponentialRampToValueAtTime(p1, t + 0.09);
    const g = envGain(t, 0.004, len, 1.2 * v);
    o.connect(g);
    g.connect(drumBus);
    if (isCine) g.connect(sends.boomRev);
    // click
    const n = noiseSrc(t, 0.02);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400;
    const ng = envGain(t, 0.001, 0.02, 0.3 * v);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(drumBus);
    if (isTrap) {
      // 808 sub tail
      const o2 = osc("sine", p1, t, 0.42);
      const g2 = envGain(t, 0.005, 0.42, 0.5 * v);
      o2.connect(g2);
      g2.connect(drumBus);
    }
  }

  function snare(t: number, v: number, longVerb = false) {
    const n = noiseSrc(t, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = isCine ? 900 : 1900;
    bp.Q.value = 0.8;
    const ng = envGain(t, 0.002, isCine ? 0.34 : 0.17, 0.8 * v);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(drumBus);
    ng.connect(sends.snRev);
    const o = osc("triangle", isCine ? 140 : 190, t, 0.12);
    const og = envGain(t, 0.002, 0.11, 0.5 * v);
    o.connect(og);
    og.connect(drumBus);
    if (longVerb || song.style === "synthwave") {
      const tailG = envGain(t + 0.02, 0.01, 0.4, 0.24 * v);
      n.connect(tailG);
      tailG.connect(sends.snRev);
    }
  }

  function clap(t: number, v: number) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.012;
      const n = noiseSrc(tt, 0.08);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1150;
      bp.Q.value = 1.6;
      const g = envGain(tt, 0.001, 0.07, (i === 2 ? 0.62 : 0.4) * v);
      n.connect(bp);
      bp.connect(g);
      g.connect(drumBus);
      g.connect(sends.clRev);
    }
  }

  function hat(t: number, v: number, open: boolean) {
    const n = noiseSrc(t, open ? 0.4 : 0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7800;
    const g = envGain(t, 0.001, open ? 0.32 : 0.045, (open ? 0.42 : 0.36) * v);
    n.connect(hp);
    hp.connect(g);
    g.connect(drumBus);
  }

  function perc(t: number, v: number) {
    const n = noiseSrc(t, 0.06);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = song.style === "lofi" ? 2800 : 2400;
    bp.Q.value = 4;
    const g = envGain(t, 0.001, 0.05, 0.5 * v);
    n.connect(bp);
    bp.connect(g);
    g.connect(drumBus);
    const o = osc("sine", 820, t, 0.035);
    const og = envGain(t, 0.001, 0.032, 0.25 * v);
    o.connect(og);
    og.connect(drumBus);
  }

  function tom(t: number, v: number, pitch = 160) {
    const o = osc("sine", 1, t, 0.32);
    o.frequency.setValueAtTime(pitch * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(pitch, t + 0.16);
    const g = envGain(t, 0.003, 0.3, 0.7 * v);
    o.connect(g);
    g.connect(drumBus);
    g.connect(sends.boomRev);
  }

  function riser(t: number, d: number, v: number) {
    const n = noiseSrc(t, d + 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(6800, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * v, t + d);
    g.gain.setValueAtTime(0.0001, t + d + 0.001);
    n.connect(bp);
    bp.connect(g);
    g.connect(drumBus);
    g.connect(sends.clRev);
  }

  for (const e of song.drums) {
    switch (e.k) {
      case "k": kick(e.t, e.v); break;
      case "s": snare(e.t, e.v); break;
      case "h": hat(e.t, e.v, false); break;
      case "o": hat(e.t, e.v, true); break;
      case "c": clap(e.t, e.v); break;
      case "p": perc(e.t, e.v); break;
      case "t": tom(e.t, e.v, e.p ?? 160); break;
      case "r": riser(e.t, e.d ?? spb, e.v); break;
    }
  }

  /* --------------------------- pads --------------------------- */
  function padNote(t: number, d: number, m: number, v: number, c: number) {
    const f = m2f(m);
    const cut = clamp((620 + 3300 * bright) * (0.45 + 0.55 * (c ?? 1)), 180, 6800);
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = cut;
    flt.Q.value = 0.6;
    const g = ctx.createGain();
    const atk = song.style === "ambient" ? d * 0.35 : Math.min(0.9, d * 0.22);
    const rel = Math.min(1.6, d * 0.4);
    const lvl = 0.075 * v * P.padGain;
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(lvl, 0.001), t + atk);
    p.setValueAtTime(Math.max(lvl, 0.001), Math.max(t + atk, t + d - rel));
    p.exponentialRampToValueAtTime(0.0001, t + d + rel);
    const o1 = osc("sawtooth", f, t, d + rel, -7);
    const o2 = osc("sawtooth", f, t, d + rel, 7);
    if (song.style === "lofi") {
      // gentle wow/flutter
      const lfo = osc("sine", 4.3, t, d + rel);
      const lfoG = ctx.createGain();
      lfoG.gain.value = 5;
      lfo.connect(lfoG);
      lfoG.connect(o1.detune);
      lfoG.connect(o2.detune);
    }
    o1.connect(flt);
    o2.connect(flt);
    flt.connect(g);
    g.connect(duckBus);
    g.connect(sends.padRev);
  }
  for (const n of song.pad) padNote(n.t, n.d, n.m, n.v, n.c ?? 1);

  /* --------------------------- bass --------------------------- */
  let lastBassF = 0;
  function bassNote(t: number, d: number, m: number, v: number, c: number) {
    const f = m2f(m);
    const cut = clamp((240 + 1500 * bright) * (0.5 + 0.5 * c), 90, 2800);
    if (song.style === "trap") {
      // glide 808
      const o = osc("sine", f, t, d + 0.35);
      if (lastBassF) {
        o.frequency.setValueAtTime(lastBassF, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      }
      lastBassF = f;
      const oH = osc("sine", f * 2.01, t, d);
      const gH = envGain(t, 0.005, d * 0.7, 0.12 * v);
      const g = ctx.createGain();
      const p = g.gain;
      p.setValueAtTime(0.0001, t);
      p.exponentialRampToValueAtTime(0.62 * v, t + 0.012);
      p.setTargetAtTime(0.0001, t + Math.max(d * 0.55, 0.05), 0.12);
      o.connect(g);
      oH.connect(gH);
      gH.connect(g);
      g.connect(bassBus);
      return;
    }
    const reese = song.style === "dnb";
    const sub = song.style !== "lofi";
    const g = ctx.createGain();
    const lvl = (song.style === "lofi" ? 0.34 : 0.42) * v;
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.001, lvl), t + 0.012);
    p.setValueAtTime(Math.max(0.001, lvl * 0.8), t + Math.max(d * 0.6, 0.03));
    p.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.Q.value = song.style === "techno" ? 7 : 3;
    flt.frequency.setValueAtTime(cut * 1.9, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.5), t + Math.min(d, 0.28));
    const o1 = osc(song.style === "lofi" ? "triangle" : "sawtooth", f, t, d, reese ? -22 : -4);
    o1.connect(flt);
    if (reese) {
      const o2 = osc("sawtooth", f, t, d, 22);
      o2.connect(flt);
    }
    flt.connect(g);
    if (sub) {
      const s = osc("sine", f, t, d);
      const sg = envGain(t, 0.008, d, 0.3 * v);
      s.connect(sg);
      sg.connect(g);
    }
    g.connect(bassBus);
  }
  for (const n of song.bass) bassNote(n.t, n.d, n.m, n.v, n.c ?? 1);

  /* --------------------------- lead --------------------------- */
  const leadT = STYLES[song.style].leadTimbre;
  function leadNote(i: number, t: number, d: number, m: number, v: number, c: number) {
    const f = m2f(m);
    if (leadT === "bell") {
      const car = osc("sine", f, t, d + 1.4);
      const mod = osc("sine", f * 3.008, t, d);
      const mG = ctx.createGain();
      mG.gain.setValueAtTime(f * 2.4, t);
      mG.gain.exponentialRampToValueAtTime(f * 0.02, t + Math.min(d, 0.9));
      mod.connect(mG);
      mG.connect(car.frequency);
      const g = envGain(t, 0.004, Math.min(d + 1.2, 2.2), 0.17 * v);
      car.connect(g);
      g.connect(duckBus);
      g.connect(sends.leadRev);
      g.connect(sends.leadDly);
      return;
    }
    if (leadT === "stab" || leadT === "seq") {
      const cut = (leadT === "seq" ? (i % 2 === 0 ? 1 : 0.45) : 1) * (700 + 4200 * bright) * (0.4 + 0.6 * c);
      const flt = ctx.createBiquadFilter();
      flt.type = "lowpass";
      flt.Q.value = leadT === "seq" ? 9 : 2.5;
      flt.frequency.setValueAtTime(clamp(cut, 200, 7500), t);
      flt.frequency.exponentialRampToValueAtTime(clamp(cut * 0.32, 160, 4000), t + Math.min(d, 0.16));
      const g = envGain(t, 0.002, leadT === "stab" ? 0.16 : d, (leadT === "stab" ? 0.13 : 0.12) * v);
      const o = osc("sawtooth", f, t, d + 0.1, 4);
      const o2 = osc("square", f / 2, t, d + 0.1);
      const g2 = ctx.createGain();
      g2.gain.value = 0.4;
      o.connect(flt);
      o2.connect(g2);
      g2.connect(flt);
      flt.connect(g);
      g.connect(duckBus);
      g.connect(sends.arpDly);
      g.connect(sends.arpRev);
      return;
    }
    // pluck (default) — dreamy, echo-ey
    const cut = clamp((900 + 5200 * bright * (0.3 + 0.7 * v)) * (0.45 + 0.6 * c), 300, 8000);
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.Q.value = 2;
    flt.frequency.setValueAtTime(cut, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(240, cut * 0.24), t + Math.min(d, 0.22));
    const g = envGain(t, 0.003, Math.min(d * 0.75, 0.5), 0.15 * v);
    const tailG = ctx.createGain();
    tailG.gain.setValueAtTime(0.05 * v, t);
    tailG.gain.setTargetAtTime(0.0001, t + 0.1, Math.max(d * 0.3, 0.12));
    const o = osc("sawtooth", f, t, d + 0.6, 5);
    const o2 = osc("triangle", f * 2, t, d + 0.3);
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    o.connect(flt);
    o2.connect(g2);
    g2.connect(flt);
    flt.connect(g);
    flt.connect(tailG);
    g.connect(duckBus);
    tailG.connect(duckBus);
    g.connect(sends.leadDly);
    g.connect(sends.leadRev);
    if (song.style === "synthwave") {
      const vib = osc("sine", 5.4, t, d);
      const vG = ctx.createGain();
      vG.gain.setValueAtTime(0, t);
      vG.gain.linearRampToValueAtTime(9, t + Math.min(d * 0.5, 0.4));
      vib.connect(vG);
      vG.connect(o.detune);
    }
  }
  song.lead.forEach((n, i) => leadNote(i, n.t, n.d, n.m, n.v, n.c ?? 1));

  /* --------------------------- arp --------------------------- */
  function arpNote(t: number, d: number, m: number, v: number, c: number) {
    const f = m2f(m);
    const cut = clamp((800 + 4600 * bright) * (0.5 + 0.5 * c), 300, 7800);
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.Q.value = 3.5;
    flt.frequency.setValueAtTime(cut, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(220, cut * 0.3), t + 0.12);
    const g = envGain(t, 0.002, Math.max(d, 0.09), 0.085 * v * 3);
    const o = osc("sawtooth", f, t, d + 0.2, 6);
    o.connect(flt);
    flt.connect(g);
    g.connect(duckBus);
    g.connect(sends.arpDly);
    g.connect(sends.arpRev);
  }
  for (const n of song.arp) arpNote(n.t, n.d, n.m, n.v, n.c ?? 1);

  /* --------------------------- vinyl crackle --------------------------- */
  if (song.crackle) {
    const len = Math.ceil(total * SR);
    const buf = ctx.createBuffer(1, len, SR);
    const d = buf.getChannelData(0);
    const rng = mulberry32(song.seed ^ 0x77aa11);
    let nextPop = 2000;
    for (let i = 0; i < len; i++) {
      d[i] = (rng() * 2 - 1) * 0.06;
      if (i > nextPop) {
        const amp = 0.25 + rng() * 0.7;
        const pl = 12 + Math.floor(rng() * 40);
        for (let j = 0; j < pl && i + j < len; j++) {
          d[i + j] = (d[i + j] as number) + (rng() * 2 - 1) * amp * Math.pow(1 - j / pl, 1.6);
        }
        nextPop = i + 3000 + Math.floor(Math.pow(rng(), 2) * 45000);
        i += pl;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3400;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(lp);
    lp.connect(g);
    g.connect(drumBus);
    src.start(0);
  }

  /* --------------------------- render --------------------------- */
  const checkpoints = Math.max(2, Math.floor(total / 1.5));
  for (let i = 1; i < checkpoints; i++) {
    const tt = (total / checkpoints) * i;
    if (tt < total - 0.2) {
      const frac = i / checkpoints;
      ctx.suspend(tt).then(() => {
        onProgress?.(frac);
        ctx.resume();
      });
    }
  }

  const rendered = await ctx.startRendering();

  /* ------------------- normalize + fade + peaks ------------------- */
  const ch0 = rendered.getChannelData(0);
  const ch1 = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : ch0;
  let peak = 0.0001;
  for (let i = 0; i < ch0.length; i += 4) {
    const a = Math.abs(ch0[i] as number);
    const b = Math.abs(ch1[i] as number);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }
  const norm = Math.min(1 / peak, 4) * 0.94;

  const out = new AudioBuffer({
    length: rendered.length,
    numberOfChannels: rendered.numberOfChannels,
    sampleRate: SR,
  });
  const fadeLen = Math.floor(SR * 1.6);
  for (let ch = 0; ch < out.numberOfChannels; ch++) {
    const src = rendered.getChannelData(ch);
    const dst = new Float32Array(rendered.length);
    for (let i = 0; i < rendered.length; i++) {
      let f = norm;
      if (i > rendered.length - fadeLen) {
        const x = (rendered.length - i) / fadeLen;
        f *= x * x;
      }
      dst[i] = (src[i] as number) * f;
    }
    out.copyToChannel(dst, ch);
  }

  const data = out.getChannelData(0);
  const dataR = out.numberOfChannels > 1 ? out.getChannelData(1) : data;
  const buckets = 240;
  const peaks: number[] = [];
  const per = Math.floor(out.length / buckets);
  for (let bkt = 0; bkt < buckets; bkt++) {
    let mx = 0;
    const start = bkt * per;
    for (let i = start; i < start + per; i += 16) {
      const a = Math.abs(data[i] as number) + Math.abs(dataR[i] as number);
      if (a > mx) mx = a;
    }
    peaks.push(Math.min(1, mx * 0.75));
  }

  return { buffer: out, peaks, duration: song.duration };
}

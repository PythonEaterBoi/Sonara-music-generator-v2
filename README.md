# SONARA — AI Music Generator

An AI-style music engine that runs **entirely in the browser**. Type a mood,
and SONARA parses your prompt, composes an original arrangement (harmony,
melody, bass, drums), synthesizes every voice with the Web Audio API, masters
it offline — then lets you scrub the waveform and export a real `.wav`.

No samples. No servers. No accounts. One static file.

## Features

- **Prompt analysis** — detects style (lo-fi, synthwave, techno, house, trap,
  ambient, cinematic, drum & bass), mood, explicit tempo (`134 bpm`) and key
  (`in D minor`).
- **Seeded composition engine** — same prompt + same seed = same song.
  Chord progressions on 9 scale modes, walking basslines, phrase-based lead
  melodies, style-specific drum patterns with swing, ghost notes, fills,
  risers and tom runs.
- **Full synthesis** — kicks, 808 glide bass, supersaw pads, plucks, FM bells,
  stabs, convolution reverb, tempo-synced delay, sidechain pump, vinyl
  crackle, soft-clip mastering with loudness normalization.
- **Real player** — offline-rendered audio means perfect scrubbing, pause,
  seek, volume, real-time analyser visuals and WAV export.
- **Session library** — every render is stored locally in your browser.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is a **single self-contained `dist/index.html`** (JS, CSS and artwork
inlined) — drop it into any static host as-is.

## Deploy to GitHub Pages

1. `npm run build`
2. Push the repo, then either:
   - copy `dist/index.html` to a `gh-pages` branch (or `/docs` folder) and
     enable **Settings → Pages → Deploy from branch**, or
   - use the official `peaceiris/actions-gh-pages` action to publish `dist/`.

No routing, base-path config or server needed — the file works from any path,
including `https://<user>.github.io/<repo>/`.

## Stack

React 19 · Vite · Tailwind CSS v4 · Framer Motion · Web Audio API
(OfflineAudioContext rendering) · localStorage persistence.

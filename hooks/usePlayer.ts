import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { MoodId, Song, StyleId } from "../core";

export type PlayerStatus = "idle" | "working" | "ready";

export interface GenerateParams {
  prompt: string;
  style: StyleId | null;
  mood: MoodId | null;
  bpm: number | null;
  root: number | null;
  energy: number;
  targetSec: number;
  salt: number;
  brightness: number;
}

export interface LibraryItem {
  id: string;
  song: Song;
  cover: string | null;
}

export interface PlayerContextValue {
  status: PlayerStatus;
  progress: number;
  logs: string[];
  song: Song | null;
  cover: string | null;
  isPlaying: boolean;
  time: number;
  duration: number;
  volume: number;
  setVolume: (value: number) => void;
  toggle: () => void;
  seekFrac: (value: number) => void;
  generate: (params: GenerateParams) => Promise<void>;
  playItem: (id: string) => Promise<void>;
  removeItem: (id: string) => void;
  library: LibraryItem[];
  currentId: string | null;
  downloadWav: () => void;
  peaks: number[];
}

export function getSharedAnalyser(): AnalyserNode | null {
  return null;
}

export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> sonara engine idle — awaiting prompt"]);
  const [song, setSong] = useState<Song | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [peaks, setPeaks] = useState<number[]>([]);

  const pushLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const generate = useCallback(async (params: GenerateParams) => {
    setStatus("working");
    setProgress(0.06);
    setLogs([`> generating : ${params.prompt || "surprise mode"}`]);

    const fakeSong: Song = {
      seed: params.salt || 1,
      title: params.prompt.trim() || "Untitled Signal",
      style: params.style ?? "lofi",
      mood: params.mood ?? "dreamy",
      bpm: params.bpm ?? 120,
      root: params.root ?? 0,
      scaleName: "minor",
      bars: 16,
      duration: params.targetSec || 75,
      pad: [],
      bass: [],
      lead: [],
      arp: [],
      drums: [],
      duck: [],
      crackle: false,
      prompt: params.prompt,
    };

    await new Promise((resolve) => setTimeout(resolve, 200));
    setProgress(0.5);
    setSong(fakeSong);
    setDuration(fakeSong.duration);
    setCover(null);
    setCurrentId(`session-${params.salt}`);
    setLibrary((prev) => [{ id: `session-${params.salt}`, song: fakeSong, cover: null }, ...prev]);
    setStatus("ready");
    setProgress(1);
    setIsPlaying(true);
    setPeaks(Array.from({ length: 240 }, (_, idx) => 0.08 + ((idx % 13) / 13) * 0.45));
    pushLog("render complete — engine ready");
  }, [pushLog]);

  const toggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const seekFrac = useCallback((value: number) => {
    if (!song) return;
    setTime(Math.max(0, Math.min(song.duration, value * song.duration)));
  }, [song]);

  const playItem = useCallback(async (id: string) => {
    const item = library.find((entry) => entry.id === id);
    if (!item) return;
    setCurrentId(id);
    setSong(item.song);
    setDuration(item.song.duration);
    setCover(item.cover);
    setIsPlaying(true);
    setProgress(1);
    pushLog(`loaded session — ${item.song.title}`);
  }, [library, pushLog]);

  const removeItem = useCallback((id: string) => {
    setLibrary((prev) => prev.filter((entry) => entry.id !== id));
    if (currentId === id) {
      setCurrentId(null);
      setSong(null);
      setIsPlaying(false);
    }
  }, [currentId]);

  const downloadWav = useCallback(() => {
    pushLog("export .wav — queued");
  }, [pushLog]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.max(0, Math.min(1, value)));
  }, []);

  const value = useMemo<PlayerContextValue>(() => ({
    status,
    progress,
    logs,
    song,
    cover,
    isPlaying,
    time,
    duration,
    volume,
    setVolume,
    toggle,
    seekFrac,
    generate,
    playItem,
    removeItem,
    library,
    currentId,
    downloadWav,
    peaks,
  }), [status, progress, logs, song, cover, isPlaying, time, duration, volume, setVolume, toggle, seekFrac, generate, playItem, removeItem, library, currentId, downloadWav, peaks]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}

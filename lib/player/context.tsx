"use client";

import {
  createContext, useContext, useRef, useState,
  useEffect, useCallback, type ReactNode,
} from "react";
import type { PlayerTrack, PlayerState, PlayerContextValue, RepeatMode } from "./types";
import { loadPlayer, savePlayer } from "./storage";

// ── Module-level audio singleton ──────────────────────────────────────────────
// Kept outside React so it survives Strict Mode double-invocations and never
// gets garbage-collected by the component lifecycle.
let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = "auto";
  }
  return _audio;
}

// ── Pure helpers (no React deps) ──────────────────────────────────────────────
function shuffleArray(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextIndex(s: PlayerState): number {
  const { queueIndex, queue, shuffle, shuffledIndices, repeat } = s;
  if (!queue.length) return -1;
  if (repeat === "one") return queueIndex;
  if (shuffle) {
    const pos = shuffledIndices.indexOf(queueIndex);
    const nxt = pos + 1;
    if (nxt >= shuffledIndices.length) return repeat === "all" ? shuffledIndices[0] : -1;
    return shuffledIndices[nxt];
  }
  const nxt = queueIndex + 1;
  if (nxt >= queue.length) return repeat === "all" ? 0 : -1;
  return nxt;
}

function prevIndex(s: PlayerState): number {
  const { queueIndex, queue, shuffle, shuffledIndices } = s;
  if (!queue.length) return -1;
  if (shuffle) {
    const pos = shuffledIndices.indexOf(queueIndex);
    return pos > 0 ? shuffledIndices[pos - 1] : shuffledIndices[shuffledIndices.length - 1];
  }
  return queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
}

function applyMediaSession(track: PlayerTrack) {
  if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork: track.coverImage
      ? [{ src: track.coverImage, sizes: "512x512", type: "image/jpeg" }]
      : [],
  });
}

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULTS: PlayerState = {
  track: null, queue: [], queueIndex: -1,
  isPlaying: false, isLoading: false,
  currentTime: 0, duration: 0,
  volume: 0.8, muted: false,
  shuffle: false, shuffledIndices: [],
  repeat: "none", showQueue: false,
};

// ── Context ───────────────────────────────────────────────────────────────────
const Ctx = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(DEFAULTS);
  const stateRef = useRef<PlayerState>(DEFAULTS);
  stateRef.current = state;

  // ── Boot: restore persisted state + wire audio events ────────────────────
  useEffect(() => {
    const audio = getAudio();
    const saved = loadPlayer();

    // Restore preferences (don't auto-play — browser blocks it)
    const volume   = saved.volume    ?? 0.8;
    const muted    = saved.muted     ?? false;
    const shuffle  = saved.shuffle   ?? false;
    const repeat   = (saved.repeat   ?? "none") as RepeatMode;
    const track    = saved.track     ?? null;
    const queue    = saved.queue     ?? [];
    const queueIndex = saved.queueIndex ?? -1;
    const currentTime = saved.currentTime ?? 0;

    audio.volume = volume;
    audio.muted  = muted;

    // If there was a track, preload it at the saved position (no autoplay)
    if (track?.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
      // seek after metadata loads
      const onLoaded = () => { audio.currentTime = currentTime; };
      audio.addEventListener("loadedmetadata", onLoaded, { once: true });
    }

    setState({
      ...DEFAULTS, volume, muted, shuffle, repeat,
      track, queue, queueIndex, currentTime,
    });

    // ── Audio event handlers ────────────────────────────────────────────────
    const onCanPlay    = () => setState(s => ({ ...s, isLoading: false }));
    const onWaiting    = () => setState(s => ({ ...s, isLoading: true }));
    const onPlaying    = () => setState(s => ({ ...s, isPlaying: true, isLoading: false }));
    const onPause      = () => setState(s => ({ ...s, isPlaying: false }));
    const onDuration   = () => setState(s => ({ ...s, duration: audio.duration || 0 }));
    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setState(s => ({ ...s, currentTime: t }));
      savePlayer({ currentTime: t });
    };
    const onError = () => setState(s => ({ ...s, isLoading: false, isPlaying: false }));
    const onEnded = () => {
      const s = stateRef.current;
      if (s.repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const ni = nextIndex(s);
      if (ni === -1) {
        setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
        return;
      }
      const next = s.queue[ni];
      if (next) loadAndPlay(next, ni);
    };

    audio.addEventListener("canplay",       onCanPlay);
    audio.addEventListener("waiting",       onWaiting);
    audio.addEventListener("playing",       onPlaying);
    audio.addEventListener("pause",         onPause);
    audio.addEventListener("durationchange",onDuration);
    audio.addEventListener("timeupdate",    onTimeUpdate);
    audio.addEventListener("error",         onError);
    audio.addEventListener("ended",         onEnded);

    return () => {
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("playing",        onPlaying);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("error",          onError);
      audio.removeEventListener("ended",          onEnded);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Media Session action handlers ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play",           () => getAudio().play().catch(() => {}));
    ms.setActionHandler("pause",          () => getAudio().pause());
    ms.setActionHandler("previoustrack",  () => previous());
    ms.setActionHandler("nexttrack",      () => next());
    ms.setActionHandler("seekto",         (d) => seek(d.seekTime ?? 0));
    ms.setActionHandler("seekforward",    () => seek(stateRef.current.currentTime + 10));
    ms.setActionHandler("seekbackward",   () => seek(stateRef.current.currentTime - 10));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core load+play ────────────────────────────────────────────────────────
  const loadAndPlay = useCallback((track: PlayerTrack, idx: number) => {
    const audio = getAudio();

    // Always update UI state so the PlayerBar appears
    setState(s => ({
      ...s, track, queueIndex: idx,
      isLoading: !!track.audioUrl,
      isPlaying: false, currentTime: 0, duration: 0,
    }));
    applyMediaSession(track);
    savePlayer({ track, queueIndex: idx });

    if (!track.audioUrl) return; // no audio file — show bar but don't play

    audio.src = track.audioUrl;
    audio.load();
    audio.play()
      .then(() => setState(s => ({ ...s, isPlaying: true })))
      .catch(() => setState(s => ({ ...s, isLoading: false })));
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const playTrack = useCallback((track: PlayerTrack, newQueue?: PlayerTrack[]) => {
    const q   = newQueue ?? [track];
    const idx = Math.max(0, q.findIndex(t => t.id === track.id));
    setState(s => {
      const si = s.shuffle ? shuffleArray(q.length) : [];
      savePlayer({ queue: q });
      return { ...s, queue: q, shuffledIndices: si };
    });
    loadAndPlay(track, idx);
  }, [loadAndPlay]);

  const playAlbum = useCallback((tracks: PlayerTrack[], startIndex = 0) => {
    if (!tracks.length) return;
    const idx   = Math.min(startIndex, tracks.length - 1);
    const track = tracks[idx];
    setState(s => {
      const si = s.shuffle ? shuffleArray(tracks.length) : [];
      savePlayer({ queue: tracks });
      return { ...s, queue: tracks, shuffledIndices: si };
    });
    loadAndPlay(track, idx);
  }, [loadAndPlay]);

  const pause = useCallback(() => getAudio().pause(), []);

  const resume = useCallback(() => getAudio().play().catch(() => {}), []);

  const togglePlay = useCallback(() => {
    stateRef.current.isPlaying ? getAudio().pause() : getAudio().play().catch(() => {});
  }, []);

  const next = useCallback(() => {
    const s  = stateRef.current;
    const ni = nextIndex(s);
    if (ni === -1) return;
    loadAndPlay(s.queue[ni], ni);
  }, [loadAndPlay]);

  const previous = useCallback(() => {
    const audio = getAudio();
    const s     = stateRef.current;
    // First 3 seconds → go to previous; after that → restart current
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const pi = prevIndex(s);
    if (pi === -1) return;
    loadAndPlay(s.queue[pi], pi);
  }, [loadAndPlay]);

  const seek = useCallback((seconds: number) => {
    const audio = getAudio();
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
  }, []);

  const setVolume = useCallback((v: number) => {
    const vol = Math.max(0, Math.min(1, v));
    getAudio().volume = vol;
    setState(s => ({ ...s, volume: vol, muted: vol === 0 }));
    savePlayer({ volume: vol, muted: vol === 0 });
  }, []);

  const toggleMute = useCallback(() => {
    const audio  = getAudio();
    const muted  = !audio.muted;
    audio.muted  = muted;
    setState(s => ({ ...s, muted }));
    savePlayer({ muted });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(s => {
      const shuffle = !s.shuffle;
      const si      = shuffle ? shuffleArray(s.queue.length) : [];
      savePlayer({ shuffle });
      return { ...s, shuffle, shuffledIndices: si };
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const order: RepeatMode[] = ["none", "all", "one"];
      const repeat = order[(order.indexOf(s.repeat) + 1) % order.length];
      savePlayer({ repeat });
      return { ...s, repeat };
    });
  }, []);

  const addToQueue = useCallback((track: PlayerTrack) => {
    setState(s => {
      const queue = [...s.queue, track];
      savePlayer({ queue });
      return { ...s, queue };
    });
  }, []);

  const playNext = useCallback((track: PlayerTrack) => {
    setState(s => {
      const at    = s.queueIndex + 1;
      const queue = [...s.queue.slice(0, at), track, ...s.queue.slice(at)];
      savePlayer({ queue });
      return { ...s, queue };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(s => {
      const queue = s.queue.filter((_, i) => i !== index);
      const qi    = index < s.queueIndex ? s.queueIndex - 1
                  : index === s.queueIndex ? Math.min(s.queueIndex, queue.length - 1)
                  : s.queueIndex;
      savePlayer({ queue, queueIndex: qi });
      return { ...s, queue, queueIndex: qi };
    });
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setState(s => {
      const queue = [...s.queue];
      const [item] = queue.splice(from, 1);
      queue.splice(to, 0, item);
      let qi = s.queueIndex;
      if (from === qi)           qi = to;
      else if (from < qi && to >= qi) qi--;
      else if (from > qi && to <= qi) qi++;
      savePlayer({ queue, queueIndex: qi });
      return { ...s, queue, queueIndex: qi };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(s => ({ ...s, queue: [], queueIndex: -1 }));
    savePlayer({ queue: [], queueIndex: -1 });
  }, []);

  const toggleQueue = useCallback(() => {
    setState(s => ({ ...s, showQueue: !s.showQueue }));
  }, []);

  const value: PlayerContextValue = {
    ...state,
    playTrack, playAlbum,
    pause, resume, togglePlay,
    next, previous, seek,
    setVolume, toggleMute,
    toggleShuffle, toggleRepeat,
    addToQueue, playNext,
    removeFromQueue, reorderQueue, clearQueue,
    toggleQueue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

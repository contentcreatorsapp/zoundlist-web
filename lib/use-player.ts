import { useCallback, useEffect, useRef, useState } from "react";
import type { Track } from "@/types/catalog";

function parseDuration(d: string): number {
  const [m, s] = (d || "0:00").split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

/**
 * Single shared audio player. Tracks with `audioUrl` play for real via an
 * <audio> element; tracks without audio (seed catalog) fall back to a
 * simulated progress so the player UI still animates.
 */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simDurRef = useRef(180);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds

  const clearSim = () => { if (simRef.current) { clearInterval(simRef.current); simRef.current = null; } };

  const startSim = useCallback((seconds: number) => {
    clearSim();
    simDurRef.current = seconds || 180;
    setDuration(simDurRef.current);
    simRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + 0.4 / simDurRef.current;
        if (np >= 1) { clearSim(); setIsPlaying(false); setCurrentTime(0); return 0; }
        setCurrentTime(np * simDurRef.current);
        return np;
      });
    }, 400);
  }, []);

  // Create the single audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => { setCurrentTime(audio.currentTime); setProgress(audio.duration ? audio.currentTime / audio.duration : 0); };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      clearSim();
    };
  }, []);

  const toggle = useCallback((track: Track) => {
    const audio = audioRef.current;
    const isCurrent = playingId === track.id;

    if (isCurrent) {
      if (isPlaying) {
        if (track.audioUrl && audio) audio.pause(); else clearSim();
        setIsPlaying(false);
      } else {
        if (track.audioUrl && audio) audio.play().catch(() => {}); else startSim(parseDuration(track.duration));
        setIsPlaying(true);
      }
      return;
    }

    // Switch to a new track
    clearSim();
    if (audio) audio.pause();
    setPlayingId(track.id);
    setProgress(0);
    setCurrentTime(0);

    if (track.audioUrl && audio) {
      audio.src = track.audioUrl;
      audio.currentTime = 0;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
      startSim(parseDuration(track.duration));
    }
  }, [playingId, isPlaying, startSim]);

  return { playingId, isPlaying, progress, currentTime, duration, toggle };
}

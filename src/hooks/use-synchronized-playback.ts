"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERAS, DURATION_SECONDS } from "@/lib/catalog";
import type { CameraId } from "@/lib/contracts";

export function useSynchronizedPlayback() {
  const videos = useRef<Partial<Record<CameraId, HTMLVideoElement>>>({});
  const playing = useRef(false);
  const seeking = useRef(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const register = useCallback(
    (id: CameraId, video: HTMLVideoElement | null) => {
      if (video) videos.current[id] = video;
      else delete videos.current[id];
    },
    [],
  );

  const pause = useCallback(() => {
    playing.current = false;
    Object.values(videos.current).forEach((video) => video.pause());
    setIsPlaying(false);
  }, []);

  const seek = useCallback((next: number) => {
    const value = Math.min(DURATION_SECONDS, Math.max(0, next));
    seeking.current = value;
    Object.values(videos.current).forEach((video) => {
      if (video.readyState >= 1)
        video.currentTime = Math.min(value, video.duration || DURATION_SECONDS);
    });
    setTime(value);
  }, []);

  const loaded = useCallback((id: CameraId) => {
    const video = videos.current[id];
    if (video)
      video.currentTime = Math.min(
        seeking.current,
        video.duration || DURATION_SECONDS,
      );
  }, []);

  const play = useCallback(async () => {
    setPlaybackError(null);
    if ((videos.current.receiving?.currentTime ?? 0) >= DURATION_SECONDS - 0.1)
      seek(0);
    if (Object.values(videos.current).length !== CAMERAS.length) return;
    playing.current = true;
    const results = await Promise.allSettled(
      Object.values(videos.current).map((video) => video.play()),
    );
    if (!playing.current) {
      Object.values(videos.current).forEach((video) => video.pause());
      return;
    }
    if (results.some((result) => result.status === "rejected")) {
      pause();
      setPlaybackError(
        "The clips could not start together. Check your connection and press play again.",
      );
      return;
    }
    setIsPlaying(true);
  }, [pause, seek]);

  useEffect(() => {
    Object.values(videos.current).forEach((video) => {
      video.playbackRate = speed;
    });
  }, [speed]);

  useEffect(() => {
    let animation = 0;
    let lastUpdate = 0;
    const update = (now: number) => {
      const master = videos.current.receiving;
      if (playing.current && master && now - lastUpdate > 100) {
        lastUpdate = now;
        seeking.current = master.currentTime;
        setTime(master.currentTime);
        for (const camera of CAMERAS) {
          const video = videos.current[camera.id];
          if (
            video &&
            video !== master &&
            video.readyState >= 2 &&
            Math.abs(video.currentTime - master.currentTime) > 0.2
          ) {
            video.currentTime = master.currentTime;
          }
        }
        if (master.ended) pause();
      }
      animation = requestAnimationFrame(update);
    };
    animation = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animation);
      playing.current = false;
      Object.values(videos.current).forEach((video) => video.pause());
    };
  }, [pause]);

  return {
    time,
    isPlaying,
    speed,
    setSpeed,
    register,
    loaded,
    pause,
    play,
    seek,
    playbackError,
  };
}

export type SynchronizedPlayback = ReturnType<typeof useSynchronizedPlayback>;

"use client";

import { useState } from "react";
import { ArrowUpRight, Pause, Play, RotateCcw, ScanLine } from "lucide-react";
import { CAMERAS, DURATION_SECONDS, formatTime } from "@/lib/catalog";
import type { CameraId, Observation } from "@/lib/contracts";
import type { SynchronizedPlayback } from "@/hooks/use-synchronized-playback";

type Props = {
  playback: SynchronizedPlayback;
  camera: CameraId;
  onCamera: (camera: CameraId) => void;
  onZone: (camera: CameraId) => void;
  observations: Observation[];
  selectedId: string | null;
  analysisReady: boolean;
  onObservation: (observation: Observation) => void;
};

const ZONES: Record<
  CameraId,
  { points: string; label: string; x: number; y: number }
> = {
  receiving: {
    points: "469,227 690,333 558,396 337,290",
    label: "R1 · RECEIVING",
    x: 514,
    y: 307,
  },
  packing: {
    points: "462,235 631,316 476,390 307,309",
    label: "P1 · PACKING",
    x: 469,
    y: 308,
  },
  dispatch: {
    points: "460,238 643,326 493,398 309,310",
    label: "D1 · DISPATCH",
    x: 476,
    y: 313,
  },
};

export function MonitorWall({
  playback,
  camera,
  onCamera,
  onZone,
  observations,
  selectedId,
  analysisReady,
  onObservation,
}: Props) {
  const [showZones, setShowZones] = useState(false);
  return (
    <section
      className="monitor-panel"
      aria-label="Synchronized warehouse footage"
    >
      <div className="monitor-heading">
        <div className="monitor-title">
          <span className="status-square" /> HARBOUR WAREHOUSE{" "}
          <span className="subtle-separator">/</span>{" "}
          <span className="muted-label">DEMO SHIFT 01</span>
        </div>
        <span className="footage-label">Synthetic demo footage · 48s</span>
      </div>
      <div className="camera-wall">
        {CAMERAS.map((item, index) => (
          <div
            className={`camera-view ${camera === item.id ? "camera-main" : "camera-secondary"}`}
            key={item.id}
          >
            <video
              ref={(element) => playback.register(item.id, element)}
              src={item.video}
              poster={item.poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={() => playback.loaded(item.id)}
              onEnded={item.id === "receiving" ? playback.pause : undefined}
              aria-label={`${item.name} synthetic warehouse clip, no audio`}
              tabIndex={-1}
            />
            <div className="camera-shade" />
            <button
              className="camera-focus-area"
              onClick={() => onCamera(item.id)}
              aria-label={`Focus ${item.name} camera`}
              aria-pressed={camera === item.id}
            >
              <span className="camera-topline">
                <span className="camera-code">CAM 0{index + 1}</span>
                <span className="camera-focus-icon">
                  <ArrowUpRight size={15} />
                </span>
              </span>
              <span className="camera-bottomline">
                <span>
                  <span className="camera-name">{item.name}</span>
                  <span className="camera-location">
                    {item.location.split(" · ")[1]}
                  </span>
                </span>
                <span className="camera-clock">
                  {formatTime(playback.time)}
                </span>
              </span>
            </button>
            {showZones && (
              <svg
                className="zone-overlay"
                viewBox="0 0 960 540"
                preserveAspectRatio="xMidYMid slice"
                aria-label={`${item.name} configured review zone`}
              >
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`Filter observations to ${item.name} zone`}
                  onClick={() => onZone(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onZone(item.id);
                    }
                  }}
                >
                  <polygon points={ZONES[item.id].points} />
                  <text
                    x={ZONES[item.id].x}
                    y={ZONES[item.id].y}
                    textAnchor="middle"
                  >
                    {ZONES[item.id].label}
                  </text>
                </g>
              </svg>
            )}
            <span className="camera-corner corner-tl" />
            <span className="camera-corner corner-br" />
          </div>
        ))}
      </div>
      <div className="transport">
        <button
          className="play-button"
          aria-label={
            playback.isPlaying ? "Pause all cameras" : "Play all cameras"
          }
          onClick={() =>
            playback.isPlaying ? playback.pause() : void playback.play()
          }
        >
          {playback.isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
        <button
          className="transport-button"
          aria-label="Replay footage from the start"
          onClick={() => {
            playback.seek(0);
            void playback.play();
          }}
        >
          <RotateCcw size={17} />
        </button>
        <div className="transport-time">
          <strong>{formatTime(playback.time)}</strong>
          <span>/ {formatTime(DURATION_SECONDS)}</span>
        </div>
        <div className="transport-divider" />
        <button
          className={`zone-toggle ${showZones ? "zones-visible" : ""}`}
          onClick={() => setShowZones((value) => !value)}
          aria-pressed={showZones}
        >
          <ScanLine size={14} />
          <span>{showZones ? "Hide zones" : "Show zones"}</span>
        </button>
        <label className="speed-select">
          <span className="sr-only">Playback speed</span>
          <select
            value={playback.speed}
            onChange={(event) => playback.setSpeed(Number(event.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
      {playback.playbackError && (
        <p role="alert" className="playback-error">
          {playback.playbackError}
        </p>
      )}
      {showZones && (
        <p className="zone-caption">
          Configured review zones. Select an area to filter observations.
        </p>
      )}
      <div className="timeline">
        <div className="timeline-heading">
          <span>SHIFT TIMELINE</span>
          <span className="timeline-help">
            Select a signal to inspect its evidence
          </span>
        </div>
        <div className="timeline-ruler">
          <span />
          {[0, 12, 24, 36, 48].map((at) => (
            <span key={at}>{formatTime(at)}</span>
          ))}
        </div>
        <div className="timeline-tracks">
          {CAMERAS.map((item) => (
            <div className="timeline-track" key={item.id}>
              <button
                className={`track-name ${camera === item.id ? "track-active" : ""}`}
                onClick={() => onCamera(item.id)}
                aria-label={`Focus ${item.name} timeline`}
              >
                {item.name}
              </button>
              <div className="track-lane">
                <div className="track-grid" />
                {observations
                  .filter((observation) => observation.cameraId === item.id)
                  .map((observation) => (
                    <button
                      key={observation.id}
                      className={`timeline-signal signal-${observation.kind} ${selectedId === observation.id ? "signal-selected" : ""}`}
                      style={{
                        left: `${(observation.from / DURATION_SECONDS) * 100}%`,
                        width: `${Math.max(2, ((observation.to - observation.from) / DURATION_SECONDS) * 100)}%`,
                      }}
                      onClick={() => onObservation(observation)}
                      aria-label={`${observation.title}, ${item.name}, ${formatTime(observation.from)} to ${formatTime(observation.to)}`}
                      title={`${observation.title} · ${formatTime(observation.from)}–${formatTime(observation.to)}`}
                    />
                  ))}
                <span
                  className="timeline-playhead"
                  style={{
                    left: `${(playback.time / DURATION_SECONDS) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <label className="seek-control">
          <span className="sr-only">Seek all cameras</span>
          <input
            type="range"
            min={0}
            max={DURATION_SECONDS}
            step={0.1}
            value={playback.time}
            aria-valuetext={formatTime(playback.time)}
            onChange={(event) => playback.seek(Number(event.target.value))}
          />
          <span className="seek-hint">Drag to explore the shift</span>
        </label>
      </div>
      <div className="monitor-footnote">
        <span className="legend-dot" />{" "}
        {analysisReady ? "Recorded AI analysis" : "Recorded analysis pending"}{" "}
        <span className="footnote-divider">·</span> 4-second frame sampling{" "}
        <span className="footnote-spacer" />
        <span>No audio. No real surveillance footage.</span>
      </div>
    </section>
  );
}

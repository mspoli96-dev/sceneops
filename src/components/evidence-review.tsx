"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  Expand,
  FileDown,
  ImageIcon,
  Layers3,
  MoveRight,
  ScanLine,
  X,
} from "lucide-react";
import { CAMERAS, FRAMES, cameraName, formatTime } from "@/lib/catalog";
import type {
  AnalysisRecord,
  CameraId,
  EvidenceFrame,
  EventKind,
  Observation,
} from "@/lib/contracts";

export type ReviewStatus = "accepted" | "dismissed" | "unreviewed";
export type ReviewDecisions = Record<string, ReviewStatus>;

const KIND_LABELS: Record<EventKind, string> = {
  movement: "Movement",
  accumulation: "Accumulation",
  occupancy: "Occupancy",
  clear: "Clear area",
  uncertain: "Uncertain",
};
const KindIcon = ({ kind }: { kind: EventKind }) =>
  kind === "movement" ? (
    <MoveRight size={15} />
  ) : kind === "accumulation" ? (
    <Boxes size={15} />
  ) : kind === "occupancy" ? (
    <Layers3 size={15} />
  ) : (
    <ScanLine size={15} />
  );

type Props = {
  record: AnalysisRecord;
  selected: Observation | null;
  filter: CameraId | "all";
  onFilter: (camera: CameraId | "all") => void;
  onObservation: (observation: Observation) => void;
  onFrame: (frame: EvidenceFrame) => void;
  decisions: ReviewDecisions;
  onDecision: (id: string, decision: ReviewStatus) => void;
  onExport: () => void;
  exported: boolean;
};

export function EvidenceReview({
  record,
  selected,
  filter,
  onFilter,
  onObservation,
  onFrame,
  decisions,
  onDecision,
  onExport,
  exported,
}: Props) {
  const [frameId, setFrameId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const observations = record.observations.filter(
    (observation) => filter === "all" || observation.cameraId === filter,
  );
  const frames =
    selected?.evidenceFrameIds
      .map((id) => FRAMES.find((frame) => frame.id === id))
      .filter((frame): frame is EvidenceFrame => Boolean(frame)) ?? [];
  const frame = frames.find((item) => item.id === frameId) ?? frames[0];
  const status = selected
    ? (decisions[selected.id] ?? "unreviewed")
    : "unreviewed";
  const reviewed = record.observations.filter(
    (item) => decisions[item.id] && decisions[item.id] !== "unreviewed",
  ).length;

  useEffect(() => {
    const element = dialog.current;
    if (expanded && element && !element.open) element.showModal();
    if (!expanded && element?.open) element.close();
  }, [expanded]);

  return (
    <section className="review-panel" aria-labelledby="review-title">
      <div className="review-heading">
        <div>
          <span className="eyebrow">FROM SIGNAL TO EVIDENCE</span>
          <h2 id="review-title">The moments that matter.</h2>
        </div>
        <button
          className="export-button"
          onClick={onExport}
          disabled={record.observations.length === 0}
        >
          <FileDown size={16} />
          <span>Export review</span>
        </button>
      </div>
      <div
        className="zone-filters"
        role="group"
        aria-label="Filter observations by zone"
      >
        {(
          [{ id: "all", name: "All zones" }, ...CAMERAS] as {
            id: CameraId | "all";
            name: string;
          }[]
        ).map((item) => (
          <button
            key={item.id}
            className={filter === item.id ? "zone-selected" : ""}
            onClick={() => onFilter(item.id)}
            aria-pressed={filter === item.id}
          >
            {item.name}
            {item.id === "all" && <span>{record.observations.length}</span>}
          </button>
        ))}
      </div>
      <div className="review-columns">
        <div className="observations-panel">
          <div className="observations-heading">
            <span>RECORDED AI OBSERVATIONS</span>
            <span>{observations.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="observation-list">
            {observations.map((observation) => {
              const decision = decisions[observation.id] ?? "unreviewed";
              return (
                <button
                  key={observation.id}
                  className={`observation-card ${selected?.id === observation.id ? "observation-selected" : ""}`}
                  onClick={() => onObservation(observation)}
                  aria-pressed={selected?.id === observation.id}
                >
                  <div className="observation-meta">
                    <span className={`kind-label kind-${observation.kind}`}>
                      <KindIcon kind={observation.kind} />
                      {KIND_LABELS[observation.kind]}
                    </span>
                    <span className="observation-time">
                      {formatTime(observation.from)}–
                      {formatTime(observation.to)}
                    </span>
                  </div>
                  <strong>{observation.title}</strong>
                  <div className="observation-bottom">
                    <span>{cameraName(observation.cameraId)}</span>
                    {decision !== "unreviewed" ? (
                      <span className={`decision-badge ${decision}`}>
                        {decision === "accepted" ? (
                          <Check size={12} />
                        ) : (
                          <X size={12} />
                        )}
                        {decision}
                      </span>
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </div>
                </button>
              );
            })}
            {observations.length === 0 && (
              <div className="empty-observations">
                <ScanLine size={25} />
                <h3>
                  {record.source === "pending"
                    ? "Analysis is being prepared"
                    : "No observations in this zone"}
                </h3>
                <p>
                  {record.source === "pending"
                    ? "Explore the three camera views. Recorded observations will appear here once the frame analysis is ready."
                    : "Try another zone or explore the full timeline."}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="evidence-inspector" aria-label="Evidence inspector">
          {selected && frame ? (
            <>
              <div className="inspector-heading">
                <span>
                  <ImageIcon size={14} /> EVIDENCE INSPECTOR
                </span>
                <span>
                  {frames.length} sampled{" "}
                  {frames.length === 1 ? "frame" : "frames"}
                </span>
              </div>
              <button
                className="evidence-image"
                onClick={() => setExpanded(true)}
                aria-label={`Expand ${cameraName(frame.cameraId)} evidence frame at ${formatTime(frame.at)}`}
              >
                <img
                  src={frame.image}
                  alt={`${cameraName(frame.cameraId)} sampled evidence frame at ${formatTime(frame.at)}`}
                />
                <span className="frame-stamp">
                  {cameraName(frame.cameraId).toUpperCase()}{" "}
                  <b>{formatTime(frame.at)}</b>
                </span>
                <span className="expand-frame">
                  <Expand size={16} />
                </span>
              </button>
              {frames.length > 1 && (
                <div
                  className="frame-strip"
                  aria-label="Sampled evidence frames"
                >
                  {frames.map((item) => (
                    <button
                      key={item.id}
                      className={item.id === frame.id ? "frame-selected" : ""}
                      onClick={() => {
                        setFrameId(item.id);
                        onFrame(item);
                      }}
                      aria-label={`View evidence frame at ${formatTime(item.at)}`}
                      aria-pressed={item.id === frame.id}
                    >
                      <img src={item.image} alt="" />
                      <span>{formatTime(item.at)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="inspector-copy">
                <span className={`kind-label kind-${selected.kind}`}>
                  <KindIcon kind={selected.kind} />
                  {KIND_LABELS[selected.kind]}
                  <span className="inspector-range">
                    {formatTime(selected.from)}–{formatTime(selected.to)}
                  </span>
                </span>
                <h3>{selected.title}</h3>
                <p>{selected.description}</p>
                <button className="jump-link" onClick={() => onFrame(frame)}>
                  Watch from this frame <ArrowRight size={14} />
                </button>
              </div>
              <div className="review-decision">
                <span>Your review</span>
                <div>
                  <button
                    className={
                      status === "accepted" ? "decision-active accepted" : ""
                    }
                    aria-pressed={status === "accepted"}
                    onClick={() =>
                      onDecision(
                        selected.id,
                        status === "accepted" ? "unreviewed" : "accepted",
                      )
                    }
                  >
                    <Check size={14} />
                    Accept
                  </button>
                  <button
                    className={
                      status === "dismissed" ? "decision-active dismissed" : ""
                    }
                    aria-pressed={status === "dismissed"}
                    onClick={() =>
                      onDecision(
                        selected.id,
                        status === "dismissed" ? "unreviewed" : "dismissed",
                      )
                    }
                  >
                    <X size={14} />
                    Dismiss
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-inspector">
              <div className="empty-frame-icon">
                <ImageIcon size={27} />
              </div>
              <h3>Follow the evidence.</h3>
              <p>
                Select a recorded observation to inspect the sampled frames
                behind it.
              </p>
              <span>Nothing is escalated automatically.</span>
            </div>
          )}
        </div>
      </div>
      <div className="review-footer">
        <span>
          {reviewed} of {record.observations.length} observations reviewed
        </span>
        <span role="status">
          {exported
            ? "Review exported as JSON."
            : "Review decisions stay in this tab. Export to keep them."}
        </span>
      </div>
      <dialog
        ref={dialog}
        className="frame-dialog"
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setExpanded(false);
        }}
        aria-label="Expanded evidence frame"
      >
        <div className="dialog-content">
          <div className="dialog-heading">
            <div>
              <span className="eyebrow">SAMPLED EVIDENCE</span>
              <h3>
                {frame
                  ? `${cameraName(frame.cameraId)} · ${formatTime(frame.at)}`
                  : "Evidence frame"}
              </h3>
            </div>
            <button
              aria-label="Close expanded frame"
              onClick={() => setExpanded(false)}
            >
              <X size={21} />
            </button>
          </div>
          {frame && (
            <img
              src={frame.image}
              alt={`${cameraName(frame.cameraId)} sampled evidence frame at ${formatTime(frame.at)}`}
            />
          )}
          <p>
            A sampled frame shows one moment. It does not prove an exact event
            boundary.
          </p>
        </div>
      </dialog>
    </section>
  );
}

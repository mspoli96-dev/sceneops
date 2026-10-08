"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Layers3,
  ScanLine,
} from "lucide-react";
import rawAnalysis from "@/data/analysis.json";
import { CONTACT_URL, REPOSITORY_URL } from "@/lib/brand";
import { CAMERAS, DATASET_ID, DURATION_SECONDS } from "@/lib/catalog";
import type {
  AnalysisRecord,
  CameraId,
  EvidenceFrame,
  Observation,
} from "@/lib/contracts";
import { useSynchronizedPlayback } from "@/hooks/use-synchronized-playback";
import { MonitorWall } from "./monitor-wall";
import { QueryPanel } from "./query-panel";
import {
  EvidenceReview,
  type ReviewDecisions,
  type ReviewStatus,
} from "./evidence-review";

const analysis = rawAnalysis as AnalysisRecord;

export function SceneOpsApp() {
  const playback = useSynchronizedPlayback();
  const [camera, setCamera] = useState<CameraId>("receiving");
  const [filter, setFilter] = useState<CameraId | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    analysis.observations[0]?.id ?? null,
  );
  const [decisions, setDecisions] = useState<ReviewDecisions>({});
  const [exported, setExported] = useState(false);
  const selected =
    analysis.observations.find(
      (observation) => observation.id === selectedId,
    ) ?? null;

  function selectObservation(observation: Observation) {
    playback.pause();
    playback.seek(observation.from);
    setCamera(observation.cameraId);
    setSelectedId(observation.id);
    if (filter !== "all" && filter !== observation.cameraId) setFilter("all");
  }

  function selectFrame(frame: EvidenceFrame) {
    playback.pause();
    playback.seek(frame.at);
    setCamera(frame.cameraId);
  }

  function changeFilter(next: CameraId | "all") {
    setFilter(next);
    if (next !== "all") {
      setCamera(next);
      if (selected?.cameraId !== next)
        setSelectedId(
          analysis.observations.find(
            (observation) => observation.cameraId === next,
          )?.id ?? null,
        );
    }
  }

  function review(id: string, decision: ReviewStatus) {
    setDecisions((current) => ({ ...current, [id]: decision }));
    setExported(false);
  }

  function exportReview() {
    const report = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      dataset: {
        id: DATASET_ID,
        synthetic: true,
        durationSeconds: DURATION_SECONDS,
        cameras: CAMERAS.map(({ id, name }) => ({ id, name })),
      },
      provenance: {
        source: analysis.source,
        model: analysis.model,
        generatedAt: analysis.generatedAt,
        sampleIntervalSeconds: analysis.sampleIntervalSeconds,
      },
      limitation:
        "Observations are based on sampled synthetic frames. Time ranges do not establish exact event boundaries. Review decisions were entered by a person in this browser tab.",
      observations: analysis.observations.map((observation) => ({
        ...observation,
        humanReview: decisions[observation.id] ?? "unreviewed",
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sceneops-review.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExported(true);
  }

  return (
    <>
      <a className="skip-link" href="#workbench">
        Skip to the video workbench
      </a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SceneOps by Webytex">
          <img src="/mark.svg" alt="" width={32} height={32} />
          <span>
            Scene<span className="brand-light">Ops</span>
            <small>BY WEBYTEX</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <span className="vertical-badge">
            <span />
            Business
          </span>
          <a
            className="source-link"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} />
            <span>View source</span>
            <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main id="top">
        <section className="hero">
          <div>
            <div className="hero-eyebrow">
              <span /> VIDEO INTELLIGENCE, MADE VISIBLE
            </div>
            <h1>
              See the shift.
              <br className="mobile-break" /> <span>Find the moment.</span>
            </h1>
            <p>
              Three camera views. One searchable story. Explore a warehouse
              shift,
              <br className="desktop-break" /> ask what changed, and inspect the
              evidence behind every observation.
            </p>
          </div>
          <div className="hero-note">
            <div className="hero-note-icon">
              <ScanLine size={22} />
            </div>
            <span>
              Built for the person
              <br />
              <strong>behind the decision.</strong>
            </span>
          </div>
        </section>
        <div className="workspace" id="workbench">
          <div className="workspace-main">
            <MonitorWall
              playback={playback}
              camera={camera}
              onCamera={setCamera}
              onZone={changeFilter}
              observations={analysis.observations}
              selectedId={selectedId}
              analysisReady={analysis.source === "recorded_model_analysis"}
              onObservation={selectObservation}
            />
            <EvidenceReview
              record={analysis}
              selected={selected}
              filter={filter}
              onFilter={changeFilter}
              onObservation={selectObservation}
              onFrame={selectFrame}
              decisions={decisions}
              onDecision={review}
              onExport={exportReview}
              exported={exported}
            />
          </div>
          <div className="workspace-side">
            <QueryPanel
              observations={analysis.observations}
              onObservation={selectObservation}
            />
            <section className="scope-card">
              <span className="scope-icon">
                <Layers3 size={18} />
              </span>
              <h3>
                A focused demo.
                <br />A bigger possibility.
              </h3>
              <p>
                Original synthetic footage. AI observations from actual sampled
                images. A review workflow you can try.
              </p>
              <div className="scope-divider" />
              <p className="scope-small">
                A production integration would connect your cameras, operational
                context and human review process.
              </p>
              <a href={CONTACT_URL} target="_blank" rel="noreferrer">
                Build for your operation <ArrowUpRight size={15} />
              </a>
            </section>
          </div>
        </div>
        <section className="method-strip" aria-label="How SceneOps works">
          <div className="method-intro">
            <span className="eyebrow">THE APPROACH</span>
            <h2>
              From footage
              <br />
              to a useful question.
            </h2>
          </div>
          <div className="method-step">
            <span className="step-number">01</span>
            <h3>Sample the scene</h3>
            <p>
              Frames from three synchronized clips give the model a bounded view
              of the shift.
            </p>
          </div>
          <div className="method-step">
            <span className="step-number">02</span>
            <h3>Anchor the answer</h3>
            <p>
              Observations and live answers point back to named cameras and
              timestamped evidence.
            </p>
          </div>
          <div className="method-step">
            <span className="step-number">03</span>
            <h3>Keep a person in control</h3>
            <p>
              Inspect, accept or dismiss. Export your review. No automatic
              operational alerts.
            </p>
          </div>
        </section>
        <section className="project-cta">
          <div>
            <span className="eyebrow">WEBYTEX FOR BUSINESS</span>
            <h2>
              Your cameras have the footage.
              <br />
              <span>Let&apos;s make it useful.</span>
            </h2>
            <p>
              We design and build AI tools around the way your team actually
              works.
            </p>
          </div>
          <a href={CONTACT_URL} target="_blank" rel="noreferrer">
            Talk about your use case <ArrowRight size={19} />
          </a>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>SceneOps</strong>
          <span>An open source experiment by Webytex.</span>
        </div>
        <div>
          <span>Synthetic footage · Human review · MIT licensed</span>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            Explore the code <ArrowUpRight size={13} />
          </a>
        </div>
      </footer>
    </>
  );
}

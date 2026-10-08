"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CornerDownLeft,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { CAMERAS, cameraName, formatTime } from "@/lib/catalog";
import type {
  Answer,
  CameraId,
  LiveConfig,
  Observation,
  QueryRequest,
} from "@/lib/contracts";

const SUGGESTIONS = [
  "When do cartons accumulate in the packing buffer?",
  "What changes in the receiving area?",
  "Which moments should an operator review?",
];

type Props = {
  observations: Observation[];
  onObservation: (observation: Observation) => void;
};

export function QueryPanel({ observations, onObservation }: Props) {
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [question, setQuestion] = useState("");
  const [camera, setCamera] = useState<CameraId | "all">("all");
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/config", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Configuration unavailable");
        setConfig((await response.json()) as LiveConfig);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setConfig({
            liveEnabled: false,
            model: "",
            unavailableReason:
              "Live questions are unavailable. You can still explore every recorded observation.",
          });
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);

  async function submit() {
    if (busy || !config?.liveEnabled || !consent || question.trim().length < 5)
      return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    setBusy(true);
    setError(null);
    setAnswer(null);
    const text = question.trim();
    setSubmittedQuestion(text);
    try {
      const body: QueryRequest = {
        question: text,
        cameraId: camera,
        consent: true,
      };
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = (await response.json()) as Answer | { error: string };
      if (!response.ok || "error" in result)
        throw new Error(
          "error" in result
            ? result.error
            : "The analysis could not be completed. Please try again later.",
        );
      setAnswer(result);
    } catch (cause) {
      if (controller.signal.aborted)
        setError(
          "The request timed out. It was not retried. Your recorded evidence is still available.",
        );
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "The analysis could not be completed. Please try again later.",
        );
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
      setBusy(false);
    }
  }

  const references =
    answer?.eventIds
      .map((id) => observations.find((observation) => observation.id === id))
      .filter((observation): observation is Observation =>
        Boolean(observation),
      ) ?? [];

  return (
    <aside className="assistant-panel" aria-labelledby="assistant-title">
      <div className="assistant-topline">
        <span className="assistant-symbol">
          <Sparkles size={18} />
        </span>
        <span className="eyebrow">ASK THE FOOTAGE</span>
        <span
          className={`availability-dot ${config?.liveEnabled ? "available" : ""}`}
          title={
            config?.liveEnabled
              ? "Live questions available"
              : "Live questions unavailable"
          }
        />
      </div>
      <h2 id="assistant-title">
        A question.
        <br />
        <span>A moment to review.</span>
      </h2>
      <p className="assistant-intro">
        Ask what changed. Get an answer linked to the evidence, then decide what
        matters.
      </p>
      <div className="suggestions" aria-label="Suggested questions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            disabled={busy}
            onClick={() => {
              setQuestion(suggestion);
              input.current?.focus();
            }}
          >
            <span>{suggestion}</span>
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="query-label" htmlFor="question">
          Your question
        </label>
        <div className="question-box">
          <textarea
            id="question"
            ref={input}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={600}
            minLength={5}
            rows={3}
            placeholder="Find the moment when…"
            disabled={busy}
          />
          <div className="question-meta">
            <label>
              <span className="sr-only">Question scope</span>
              <select
                value={camera}
                disabled={busy}
                onChange={(event) =>
                  setCamera(event.target.value as CameraId | "all")
                }
              >
                <option value="all">All zones</option>
                {CAMERAS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <span>{question.length}/600</span>
          </div>
        </div>
        <label className="query-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            disabled={busy}
          />
          <span>
            I agree to send this question and the demo&apos;s sampled evidence
            to OpenAI.
          </span>
        </label>
        <button
          className="ask-button"
          type="submit"
          disabled={
            busy ||
            !config?.liveEnabled ||
            !consent ||
            question.trim().length < 5
          }
        >
          {busy ? (
            <>
              <LoaderCircle className="loading-icon" size={17} /> Reading the
              evidence
            </>
          ) : (
            <>
              Ask SceneOps <CornerDownLeft size={17} />
            </>
          )}
        </button>
      </form>
      {!config && (
        <p className="availability-note">
          Checking live analysis availability…
        </p>
      )}
      {config && !config.liveEnabled && (
        <p className="availability-note">
          {config.unavailableReason ||
            "Live questions are currently unavailable. Recorded observations remain available."}
        </p>
      )}
      {error && (
        <p className="query-error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <div className="answer-loading" role="status">
          <span className="loading-line" />
          <span className="loading-line" />
          <span className="loading-line short" />
          <p>Checking sampled frames and recorded observations.</p>
        </div>
      )}
      {answer && (
        <section
          className="live-answer"
          aria-label="Live AI response"
          aria-live="polite"
        >
          <div className="answer-heading">
            <Sparkles size={14} />
            <span>Live AI response</span>
          </div>
          <p className="asked-question">{submittedQuestion}</p>
          <p className="answer-text">{answer.answer}</p>
          {references.length > 0 && (
            <div className="answer-references">
              {references.map((observation) => (
                <button
                  key={observation.id}
                  onClick={() => onObservation(observation)}
                >
                  <ArrowDownRight size={15} />
                  <span>
                    {cameraName(observation.cameraId)}{" "}
                    <b>
                      {formatTime(observation.from)}–
                      {formatTime(observation.to)}
                    </b>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          )}
          <p className="answer-limitation">{answer.limitation}</p>
          <span className="answer-model">{answer.model}</span>
        </section>
      )}
      <div className="assistant-footnote">
        <span className="small-rule" />
        <p>
          AI helps you find evidence.
          <br />
          <strong>A person makes the operational decision.</strong>
        </p>
      </div>
    </aside>
  );
}

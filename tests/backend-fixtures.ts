import { vi } from "vitest";
import type { AnalysisRecord, Answer, QueryRequest } from "../src/lib/contracts";
import type { Evidence } from "../src/lib/server/evidence";
import type { QueryDependencies } from "../src/lib/server/handlers";
import { newVisitor } from "../src/lib/server/security";

export const origin = "https://sceneops.example";
export const validQuery: QueryRequest = { question: "What changed near receiving?", cameraId: "all", consent: true };
export const analysis: AnalysisRecord = {
  datasetId: "harbour-48-v1", source: "recorded_model_analysis", model: "gpt-6.1-sol", generatedAt: "2026-10-07T12:00:00.000Z", sampleIntervalSeconds: 4,
  observations: ["receiving", "packing", "dispatch"].map(cameraId => ({
    id: `${cameraId}-change`, cameraId: cameraId as "receiving" | "packing" | "dispatch", from: 0, to: 48,
    kind: "movement", title: "Visible change", description: "Objects appear in different positions in the sampled frames.", evidenceFrameIds: [`${cameraId}-00`, `${cameraId}-48`],
  })),
};
export const evidence: Evidence = {
  observations: analysis.observations,
  provenance: { ...analysis, source: "recorded_model_analysis", generatedAt: analysis.generatedAt! },
  sheets: ["receiving", "packing", "dispatch"].map(cameraId => ({ cameraId: cameraId as "receiving" | "packing" | "dispatch", dataUrl: "data:image/jpeg;base64,/9j/" })),
};
export const answer: Answer = { answer: "The sampled views show a change in object positions.", eventIds: ["receiving-change"], limitation: "Sampled synthetic footage cannot establish an exact onset.", source: "live_model", model: "gpt-6.1-sol" };

export function configureEnvironment(): void {
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("SESSION_SECRET", "test-only-signing-secret-with-at-least-32-characters");
  vi.stubEnv("OPENAI_API_KEY", "test-only-nonfunctional-value");
  vi.stubEnv("KV_REST_API_URL", "https://test-redis.example");
  vi.stubEnv("KV_REST_API_TOKEN", "test-only-redis-value");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("SCENEOPS_LIVE_ENABLED", "true");
  vi.stubEnv("SCENEOPS_COST_RESERVATION_CONFIRMED", "true");
  vi.stubEnv("OPENAI_PROJECT_HARD_LIMIT_CONFIRMED", "true");
  vi.stubEnv("VERCEL_BOTID_ENABLED", "true");
  vi.stubEnv("VERCEL_RATE_LIMIT_CONFIRMED", "true");
  vi.stubEnv("SCENEOPS_MONTHLY_BUDGET_USD", "18");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
}

export function request(body: unknown = validQuery, headers: Record<string, string> = {}): Request {
  return new Request(`${origin}/api/query`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", cookie: newVisitor(new Request(origin)).cookie.split(";")[0], ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function services() {
  const store = { reserve: vi.fn().mockResolvedValue(undefined), release: vi.fn().mockResolvedValue(undefined) };
  const dependencies = {
    ready: vi.fn(() => true),
    evidence: vi.fn().mockResolvedValue(evidence),
    store: vi.fn(() => store),
    answer: vi.fn().mockResolvedValue(answer),
    verifyBrowser: vi.fn().mockResolvedValue(true),
  } satisfies QueryDependencies;
  return { dependencies, store };
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import recordedAnalysis from "../../data/analysis.json";
import { CAMERAS, DATASET_ID, DURATION_SECONDS, FRAMES, SAMPLE_INTERVAL_SECONDS } from "../catalog";
import type { CameraId, Observation } from "../contracts";
import { PublicError } from "./security";

const cameraSchema = z.enum(["receiving", "packing", "dispatch"]);
export const observationSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),
  cameraId: cameraSchema,
  from: z.number().min(0).max(DURATION_SECONDS),
  to: z.number().min(0).max(DURATION_SECONDS),
  kind: z.enum(["movement", "accumulation", "occupancy", "clear", "uncertain"]),
  title: z.string().min(1).max(140),
  description: z.string().min(1).max(800),
  evidenceFrameIds: z.array(z.string()).min(1).max(FRAMES.length),
});
const recordSchema = z.strictObject({
  datasetId: z.literal(DATASET_ID),
  source: z.literal("recorded_model_analysis"),
  model: z.string().min(1).max(100),
  generatedAt: z.iso.datetime(),
  sampleIntervalSeconds: z.literal(SAMPLE_INTERVAL_SECONDS),
  observations: z.array(observationSchema).min(1).max(36),
});

export type Evidence = {
  observations: Observation[];
  sheets: { cameraId: CameraId; dataUrl: string }[];
  provenance: { datasetId: string; source: "recorded_model_analysis"; model: string; generatedAt: string; sampleIntervalSeconds: number };
};

export function validateRecordedAnalysis(value: unknown) {
  const parsed = recordSchema.safeParse(value);
  if (!parsed.success) throw new PublicError("Recorded evidence is not ready yet.", 503);
  const ids = new Set<string>();
  for (const observation of parsed.data.observations) {
    if (ids.has(observation.id) || observation.from > observation.to || new Set(observation.evidenceFrameIds).size !== observation.evidenceFrameIds.length) throw new PublicError("Recorded evidence is not ready yet.", 503);
    ids.add(observation.id);
    for (const id of observation.evidenceFrameIds) {
      const frame = FRAMES.find(item => item.id === id);
      if (!frame || frame.cameraId !== observation.cameraId || frame.at < observation.from || frame.at > observation.to) throw new PublicError("Recorded evidence is not ready yet.", 503);
    }
  }
  return parsed.data;
}

export function evidenceReady(): boolean {
  try { validateRecordedAnalysis(recordedAnalysis); return true; } catch { return false; }
}

export async function loadEvidence(cameraId: CameraId | "all"): Promise<Evidence> {
  const record = validateRecordedAnalysis(recordedAnalysis);
  const cameras = CAMERAS.filter(camera => cameraId === "all" || camera.id === cameraId);
  const observations = record.observations.filter(item => cameraId === "all" || item.cameraId === cameraId);
  if (!observations.length) throw new PublicError("This camera has no recorded evidence yet.", 503);
  const sheets = await Promise.all(cameras.map(async camera => {
    const bytes = await readFile(path.join(process.cwd(), "public", "evidence", `${camera.id}-sheet.jpg`));
    if (!bytes.length || bytes.length > 2_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new PublicError("The evidence images are unavailable.", 503);
    return { cameraId: camera.id, dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}` };
  }));
  const { datasetId, source, model, generatedAt, sampleIntervalSeconds } = record;
  return { observations, sheets, provenance: { datasetId, source, model, generatedAt, sampleIntervalSeconds } };
}

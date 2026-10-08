import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Answer, QueryRequest } from "../contracts";
import { MAX_OUTPUT_TOKENS, MODEL, PROVIDER_TIMEOUT_MS } from "./config";
import type { Evidence } from "./evidence";
import { SYSTEM_PROMPT } from "./prompt";
import { PublicError } from "./security";

export const answerSchema = z.strictObject({
  answer: z.string().min(1).max(1_500),
  eventIds: z.array(z.string().max(80)).max(12),
  limitation: z.string().min(1).max(600),
});

export function validateAnswer(value: unknown, evidence: Evidence, request: QueryRequest): Answer {
  const parsed = answerSchema.safeParse(value);
  if (!parsed.success) throw new PublicError("The assistant could not produce a supported answer. Please try a more specific question.", 502);
  const eventIds = [...new Set(parsed.data.eventIds)];
  const allowed = new Set(evidence.observations.filter(item => request.cameraId === "all" || item.cameraId === request.cameraId).map(item => item.id));
  if (eventIds.some(id => !allowed.has(id))) throw new PublicError("The assistant returned an unsupported evidence reference. Please try again.", 502);
  return {
    ...parsed.data,
    answer: eventIds.length ? parsed.data.answer : "The sampled footage does not provide enough evidence to answer this question.",
    limitation: eventIds.length ? parsed.data.limitation : "No supported event reference was returned. These sampled synthetic clips cannot establish facts outside the recorded evidence.",
    eventIds,
    source: "live_model",
    model: MODEL,
  };
}

export function buildProviderRequest(request: QueryRequest, evidence: Evidence) {
  const { datasetId, source, model, generatedAt, sampleIntervalSeconds } = evidence.provenance;
  const context = {
    selectedCamera: request.cameraId,
    provenance: { datasetId, source, model, generatedAt, sampleIntervalSeconds },
    allowedObservations: evidence.observations.filter(item => request.cameraId === "all" || item.cameraId === request.cameraId).map(({ id, cameraId, from, to, kind, title, description, evidenceFrameIds }) => ({ id, cameraId, from, to, kind, title, description, evidenceFrameIds })),
    question: request.question,
  };
  return {
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    store: false,
    service_tier: "default" as const,
    reasoning: { effort: "low" as const },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{
      role: "user" as const,
      content: [
        { type: "input_text" as const, text: JSON.stringify(context) },
        ...evidence.sheets.filter(sheet => request.cameraId === "all" || sheet.cameraId === request.cameraId).flatMap(sheet => [
          { type: "input_text" as const, text: `Contact sheet: ${sheet.cameraId}. Each tile has its sampled timestamp.` },
          { type: "input_image" as const, image_url: sheet.dataUrl, detail: "high" as const },
        ]),
      ],
    }],
    text: { format: zodTextFormat(answerSchema, "sceneops_answer") },
  };
}

export async function answerQuestion(request: QueryRequest, evidence: Evidence): Promise<Answer> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: PROVIDER_TIMEOUT_MS, maxRetries: 0 });
  try {
    const response = await client.responses.parse(buildProviderRequest(request, evidence));
    if (response.status !== "completed" || !response.output_parsed) throw new PublicError("The assistant could not complete this answer. Please try a shorter question.", 502);
    return validateAnswer(response.output_parsed, evidence, request);
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError("The assistant is temporarily unavailable. Please try again later.", 502);
  }
}

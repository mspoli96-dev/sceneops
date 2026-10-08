import { randomUUID } from "node:crypto";
import { checkBotId } from "botid/server";
import { z } from "zod";
import type { Answer, CameraId, QueryRequest } from "../contracts";
import { hostedEnvironment, publicConfig } from "./config";
import { evidenceReady, loadEvidence, type Evidence } from "./evidence";
import { answerQuestion } from "./provider";
import { assertOrigin, newVisitor, PublicError, readBoundedJson, visitorFromRequest } from "./security";
import { createQueryStore, type QueryStore } from "./store";

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export const querySchema = z.strictObject({
  question: z.string().trim().min(1).max(600),
  cameraId: z.enum(["receiving", "packing", "dispatch", "all"]),
  consent: z.literal(true),
});

export type QueryDependencies = {
  ready: () => boolean;
  evidence: (cameraId: CameraId | "all") => Promise<Evidence>;
  store: () => QueryStore;
  answer: (request: QueryRequest, evidence: Evidence) => Promise<Answer>;
  verifyBrowser: () => Promise<boolean>;
};

const dependencies: QueryDependencies = {
  ready: evidenceReady,
  evidence: loadEvidence,
  store: createQueryStore,
  answer: answerQuestion,
  async verifyBrowser() {
    const result = await checkBotId({ advancedOptions: { checkLevel: "basic" }, developmentOptions: { isDevelopment: false } });
    return result?.isBot === false && result.bypassed === false;
  },
};

function errorResponse(error: unknown): Response {
  const known = error instanceof PublicError;
  return Response.json({ error: known ? error.message : "Live questions are temporarily unavailable. Please try again later." }, { status: known ? error.status : 503, headers: noStore });
}

export function configResponse(request: Request, ready: () => boolean = evidenceReady): Response {
  try {
    const config = publicConfig(ready());
    const cookie = config.liveEnabled && !visitorFromRequest(request) ? newVisitor(request).cookie : undefined;
    return Response.json(config, { headers: { ...noStore, ...(cookie ? { "Set-Cookie": cookie } : {}) } });
  } catch (error) { return errorResponse(error); }
}

export async function queryResponse(request: Request, services: QueryDependencies = dependencies): Promise<Response> {
  try {
    assertOrigin(request);
    const parsed = querySchema.safeParse(await readBoundedJson(request));
    if (!parsed.success) throw new PublicError("Enter a question of up to 600 characters, choose a camera, and confirm AI processing.", 400);
    if (!publicConfig(services.ready()).liveEnabled) throw new PublicError("Live questions are temporarily unavailable. You can still explore the recorded evidence.", 503);
    const visitorId = visitorFromRequest(request);
    if (!visitorId) throw new PublicError("Refresh the SceneOps page before asking a question.", 403);
    if (hostedEnvironment()) {
      let verified = false;
      try { verified = await services.verifyBrowser(); } catch { throw new PublicError("Browser verification is temporarily unavailable.", 503); }
      if (!verified) throw new PublicError("Browser verification failed. Refresh the page and try again.", 403);
    }
    const evidence = await services.evidence(parsed.data.cameraId);
    const store = services.store();
    const reservationId = randomUUID();
    await store.reserve(visitorId, reservationId);
    const answer = await services.answer(parsed.data, evidence);
    try { await store.release(visitorId, reservationId); } catch {}
    return Response.json(answer, { headers: noStore });
  } catch (error) { return errorResponse(error); }
}

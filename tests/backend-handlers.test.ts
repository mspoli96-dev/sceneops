import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configResponse, queryResponse } from "../src/lib/server/handlers";
import { PublicError } from "../src/lib/server/security";
import { answer, configureEnvironment, origin, request, services, validQuery } from "./backend-fixtures";

beforeEach(configureEnvironment);
afterEach(() => vi.unstubAllEnvs());

describe("public query admission", () => {
  it("issues a no-store signed visitor cookie through configuration", async () => {
    const response = configResponse(new Request(`${origin}/api/config`), () => true);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("sceneops_visitor=");
    expect(await response.json()).toEqual({ liveEnabled: true, model: "gpt-6.1-sol", unavailableReason: null });
  });
  it("keeps recorded evidence browsable when the live route is disabled", async () => {
    const response = configResponse(new Request(`${origin}/api/config`), () => false);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toMatchObject({ liveEnabled: false });
  });
  it("makes one admitted provider call and releases concurrency only", async () => {
    const { dependencies, store } = services();
    const response = await queryResponse(request(), dependencies);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(answer);
    expect(dependencies.answer).toHaveBeenCalledOnce();
    expect(store.reserve).toHaveBeenCalledOnce();
    expect(store.release).toHaveBeenCalledWith(...store.reserve.mock.calls[0]);
    expect(dependencies.verifyBrowser).toHaveBeenCalledOnce();
  });
  it("rejects cross-origin requests before browser, storage, or provider work", async () => {
    const { dependencies, store } = services();
    const response = await queryResponse(request(validQuery, { origin: "https://attacker.example" }), dependencies);
    expect(response.status).toBe(403);
    expect(store.reserve).not.toHaveBeenCalled();
    expect(dependencies.verifyBrowser).not.toHaveBeenCalled();
    expect(dependencies.answer).not.toHaveBeenCalled();
  });
  it("requires a valid signed visitor cookie instead of minting a quota bypass on POST", async () => {
    const { dependencies, store } = services();
    for (const cookie of ["", "sceneops_visitor=tampered"]) {
      const response = await queryResponse(request(validQuery, { cookie }), dependencies);
      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    expect(store.reserve).not.toHaveBeenCalled();
  });
  it.each([
    { question: "Where are packages?", cameraId: "all" },
    { ...validQuery, consent: false },
    { ...validQuery, question: "x".repeat(601) },
    { ...validQuery, question: "  " },
    { ...validQuery, cameraId: "../../other" },
    { ...validQuery, image: "data:untrusted" },
    { ...validQuery, url: "https://untrusted.example" },
  ])("rejects unsupported or unconsented payload %#", async body => {
    const { dependencies } = services();
    expect((await queryResponse(request(body), dependencies)).status).toBe(400);
    expect(dependencies.answer).not.toHaveBeenCalled();
  });
  it("rejects missing browser proof and verification failures without admission", async () => {
    const { dependencies, store } = services();
    dependencies.verifyBrowser.mockResolvedValueOnce(false);
    expect((await queryResponse(request(), dependencies)).status).toBe(403);
    dependencies.verifyBrowser.mockRejectedValueOnce(new Error("private verifier details"));
    const response = await queryResponse(request(), dependencies);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(store.reserve).not.toHaveBeenCalled();
  });
  it("fails closed on missing evidence or Redis failure", async () => {
    const { dependencies, store } = services();
    dependencies.evidence.mockRejectedValueOnce(new Error("missing image path"));
    expect((await queryResponse(request(), dependencies)).status).toBe(503);
    expect(store.reserve).not.toHaveBeenCalled();
    store.reserve.mockRejectedValueOnce(new Error("private Redis credentials"));
    const response = await queryResponse(request(), dependencies);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("credentials");
    expect(dependencies.answer).not.toHaveBeenCalled();
  });
  it("preserves the reservation after uncertain provider failure and never retries", async () => {
    const { dependencies, store } = services();
    dependencies.answer.mockRejectedValueOnce(new PublicError("The assistant is temporarily unavailable.", 502));
    expect((await queryResponse(request(), dependencies)).status).toBe(502);
    expect(dependencies.answer).toHaveBeenCalledOnce();
    expect(store.release).not.toHaveBeenCalled();
  });
  it("returns the completed answer even if releasing concurrency fails", async () => {
    const { dependencies, store } = services();
    store.release.mockRejectedValueOnce(new Error("Redis disconnected"));
    const response = await queryResponse(request(), dependencies);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(answer);
    expect(dependencies.answer).toHaveBeenCalledOnce();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion } from "../src/lib/server/provider";
import { configureEnvironment, evidence, validQuery } from "./backend-fixtures";

beforeEach(configureEnvironment);
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Responses SDK boundary with an offline HTTP stub", () => {
  it("parses a completed response while using no storage, no tools, and Standard service tier", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "resp_fixture", object: "response", status: "completed", model: "gpt-6.1-sol",
      output: [{ type: "message", id: "msg_fixture", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ answer: "Objects change position in the sampled receiving frames.", eventIds: ["receiving-change"], limitation: "Synthetic sampled footage does not establish an exact event boundary." }), annotations: [] }] }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const result = await answerQuestion(validQuery, evidence);
    expect(result.eventIds).toEqual(["receiving-change"]);
    expect(result.source).toBe("live_model");
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ store: false, service_tier: "default", max_output_tokens: 1_600 });
    expect(payload).not.toHaveProperty("tools");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("never retries a provider server error and suppresses raw diagnostics", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: { message: "private provider details", type: "server_error" } }), { status: 500, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetch);
    await expect(answerQuestion(validQuery, evidence)).rejects.toMatchObject({ status: 502, message: "The assistant is temporarily unavailable. Please try again later." });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("rejects incomplete output without attempting repair or retry", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "resp_fixture", object: "response", status: "incomplete", output: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(answerQuestion(validQuery, evidence)).rejects.toMatchObject({ status: 502 });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { budgetLimits, publicConfig, redisConfiguration } from "../src/lib/server/config";
import { newVisitor, readBoundedJson, visitorFromRequest } from "../src/lib/server/security";
import { configureEnvironment, origin, request } from "./backend-fixtures";

beforeEach(configureEnvironment);
afterEach(() => vi.unstubAllEnvs());

describe("visitor identity and bounded input", () => {
  it("signs a secure, private cookie and rejects changes and expiry", () => {
    const now = Date.now();
    const visitor = newVisitor(new Request(origin), now);
    expect(visitor.cookie).toContain("HttpOnly; SameSite=Strict; Max-Age=86400; Secure");
    const signed = new Request(origin, { headers: { cookie: visitor.cookie } });
    expect(visitorFromRequest(signed, now)).toBe(visitor.id);
    expect(visitorFromRequest(signed, now + 86_400_001)).toBeNull();
    expect(visitorFromRequest(new Request(origin, { headers: { cookie: visitor.cookie.replace(visitor.id, "00000000-0000-4000-8000-000000000000") } }), now)).toBeNull();
  });
  it("rejects malformed or missing cookies without throwing", () => {
    for (const cookie of ["", "sceneops_visitor=bad", "sceneops_visitor=../../secret", "sceneops_visitor=a.b.c.d"]) expect(visitorFromRequest(new Request(origin, { headers: { cookie } }))).toBeNull();
  });
  it("enforces actual body bytes even without Content-Length", async () => {
    await expect(readBoundedJson(request("x".repeat(4_097)))).rejects.toMatchObject({ status: 413 });
    await expect(readBoundedJson(request({ question: "é".repeat(2_050) }))).rejects.toMatchObject({ status: 413 });
  });
  it("rejects excessive declared bytes before parsing", async () => {
    await expect(readBoundedJson(request("{}", { "content-length": "5000" }))).rejects.toMatchObject({ status: 413 });
    await expect(readBoundedJson(request("{}", { "content-length": "invalid" }))).rejects.toMatchObject({ status: 413 });
  });
  it("rejects unsupported types and malformed JSON", async () => {
    await expect(readBoundedJson(request("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
    await expect(readBoundedJson(request("{bad"))).rejects.toMatchObject({ status: 400 });
  });
});

describe("fail-closed configuration", () => {
  it("requires evidence and every paid-route prerequisite", () => {
    expect(publicConfig(true).liveEnabled).toBe(true);
    expect(publicConfig(false).liveEnabled).toBe(false);
    for (const flag of ["SCENEOPS_LIVE_ENABLED", "SCENEOPS_COST_RESERVATION_CONFIRMED", "OPENAI_PROJECT_HARD_LIMIT_CONFIRMED", "VERCEL_BOTID_ENABLED", "VERCEL_RATE_LIMIT_CONFIRMED"]) {
      vi.stubEnv(flag, "false");
      expect(publicConfig(true).liveEnabled).toBe(false);
      vi.stubEnv(flag, "true");
    }
    vi.stubEnv("SESSION_SECRET", "short");
    expect(publicConfig(true).liveEnabled).toBe(false);
  });
  it("uses native Vercel Redis credentials when custom variables are blank", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "  ");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "  ");
    expect(redisConfiguration()).toEqual({ url: "https://test-redis.example", token: "test-only-redis-value" });
    vi.stubEnv("KV_REST_API_TOKEN", "");
    expect(publicConfig(true).liveEnabled).toBe(false);
  });
  it("cannot raise the application budget or reduce the fixed reservation by configuration", () => {
    expect(budgetLimits()).toEqual({ monthlyMicroUsd: 18_000_000, reserveMicroUsd: 250_000 });
    for (const value of ["20", "-1", "NaN", "1e2", "0"]) {
      vi.stubEnv("SCENEOPS_MONTHLY_BUDGET_USD", value);
      expect(publicConfig(true).liveEnabled).toBe(false);
    }
    vi.stubEnv("SCENEOPS_MONTHLY_BUDGET_USD", "5");
    vi.stubEnv("SCENEOPS_QUERY_RESERVE_USD", "0");
    expect(budgetLimits()).toEqual({ monthlyMicroUsd: 5_000_000, reserveMicroUsd: 250_000 });
  });
  it("requires a single exact HTTPS production origin", () => {
    for (const value of ["https://sceneops.example/", "http://sceneops.example", "*", "https://sceneops.example/path"]) {
      vi.stubEnv("APP_ORIGIN", value);
      expect(publicConfig(true).liveEnabled).toBe(false);
    }
  });
});

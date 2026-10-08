import type { LiveConfig } from "../contracts";

export const MODEL = "gpt-6.1-sol";
export const VISITOR_COOKIE = "sceneops_visitor";
export const VISITOR_DAILY_LIMIT = 5;
export const GLOBAL_DAILY_LIMIT = 30;
export const CONCURRENT_LIMIT = 2;
export const RESERVATION_SECONDS = 120;
export const MAX_OUTPUT_TOKENS = 1_600;
export const PROVIDER_TIMEOUT_MS = 45_000;

export function hostedEnvironment(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export function redisConfiguration(): { url: string; token: string } {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim() || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim() || "",
  };
}

function microDollars(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+(\.\d{1,6})?$/.test(value)) return 0;
  const result = Math.round(Number(value) * 1_000_000);
  return Number.isSafeInteger(result) && result > 0 && result <= maximum ? result : 0;
}

export function budgetLimits(): { monthlyMicroUsd: number; reserveMicroUsd: number } {
  return {
    monthlyMicroUsd: microDollars(process.env.SCENEOPS_MONTHLY_BUDGET_USD, 18_000_000, 18_000_000),
    reserveMicroUsd: 250_000,
  };
}

export function publicConfig(evidenceReady: boolean): LiveConfig {
  const redis = redisConfiguration();
  const budget = budgetLimits();
  let originReady = false;
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? "");
    originReady = origin.origin === process.env.APP_ORIGIN && (origin.protocol === "https:" || (!hostedEnvironment() && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)));
  } catch {}
  const configured = process.env.SCENEOPS_LIVE_ENABLED === "true"
    && Boolean(process.env.OPENAI_API_KEY?.trim())
    && (process.env.SESSION_SECRET?.length ?? 0) >= 32
    && Boolean(redis.url && redis.token)
    && originReady
    && process.env.OPENAI_PROJECT_HARD_LIMIT_CONFIRMED === "true"
    && process.env.SCENEOPS_COST_RESERVATION_CONFIRMED === "true"
    && budget.reserveMicroUsd > 0 && budget.monthlyMicroUsd >= budget.reserveMicroUsd
    && (!hostedEnvironment() || (process.env.VERCEL_BOTID_ENABLED === "true" && process.env.VERCEL_RATE_LIMIT_CONFIRMED === "true"));
  const liveEnabled = configured && evidenceReady;
  return {
    liveEnabled,
    model: MODEL,
    unavailableReason: liveEnabled ? null : "Live questions are temporarily unavailable. You can still explore the recorded evidence.",
  };
}

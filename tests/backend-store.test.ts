import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryStore } from "../src/lib/server/store";
import { configureEnvironment } from "./backend-fixtures";
import { LuaRedis } from "./backend-lua";

beforeEach(configureEnvironment);
afterEach(() => vi.unstubAllEnvs());

describe("atomic Redis admission scripts executed in Lua", () => {
  it("admits two visitors, rejects a third, and releases only the matching visitor lease", async () => {
    const redis = new LuaRedis();
    const store = createQueryStore(redis, () => redis.at);
    await store.reserve("a", "request-a");
    await store.reserve("b", "request-b");
    await expect(store.reserve("c", "request-c")).rejects.toMatchObject({ status: 429 });
    await store.release("a", "wrong-request");
    await expect(store.reserve("a", "another-a")).rejects.toMatchObject({ status: 429 });
    await store.release("a", "request-a");
    await store.reserve("c", "request-c");
    expect(redis.get("sceneops:{admission}:daily:2026-10-07")).toBe("3");
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("750000");
  });
  it("makes repeat reservation IDs idempotent and expires abandoned concurrency without refunding spend", async () => {
    const redis = new LuaRedis();
    const store = createQueryStore(redis, () => redis.at);
    await store.reserve("a", "request-a");
    await store.reserve("a", "request-a");
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("250000");
    redis.at += 120_001;
    await store.reserve("a", "request-b");
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("500000");
    expect(redis.get("sceneops:{admission}:daily:2026-10-07")).toBe("2");
  });
  it("retains a newer visitor lease if a stale completion releases its old reservation", async () => {
    const redis = new LuaRedis();
    const store = createQueryStore(redis, () => redis.at);
    await store.reserve("a", "old");
    redis.at += 120_001;
    await store.reserve("a", "new");
    await store.release("a", "old");
    expect(redis.get("sceneops:{admission}:visitor-active:a")).toBe("new");
    await expect(store.reserve("a", "third")).rejects.toMatchObject({ status: 429 });
  });
  it("stops each visitor at five daily attempts without partially charging a rejection", async () => {
    const redis = new LuaRedis();
    const store = createQueryStore(redis, () => redis.at);
    for (let index = 0; index < 5; index++) { await store.reserve("a", `r${index}`); await store.release("a", `r${index}`); }
    await expect(store.reserve("a", "r6")).rejects.toMatchObject({ status: 429 });
    expect(redis.get("sceneops:{admission}:daily:2026-10-07")).toBe("5");
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("1250000");
  });
  it("stops global daily attempts at thirty independently of fresh visitor cookies", async () => {
    const redis = new LuaRedis();
    const store = createQueryStore(redis, () => redis.at);
    for (let index = 0; index < 30; index++) { await store.reserve(`v${index}`, `r${index}`); await store.release(`v${index}`, `r${index}`); }
    await expect(store.reserve("fresh", "r31")).rejects.toMatchObject({ status: 429 });
    expect(redis.get("sceneops:{admission}:daily:2026-10-07")).toBe("30");
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("7500000");
  });
  it("admits exactly 72 quarter-dollar reservations across days and resets only at the next UTC month", async () => {
    const redis = new LuaRedis();
    const initial = redis.at;
    const store = createQueryStore(redis, () => redis.at);
    for (let index = 0; index < 72; index++) {
      redis.at = initial + Math.floor(index / 30) * 86_400_000;
      await store.reserve(`v${index}`, `r${index}`);
      await store.release(`v${index}`, `r${index}`);
    }
    await expect(store.reserve("v73", "r73")).rejects.toMatchObject({ status: 429 });
    expect(redis.get("sceneops:{admission}:budget:2026-10")).toBe("18000000");
    expect(redis.get("sceneops:{admission}:daily:2026-10-09")).toBe("12");
    redis.at = Date.parse("2026-11-01T00:00:00Z");
    await store.reserve("v73", "r74");
    expect(redis.get("sceneops:{admission}:budget:2026-11")).toBe("250000");
  });
  it("fails closed on network errors or unexpected script responses", async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error("network response lost")).mockResolvedValueOnce(0);
    const store = createQueryStore({ eval: execute });
    await expect(store.reserve("a", "r1")).rejects.toMatchObject({ status: 503 });
    expect(execute).toHaveBeenCalledOnce();
    await expect(store.reserve("a", "r2")).rejects.toMatchObject({ status: 503 });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

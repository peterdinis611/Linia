import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "@/lib/ttl-cache";

describe("createTtlCache", () => {
  it("returns a remembered value inside the ttl", async () => {
    const cache = createTtlCache<number>({ ttlMs: 5_000 });
    const load = vi.fn(async () => 7);
    expect(await cache.get("a", load)).toBe(7);
    expect(await cache.get("a", load)).toBe(7);
    expect(load).toHaveBeenCalledOnce();
  });

  it("shares one in-flight load", async () => {
    const cache = createTtlCache<string>({ ttlMs: 5_000 });
    let release: (value: string) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );

    const first = cache.get("k", load);
    const second = cache.get("k", load);
    release("ok");
    expect(await first).toBe("ok");
    expect(await second).toBe("ok");
    expect(load).toHaveBeenCalledOnce();
  });

  it("reloads when asked for a fresh copy", async () => {
    const cache = createTtlCache<number>({ ttlMs: 5_000 });
    const load = vi.fn(async () => 1);
    await cache.get("n", load);
    load.mockResolvedValueOnce(2);
    expect(await cache.get("n", load, { fresh: true })).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

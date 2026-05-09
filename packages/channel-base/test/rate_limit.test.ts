import { describe, it, expect, vi } from "vitest";
import { TokenBucket, withRetryBackoff, type Clock } from "../src/rate_limit.js";

function fakeClock(initial = 1_000_000): Clock & { advance: (ms: number) => void } {
  let t = initial;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("TokenBucket", () => {
  it("rejects invalid construction", () => {
    expect(() => new TokenBucket({ capacity: 0, refill_per_sec: 1 })).toThrow();
    expect(() => new TokenBucket({ capacity: 1, refill_per_sec: 0 })).toThrow();
  });

  it("starts full and consumes tokens", () => {
    const clock = fakeClock();
    const b = new TokenBucket({ capacity: 5, refill_per_sec: 1, clock });
    for (let i = 0; i < 5; i++) {
      expect(b.consume("u1").ok).toBe(true);
    }
    const r = b.consume("u1");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Need 1 token, refill 1/sec → wait ~1000ms
      expect(r.retry_after_ms).toBeGreaterThanOrEqual(900);
      expect(r.retry_after_ms).toBeLessThanOrEqual(1100);
    }
  });

  it("refills proportionally to elapsed time", () => {
    const clock = fakeClock();
    const b = new TokenBucket({ capacity: 10, refill_per_sec: 2, clock });
    for (let i = 0; i < 10; i++) b.consume("u1");
    expect(b.consume("u1").ok).toBe(false);
    clock.advance(2_500); // 2.5s @ 2/s = 5 tokens
    expect(b.consume("u1", 5).ok).toBe(true);
    expect(b.consume("u1").ok).toBe(false);
  });

  it("does not exceed capacity on long idle", () => {
    const clock = fakeClock();
    const b = new TokenBucket({ capacity: 3, refill_per_sec: 1, clock });
    b.consume("u1"); // 2 left
    clock.advance(60_000); // a minute idle — should cap at 3 not 62
    expect(b.consume("u1", 3).ok).toBe(true);
    expect(b.consume("u1").ok).toBe(false);
  });

  it("isolates buckets per key", () => {
    const clock = fakeClock();
    const b = new TokenBucket({ capacity: 2, refill_per_sec: 1, clock });
    expect(b.consume("u1").ok).toBe(true);
    expect(b.consume("u1").ok).toBe(true);
    expect(b.consume("u1").ok).toBe(false);
    // u2 untouched
    expect(b.consume("u2").ok).toBe(true);
    expect(b.consume("u2").ok).toBe(true);
    expect(b.consume("u2").ok).toBe(false);
  });

  it("prune drops only fully-refilled idle entries", () => {
    const clock = fakeClock();
    const b = new TokenBucket({ capacity: 5, refill_per_sec: 1, clock });
    b.consume("u1");
    b.consume("u2", 3);
    expect(b.size()).toBe(2);
    // u1 refills to full after 1s; u2 needs 3s.
    clock.advance(2_000);
    const dropped = b.prune(1_000);
    expect(dropped).toBe(1); // u1
    expect(b.size()).toBe(1);
  });
});

describe("withRetryBackoff", () => {
  const noJitter = () => 0.5; // → (0.5*2-1) = 0; jitter term = 0

  it("returns successful value without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const r = await withRetryBackoff(fn, {
      max_retries: 3,
      base_delay_ms: 10,
      max_delay_ms: 1000,
      jitter_ratio: 0,
      is_retryable: () => false,
      sleep: async () => {},
      random: noJitter,
    });
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries throws up to max and then propagates", async () => {
    const err = new Error("boom");
    const fn = vi.fn().mockRejectedValue(err);
    const sleeps: number[] = [];
    await expect(
      withRetryBackoff(fn, {
        max_retries: 3,
        base_delay_ms: 100,
        max_delay_ms: 10_000,
        jitter_ratio: 0,
        is_retryable: (s) => s.kind === "throw",
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        random: noJitter,
      }),
    ).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(4); // 1 + 3 retries
    expect(sleeps).toEqual([100, 200, 400]);
  });

  it("honors extract_retry_after_ms when provided", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        const e = new Error("rate_limited") as Error & { retry_after_ms?: number };
        e.retry_after_ms = 750;
        throw e;
      }
      return "ok";
    });
    const sleeps: number[] = [];
    const r = await withRetryBackoff(fn, {
      max_retries: 5,
      base_delay_ms: 100,
      max_delay_ms: 10_000,
      jitter_ratio: 0,
      is_retryable: (s) => s.kind === "throw",
      extract_retry_after_ms: (s) =>
        s.kind === "throw"
          ? ((s.error as { retry_after_ms?: number }).retry_after_ms ?? null)
          : null,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: noJitter,
    });
    expect(r).toBe("ok");
    expect(sleeps).toEqual([750, 750]); // server hint overrides exponential
  });

  it("retries values that are flagged as retryable", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      return calls < 2 ? { ok: false, error: "ratelimited" } : { ok: true };
    });
    const r = await withRetryBackoff(fn, {
      max_retries: 3,
      base_delay_ms: 10,
      max_delay_ms: 1000,
      jitter_ratio: 0,
      is_retryable: (s) =>
        s.kind === "value" && (s.value as { ok: boolean }).ok === false,
      sleep: async () => {},
      random: noJitter,
    });
    expect(r).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("caps delay at max_delay_ms", async () => {
    const sleeps: number[] = [];
    await expect(
      withRetryBackoff(async () => Promise.reject(new Error("x")), {
        max_retries: 5,
        base_delay_ms: 1_000,
        max_delay_ms: 2_500,
        jitter_ratio: 0,
        is_retryable: (s) => s.kind === "throw",
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        random: noJitter,
      }),
    ).rejects.toThrow();
    // 1000, 2000, 2500(capped), 2500, 2500
    expect(sleeps).toEqual([1000, 2000, 2500, 2500, 2500]);
  });

  it("invokes on_retry observer", async () => {
    const observed: number[] = [];
    await expect(
      withRetryBackoff(async () => Promise.reject(new Error("x")), {
        max_retries: 2,
        base_delay_ms: 50,
        max_delay_ms: 1_000,
        jitter_ratio: 0,
        is_retryable: (s) => s.kind === "throw",
        sleep: async () => {},
        random: noJitter,
        on_retry: ({ attempt }) => observed.push(attempt),
      }),
    ).rejects.toThrow();
    expect(observed).toEqual([1, 2]);
  });
});

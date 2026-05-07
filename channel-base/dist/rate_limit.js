/**
 * Rate-limit primitives shared by inbound (WebChat) and outbound
 * (Slack/Discord) channels.
 *
 * Phase 4-S1 design notes:
 *   - Inbound (WebChat) needs proactive throttling, since the channel itself
 *     is the trust boundary. We use a per-key TokenBucket with HTTP 429 +
 *     Retry-After.
 *   - Outbound to Slack/Discord does NOT use proactive throttling. Both
 *     SDKs (`@slack/bolt`/`@slack/web-api` and `discord.js`) already queue
 *     and respect their own rate-limit headers internally. Stacking another
 *     pre-throttle on top would only fight the SDK. Instead, we wrap the
 *     transport's `postMessage` with `withRetryBackoff` to honor any 429
 *     that still escapes the SDK as a final error.
 */
const DEFAULT_CLOCK = { now: () => Date.now() };
/**
 * Per-key token bucket. The bucket map is keyed by an arbitrary string
 * (e.g. `${user}:${endpoint}`). Stale entries are NOT auto-evicted; callers
 * that face unbounded keyspaces should periodically call `prune()`.
 */
export class TokenBucket {
    opts;
    state = new Map();
    clock;
    constructor(opts) {
        this.opts = opts;
        if (opts.capacity <= 0) {
            throw new Error("TokenBucket: capacity must be > 0");
        }
        if (opts.refill_per_sec <= 0) {
            throw new Error("TokenBucket: refill_per_sec must be > 0");
        }
        this.clock = opts.clock ?? DEFAULT_CLOCK;
    }
    /**
     * Try to consume `n` tokens for `key`. Returns:
     *   - { ok: true } on success
     *   - { ok: false, retry_after_ms } when not enough tokens; the
     *     `retry_after_ms` is the soonest time at which a single token will
     *     be available again, rounded up to whole milliseconds.
     *
     * Note: this method only refills lazily on access, which is intentional
     * — there's no background timer to leak. A long-idle bucket simply gets
     * topped back up on its next call.
     */
    consume(key, n = 1) {
        if (n <= 0)
            return { ok: true };
        const now = this.clock.now();
        const cur = this.state.get(key) ?? {
            tokens: this.opts.initial_tokens ?? this.opts.capacity,
            last_refill_ms: now,
        };
        const elapsed_ms = Math.max(0, now - cur.last_refill_ms);
        const refilled = cur.tokens + (elapsed_ms / 1000) * this.opts.refill_per_sec;
        cur.tokens = Math.min(this.opts.capacity, refilled);
        cur.last_refill_ms = now;
        if (cur.tokens >= n) {
            cur.tokens -= n;
            this.state.set(key, cur);
            return { ok: true };
        }
        const deficit = n - cur.tokens;
        const wait_sec = deficit / this.opts.refill_per_sec;
        const retry_after_ms = Math.max(1, Math.ceil(wait_sec * 1000));
        this.state.set(key, cur);
        return { ok: false, retry_after_ms };
    }
    /** Inspection (test/diagnostic only). */
    snapshot(key) {
        const s = this.state.get(key);
        return s ? { ...s } : null;
    }
    /** Number of distinct keys currently tracked. */
    size() {
        return this.state.size;
    }
    /**
     * Drop entries whose virtual (lazily-refilled) token count would be at
     * capacity AND have been idle at least `idle_ms`. A "full" entry conveys
     * no rate-limit memory, so dropping it is safe — the next consume() on
     * that key will re-create it as a fresh full bucket.
     */
    prune(idle_ms) {
        const now = this.clock.now();
        let dropped = 0;
        for (const [k, v] of this.state) {
            const idle = now - v.last_refill_ms;
            if (idle < idle_ms)
                continue;
            const refilled = Math.min(this.opts.capacity, v.tokens + (idle / 1000) * this.opts.refill_per_sec);
            if (refilled >= this.opts.capacity - 1e-9) {
                this.state.delete(k);
                dropped += 1;
            }
        }
        return dropped;
    }
    /** Reset all buckets. Intended for tests. */
    reset() {
        this.state.clear();
    }
}
const DEFAULT_SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Run `fn` with exponential backoff + jitter. Retries are governed by
 * `is_retryable`. On exhaustion, the final outcome — whatever it was —
 * is propagated (throw or return).
 *
 * Intended use here: wrap `transport.postMessage` so a Slack/Discord
 * 429 that the SDK couldn't internally resolve gets a few more chances
 * before being surfaced as a delivery failure.
 */
export async function withRetryBackoff(fn, opts) {
    const sleep = opts.sleep ?? DEFAULT_SLEEP;
    const random = opts.random ?? Math.random;
    let attempt = 0;
    // attempt 0 = first try; attempts 1..max_retries = retries.
    // Total calls: 1 + max_retries.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let signal;
        try {
            const value = await fn();
            signal = { kind: "value", value };
        }
        catch (error) {
            signal = { kind: "throw", error };
        }
        const should_retry = attempt < opts.max_retries && opts.is_retryable(signal);
        if (!should_retry) {
            if (signal.kind === "throw")
                throw signal.error;
            return signal.value;
        }
        attempt += 1;
        const exp_delay = Math.min(opts.max_delay_ms, opts.base_delay_ms * 2 ** (attempt - 1));
        let delay_ms = exp_delay;
        const hint = opts.extract_retry_after_ms?.(signal);
        if (hint != null && hint > 0) {
            delay_ms = Math.min(opts.max_delay_ms, hint);
        }
        // Apply symmetric jitter: delay * (1 ± jitter_ratio * U(-1,1)).
        const jitter = (random() * 2 - 1) * opts.jitter_ratio;
        delay_ms = Math.max(0, Math.floor(delay_ms * (1 + jitter)));
        opts.on_retry?.({ attempt, delay_ms, signal });
        await sleep(delay_ms);
    }
}
//# sourceMappingURL=rate_limit.js.map
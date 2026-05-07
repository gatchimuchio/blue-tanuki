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
/**
 * Minimal monotonic clock interface for testability. Default implementation
 * uses `Date.now()`. Tests can pass a fake.
 */
export interface Clock {
    now(): number;
}
export interface TokenBucketOptions {
    /** Maximum tokens the bucket can hold (burst capacity). */
    capacity: number;
    /** Sustained refill rate, in tokens per second. */
    refill_per_sec: number;
    /** Initial token count. Defaults to `capacity` (full bucket). */
    initial_tokens?: number;
    /** Injectable clock for tests. */
    clock?: Clock;
}
/**
 * Per-key token bucket. The bucket map is keyed by an arbitrary string
 * (e.g. `${user}:${endpoint}`). Stale entries are NOT auto-evicted; callers
 * that face unbounded keyspaces should periodically call `prune()`.
 */
export declare class TokenBucket {
    private readonly opts;
    private readonly state;
    private readonly clock;
    constructor(opts: TokenBucketOptions);
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
    consume(key: string, n?: number): {
        ok: true;
    } | {
        ok: false;
        retry_after_ms: number;
    };
    /** Inspection (test/diagnostic only). */
    snapshot(key: string): {
        tokens: number;
        last_refill_ms: number;
    } | null;
    /** Number of distinct keys currently tracked. */
    size(): number;
    /**
     * Drop entries whose virtual (lazily-refilled) token count would be at
     * capacity AND have been idle at least `idle_ms`. A "full" entry conveys
     * no rate-limit memory, so dropping it is safe — the next consume() on
     * that key will re-create it as a fresh full bucket.
     */
    prune(idle_ms: number): number;
    /** Reset all buckets. Intended for tests. */
    reset(): void;
}
export interface BackoffOptions<T> {
    /** Maximum number of *retries* (i.e. attempts beyond the first). */
    max_retries: number;
    /** Base delay in ms for the first retry. */
    base_delay_ms: number;
    /** Hard upper bound on a single sleep duration. */
    max_delay_ms: number;
    /**
     * Multiplicative random jitter ratio, e.g. 0.2 = ±20%. Applied
     * symmetrically around the computed exponential delay.
     */
    jitter_ratio: number;
    /**
     * Decide whether a thrown error or a returned value should trigger a
     * retry. Called for both throws (with the error) and successful returns
     * (with `{ value }` wrapper) — see implementation below.
     */
    is_retryable: (signal: {
        kind: "throw";
        error: unknown;
    } | {
        kind: "value";
        value: T;
    }) => boolean;
    /**
     * Optional extractor for a server-suggested retry-after duration in ms.
     * If it returns a positive number, that overrides the exponential delay
     * for the upcoming sleep (capped at `max_delay_ms`).
     */
    extract_retry_after_ms?: (signal: {
        kind: "throw";
        error: unknown;
    } | {
        kind: "value";
        value: T;
    }) => number | null;
    /** Sleep injection point for tests. Default uses `setTimeout`. */
    sleep?: (ms: number) => Promise<void>;
    /** RNG injection point for tests. Default `Math.random`. */
    random?: () => number;
    /** Optional observability hook. */
    on_retry?: (info: {
        attempt: number;
        delay_ms: number;
        signal: unknown;
    }) => void;
}
/**
 * Run `fn` with exponential backoff + jitter. Retries are governed by
 * `is_retryable`. On exhaustion, the final outcome — whatever it was —
 * is propagated (throw or return).
 *
 * Intended use here: wrap `transport.postMessage` so a Slack/Discord
 * 429 that the SDK couldn't internally resolve gets a few more chances
 * before being surfaced as a delivery failure.
 */
export declare function withRetryBackoff<T>(fn: () => Promise<T>, opts: BackoffOptions<T>): Promise<T>;
//# sourceMappingURL=rate_limit.d.ts.map
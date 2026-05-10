# Phase 4-S1: Rate Limiting and TicketStore Abstraction

Phase 4 was split into three sub-phases (S1/S2/S3); this document covers S1.

## Scope

- 4-1: WebChat rate limiting + Retry-After
- 4-2: Slack/Discord retry/backoff for rate-limit responses
- 4-3: TicketStore interface + default in-memory implementation

## 4-1 WebChat rate limits

Three authenticated endpoints are rate-limited per-key with a token bucket.

| Endpoint     | Key        | Capacity | Refill (tokens/s) | Effective rate           |
| ------------ | ---------- | -------- | ----------------- | ------------------------ |
| `POST /inbound`   | per user   | 10       | 1.0               | ~60/min/user with burst  |
| `POST /resume`    | global (`*`) | 5      | 0.5               | ~30/min global with burst |
| `POST /ws-ticket` | per user   | 3        | 10/60 ≈ 0.167     | ~10/min/user with burst  |

`GET /healthz` is never rate-limited.

On rejection:

```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
Content-Type: application/json

{ "error": "rate_limited", "retry_after_ms": <ms> }
```

`Retry-After` is `ceil(retry_after_ms / 1000)` with a floor of 1.

### Configuration

`WebChatOptions.rate_limits`:

- omit (default): use the defaults above
- `false`: disable all rate limiting (used in tests and trusted single-tenant deployments)
- partial object: override only the endpoints you specify; others fall back to defaults

```ts
new WebChatChannel({
  port: 8787,
  token: "...",
  rate_limits: {
    inbound: { capacity: 30, refill_per_sec: 5 }, // higher inbound for batch
    // resume / ws_ticket use defaults
  },
});
```

### Why a token bucket and not fixed window?

Two reasons:

1. **Burst tolerance.** A user opening the page and sending a few quick messages
   should not be punished for using their burst budget; the bucket refills
   while they read replies. A fixed window resets at sharp boundaries and
   can deny three requests in a row that arrive 100ms before window rollover.
2. **Cheap state.** One numeric token count + last refill timestamp per key,
   refilled lazily on access. No background timers.

### Why not pre-throttle Slack/Discord too?

The Slack SDK (`@slack/web-api`) and `discord.js` both maintain internal
queues that respect their respective `Retry-After` / `retry_after`
headers. Adding our own pre-throttle on top would only fight the SDK and
add latency. We instead handle the rare case where a rate-limit error
escapes the SDK with a fallback retry layer (see 4-2).

## 4-2 Slack/Discord retry/backoff

`SlackChannel` and `DiscordChannel` wrap each `transport.postMessage()`
call in `withRetryBackoff` from `@blue-tanuki/channel-base`.

Defaults:

| Option         | Value     |
| -------------- | --------- |
| max_retries    | 3         |
| base_delay_ms  | 500       |
| max_delay_ms   | 30 000    |
| jitter_ratio   | 0.2 (±20%) |

Retry decision:

- `is_retryable=true` for thrown errors (defensive — transports normally
  catch and convert to `{ ok:false }` but we don't trust that absolutely).
- `is_retryable=true` when the result is `{ ok:false }` AND either:
  - `retry_after_ms` is a positive number, OR
  - `error` matches `/rate.?limit|ratelimited|too_many|429/i` (Discord
    additionally matches `429`).
- All other failures (e.g. `channel_not_found`, `missing_access`) are
  treated as permanent and bubble up immediately.

When the transport surfaces a `retry_after_ms` hint, that overrides the
exponential delay (capped at `max_delay_ms`). Otherwise the delay
follows `base_delay_ms * 2^(attempt-1)` with symmetric jitter.

Pass `retry: false` on either channel to disable the retry layer entirely.

### Production transports today

`BoltTransport` and `DiscordJsTransport` do not currently extract
`retry_after_ms` from the SDK error path. Adding that is a Phase 4-S2 or
Phase 5 task; for now, the retry layer matches on `error` text and uses
exponential backoff, which is sufficient for the SDK-escape cases that
motivated 4-2.

## 4-3 TicketStore abstraction

The WebChat WS-ticket cache moves behind a 3-method async interface so
horizontal scaling (Redis) becomes a drop-in change.

```ts
interface TicketStore {
  issue(user: string, ttl_ms: number): Promise<{ ticket: string; expires_at_ms: number }>;
  consume(ticket: string): Promise<string | null>;  // user, single-use
  size(): Promise<number>;
}
```

### Contracts

- **Single-use.** A successful `consume` MUST atomically remove the entry
  so a slow client retry cannot replay the ticket.
- **Expiry-checked on consume.** `expires_at_ms < now()` → `null`.
- **All methods async.** Even when the default implementation is
  in-memory and synchronous, the surface stays async to avoid a future
  breaking change when a Redis backend lands.

### Default: `MemoryTicketStore`

Single-process, ordered Map. When `cap` is reached, the oldest insertion
is evicted to make room for the new entry. Lazy GC of expired entries
on `issue()` and `size()`.

```ts
new WebChatChannel({
  port: 8787,
  token: "...",
  // ticket_store: new RedisTicketStore({ url, prefix }), // future
});
```

When `ticket_store` is omitted, an internal `MemoryTicketStore` is
created with `cap = ws_ticket_cap` (default 10 000).

## Test coverage delta (S1)

| Package         | Before | After | New cases                                      |
| --------------- | ------ | ----- | ---------------------------------------------- |
| channel-base    | 10     | 22    | TokenBucket (6) + withRetryBackoff (6)          |
| channel-webchat | 20     | 34    | TicketStore (7) + rate-limit suite (7)         |
| channel-slack   | 12     | 17    | retry/backoff (5)                              |
| channel-discord | 6      | 9     | retry/backoff (3)                              |
| **total delta** | —      | —     | **+38**                                        |

All Phase 3 smoke flows (`smoke:serve`, `smoke:resume`, CLI ASSERT/SUSPEND)
continue to pass unchanged.

## Out of scope (deferred to S2/S3)

- Session persistence (S2: 4-4)
- Plugin manifest format (S2: 4-5)
- `doctor` diagnostic command (S2: 4-6)
- DM pairing flow (S3: 4-7)
- Real Slack/Discord live-fire smoke (S3: 4-8)
- Production transports surfacing `retry_after_ms` from SDK error paths
  (S2 or Phase 5; see "Production transports today" above)
- Redis-backed `TicketStore` implementation (post-4)

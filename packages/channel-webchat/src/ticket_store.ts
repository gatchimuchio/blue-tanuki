/**
 * TicketStore — abstraction for the WS-ticket cache used by the WebChat
 * channel. Phase 4-3 introduces this interface so a future Redis-backed
 * implementation can replace the in-memory default for horizontally-scaled
 * deployments without touching `WebChatChannel`.
 *
 * Contract:
 *   - `issue(user, ttl_ms)` returns a freshly-minted opaque ticket plus
 *     its absolute expiry (ms since epoch). Implementations choose ticket
 *     length and entropy.
 *   - `consume(ticket)` is single-use. On success, returns the bound user
 *     and the implementation MUST atomically remove the ticket so that a
 *     concurrent retry cannot replay it. On miss or expiry, returns null.
 *   - `size()` is a diagnostic; implementations may approximate.
 *
 * All methods are async because a Redis implementation will be — keeping
 * the surface async-from-day-one avoids a future breaking change.
 */
export interface TicketIssued {
  ticket: string;
  expires_at_ms: number;
}

export interface TicketStore {
  issue(user: string, ttl_ms: number): Promise<TicketIssued>;
  consume(ticket: string): Promise<string | null>;
  size(): Promise<number>;
}

import { randomBytes } from "node:crypto";

interface MemoryEntry {
  user: string;
  expires_at_ms: number;
}

export interface MemoryTicketStoreOptions {
  /** Hard cap on simultaneously live tickets. Default 10_000. */
  cap?: number;
  /** Clock injection for tests. Default uses Date.now. */
  now?: () => number;
}

/**
 * Default in-memory TicketStore. Single-process only — concurrent processes
 * each see their own map and tickets are NOT shared. For horizontal scaling,
 * swap this out for a Redis-backed store.
 *
 * Capacity behavior: when `cap` is reached, the oldest-inserted entry is
 * dropped to make room for the new one (Map preserves insertion order).
 */
export class MemoryTicketStore implements TicketStore {
  private readonly map = new Map<string, MemoryEntry>();
  private readonly cap: number;
  private readonly now: () => number;

  constructor(opts: MemoryTicketStoreOptions = {}) {
    this.cap = opts.cap ?? 10_000;
    this.now = opts.now ?? (() => Date.now());
    if (this.cap < 1) {
      throw new Error("MemoryTicketStore: cap must be >= 1");
    }
  }

  async issue(user: string, ttl_ms: number): Promise<TicketIssued> {
    if (ttl_ms <= 0) {
      throw new Error("MemoryTicketStore: ttl_ms must be > 0");
    }
    this.gc();
    if (this.map.size >= this.cap) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    const ticket = randomBytes(32).toString("base64url");
    const expires_at_ms = this.now() + ttl_ms;
    this.map.set(ticket, { user, expires_at_ms });
    return { ticket, expires_at_ms };
  }

  async consume(ticket: string): Promise<string | null> {
    const entry = this.map.get(ticket);
    if (!entry) return null;
    // Single-use: remove unconditionally so a slow client retry can't replay.
    this.map.delete(ticket);
    if (entry.expires_at_ms < this.now()) return null;
    return entry.user;
  }

  async size(): Promise<number> {
    this.gc();
    return this.map.size;
  }

  private gc(): void {
    const t = this.now();
    for (const [k, v] of this.map) {
      if (v.expires_at_ms < t) this.map.delete(k);
    }
  }
}

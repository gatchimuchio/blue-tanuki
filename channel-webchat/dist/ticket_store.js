import { randomBytes } from "node:crypto";
/**
 * Default in-memory TicketStore. Single-process only — concurrent processes
 * each see their own map and tickets are NOT shared. For horizontal scaling,
 * swap this out for a Redis-backed store.
 *
 * Capacity behavior: when `cap` is reached, the oldest-inserted entry is
 * dropped to make room for the new one (Map preserves insertion order).
 */
export class MemoryTicketStore {
    map = new Map();
    cap;
    now;
    constructor(opts = {}) {
        this.cap = opts.cap ?? 10_000;
        this.now = opts.now ?? (() => Date.now());
        if (this.cap < 1) {
            throw new Error("MemoryTicketStore: cap must be >= 1");
        }
    }
    async issue(user, ttl_ms) {
        if (ttl_ms <= 0) {
            throw new Error("MemoryTicketStore: ttl_ms must be > 0");
        }
        this.gc();
        if (this.map.size >= this.cap) {
            const firstKey = this.map.keys().next().value;
            if (firstKey !== undefined)
                this.map.delete(firstKey);
        }
        const ticket = randomBytes(32).toString("base64url");
        const expires_at_ms = this.now() + ttl_ms;
        this.map.set(ticket, { user, expires_at_ms });
        return { ticket, expires_at_ms };
    }
    async consume(ticket) {
        const entry = this.map.get(ticket);
        if (!entry)
            return null;
        // Single-use: remove unconditionally so a slow client retry can't replay.
        this.map.delete(ticket);
        if (entry.expires_at_ms < this.now())
            return null;
        return entry.user;
    }
    async size() {
        this.gc();
        return this.map.size;
    }
    gc() {
        const t = this.now();
        for (const [k, v] of this.map) {
            if (v.expires_at_ms < t)
                this.map.delete(k);
        }
    }
}
//# sourceMappingURL=ticket_store.js.map
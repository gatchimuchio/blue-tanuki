import { randomBytes } from "node:crypto";
/**
 * Default one-time approval token store. Single-process only.
 *
 * Tokens are bound to a request_id and consumed atomically. If a known token is
 * presented for the wrong request_id it is still burned; the token has been
 * exposed and must not remain reusable.
 */
export class MemoryResumeApprovalTokenStore {
    map = new Map();
    cap;
    now;
    constructor(opts = {}) {
        this.cap = opts.cap ?? 10_000;
        this.now = opts.now ?? (() => Date.now());
        if (this.cap < 1) {
            throw new Error("MemoryResumeApprovalTokenStore: cap must be >= 1");
        }
    }
    async issue(request_id, ttl_ms) {
        if (!request_id.trim()) {
            throw new Error("MemoryResumeApprovalTokenStore: request_id is required");
        }
        if (ttl_ms <= 0) {
            throw new Error("MemoryResumeApprovalTokenStore: ttl_ms must be > 0");
        }
        this.gc();
        if (this.map.size >= this.cap) {
            const firstKey = this.map.keys().next().value;
            if (firstKey !== undefined)
                this.map.delete(firstKey);
        }
        const token = randomBytes(32).toString("base64url");
        const expires_at_ms = this.now() + ttl_ms;
        this.map.set(token, { request_id, expires_at_ms });
        return { request_id, token, expires_at_ms };
    }
    async consume(request_id, token) {
        const entry = this.map.get(token);
        if (!entry)
            return false;
        this.map.delete(token);
        if (entry.expires_at_ms < this.now())
            return false;
        return entry.request_id === request_id;
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
//# sourceMappingURL=resume_approval_token_store.js.map
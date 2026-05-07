/**
 * In-memory SessionStore. Default for single-process deployments.
 *
 * Semantics:
 *   - Per-session FIFO eviction when length exceeds cap.
 *   - Distinct sessions are tracked even when their message list becomes
 *     empty after clear(); cleared sessions are removed from the map so
 *     size() reflects only sessions with at least one message.
 */
export class MemorySessionStore {
    cap;
    store = new Map();
    constructor(opts = {}) {
        this.cap = opts.cap ?? 100;
        if (!Number.isFinite(this.cap) || this.cap < 0) {
            throw new Error("MemorySessionStore: cap must be a non-negative number");
        }
    }
    async append(session_id, message) {
        if (!session_id) {
            throw new Error("MemorySessionStore.append: session_id required");
        }
        if (this.cap === 0)
            return;
        const arr = this.store.get(session_id) ?? [];
        arr.push(message);
        while (arr.length > this.cap)
            arr.shift();
        this.store.set(session_id, arr);
    }
    async getMessages(session_id, opts = {}) {
        const arr = this.store.get(session_id);
        if (!arr || arr.length === 0)
            return [];
        if (opts.limit !== undefined && opts.limit < arr.length) {
            return arr.slice(arr.length - opts.limit).map((m) => ({ ...m }));
        }
        return arr.map((m) => ({ ...m }));
    }
    async clear(session_id) {
        this.store.delete(session_id);
    }
    async size() {
        return this.store.size;
    }
}
//# sourceMappingURL=memory.js.map
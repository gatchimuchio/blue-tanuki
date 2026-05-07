import type { ChatMessage, GetMessagesOptions, SessionStore } from "./types.js";
export interface MemorySessionStoreOptions {
    /** Maximum messages retained per session. Default 100. cap===0 disables. */
    cap?: number;
}
/**
 * In-memory SessionStore. Default for single-process deployments.
 *
 * Semantics:
 *   - Per-session FIFO eviction when length exceeds cap.
 *   - Distinct sessions are tracked even when their message list becomes
 *     empty after clear(); cleared sessions are removed from the map so
 *     size() reflects only sessions with at least one message.
 */
export declare class MemorySessionStore implements SessionStore {
    private readonly cap;
    private readonly store;
    constructor(opts?: MemorySessionStoreOptions);
    append(session_id: string, message: ChatMessage): Promise<void>;
    getMessages(session_id: string, opts?: GetMessagesOptions): Promise<ChatMessage[]>;
    clear(session_id: string): Promise<void>;
    size(): Promise<number>;
}
//# sourceMappingURL=memory.d.ts.map
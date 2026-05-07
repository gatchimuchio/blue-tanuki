/**
 * Persisted chat message in a session history.
 *
 * Mirrors the shape of LLMCallPayload.messages[] entries (role + content)
 * so that history can be re-injected directly into a subsequent llm_call
 * without translation.
 */
export interface ChatMessage {
    /** "system" is reserved for future prompt-templating; current persistence
     *  layer only writes "user" and "assistant" messages. */
    role: "system" | "user" | "assistant";
    content: string;
    /** Unix epoch ms of when this message was appended. */
    timestamp: number;
}
/**
 * Options shared across SessionStore methods.
 */
export interface GetMessagesOptions {
    /** Maximum number of messages to return (most recent first in storage,
     *  but returned in chronological order). When omitted, returns all
     *  messages within the store's retained range. */
    limit?: number;
}
/**
 * SessionStore — abstraction over per-session conversation history.
 *
 * Contracts:
 *   1. session_id is opaque to the store. Callers form it as
 *      `${channel}:${user}` (gateway convention). Stores must accept any
 *      non-empty string but are not required to interpret it.
 *   2. All methods are async even when the default implementation is
 *      synchronous, to keep the interface stable across in-memory, file,
 *      and future networked backends.
 *   3. Append is best-effort durable: the store decides flush timing.
 *      Callers should not assume that getMessages immediately after
 *      append on a different process will see the appended row. (The
 *      file-backed default flushes per-append; in-memory is trivially
 *      consistent.)
 *   4. The store enforces a per-session cap. When append would exceed
 *      the cap, the oldest message in that session is evicted FIFO.
 *      cap === 0 disables history (every getMessages returns []).
 */
export interface SessionStore {
    /**
     * Append a message to the given session's history. Subject to the
     * store's cap eviction policy.
     */
    append(session_id: string, message: ChatMessage): Promise<void>;
    /**
     * Fetch messages in chronological order (oldest first). When opts.limit
     * is set, returns the most recent N messages while preserving order.
     */
    getMessages(session_id: string, opts?: GetMessagesOptions): Promise<ChatMessage[]>;
    /**
     * Remove all messages for the given session. Idempotent.
     */
    clear(session_id: string): Promise<void>;
    /**
     * Number of distinct sessions currently held. Diagnostic helper for
     * doctor / metrics.
     */
    size(): Promise<number>;
}
//# sourceMappingURL=types.d.ts.map
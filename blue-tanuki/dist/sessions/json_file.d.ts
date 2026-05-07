import type { ChatMessage, GetMessagesOptions, SessionStore } from "./types.js";
export interface JsonFileSessionStoreOptions {
    /** Directory where per-session JSONL files live. Created if missing. */
    base_dir: string;
    /** Maximum messages retained per session. Default 100. cap===0 disables. */
    cap?: number;
}
/**
 * File-backed SessionStore. One JSONL file per session.
 *
 * File layout: ${base_dir}/${encoded_session_id}.jsonl
 *   - session_id may legitimately contain ":" (e.g. "slack:U123"). To keep
 *     the filename portable across OSes the id is URL-safe base64 encoded.
 *   - Each line is JSON.stringify(ChatMessage). Newlines in message
 *     content are escaped automatically by JSON.stringify.
 *
 * Concurrency model:
 *   - Append uses fs.appendFile with implicit OS-level write atomicity.
 *     Each line is one syscall and is small (well under PIPE_BUF on all
 *     supported platforms), so torn writes are not expected for the
 *     single-process, single-host gateway today.
 *   - cap eviction is done by reading-then-rewriting the file on each
 *     append once the line count exceeds `cap`. This is intentionally
 *     simple; a second-process appending concurrently could see one
 *     extra row briefly, but the next append from either side will
 *     re-truncate. Acceptable for Phase 4 single-process use.
 *   - When horizontal scaling lands (Phase 6+), this implementation will
 *     be replaced by a Redis or Postgres-backed store via the same
 *     SessionStore interface. The interface is the contract; this is one
 *     implementation.
 *
 * Boundary with HDS-BRAIN:
 *   - This store persists EXECUTOR conversation history only.
 *   - HDS-BRAIN's audit chain is a separate JSONL written by AuditLog.
 *   - The two MUST NOT share files or directories. See
 *     docs/persistence-boundary.md for the full responsibility split.
 */
export declare class JsonFileSessionStore implements SessionStore {
    private readonly base_dir;
    private readonly cap;
    /**
     * Per-session async lock chain. Serialises append/clear so the
     * read-modify-write window of cap eviction can't interleave with itself
     * in the same process. Cross-process safety is described in the class
     * doc above.
     */
    private readonly chains;
    constructor(opts: JsonFileSessionStoreOptions);
    /** URL-safe base64 of session_id, used as the file basename. */
    private fileFor;
    /** Decode a filename produced by fileFor() back to its session_id. */
    private sessionForFile;
    /** Run `fn` after any pending op for the same session has settled. */
    private serialize;
    append(session_id: string, message: ChatMessage): Promise<void>;
    /** Reads the file, keeps last `cap` lines, rewrites atomically. */
    private truncateToCap;
    getMessages(session_id: string, opts?: GetMessagesOptions): Promise<ChatMessage[]>;
    clear(session_id: string): Promise<void>;
    size(): Promise<number>;
}
//# sourceMappingURL=json_file.d.ts.map
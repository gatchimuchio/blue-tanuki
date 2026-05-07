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
export declare class MemoryTicketStore implements TicketStore {
    private readonly map;
    private readonly cap;
    private readonly now;
    constructor(opts?: MemoryTicketStoreOptions);
    issue(user: string, ttl_ms: number): Promise<TicketIssued>;
    consume(ticket: string): Promise<string | null>;
    size(): Promise<number>;
    private gc;
}
//# sourceMappingURL=ticket_store.d.ts.map
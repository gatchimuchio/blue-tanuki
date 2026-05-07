export interface ResumeApprovalTokenIssued {
    request_id: string;
    token: string;
    expires_at_ms: number;
}
export interface ResumeApprovalTokenStore {
    issue(request_id: string, ttl_ms: number): Promise<ResumeApprovalTokenIssued>;
    consume(request_id: string, token: string): Promise<boolean>;
    size(): Promise<number>;
}
export interface MemoryResumeApprovalTokenStoreOptions {
    /** Hard cap on simultaneously live approval tokens. Default 10_000. */
    cap?: number;
    /** Clock injection for tests. Default uses Date.now. */
    now?: () => number;
}
/**
 * Default one-time approval token store. Single-process only.
 *
 * Tokens are bound to a request_id and consumed atomically. If a known token is
 * presented for the wrong request_id it is still burned; the token has been
 * exposed and must not remain reusable.
 */
export declare class MemoryResumeApprovalTokenStore implements ResumeApprovalTokenStore {
    private readonly map;
    private readonly cap;
    private readonly now;
    constructor(opts?: MemoryResumeApprovalTokenStoreOptions);
    issue(request_id: string, ttl_ms: number): Promise<ResumeApprovalTokenIssued>;
    consume(request_id: string, token: string): Promise<boolean>;
    size(): Promise<number>;
    private gc;
}
//# sourceMappingURL=resume_approval_token_store.d.ts.map
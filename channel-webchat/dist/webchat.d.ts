import type { ChannelSendPayload } from "@blue-tanuki/protocol";
import { type Clock, type InboundChannel, type InboundHandler, type OutboundChannel, type SendMeta, type SendResult } from "@blue-tanuki/channel-base";
import { type TicketStore } from "./ticket_store.js";
import { type ResumeApprovalTokenIssued, type ResumeApprovalTokenStore } from "./resume_approval_token_store.js";
export interface WebChatRateLimit {
    /** Burst capacity. */
    capacity: number;
    /** Sustained refill rate (tokens/sec). */
    refill_per_sec: number;
}
/**
 * Rate-limit configuration for the three authenticated endpoints.
 *
 * Defaults (Phase 4):
 *   - inbound:    capacity 10, refill 1.0/sec  ≈ 60/min/user with burst
 *   - resume:     capacity  5, refill 0.5/sec  ≈ 30/min global with burst
 *   - ws_ticket:  capacity  3, refill 10/60/sec ≈ 10/min/user with burst
 *
 * Pass `rate_limits: false` to disable entirely (used in tests).
 */
export interface WebChatRateLimits {
    inbound?: WebChatRateLimit;
    resume?: WebChatRateLimit;
    ws_ticket?: WebChatRateLimit;
}
export interface WebChatResumeApprovalOptions {
    /** If true, the gateway may convert this approval into a reusable grant. */
    remember?: boolean;
    /** Optional duration for the reusable grant. Null means no expiry. */
    duration_ms?: number | null;
    /** Optional widen mode. `full_access` remains final-review guarded downstream. */
    mode?: "remember_this_decision" | "full_access";
}
export interface WebChatResumeContext {
    actor: string;
    token_kind: "resume";
    approval?: WebChatResumeApprovalOptions;
}
export interface WebChatSettingsSurface {
    /** Dedicated bearer token for settings API endpoints. */
    token: string;
    /** Static settings HTML or a function that renders it. */
    html: string | (() => string);
    /** Return a redacted current-settings snapshot. */
    getSnapshot: () => Promise<unknown>;
    /** Persist a settings update. When omitted, POST is rejected. */
    update?: (body: Record<string, unknown>) => Promise<unknown>;
}
export interface WebChatRuntimeSurface {
    /** Return the HDS/process/memory/authority state visible to the local console. */
    getSnapshot: () => Promise<unknown>;
}
export interface WebChatOptions {
    /** HTTP/WS port. Required. */
    port: number;
    /**
     * Bearer token required on POST /inbound and POST /ws-ticket.
     * Must be ≥8 chars; throws on construction otherwise.
     */
    token: string;
    /** Separate Bearer token required on POST /resume. Must differ from token. */
    resume_token?: string;
    /** Bind host. Defaults to 127.0.0.1 (loopback only). */
    host?: string;
    /**
     * Optional human-resume sink. If provided, POST /resume routes here.
     */
    onResume?: (request_id: string, verdict: "approve" | "reject" | "block", context: WebChatResumeContext) => Promise<unknown>;
    /**
     * TTL for /ws-ticket entries in milliseconds. Default 30_000 (30s).
     */
    ws_ticket_ttl_ms?: number;
    /**
     * Hard cap on the live ticket store. Default 10_000. Only consulted
     * when `ticket_store` is not supplied (default MemoryTicketStore).
     */
    ws_ticket_cap?: number;
    /**
     * Inject a custom TicketStore (Phase 4-3). When unset, an internal
     * MemoryTicketStore is created with `cap = ws_ticket_cap`.
     */
    ticket_store?: TicketStore;
    /**
     * One-time token store for human resume approvals. Default: in-memory,
     * enabled. Pass `false` only for legacy/custom deployments that supply an
     * equivalent gate outside WebChat.
     */
    resume_approval_tokens?: ResumeApprovalTokenStore | false;
    /**
     * TTL for request_id-bound resume approval tokens. Default 600_000 (10 min).
     */
    resume_approval_token_ttl_ms?: number;
    /**
     * Hard cap on the live approval-token store. Default 10_000. Only consulted
     * when `resume_approval_tokens` is not supplied.
     */
    resume_approval_token_cap?: number;
    /** Optional local settings window/API surface. */
    settings?: WebChatSettingsSurface;
    /** Optional local runtime/status API surface. Uses the normal inbound bearer token. */
    runtime?: WebChatRuntimeSurface;
    /**
     * Per-endpoint rate limit configuration. Pass `false` to disable
     * rate limiting entirely. Default: enabled with the per-endpoint
     * defaults documented on `WebChatRateLimits`.
     */
    rate_limits?: WebChatRateLimits | false;
    /**
     * Periodic TokenBucket prune interval in milliseconds. The prune sweep
     * drops bucket entries that are both idle and conceptually full (i.e.
     * carry no rate-limit memory). Set to 0 to disable. Default 60_000.
     *
     * Sets a guard against unbounded keyspace growth on long-running
     * gateways receiving traffic from many distinct (user, endpoint)
     * pairs. Without it, in-memory `state` map grows monotonically.
     */
    rate_limit_prune_interval_ms?: number;
    /**
     * Idle threshold (ms) for an entry to become prune-eligible. Default
     * 5 × the prune interval, so a key that sees traffic more than once
     * per prune sweep is never dropped. Has no effect when
     * `rate_limit_prune_interval_ms === 0`.
     */
    rate_limit_prune_idle_ms?: number;
    /** Clock injection for tests. */
    clock?: Clock;
}
/**
 * WebChat channel — Phase 4.
 *
 * Endpoint summary:
 *   POST /ws-ticket  body:{user}  auth:Bearer  rate-limited per-user
 *   POST /inbound    body:{user, content}  auth:Bearer  rate-limited per-user
 *   POST /resume     body:{request_id, verdict, approval_token}  auth:Bearer  rate-limited (global)
 *   GET  /ws         query:?ticket=...
 *   GET  /healthz    no auth, not rate-limited
 *
 * Rate-limit response:
 *   HTTP 429
 *   Retry-After: <seconds>
 *   { "error": "rate_limited", "retry_after_ms": <ms> }
 */
export declare class WebChatChannel implements InboundChannel, OutboundChannel {
    private readonly opts;
    readonly name = "webchat";
    private server;
    private wss;
    private handler;
    private readonly conns;
    private readonly ticketStore;
    private readonly ticketTtlMs;
    private readonly resumeApprovalTokenStore;
    private readonly resumeApprovalTokenTtlMs;
    private readonly buckets;
    private starting;
    private started;
    private pruneTimer;
    constructor(opts: WebChatOptions);
    issueResumeApprovalToken(request_id: string, ttl_ms?: number): Promise<ResumeApprovalTokenIssued | null>;
    start(handler: InboundHandler): Promise<void>;
    stop(): Promise<void>;
    send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
    connectionCount(user?: string): number;
    /** Live ticket count (test/diagnostic). Backed by the ticket store. */
    ticketCount(): Promise<number>;
    private attachConnection;
    /** Apply rate-limit check; on miss, write 429 + Retry-After and return false. */
    private rateLimitOr429;
    private handleHttp;
    private checkAuth;
    private checkSettingsAuth;
    private handleRuntimeSnapshot;
    private handleSettingsPage;
    private handleSettingsConfig;
}
//# sourceMappingURL=webchat.d.ts.map
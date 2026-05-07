import type { InboundRequest, ExecuteCommand, ExecuteFeedback } from "@blue-tanuki/protocol";
import type { AuthorityEventLog, CommandLifecyclePhase, ControllerState, DecisionLog, PolicyConfig, ResumeAuditTrace, ResumeVerdict, SuspendedRequest } from "./types.js";
import { AuditLog } from "./audit.js";
import { DetectorRegistry } from "./detectors/index.js";
import type { ApprovalEvaluation } from "./approval_policy.js";
interface LongTermMemoryPort {
    capture(log: DecisionLog): unknown;
    recent(n: number): readonly unknown[];
    all?: () => readonly unknown[];
    size?: () => number;
    verify?: () => boolean;
}
export interface HDSRuntimeSnapshot {
    state: ControllerState;
    suspended: readonly SuspendedRequest[];
    inflight: Array<{
        command_id: string;
        request_id: string;
        commit_hash: string;
        decision: string;
    }>;
    audit: {
        entries: number;
        chain_valid: boolean;
    };
    memory: {
        configured: boolean;
        entries?: number;
        chain_valid?: boolean;
    };
    invariants: {
        hds_calls_llm: false;
        process_policy_enforced: true;
        external_metadata_can_escalate_authority: false;
        memory_used_for_authority: false;
        final_review_boundary_enforced_by_approval_gate: true;
    };
}
/**
 * HDSUpperController — Phase 1.
 *
 * Receives inbound requests, runs F→M→C, produces commands for downstream,
 * consumes feedback, maintains audit chain, and manages the SUSPEND/RESUME
 * state machine.
 *
 * Critical invariants:
 *   1. This class NEVER calls an LLM. All LLM/tool/channel actions are
 *      emitted as commands and executed by BLUE-TANUKI core.
 *   2. RESUME is HUMAN-ONLY in Phase 1. There is no executor-feedback path
 *      that can lift a SUSPEND. This preserves the upstream containment
 *      property: a misbehaving downstream cannot escalate its own privileges.
 */
export interface ControllerOptions {
    policy?: PolicyConfig;
    detectors?: DetectorRegistry;
    audit?: AuditLog;
    memory?: LongTermMemoryPort;
    llm_route?: LLMCommandRoute;
}
export interface LLMCommandRoute {
    backend_hint?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
}
export interface ResumeAuditOptions {
    actor?: string;
    token_kind?: ResumeAuditTrace["token_kind"];
}
export declare class HDSUpperController {
    private state;
    private readonly audit;
    private readonly policy;
    private readonly detectors;
    private readonly memory?;
    private readonly llm_route;
    /** Commands awaiting executor feedback (already ASSERTed). */
    private readonly inflight;
    /** Requests halted by SUSPEND, awaiting human verdict via resume(). */
    private readonly suspended;
    /** Cached original requests for suspended ones, so resume() can re-emit. */
    private readonly suspendedRequests;
    constructor(opts?: ControllerOptions);
    /**
     * Run F→M→C on an inbound request.
     *   - ASSERT       → emit command (returned in `command`)
     *   - SUSPEND      → store as suspended; no command emitted
     *   - OUT_OF_SCOPE → audit only; no command
     *   - FAIL         → audit only; no command
     */
    decide(req: InboundRequest): {
        log: DecisionLog;
        command: ExecuteCommand | null;
    };
    /**
     * Human-only RESUME. Pass the request_id of a suspended request and a
     * verdict. Returns:
     *   - log     : a fresh DecisionLog entry recording the human verdict
     *   - command : the lifted ExecuteCommand if verdict==="approve", else null
     *   - request : the originating InboundRequest. Returned for ALL verdicts
     *               so callers (e.g. gateway serve.ts) can route resume-driven
     *               outputs back to the originating channel/user without
     *               having to maintain a parallel cache of suspended requests.
     *
     * Audit gets a fresh entry recording the human verdict for traceability.
     */
    resume(request_id: string, verdict: ResumeVerdict, opts?: ResumeAuditOptions): {
        log: DecisionLog;
        command: ExecuteCommand | null;
        request: InboundRequest;
    };
    /** Record approval gate evaluation after HDS ASSERT and before executor execution. */
    onApprovalEvaluation(evaluation: ApprovalEvaluation, opts?: {
        request_id?: string | null;
    }): void;
    /** Append an explicit authority-ledger event into the same audit hash-chain. */
    onAuthorityEvent(event: AuthorityEventLog["event"], opts?: {
        request_id?: string | null;
        command_id?: string;
        grant_id?: string;
        actor?: string;
        reason?: string;
        evaluation?: ApprovalEvaluation;
    }): void;
    /** Record pre-executor command lifecycle events without pretending executor ran. */
    onCommandLifecycle(command_id: string, phase: CommandLifecyclePhase, opts?: {
        actor?: string;
        reason?: string;
    }): void;
    /**
     * Consume executor feedback for an in-flight (already ASSERTed) command.
     * Phase 1: feedback is recorded but cannot transition state away from a
     * SUSPENDED entry — that boundary is enforced by design.
     */
    onFeedback(fb: ExecuteFeedback): void;
    getState(): ControllerState;
    getAudit(): AuditLog;
    /**
     * List currently suspended requests for human review.
     */
    listSuspended(): readonly SuspendedRequest[];
    getRuntimeSnapshot(): HDSRuntimeSnapshot;
    private buildCommand;
}
export {};
//# sourceMappingURL=controller.d.ts.map
import type { ExecuteCommand, ToolCapability } from "@blue-tanuki/protocol";
/** Approval policy is the human-authority layer above HDS ASSERT. */
export type ApprovalMode = "ask_every_time" | "remember_this_decision" | "full_access";
export type ApprovalDecision = "allow" | "ask" | "deny";
export type ApprovalRisk = "low" | "medium" | "high" | "critical";
export type ApprovalOperation = "noop" | "llm.call" | "tool.call" | "tool.file.read" | "tool.file.search" | "tool.file.write" | "tool.file.delete" | "tool.shell.exec" | "tool.network.http" | "channel.send" | "external.send" | "settings.write" | "credential.access" | "schedule.create" | "payment.charge" | "unknown";
export type ApprovalScopeKind = "command" | "file" | "folder" | "repo" | "channel" | "task_type" | "global";
/**
 * AuthorityTransparencyTrace is the explicit "no black box in the authority path"
 * claim. It does not pretend that OS kernels, provider LLMs, networks, or tools
 * are internally transparent. It states that BLUE-TANUKI's own authority plane
 * resolves operation/scope/risk/actor/final-review status as structured data,
 * then writes that resolution into the audit chain.
 */
export interface AuthorityTransparencyTrace {
    authority_model: "owner_operated_full_access";
    control_plane_black_boxes: [];
    black_box_boundary: "none_in_hds_authority_path";
    hds_position: "upper_control_self_norm";
    full_access_default: boolean;
    final_review_boundary: ApprovalOperation[];
    resolved_factors: {
        operation: ApprovalOperation;
        target_scope: ApprovalScopeKind;
        risk: ApprovalRisk;
        actor: string;
        final_review_required: boolean;
        matched_grant_id?: string;
        reason: string;
    };
    audit_closure: {
        decision: "hash_chain";
        approval: "hash_chain";
        execution_feedback: "hash_chain";
    };
}
export interface ApprovalContext {
    operation: ApprovalOperation;
    target_scope: ApprovalScopeKind;
    target?: string;
    path_pattern?: string;
    channel?: string;
    risk: ApprovalRisk;
    actor: string;
    capabilities: ToolCapability[];
    command_type: ExecuteCommand["type"];
    command_id: string;
    upstream_commit_hash: string;
    created_at: number;
}
export interface ApprovalGrant {
    id: string;
    mode: ApprovalMode;
    decision: Exclude<ApprovalDecision, "ask">;
    operation: ApprovalOperation | "*";
    target_scope: ApprovalScopeKind | "*";
    target?: string;
    path_pattern?: string;
    channel?: string;
    risk: ApprovalRisk | "*";
    actor: string | "*";
    capabilities?: ToolCapability[];
    created_by: string;
    created_at: number;
    expires_at: number | null;
    revocable: boolean;
    note?: string;
}
export interface ApprovalEvaluation {
    decision: ApprovalDecision;
    mode: ApprovalMode;
    risk: ApprovalRisk;
    reason: string;
    matched_grant_id?: string;
    final_review_required: boolean;
    context: ApprovalContext;
    authority_trace: AuthorityTransparencyTrace;
}
export declare const FINAL_REVIEW_OPERATIONS: Set<ApprovalOperation>;
export declare function approvalContextFromCommand(command: ExecuteCommand, opts?: {
    actor?: string;
    now?: number;
}): ApprovalContext;
export declare function operationFromCommand(command: ExecuteCommand, caps?: readonly ToolCapability[]): ApprovalOperation;
export declare function riskForOperation(op: ApprovalOperation, caps?: readonly ToolCapability[]): ApprovalRisk;
export declare function finalReviewRequired(ctx: ApprovalContext): boolean;
export declare function evaluateApproval(command: ExecuteCommand, grants: readonly ApprovalGrant[], opts?: {
    actor?: string;
    now?: number;
    default_mode?: ApprovalMode;
}): ApprovalEvaluation;
export declare function buildAuthorityTransparencyTrace(ctx: ApprovalContext, opts: {
    final_review_required: boolean;
    matched_grant_id?: string;
    reason: string;
    full_access_default?: boolean;
}): AuthorityTransparencyTrace;
export declare function buildApprovalGrant(input: Omit<ApprovalGrant, "id" | "created_at" | "revocable"> & Partial<Pick<ApprovalGrant, "id" | "created_at" | "revocable">>): ApprovalGrant;
export declare function approvalGrantFromEvaluation(evaluation: ApprovalEvaluation, opts: {
    created_by: string;
    mode?: ApprovalMode;
    decision?: Exclude<ApprovalDecision, "ask">;
    expires_at?: number | null;
    widen_to_full_access?: boolean;
    note?: string;
}): ApprovalGrant;
export declare function grantMatches(grant: ApprovalGrant, ctx: ApprovalContext, now?: number): boolean;
//# sourceMappingURL=approval_policy.d.ts.map
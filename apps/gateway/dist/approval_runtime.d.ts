import type { ExecuteCommand, ExecuteFeedback } from "@blue-tanuki/protocol";
import { type ApprovalEvaluation, type ApprovalGrant, type ApprovalGrantStore, type ApprovalMode } from "@blue-tanuki/hds-brain";
export interface ApprovalRuntime {
    default_mode: ApprovalMode;
    store: ApprovalGrantStore;
    system_grants: readonly ApprovalGrant[];
    evaluate(command: ExecuteCommand, actor: string): ApprovalEvaluation;
    remember(evaluation: ApprovalEvaluation, opts: RememberApprovalOptions): ApprovalGrant;
}
export interface RememberApprovalOptions {
    actor: string;
    mode?: "remember_this_decision" | "full_access";
    duration_ms?: number | null;
    note?: string;
}
type Env = Record<string, string | undefined>;
export declare function buildApprovalRuntime(env?: Env): ApprovalRuntime;
export declare function approvalRequiredMessage(evaluation: ApprovalEvaluation, command_id: string, approval_token?: string): string;
export declare function approvalDeniedFeedback(command: ExecuteCommand, reason: string): ExecuteFeedback;
export {};
//# sourceMappingURL=approval_runtime.d.ts.map
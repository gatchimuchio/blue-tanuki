import type { HDSRuntimeSnapshot } from "./controller.js";

export type HDSBrainHealthStatus = "ok" | "fail_safe";

export interface HDSBrainHealth {
  status: HDSBrainHealthStatus;
  audit_chain_valid: boolean;
  runtime_invariants_ok: boolean;
  memory_chain_valid?: boolean;
  hds_calls_llm: false;
  downstream_limbs_are_authority: false;
  fail_safe: boolean;
  checked_at_ms: number;
}

export function evaluateHDSBrainHealth(
  snapshot: HDSRuntimeSnapshot,
  opts: { now?: number } = {},
): HDSBrainHealth {
  const runtime_invariants_ok =
    snapshot.invariants.hds_calls_llm === false &&
    snapshot.invariants.process_policy_enforced === true &&
    snapshot.invariants.external_metadata_can_escalate_authority === false &&
    snapshot.invariants.memory_used_for_authority === false &&
    snapshot.invariants.complete_history_used_for_authority === false &&
    snapshot.invariants.final_review_boundary_enforced_by_approval_gate === true;
  const memoryOk = snapshot.memory.chain_valid !== false;
  const ok = snapshot.audit.chain_valid && runtime_invariants_ok && memoryOk;
  return {
    status: ok ? "ok" : "fail_safe",
    audit_chain_valid: snapshot.audit.chain_valid,
    runtime_invariants_ok,
    memory_chain_valid: snapshot.memory.chain_valid,
    hds_calls_llm: false,
    downstream_limbs_are_authority: false,
    fail_safe: !ok,
    checked_at_ms: opts.now ?? Date.now(),
  };
}

import type { HDSRuntimeSnapshot } from "./controller.js";
import {
  evaluateFailSafeBoundary,
  type FailSafeInput,
} from "./boundary_policy.js";
import {
  runtimeInvariantReportOk,
  runtimeInvariantValuesOk,
} from "./runtime_invariants.js";

export type HDSBrainHealthStatus = "ok" | "fail_safe";

export type HDSBrainHealthPrecondition = keyof FailSafeInput;

export interface HDSBrainHealth {
  status: HDSBrainHealthStatus;
  hds_available: boolean;
  policy_valid: boolean;
  audit_chain_valid: boolean;
  runtime_invariants_ok: boolean;
  approval_gate_available: boolean;
  memory_chain_valid?: boolean;
  hds_calls_llm: false;
  downstream_limbs_are_authority: false;
  fail_safe: boolean;
  failed_preconditions: HDSBrainHealthPrecondition[];
  command_execution_allowed: boolean;
  downstream_execution_allowed: boolean;
  fail_safe_reason: string;
  operator_next_action: string | null;
  safe_to_retry: boolean;
  used_for_authority: false;
  checked_at_ms: number;
}

export interface HDSBrainHealthOptions {
  now?: number;
  hds_available?: boolean;
  policy_valid?: boolean;
  approval_gate_available?: boolean;
}

export function evaluateHDSBrainHealth(
  snapshot: HDSRuntimeSnapshot,
  opts: HDSBrainHealthOptions = {},
): HDSBrainHealth {
  const runtime_invariants_ok =
    runtimeInvariantValuesOk(snapshot.invariants) &&
    runtimeInvariantReportOk(snapshot.runtime_invariants);
  const failSafeInput: FailSafeInput = {
    hds_available: opts.hds_available ?? true,
    policy_valid: opts.policy_valid ?? true,
    audit_chain_valid: snapshot.audit.chain_valid,
    runtime_invariants_valid: runtime_invariants_ok,
    approval_gate_available: opts.approval_gate_available ?? true,
    memory_chain_valid: snapshot.memory.chain_valid,
  };
  const failSafe = evaluateFailSafeBoundary(failSafeInput);
  return {
    status: failSafe.allowed ? "ok" : "fail_safe",
    hds_available: failSafeInput.hds_available,
    policy_valid: failSafeInput.policy_valid,
    audit_chain_valid: snapshot.audit.chain_valid,
    runtime_invariants_ok,
    approval_gate_available: failSafeInput.approval_gate_available,
    memory_chain_valid: snapshot.memory.chain_valid,
    hds_calls_llm: false,
    downstream_limbs_are_authority: false,
    fail_safe: !failSafe.allowed,
    failed_preconditions: failSafe.failed_preconditions,
    command_execution_allowed: failSafe.command_execution_allowed,
    downstream_execution_allowed: failSafe.downstream_execution_allowed,
    fail_safe_reason: failSafe.reason,
    operator_next_action: nextAction(failSafe.failed_preconditions),
    safe_to_retry: failSafe.allowed,
    used_for_authority: false,
    checked_at_ms: opts.now ?? Date.now(),
  };
}

function nextAction(failed: HDSBrainHealthPrecondition[]): string | null {
  if (failed.length === 0) return null;
  if (failed.includes("hds_available")) {
    return "Stop downstream execution and restart HDS-BRAIN before retrying";
  }
  if (failed.includes("policy_valid")) {
    return "Repair or roll back the HDS policy configuration, then retry the request";
  }
  if (failed.includes("audit_chain_valid")) {
    return "Stop execution and run audit verification before continuing";
  }
  if (failed.includes("runtime_invariants_valid")) {
    return "Inspect Runtime Invariants evidence and remediate the failed invariant before retrying";
  }
  if (failed.includes("approval_gate_available")) {
    return "Restore Approval Gate availability before any downstream execution";
  }
  if (failed.includes("memory_chain_valid")) {
    return "Inspect or repair the memory store; do not use memory as authority";
  }
  return "Inspect HDS-BRAIN self-health before retrying";
}

import type {
  FailureGateDecision,
  FailureRuleState,
  FailureScope,
  FailureSeverity,
  FailureSignature,
  FailureType,
  MatchLevel,
  ProbePolicy,
  SuppressionPolicy,
} from "./types.js";

export function clampConfidence(value: number | undefined, fallback = 0.5): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function defaultTtlDays(severity: FailureSeverity): number | undefined {
  if (severity === "critical") return undefined;
  if (severity === "high") return 30;
  if (severity === "medium") return 14;
  return 7;
}

export function defaultDecayRate(severity: FailureSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "high") return 0.05;
  if (severity === "medium") return 0.1;
  return 0.2;
}

export function defaultProbePolicy(input: {
  scope: FailureScope;
  failure_type: FailureType;
  severity: FailureSeverity;
  suppression_policy?: SuppressionPolicy;
}): ProbePolicy {
  if (
    input.severity === "critical" ||
    input.scope === "authority" ||
    input.scope === "boundary" ||
    input.failure_type === "boundary_violation"
  ) {
    return input.suppression_policy === "block" ? "never" : "manual";
  }
  if (input.scope === "test" || input.failure_type === "environment_error") {
    return "sandbox";
  }
  if (input.scope === "llm_output" || input.failure_type === "hallucination") {
    return "shadow_only";
  }
  return input.suppression_policy === "block" ? "sandbox" : "shadow_only";
}

export function defaultSuppressionPolicy(input: {
  severity: FailureSeverity;
  confidence: number;
  match_level: MatchLevel;
  scope: FailureScope;
  failure_type: FailureType;
}): SuppressionPolicy {
  const c = clampConfidence(input.confidence);
  if (input.match_level === 3) {
    return c >= 0.75 ? "downrank" : "warn";
  }
  const safetyCritical =
    input.scope === "authority" ||
    input.scope === "boundary" ||
    input.failure_type === "boundary_violation";
  if (input.severity === "critical") {
    if (input.match_level === 0 && c >= 0.9) return "block";
    if (input.match_level <= 1 && c >= 0.8) return "require_approval";
    return safetyCritical ? "require_approval" : "warn";
  }
  if (input.severity === "high") {
    if (input.match_level === 0 && c >= 0.85) {
      return safetyCritical ? "block" : "require_approval";
    }
    if (input.match_level === 1 && c >= 0.75) return "require_approval";
    if (input.match_level === 2 && safetyCritical && c >= 0.85) return "require_approval";
    return "warn";
  }
  if (input.severity === "medium") {
    if (input.match_level <= 1 && c >= 0.7) return "downrank";
    return "warn";
  }
  return "warn";
}

export function policyToGateDecision(policy: SuppressionPolicy): FailureGateDecision {
  if (policy === "block") return "block";
  if (policy === "require_approval") return "require_approval";
  if (policy === "rewrite") return "rewrite";
  if (policy === "downrank") return "downrank";
  return "warn";
}

export function enforceableState(state: FailureRuleState): boolean {
  return state === "active" || state === "probation";
}

export function stateAppliesInShadow(state: FailureRuleState): boolean {
  return state === "active" || state === "probation" || state === "shadow";
}

export function policyAllowedForMatch(policy: SuppressionPolicy, level: MatchLevel, signature: FailureSignature): boolean {
  if (level === 3) return policy === "warn" || policy === "downrank";
  if (level === 2 && policy === "block") {
    return signature.severity === "critical" && signature.confidence >= 0.9 && signature.notes?.includes("explicit_block_level_2") === true;
  }
  if (level === 1 && policy === "block") {
    return signature.confidence >= 0.9 && (signature.severity === "high" || signature.severity === "critical");
  }
  return true;
}

export function effectivePolicyForState(signature: FailureSignature, matched_level: MatchLevel): SuppressionPolicy {
  if (!policyAllowedForMatch(signature.suppression_policy, matched_level, signature)) {
    return matched_level === 3 ? "warn" : "require_approval";
  }
  if (signature.state === "probation" && signature.suppression_policy === "block" && signature.severity !== "critical") {
    return "warn";
  }
  return signature.suppression_policy;
}

export function needsBlockRevalidation(signature: FailureSignature, now: Date): boolean {
  if (signature.suppression_policy !== "block" || signature.state === "retired") return false;
  if (signature.probe_policy === "never") {
    return !(
      signature.notes?.includes("never_probe_justification:") === true ||
      signature.notes?.includes("permanent_block_justification:") === true
    );
  }
  if (signature.severity === "critical" && signature.notes?.includes("permanent_block_justification:") === true) return false;
  if (!signature.next_revalidation_at) return true;
  return Date.parse(signature.next_revalidation_at) <= now.getTime();
}

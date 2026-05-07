import type { Decision } from "@blue-tanuki/protocol";
import type { PolicyConfig, ScoringResult } from "./types.js";
import type { DetectorContext, DetectorRegistry } from "./detectors/index.js";
/**
 * Run all detectors declared in a policy against the given context,
 * producing per-axis scores and an aggregate.
 *
 * Aggregate is the weighted average of axis scores, normalized by
 * the sum of weights (so policies need not pre-normalize to 1.0).
 */
export declare function runScoring(policy: PolicyConfig, ctx: DetectorContext, registry: DetectorRegistry): ScoringResult;
/**
 * Apply Operational Policy thresholds to a ScoringResult.
 *
 * Decision order (first match wins):
 *   1. per_axis_fail        : axis score ≤ threshold → FAIL
 *   2. per_axis_suspend_below: axis score < threshold → SUSPEND
 *   3. aggregate < out_of_scope_below → OUT_OF_SCOPE
 *   4. aggregate ≥ aggregate_assert   → ASSERT
 *   5. otherwise                       → SUSPEND
 *
 * Returns the decision plus a list of human-readable rule labels that fired.
 */
export declare function evaluateDecision(scoring: ScoringResult, policy: PolicyConfig): {
    decision: Decision;
    reason: string;
    triggered_thresholds: string[];
};
/**
 * Load a policy config from a JSON file path.
 * Throws on parse errors — policy load failures should be loud.
 */
export declare function loadPolicyFromFile(filepath: string): PolicyConfig;
/**
 * Lightweight structural validation. Catches typical config mistakes early.
 */
export declare function validatePolicy(p: PolicyConfig): void;
/**
 * Built-in default policy, embedded for convenience.
 * The same content is also available as policies/default.json so it can be
 * edited without a recompile in non-bundled deployments.
 */
export declare const DEFAULT_POLICY: PolicyConfig;
//# sourceMappingURL=policy.d.ts.map
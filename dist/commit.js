import { createHash } from "node:crypto";
import { evaluateDecision } from "./policy.js";
/**
 * C (Commit) phase.
 *
 * Applies the operational policy thresholds to the model's scoring output,
 * producing a final decision (ASSERT / SUSPEND / OUT_OF_SCOPE / FAIL).
 *
 * The hash binds the decision to the scoring inputs so audit can detect
 * tampering of upstream stages.
 */
export function commit(m, policy) {
    const verdict = evaluateDecision(m.scoring, policy);
    // Hash includes scoring + decision so any rewrite of either is detectable.
    const hash = createHash("sha256")
        .update(JSON.stringify({
        scoring: m.scoring,
        decision: verdict.decision,
        reason: verdict.reason,
        triggered_thresholds: verdict.triggered_thresholds,
    }))
        .digest("hex");
    return {
        decision: verdict.decision,
        reason: verdict.reason,
        hash,
        triggered_thresholds: verdict.triggered_thresholds,
    };
}
//# sourceMappingURL=commit.js.map
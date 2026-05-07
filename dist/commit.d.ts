import type { CommitResult, ModelResult, PolicyConfig } from "./types.js";
/**
 * C (Commit) phase.
 *
 * Applies the operational policy thresholds to the model's scoring output,
 * producing a final decision (ASSERT / SUSPEND / OUT_OF_SCOPE / FAIL).
 *
 * The hash binds the decision to the scoring inputs so audit can detect
 * tampering of upstream stages.
 */
export declare function commit(m: ModelResult, policy: PolicyConfig): CommitResult;
//# sourceMappingURL=commit.d.ts.map
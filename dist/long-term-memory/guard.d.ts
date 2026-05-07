import type { DecisionLog } from "../types.js";
/**
 * Returns true iff the DecisionLog should be persisted to long-term memory.
 * Criteria: TCP closure (X/R/M all non-empty) plus ASSERT.
 */
export declare function shouldPersist(log: DecisionLog): boolean;
//# sourceMappingURL=guard.d.ts.map
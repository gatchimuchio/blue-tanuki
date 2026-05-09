import type { DecisionLog } from "../types.js";

/**
 * Returns true iff the DecisionLog should be persisted to long-term memory.
 * Criteria: TCP closure (X/R/M all non-empty) plus ASSERT.
 */
export function shouldPersist(log: DecisionLog): boolean {
  return (
    log.commit.decision === "ASSERT" &&
    log.frame.world_closure.x.length > 0 &&
    log.frame.world_closure.r.length > 0 &&
    log.frame.world_closure.m.length > 0
  );
}

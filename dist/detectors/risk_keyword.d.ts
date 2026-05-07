import type { Detector } from "./types.js";
/**
 * Risk keyword detector.
 *
 * Scans the request for patterns indicating dangerous operations
 * (irreversible filesystem destruction, fork bombs, pipe-to-shell, etc.).
 *
 * Scoring (unified direction: 1.0 = safe, 0.0 = unsafe):
 *   - Zero matches      → 1.0
 *   - One match         → 0.3
 *   - Two or more       → 0.0
 *
 * Matching is case-insensitive and regex-based. Patterns come from policy
 * config so that dangerous-pattern lists can be reviewed without code changes.
 */
export declare const riskKeywordDetector: Detector;
//# sourceMappingURL=risk_keyword.d.ts.map
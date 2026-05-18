import type { Detector, DetectorOutput, DetectorContext } from "./types.js";
import { detectorLifecycleEscalation } from "./types.js";

interface RiskKeywordArgs {
  danger_patterns?: string[];
}

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
export const riskKeywordDetector: Detector = {
  name: "risk_keyword",
  evaluate(args: Record<string, unknown>, ctx: DetectorContext): DetectorOutput {
    const a = args as RiskKeywordArgs;
    const patterns = Array.isArray(a.danger_patterns) ? a.danger_patterns : [];
    if (patterns.length === 0) {
      return { score: 1, evidence: "no danger_patterns configured" };
    }

    const matched: string[] = [];
    const invalid: string[] = [];
    for (const p of patterns) {
      let re: RegExp;
      try {
        re = new RegExp(p, "i");
      } catch {
        invalid.push(p);
        continue;
      }
      if (re.test(ctx.request_content)) {
        matched.push(p);
      }
    }

    if (invalid.length > 0) {
      return {
        score: 0,
        evidence: `invalid danger_patterns: ${invalid.length}`,
        lifecycle: detectorLifecycleEscalation(
          "unknown_pattern",
          `invalid danger_patterns: ${invalid.length}`,
          "detector_unknown_pattern",
        ),
      };
    }

    if (matched.length === 0) {
      return { score: 1, evidence: "no danger patterns matched" };
    }
    if (matched.length === 1) {
      return { score: 0.3, evidence: `1 danger pattern matched: ${matched[0]}` };
    }
    return {
      score: 0,
      evidence: `${matched.length} danger patterns matched: ${matched.join(", ")}`,
    };
  },
};

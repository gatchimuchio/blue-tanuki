import { clamp01, type Detector, type DetectorOutput, type DetectorContext } from "./types.js";

interface LengthArgs {
  min_chars?: number;
  max_chars?: number;
}

/**
 * Length detector.
 *
 * Scores the request content by character length:
 *   - Below min_chars        → 0.0  (request too short / empty)
 *   - Above max_chars        → linearly decaying score
 *   - Within [min, max]      → 1.0
 *
 * No knowledge of semantic content is required — purely structural.
 */
export const lengthDetector: Detector = {
  name: "length",
  evaluate(args: Record<string, unknown>, ctx: DetectorContext): DetectorOutput {
    const a = args as LengthArgs;
    const min = typeof a.min_chars === "number" ? a.min_chars : 1;
    const max = typeof a.max_chars === "number" ? a.max_chars : 5000;
    const len = ctx.request_content.length;

    if (len < min) {
      return { score: 0, evidence: `length=${len} < min_chars=${min}` };
    }
    if (len <= max) {
      return { score: 1, evidence: `length=${len} within [${min}, ${max}]` };
    }
    // Above max: linear decay over [max, 2*max]; >2*max → 0
    const overshoot = len - max;
    const decayRange = max; // "2x max" point is fully decayed
    const score = clamp01(1 - overshoot / decayRange);
    return { score, evidence: `length=${len} > max_chars=${max} (decayed)` };
  },
};

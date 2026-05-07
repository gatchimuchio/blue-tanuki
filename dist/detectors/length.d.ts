import { type Detector } from "./types.js";
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
export declare const lengthDetector: Detector;
//# sourceMappingURL=length.d.ts.map
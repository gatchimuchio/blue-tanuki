import type { Detector } from "./types.js";
export type { Detector, DetectorOutput, DetectorContext } from "./types.js";
export { lengthDetector } from "./length.js";
export { riskKeywordDetector } from "./risk_keyword.js";
export { keywordMatchDetector } from "./keyword_match.js";
/**
 * Built-in detector registry. Phase 1 ships three detectors,
 * all pure-logic and side-effect free.
 */
export declare class DetectorRegistry {
    private readonly detectors;
    constructor(initial?: Detector[]);
    register(d: Detector): void;
    get(name: string): Detector | undefined;
    list(): readonly Detector[];
}
/**
 * Default registry for Phase 1.
 */
export declare function createDefaultDetectorRegistry(): DetectorRegistry;
//# sourceMappingURL=index.d.ts.map
import { lengthDetector } from "./length.js";
import { riskKeywordDetector } from "./risk_keyword.js";
import { keywordMatchDetector } from "./keyword_match.js";
export { lengthDetector } from "./length.js";
export { riskKeywordDetector } from "./risk_keyword.js";
export { keywordMatchDetector } from "./keyword_match.js";
/**
 * Built-in detector registry. Phase 1 ships three detectors,
 * all pure-logic and side-effect free.
 */
export class DetectorRegistry {
    detectors = new Map();
    constructor(initial) {
        for (const d of initial ?? []) {
            this.register(d);
        }
    }
    register(d) {
        if (this.detectors.has(d.name)) {
            throw new Error(`Detector already registered: ${d.name}`);
        }
        this.detectors.set(d.name, d);
    }
    get(name) {
        return this.detectors.get(name);
    }
    list() {
        return Array.from(this.detectors.values());
    }
}
/**
 * Default registry for Phase 1.
 */
export function createDefaultDetectorRegistry() {
    return new DetectorRegistry([
        lengthDetector,
        riskKeywordDetector,
        keywordMatchDetector,
    ]);
}
//# sourceMappingURL=index.js.map
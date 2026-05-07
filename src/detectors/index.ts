import type { Detector } from "./types.js";
import { lengthDetector } from "./length.js";
import { riskKeywordDetector } from "./risk_keyword.js";
import { keywordMatchDetector } from "./keyword_match.js";

export type { Detector, DetectorOutput, DetectorContext } from "./types.js";
export { lengthDetector } from "./length.js";
export { riskKeywordDetector } from "./risk_keyword.js";
export { keywordMatchDetector } from "./keyword_match.js";

/**
 * Built-in detector registry. Phase 1 ships three detectors,
 * all pure-logic and side-effect free.
 */
export class DetectorRegistry {
  private readonly detectors = new Map<string, Detector>();

  constructor(initial?: Detector[]) {
    for (const d of initial ?? []) {
      this.register(d);
    }
  }

  register(d: Detector): void {
    if (this.detectors.has(d.name)) {
      throw new Error(`Detector already registered: ${d.name}`);
    }
    this.detectors.set(d.name, d);
  }

  get(name: string): Detector | undefined {
    return this.detectors.get(name);
  }

  list(): readonly Detector[] {
    return Array.from(this.detectors.values());
  }
}

/**
 * Default registry for Phase 1.
 */
export function createDefaultDetectorRegistry(): DetectorRegistry {
  return new DetectorRegistry([
    lengthDetector,
    riskKeywordDetector,
    keywordMatchDetector,
  ]);
}

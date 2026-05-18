import type { Detector } from "./types.js";
import { detectorLifecycleOk } from "./types.js";
import { lengthDetector } from "./length.js";
import { riskKeywordDetector } from "./risk_keyword.js";
import { keywordMatchDetector } from "./keyword_match.js";

export type {
  Detector,
  DetectorContext,
  DetectorLifecycleStatus,
  DetectorLifecycleTrace,
  DetectorOutput,
} from "./types.js";
export {
  detectorLifecycleEscalation,
  detectorLifecycleOk,
} from "./types.js";
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
    const name = d.name.trim();
    if (!name) {
      throw new Error("Detector name is required");
    }
    if (this.detectors.has(name)) {
      throw new Error(`Detector already registered: ${name}`);
    }
    this.detectors.set(name, d);
  }

  get(name: string): Detector | undefined {
    return this.detectors.get(name.trim());
  }

  list(): readonly Detector[] {
    return Array.from(this.detectors.values());
  }

  lifecycle(): ReadonlyArray<{ name: string; lifecycle: ReturnType<typeof detectorLifecycleOk> }> {
    return Array.from(this.detectors.keys())
      .sort()
      .map((name) => ({
        name,
        lifecycle: detectorLifecycleOk(`registered:${name}`),
      }));
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

import type { InboundRequest } from "@blue-tanuki/protocol";
import type { FrameResult, ModelResult, PolicyConfig } from "./types.js";
import type { DetectorRegistry } from "./detectors/index.js";
/**
 * M (Model) phase.
 *
 * Builds a structural abstraction of the framed request and runs detector-based
 * axis scoring per the policy. The scoring output is the input to the Commit
 * phase's threshold evaluation.
 *
 * No LLM calls. Detectors are pure-logic functions.
 */
export declare function model(req: InboundRequest, f: FrameResult, policy: PolicyConfig, registry: DetectorRegistry): ModelResult;
//# sourceMappingURL=model.d.ts.map
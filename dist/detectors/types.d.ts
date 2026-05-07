/**
 * Detector contract.
 *
 * A Detector is a PURE-LOGIC function that scores one axis.
 * It must NOT call an LLM, network, or side-effecting subsystem.
 * All decisions in HDS-BRAIN are made without ever delegating to a model
 * — that is the whole point of the upstream layer.
 *
 * Score convention (unified across all detectors):
 *   1.0 = most desirable (e.g. "no risk", "well-formed input")
 *   0.0 = least desirable (e.g. "extreme risk", "malformed")
 */
export interface DetectorContext {
    request_content: string;
    goal: string;
    protected_values: string[];
    channel: string;
    user: string;
}
export interface DetectorOutput {
    score: number;
    evidence?: string;
}
export interface Detector {
    readonly name: string;
    evaluate(args: Record<string, unknown>, ctx: DetectorContext): DetectorOutput;
}
/**
 * Clamp a value to [0, 1].
 */
export declare function clamp01(x: number): number;
//# sourceMappingURL=types.d.ts.map
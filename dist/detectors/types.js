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
/**
 * Clamp a value to [0, 1].
 */
export function clamp01(x) {
    if (Number.isNaN(x))
        return 0;
    if (x < 0)
        return 0;
    if (x > 1)
        return 1;
    return x;
}
//# sourceMappingURL=types.js.map
import type { UnknownEscalationReason } from "../boundary_policy.js";

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

export type DetectorLifecycleStatus =
  | "ok"
  | "missing_detector"
  | "detector_exception"
  | "invalid_output"
  | "unknown_pattern"
  | "detector_conflict";

export interface DetectorLifecycleTrace {
  status: DetectorLifecycleStatus;
  reason: string;
  escalation_reason?: UnknownEscalationReason;
}

export interface DetectorOutput {
  score: number;
  evidence?: string;
  lifecycle?: DetectorLifecycleTrace;
}

export interface Detector {
  readonly name: string;
  evaluate(args: Record<string, unknown>, ctx: DetectorContext): DetectorOutput;
}

/**
 * Clamp a value to [0, 1].
 */
export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function detectorLifecycleOk(reason = "detector_ok"): DetectorLifecycleTrace {
  return { status: "ok", reason };
}

export function detectorLifecycleEscalation(
  status: Exclude<DetectorLifecycleStatus, "ok">,
  reason: string,
  escalation_reason: UnknownEscalationReason = "detector_conflict",
): DetectorLifecycleTrace {
  return { status, reason, escalation_reason };
}

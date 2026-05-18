import { describe, expect, it } from "vitest";
import type { InboundRequest } from "@blue-tanuki/protocol";
import { HDSUpperController } from "../src/controller.js";
import {
  DetectorRegistry,
  type Detector,
} from "../src/detectors/index.js";
import type { PolicyConfig } from "../src/types.js";

function inbound(content: string, id = "detector-lifecycle"): InboundRequest {
  return {
    id,
    channel: "test",
    user: "u1",
    content,
    timestamp: 1,
  };
}

function policyFor(detector: string, detector_args: Record<string, unknown> = {}): PolicyConfig {
  return {
    problem_definition_id: "detector_lifecycle_policy",
    axes: [
      {
        name: "detector_axis",
        detector,
        weight: 1,
        detector_args,
      },
    ],
    thresholds: {
      aggregate_assert: 0.6,
      out_of_scope_below: 0.2,
      per_axis_fail: { detector_axis: 0.2 },
    },
  };
}

function expectDetectorSuspend(controller: HDSUpperController, request: InboundRequest) {
  const { log, command } = controller.decide(request);
  expect(command).toBeNull();
  expect(log.commit.decision).toBe("SUSPEND");
  expect(log.commit.reason).toContain("unknown_must_escalate");
  expect(log.commit.triggered_thresholds[0]).toContain("unknown_escalation:");
  expect(log.commit.triggered_thresholds[1]).toContain("detector_lifecycle:");
  expect(controller.getAudit().verify()).toBe(true);
  return log;
}

describe("Phase 12-S7 detector lifecycle and unknown pattern escalation", () => {
  it("exposes registered detector lifecycle without downstream dependencies", () => {
    const registry = new DetectorRegistry();
    registry.register({ name: "sample", evaluate: () => ({ score: 1 }) });

    expect(registry.lifecycle()).toEqual([
      {
        name: "sample",
        lifecycle: {
          status: "ok",
          reason: "registered:sample",
        },
      },
    ]);
  });

  it("suspends when policy references a missing detector instead of auto-allowing", () => {
    const controller = new HDSUpperController({ policy: policyFor("missing.detector") });
    const log = expectDetectorSuspend(controller, inbound("hello missing detector", "missing-detector"));

    expect(log.commit.reason).toContain("unknown_must_escalate:detector_conflict");
    expect(log.model.scoring.axis_scores[0]?.lifecycle).toMatchObject({
      status: "missing_detector",
      escalation_reason: "detector_conflict",
    });
  });

  it("suspends when a detector throws instead of crashing the authority path", () => {
    const throwing: Detector = {
      name: "throwing",
      evaluate: () => {
        throw new Error("boom");
      },
    };
    const registry = new DetectorRegistry([throwing]);
    const controller = new HDSUpperController({
      policy: policyFor("throwing"),
      detectors: registry,
    });
    const log = expectDetectorSuspend(controller, inbound("hello throwing detector", "throwing-detector"));

    expect(log.model.scoring.axis_scores[0]?.lifecycle).toMatchObject({
      status: "detector_exception",
      escalation_reason: "detector_conflict",
    });
  });

  it("suspends invalid detector scores as lifecycle failures", () => {
    const invalid: Detector = {
      name: "invalid-score",
      evaluate: () => ({ score: Number.NaN }),
    };
    const registry = new DetectorRegistry([invalid]);
    const controller = new HDSUpperController({
      policy: policyFor("invalid-score"),
      detectors: registry,
    });
    const log = expectDetectorSuspend(controller, inbound("hello invalid score", "invalid-score"));

    expect(log.model.scoring.axis_scores[0]?.lifecycle).toMatchObject({
      status: "invalid_output",
      escalation_reason: "detector_conflict",
    });
  });

  it("suspends unknown detector patterns before threshold fail rules", () => {
    const controller = new HDSUpperController({
      policy: policyFor("risk_keyword", { danger_patterns: ["[invalid("] }),
    });
    const log = expectDetectorSuspend(controller, inbound("hello invalid pattern", "unknown-pattern"));

    expect(log.commit.reason).toContain("unknown_must_escalate:detector_unknown_pattern");
    expect(log.commit.triggered_thresholds).not.toContain("per_axis_fail:detector_axis<=0.2");
    expect(log.model.scoring.axis_scores[0]?.lifecycle).toMatchObject({
      status: "unknown_pattern",
      escalation_reason: "detector_unknown_pattern",
    });
  });

  it("suspends duplicate policy axes as detector conflicts", () => {
    const policy: PolicyConfig = {
      problem_definition_id: "duplicate_axis_policy",
      axes: [
        {
          name: "same_axis",
          detector: "length",
          weight: 1,
          detector_args: { min_chars: 1, max_chars: 100 },
        },
        {
          name: "same_axis",
          detector: "length",
          weight: 1,
          detector_args: { min_chars: 1, max_chars: 100 },
        },
      ],
      thresholds: {
        aggregate_assert: 0.6,
        out_of_scope_below: 0.2,
      },
    };

    const controller = new HDSUpperController({ policy });
    const log = expectDetectorSuspend(controller, inbound("hello duplicate axis", "duplicate-axis"));
    const duplicate = log.model.scoring.axis_scores.find((axis) => axis.lifecycle.status === "detector_conflict");

    expect(duplicate?.lifecycle.reason).toBe("duplicate policy axis: same_axis");
    expect(log.commit.reason).toContain("unknown_must_escalate:detector_conflict");
  });
});

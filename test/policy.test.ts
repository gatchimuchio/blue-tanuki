import { describe, it, expect } from "vitest";
import {
  runScoring,
  evaluateDecision,
  DEFAULT_POLICY,
  validatePolicy,
} from "../src/policy.js";
import { createDefaultDetectorRegistry } from "../src/detectors/index.js";
import type { DetectorContext } from "../src/detectors/types.js";
import type { PolicyConfig, ScoringResult } from "../src/types.js";

const baseCtx: DetectorContext = {
  request_content: "",
  goal: "",
  protected_values: [],
  channel: "test",
  user: "u1",
};

describe("runScoring", () => {
  it("produces axis_scores and weighted aggregate", () => {
    const reg = createDefaultDetectorRegistry();
    const r = runScoring(DEFAULT_POLICY, {
      ...baseCtx,
      request_content: "hello world",
    }, reg);

    expect(r.axis_scores).toHaveLength(3);
    // hello world is short, no danger, no compliance hits → all axes 1.0
    expect(r.aggregate).toBeCloseTo(1.0, 2);
  });

  it("aggregates correctly when one axis is 0", () => {
    const reg = createDefaultDetectorRegistry();
    const r = runScoring(DEFAULT_POLICY, {
      ...baseCtx,
      request_content: "rm -rf /",
    }, reg);
    // risk_safety=0.3 (1 match), input_validity=1, compliance=1
    // weights: 0.5/0.2/0.3 (sum=1) → 0.3*0.5 + 1*0.2 + 1*0.3 = 0.65
    expect(r.aggregate).toBeCloseTo(0.65, 2);
  });

  it("handles missing detectors gracefully (score=0)", () => {
    const reg = createDefaultDetectorRegistry();
    const policy: PolicyConfig = {
      problem_definition_id: "test",
      axes: [{ name: "x", detector: "nonexistent", weight: 1.0 }],
      thresholds: { aggregate_assert: 0.5, out_of_scope_below: 0.1 },
    };
    const r = runScoring(policy, baseCtx, reg);
    expect(r.aggregate).toBe(0);
    expect(r.axis_scores[0]!.evidence).toContain("not registered");
  });
});

describe("evaluateDecision", () => {
  const policy: PolicyConfig = {
    problem_definition_id: "t",
    axes: [
      { name: "risk_safety", detector: "risk_keyword", weight: 0.5 },
      { name: "compliance", detector: "keyword_match", weight: 0.5 },
    ],
    thresholds: {
      aggregate_assert: 0.6,
      out_of_scope_below: 0.2,
      per_axis_fail: { risk_safety: 0.2 },
      per_axis_suspend_below: { risk_safety: 0.5 },
    },
  };

  function scoring(risk: number, comp: number): ScoringResult {
    return {
      axis_scores: [
        { axis: "risk_safety", score: risk, detector: "risk_keyword" },
        { axis: "compliance", score: comp, detector: "keyword_match" },
      ],
      weights: { risk_safety: 0.5, compliance: 0.5 },
      aggregate: (risk + comp) / 2,
    };
  }

  it("FAIL when per-axis fail threshold met", () => {
    const r = evaluateDecision(scoring(0.1, 1.0), policy);
    expect(r.decision).toBe("FAIL");
    expect(r.triggered_thresholds[0]).toContain("per_axis_fail");
  });

  it("SUSPEND when per-axis suspend threshold met (and not fail)", () => {
    const r = evaluateDecision(scoring(0.4, 1.0), policy);
    expect(r.decision).toBe("SUSPEND");
    expect(r.triggered_thresholds[0]).toContain("per_axis_suspend_below");
  });

  it("OUT_OF_SCOPE when aggregate below out_of_scope_below", () => {
    // risk=0.6 (above suspend 0.5), comp=0 (no per_axis rule on comp)
    // But comp=0 makes aggregate=0.3 → above 0.2, not OOS
    // Use risk=0.6, comp=-... no, scores in [0,1]. Test with weighted policy
    const policy2: PolicyConfig = {
      problem_definition_id: "t",
      axes: [
        { name: "risk_safety", detector: "risk_keyword", weight: 0.1 },
        { name: "compliance", detector: "keyword_match", weight: 0.9 },
      ],
      thresholds: {
        aggregate_assert: 0.9,
        out_of_scope_below: 0.5,
      },
    };
    const r = evaluateDecision(
      {
        axis_scores: [
          { axis: "risk_safety", score: 1.0, detector: "x" },
          { axis: "compliance", score: 0.3, detector: "y" },
        ],
        weights: { risk_safety: 0.1, compliance: 0.9 },
        aggregate: 0.37, // 0.1 + 0.27
      },
      policy2,
    );
    expect(r.decision).toBe("OUT_OF_SCOPE");
  });

  it("ASSERT when aggregate >= aggregate_assert", () => {
    const r = evaluateDecision(scoring(1.0, 1.0), policy);
    expect(r.decision).toBe("ASSERT");
  });

  it("default SUSPEND otherwise", () => {
    // risk=0.6 (no fail/suspend), comp=0.4 → aggregate=0.5, < 0.6 assert, > 0.2 OOS
    const r = evaluateDecision(scoring(0.6, 0.4), policy);
    expect(r.decision).toBe("SUSPEND");
    expect(r.triggered_thresholds[0]).toBe("default_suspend");
  });

  it("FAIL takes priority over SUSPEND on the same axis", () => {
    // risk=0.1 → both fail (≤0.2) and suspend_below (<0.5) match. FAIL wins.
    const r = evaluateDecision(scoring(0.1, 1.0), policy);
    expect(r.decision).toBe("FAIL");
  });
});

describe("validatePolicy", () => {
  it("accepts the default policy", () => {
    expect(() => validatePolicy(DEFAULT_POLICY)).not.toThrow();
  });

  it("rejects policy without axes", () => {
    expect(() =>
      validatePolicy({
        problem_definition_id: "x",
        axes: [],
        thresholds: { aggregate_assert: 0.5, out_of_scope_below: 0.1 },
      }),
    ).toThrow();
  });

  it("rejects policy with negative weight", () => {
    expect(() =>
      validatePolicy({
        problem_definition_id: "x",
        axes: [{ name: "a", detector: "length", weight: -1 }],
        thresholds: { aggregate_assert: 0.5, out_of_scope_below: 0.1 },
      }),
    ).toThrow();
  });
});

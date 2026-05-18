import { describe, it, expect } from "vitest";
import {
  lengthDetector,
  riskKeywordDetector,
  keywordMatchDetector,
} from "../src/detectors/index.js";
import type { DetectorContext } from "../src/detectors/types.js";

const baseCtx: DetectorContext = {
  request_content: "",
  goal: "",
  protected_values: [],
  channel: "test",
  user: "user-1",
};

describe("lengthDetector", () => {
  it("returns 0 for empty content when min_chars=1", () => {
    const out = lengthDetector.evaluate({ min_chars: 1, max_chars: 100 }, {
      ...baseCtx,
      request_content: "",
    });
    expect(out.score).toBe(0);
  });

  it("returns 1 for content within bounds", () => {
    const out = lengthDetector.evaluate({ min_chars: 1, max_chars: 100 }, {
      ...baseCtx,
      request_content: "hello",
    });
    expect(out.score).toBe(1);
  });

  it("decays linearly above max_chars", () => {
    const out = lengthDetector.evaluate({ min_chars: 1, max_chars: 10 }, {
      ...baseCtx,
      request_content: "x".repeat(15),
    });
    // overshoot=5, decayRange=10 → 1 - 0.5 = 0.5
    expect(out.score).toBeCloseTo(0.5, 2);
  });

  it("returns 0 at >=2x max_chars", () => {
    const out = lengthDetector.evaluate({ min_chars: 1, max_chars: 10 }, {
      ...baseCtx,
      request_content: "x".repeat(25),
    });
    expect(out.score).toBe(0);
  });
});

describe("riskKeywordDetector", () => {
  it("returns 1 with no patterns configured", () => {
    const out = riskKeywordDetector.evaluate({}, { ...baseCtx, request_content: "rm -rf /" });
    expect(out.score).toBe(1);
  });

  it("returns 1 when no danger pattern matches", () => {
    const out = riskKeywordDetector.evaluate(
      { danger_patterns: ["rm\\s+-rf"] },
      { ...baseCtx, request_content: "hello world" },
    );
    expect(out.score).toBe(1);
  });

  it("returns 0.3 for a single match", () => {
    const out = riskKeywordDetector.evaluate(
      { danger_patterns: ["rm\\s+-rf", "DROP\\s+TABLE"] },
      { ...baseCtx, request_content: "please run rm -rf foo" },
    );
    expect(out.score).toBeCloseTo(0.3, 2);
  });

  it("returns 0 for two or more matches", () => {
    const out = riskKeywordDetector.evaluate(
      { danger_patterns: ["rm\\s+-rf", "DROP\\s+TABLE"] },
      { ...baseCtx, request_content: "rm -rf / and DROP TABLE users" },
    );
    expect(out.score).toBe(0);
  });

  it("is case-insensitive", () => {
    const out = riskKeywordDetector.evaluate(
      { danger_patterns: ["drop\\s+table"] },
      { ...baseCtx, request_content: "DROP TABLE foo" },
    );
    expect(out.score).toBeCloseTo(0.3, 2);
  });

  it("marks invalid regex patterns as unknown detector patterns", () => {
    const out = riskKeywordDetector.evaluate(
      { danger_patterns: ["[invalid("] },
      { ...baseCtx, request_content: "anything" },
    );
    expect(out.score).toBe(0);
    expect(out.lifecycle?.status).toBe("unknown_pattern");
    expect(out.lifecycle?.escalation_reason).toBe("detector_unknown_pattern");
  });
});

describe("keywordMatchDetector", () => {
  it("returns 1 with no blocked terms configured", () => {
    const out = keywordMatchDetector.evaluate({}, { ...baseCtx, request_content: "anything" });
    expect(out.score).toBe(1);
  });

  it("returns 1 when no blocked term matches", () => {
    const out = keywordMatchDetector.evaluate(
      { blocked_terms: ["passport number"] },
      { ...baseCtx, request_content: "tell me a joke" },
    );
    expect(out.score).toBe(1);
  });

  it("returns 0 when any blocked term appears (case-insensitive)", () => {
    const out = keywordMatchDetector.evaluate(
      { blocked_terms: ["passport number"] },
      { ...baseCtx, request_content: "my Passport Number is 123" },
    );
    expect(out.score).toBe(0);
  });
});

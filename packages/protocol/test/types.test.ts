import { describe, expect, it } from "vitest";
import {
  ExecuteCommandSchema,
  parseInboundRequestAtBoundary,
} from "../src/types.js";

const upstream = {
  frame_goal: "g",
  model_abstraction: "m",
  commit_hash: "h",
  commit_decision: "ASSERT",
};

describe("ExecuteCommandSchema", () => {
  it("accepts allowed_capabilities on command constraints", () => {
    const parsed = ExecuteCommandSchema.parse({
      id: "cmd-1",
      type: "tool_call",
      payload: {
        tool_name: "echo",
        arguments: { text: "hi" },
      },
      constraints: {
        allowed_tools: ["echo"],
        allowed_capabilities: ["tool:echo"],
      },
      upstream_decision: upstream,
    });

    expect(parsed.constraints?.allowed_capabilities).toEqual(["tool:echo"]);
  });

  it("rejects empty allowed_capabilities entries", () => {
    const result = ExecuteCommandSchema.safeParse({
      id: "cmd-1",
      type: "tool_call",
      payload: {
        tool_name: "echo",
        arguments: {},
      },
      constraints: {
        allowed_capabilities: [""],
      },
      upstream_decision: upstream,
    });

    expect(result.success).toBe(false);
  });
});

describe("InboundRequest boundary", () => {
  it("normalizes only canonical inbound requests for authority", () => {
    const result = parseInboundRequestAtBoundary({
      id: " req-1 ",
      channel: "webchat",
      user: "owner",
      content: "ＡＢＣ",
      timestamp: 1,
      metadata: { note: "ｔｅｓｔ" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.id).toBe("req-1");
      expect(result.request.content).toBe("ABC");
      expect(result.request.metadata?.note).toBe("test");
    }
  });

  it("rejects unknown fields and dangerous metadata keys", () => {
    const withUnknown = parseInboundRequestAtBoundary({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: 1,
      extra: true,
    });
    expect(withUnknown.ok).toBe(false);

    const withDangerousKey = parseInboundRequestAtBoundary({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: 1,
      metadata: { constructor: "pollute" },
    });
    expect(withDangerousKey.ok).toBe(false);
  });

  it("rejects path-like authority identifiers", () => {
    const result = parseInboundRequestAtBoundary({
      id: "../req",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: 1,
    });

    expect(result.ok).toBe(false);
  });
});

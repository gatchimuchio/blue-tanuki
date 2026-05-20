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

  it("rejects malformed timestamps, oversized content, and nested dangerous metadata", () => {
    expect(parseInboundRequestAtBoundary({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: Number.NaN,
    }).ok).toBe(false);

    expect(parseInboundRequestAtBoundary({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "x".repeat(200_001),
      timestamp: 1,
    }).ok).toBe(false);

    expect(parseInboundRequestAtBoundary({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: 1,
      metadata: { safe: { prototype: "pollute" } },
    }).ok).toBe(false);
  });

  it("normalizes unicode and blocks prototype-pollution shaped metadata", () => {
    const polluted = JSON.parse('{"id":"req-1","channel":"webchat","user":"owner","content":"ｈｅｌｌｏ","timestamp":1,"metadata":{"__proto__":{"admin":true}}}');
    const blocked = parseInboundRequestAtBoundary(polluted);
    expect(blocked.ok).toBe(false);

    const normalized = parseInboundRequestAtBoundary({
      id: "req-2",
      channel: "webchat",
      user: "owner",
      content: "ｈｅｌｌｏ",
      timestamp: 1,
      metadata: { " ｒｅｐｌｙ＿ｔｏ ": " ｌｏｃａｌ " },
    });
    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.request.content).toBe("hello");
      expect(normalized.request.metadata?.reply_to).toBe(" local ");
    }
  });
});

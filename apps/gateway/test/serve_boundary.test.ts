import { describe, expect, it } from "vitest";
import { canonicalizeGatewayInbound } from "../src/serve.js";

describe("gateway inbound boundary", () => {
  it("canonicalizes valid inbound requests before authority use", () => {
    const result = canonicalizeGatewayInbound({
      id: " req-1 ",
      channel: "webchat",
      user: "owner",
      content: "ｈｅｌｌｏ",
      timestamp: 1,
    });

    expect(result.boundary_ok).toBe(true);
    expect(result.request).toMatchObject({
      id: "req-1",
      channel: "webchat",
      user: "owner",
      content: "hello",
    });
  });

  it("uses a safe fallback for malformed inbound objects", () => {
    for (const raw of [
      { channel: "webchat", user: "owner", timestamp: 1 },
      { id: undefined, channel: "webchat", user: "owner", content: "hello", timestamp: 1 },
      JSON.parse('{"id":"req","channel":"webchat","user":"owner","content":"hello","timestamp":1,"metadata":{"__proto__":{"polluted":true}}}'),
      null,
    ]) {
      const result = canonicalizeGatewayInbound(raw);
      expect(result.boundary_ok).toBe(false);
      expect(result.boundary_issues.length).toBeGreaterThan(0);
      expect(result.request.id).toMatch(/^invalid-gateway-boundary-/);
      expect(result.request.channel).toBe("invalid");
      expect(result.request.user).toBe("unknown");
      expect(result.request.metadata).toEqual({
        "blue_tanuki.boundary_failure": "gateway_inbound",
      });
      expect(JSON.stringify(result.request)).not.toContain("polluted");
      expect(result.request.content).not.toMatch(/rm\s+-rf|DROP\s+TABLE|shutdown\s+-/i);
    }
  });
});

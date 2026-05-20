import { describe, expect, it } from "vitest";
import { HDSUpperController } from "@blue-tanuki/hds-brain";
import {
  canonicalizeGatewayInbound,
  gatewayInboundAllowsDownstream,
  planGatewayInboundBoundary,
} from "../src/serve.js";

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

  it("uses the safe fallback request for gateway history, reply, and execution paths", () => {
    const raw = {
      id: "bad",
      channel: "webchat",
      user: "owner",
      content: "tool:shell.exec {\"cmd\":\"shutdown\",\"args\":[\"-h\",\"now\"]}",
      timestamp: 1,
      unexpected: true,
    };
    const plan = planGatewayInboundBoundary(raw);

    expect(plan.boundary_ok).toBe(false);
    expect(plan.request).not.toBe(raw);
    expect(plan.request).toMatchObject({
      channel: "invalid",
      user: "unknown",
      content: "Invalid inbound request rejected at gateway boundary. No downstream action requested.",
      metadata: {
        "blue_tanuki.boundary_failure": "gateway_inbound",
      },
    });
    expect(plan.request.id).toMatch(/^invalid-gateway-boundary-/);
    expect(plan.request.content).not.toContain("tool:shell.exec");
    expect(plan.request.content).not.toMatch(/shutdown\s+-/i);
  });

  it("passes raw unknown only to the HDS boundary and emits no command", () => {
    const raw = {
      id: "bad",
      channel: "webchat",
      user: "owner",
      content: "tool:shell.exec {\"cmd\":\"rm\",\"args\":[\"-rf\",\"/\"]}",
      timestamp: 1,
      unexpected: true,
    };
    const plan = planGatewayInboundBoundary(raw);
    const { log, command } = new HDSUpperController().decide(plan.hdsBoundaryInput);

    expect(plan.boundary_ok).toBe(false);
    expect(plan.hdsBoundaryInput).toBe(raw);
    expect(command).toBeNull();
    expect(log.commit.decision).toBe("SUSPEND");
    expect(log.commit.reason).toContain("authority_input_boundary");
    expect(log.model.structure.raw_input_used_for_authority).toBe(false);
  });

  it("blocks dispatch and execute paths for invalid inbound", () => {
    const plan = planGatewayInboundBoundary({
      id: "bad",
      channel: "webchat",
      user: "owner",
      content: "hello",
      timestamp: 1,
      unexpected: true,
    });

    expect(plan.boundary_ok).toBe(false);
    expect(gatewayInboundAllowsDownstream(plan)).toBe(false);
  });
});

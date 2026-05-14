import { describe, expect, it } from "vitest";
import { frame } from "../src/frame.js";
import { DEFAULT_POLICY } from "../src/policy.js";

describe("operator surface framing", () => {
  it("recognizes Writing Operator by content prefix without changing process authority", () => {
    const result = frame(
      {
        id: "req-1",
        channel: "webchat",
        user: "alice",
        content: "writing: draft a release note",
        timestamp: 1,
      },
      { default_policy: DEFAULT_POLICY },
    );

    expect(result.operator_surface).toEqual({
      id: "writing",
      layer: "A",
      source: "content_prefix",
      authority: "downstream_device_only",
    });
    expect(result.process.process_kind).toBe("chat");
    expect(result.world_closure.x).toContain("surface:writing");
    expect(result.world_closure.r).toContain("operator_surface_binding");
  });

  it("accepts gateway-owned Writing metadata but ignores untrusted surface metadata", () => {
    const untrusted = frame(
      {
        id: "req-2",
        channel: "slack",
        user: "external-user",
        content: "draft this",
        timestamp: 1,
        metadata: { "blue_tanuki.operator_surface": "writing" },
      },
      { default_policy: DEFAULT_POLICY },
    );
    expect(untrusted.operator_surface).toBeUndefined();

    const trusted = frame(
      {
        id: "req-3",
        channel: "webchat",
        user: "alice",
        content: "draft this",
        timestamp: 1,
        metadata: {
          "blue_tanuki.authority_context": "gateway_internal_v1",
          "blue_tanuki.operator_surface": "writing",
        },
      },
      { default_policy: DEFAULT_POLICY },
    );
    expect(trusted.operator_surface?.source).toBe("gateway_internal_metadata");
  });
});

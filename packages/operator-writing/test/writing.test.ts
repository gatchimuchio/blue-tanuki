import { describe, expect, it } from "vitest";
import {
  WRITING_OPERATOR_REQUIRED_PERMISSIONS,
  buildWritingInvocation,
  getWritingOperationSpec,
  getWritingSurfaceSnapshot,
  writingMetadataForOperation,
} from "../src/index.js";

describe("Writing Operator surface", () => {
  it("declares itself as a Layer A downstream surface, not an authority source", () => {
    const snapshot = getWritingSurfaceSnapshot();
    expect(snapshot.surface).toBe("writing");
    expect(snapshot.layer).toBe("A");
    expect(snapshot.authority).toBe("hds_brain_downstream_device");
    expect(snapshot.replaces_authority).toBe(false);
    expect(snapshot.raw_authority_added).toBe(false);
  });

  it("keeps L1, L2, and L3 operation boundaries explicit", () => {
    expect(getWritingOperationSpec("draft.in_memory").approval_level).toBe("L1_observe");
    expect(getWritingOperationSpec("file.write").approval_level).toBe("L2_operate");
    expect(getWritingOperationSpec("gmail.write").approval_level).toBe("L3_final_review");
    expect(getWritingOperationSpec("google.drive.write").final_review_required).toBe(true);
  });

  it("uses only existing downstream capability names", () => {
    expect(WRITING_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:file.search");
    expect(WRITING_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:gmail.write");
    expect(WRITING_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("authority:write");
    expect(WRITING_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("hds:bypass");
  });

  it("builds digest-only invocation traces", () => {
    const invocation = buildWritingInvocation({
      operation: "proofread.in_memory",
      content: "hello",
      source: "provided_text",
    });
    expect(invocation.input_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(invocation).not.toHaveProperty("content");
  });

  it("emits structured operation metadata for gateway-owned requests", () => {
    expect(writingMetadataForOperation("file.edit")).toEqual({
      "blue_tanuki.operator_surface": "writing",
      "blue_tanuki.writing.operation": "file.edit",
      "blue_tanuki.approval_level": "L2_operate",
      "blue_tanuki.approval_risk": "medium",
      "blue_tanuki.final_review_required": "false",
    });
  });
});

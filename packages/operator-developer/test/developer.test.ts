import { describe, expect, it } from "vitest";
import {
  DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS,
  buildDeveloperInvocation,
  developerMetadataForOperation,
  getDeveloperOperationSpec,
  getDeveloperSurfaceSnapshot,
} from "../src/index.js";

describe("Developer Operator surface", () => {
  it("declares itself as a Layer A downstream surface, not an authority source", () => {
    const snapshot = getDeveloperSurfaceSnapshot();
    expect(snapshot.surface).toBe("developer");
    expect(snapshot.layer).toBe("A");
    expect(snapshot.authority).toBe("hds_brain_downstream_device");
    expect(snapshot.replaces_authority).toBe(false);
    expect(snapshot.raw_authority_added).toBe(false);
  });

  it("keeps L1, L2, and L3 operation boundaries explicit", () => {
    expect(getDeveloperOperationSpec("file.read").approval_level).toBe("L1_observe");
    expect(getDeveloperOperationSpec("file.write").approval_level).toBe("L2_operate");
    expect(getDeveloperOperationSpec("github.write").approval_level).toBe("L3_final_review");
    expect(getDeveloperOperationSpec("shell.exec").final_review_required).toBe(true);
  });

  it("keeps browser automation as disabled-by-default preview", () => {
    const snapshot = getDeveloperSurfaceSnapshot();
    expect(snapshot.browser_preview).toEqual({
      status: "preview_disabled_by_default",
      enable_env: "BLUE_TANUKI_BROWSER_AUTOMATION_PREVIEW",
      promoted_to_first_party: false,
    });
    expect(getDeveloperOperationSpec("browser.automation").preview).toBe(true);
    expect(getDeveloperOperationSpec("browser.automation").disabled_by_default).toBe(true);
    expect(getDeveloperOperationSpec("browser.automation").approval_level).toBe("L3_final_review");
  });

  it("uses only existing downstream capability names", () => {
    expect(DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:file.search");
    expect(DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:github.write");
    expect(DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:shell.exec");
    expect(DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("authority:write");
    expect(DEVELOPER_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("hds:bypass");
  });

  it("builds digest-only invocation traces", () => {
    const invocation = buildDeveloperInvocation({
      operation: "shell.exec",
      content: "pnpm test",
      source: "repository_context",
    });
    expect(invocation.input_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(invocation).not.toHaveProperty("content");
  });

  it("emits structured operation metadata for gateway-owned requests", () => {
    expect(developerMetadataForOperation("file.edit")).toEqual({
      "blue_tanuki.operator_surface": "developer",
      "blue_tanuki.developer.operation": "file.edit",
      "blue_tanuki.approval_level": "L2_operate",
      "blue_tanuki.approval_risk": "medium",
      "blue_tanuki.final_review_required": "false",
    });
  });
});

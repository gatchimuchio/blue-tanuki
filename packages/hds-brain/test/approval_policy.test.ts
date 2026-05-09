import { describe, expect, it } from "vitest";
import type { ExecuteCommand } from "@blue-tanuki/protocol";
import {
  approvalContextFromCommand,
  buildApprovalGrant,
  evaluateApproval,
  finalReviewRequired,
  approvalGrantFromEvaluation,
} from "../src/approval_policy.js";

const upstream = {
  frame_goal: "goal",
  model_abstraction: "model",
  commit_hash: "abc123",
  commit_decision: "ASSERT" as const,
};

function toolCommand(
  tool_name: string,
  args: Record<string, unknown>,
  caps: string[],
): ExecuteCommand {
  return {
    id: "cmd-1",
    type: "tool_call",
    payload: { tool_name, arguments: args },
    constraints: { allowed_tools: [tool_name], allowed_capabilities: caps },
    upstream_decision: upstream,
  };
}

describe("approval policy", () => {
  it("classifies file search as low-risk read/search", () => {
    const cmd = toolCommand("file.search", { query: "docs" }, ["tool:file.search", "fs:read"]);
    const ctx = approvalContextFromCommand(cmd, { actor: "alice", now: 1 });
    expect(ctx.operation).toBe("tool.file.search");
    expect(ctx.risk).toBe("low");
    expect(finalReviewRequired(ctx)).toBe(false);
  });

  it("allows non-final-review commands by default in full-access operator mode", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const r = evaluateApproval(cmd, [], { actor: "alice", now: 1 });
    expect(r.decision).toBe("allow");
    expect(r.mode).toBe("full_access");
    expect(r.context.operation).toBe("tool.file.write");
    expect(r.risk).toBe("medium");
  });

  it("still supports strict ask-every-time mode by explicit configuration", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const r = evaluateApproval(cmd, [], { actor: "alice", now: 1, default_mode: "ask_every_time" });
    expect(r.decision).toBe("ask");
    expect(r.mode).toBe("ask_every_time");
  });

  it("allows remembered same-operation same-scope grants", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const grant = buildApprovalGrant({
      mode: "remember_this_decision",
      decision: "allow",
      operation: "tool.file.write",
      target_scope: "file",
      target: "docs/a.md",
      path_pattern: "docs/a.md",
      risk: "medium",
      actor: "alice",
      created_by: "alice",
      expires_at: 9999,
    });
    const r = evaluateApproval(cmd, [grant], { actor: "alice", now: 1 });
    expect(r.decision).toBe("allow");
    expect(r.matched_grant_id).toBe(grant.id);
  });


  it("lets explicit deny grants override default full access", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const grant = buildApprovalGrant({
      mode: "remember_this_decision",
      decision: "deny",
      operation: "tool.file.write",
      target_scope: "file",
      target: "docs/a.md",
      path_pattern: "docs/a.md",
      risk: "medium",
      actor: "alice",
      created_by: "alice",
      expires_at: null,
    });
    const r = evaluateApproval(cmd, [grant], { actor: "alice", now: 1 });
    expect(r.decision).toBe("deny");
    expect(r.reason).toContain("deny_grant_matched");
  });

  it("keeps final review even when a matching allow grant exists", () => {
    const cmd = toolCommand("shell.exec", { command: "echo ok" }, ["shell:exec"]);
    const grant = buildApprovalGrant({
      mode: "remember_this_decision",
      decision: "allow",
      operation: "tool.shell.exec",
      target_scope: "task_type",
      target: "shell.exec",
      risk: "high",
      actor: "alice",
      created_by: "alice",
      expires_at: null,
    });
    const r = evaluateApproval(cmd, [grant], { actor: "alice", now: 1 });
    expect(r.decision).toBe("ask");
    expect(r.final_review_required).toBe(true);
  });


  it("makes the no-black-box authority boundary machine-readable", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const r = evaluateApproval(cmd, [], { actor: "alice", now: 1 });
    expect(r.authority_trace.authority_model).toBe("owner_operated_full_access");
    expect(r.authority_trace.control_plane_black_boxes).toEqual([]);
    expect(r.authority_trace.black_box_boundary).toBe("none_in_hds_authority_path");
    expect(r.authority_trace.audit_closure).toEqual({
      decision: "hash_chain",
      approval: "hash_chain",
      execution_feedback: "hash_chain",
    });
    expect(r.authority_trace.resolved_factors.operation).toBe("tool.file.write");
    expect(r.authority_trace.resolved_factors.final_review_required).toBe(false);
  });

  it("does not let full-access bypass final review operations", () => {
    const cmd = toolCommand("shell.exec", { command: "rm -rf ./tmp" }, ["shell:exec"]);
    const grant = buildApprovalGrant({
      mode: "full_access",
      decision: "allow",
      operation: "*",
      target_scope: "*",
      risk: "*",
      actor: "*",
      created_by: "alice",
      expires_at: null,
    });
    const r = evaluateApproval(cmd, [grant], { actor: "alice", now: 1, default_mode: "full_access" });
    expect(r.context.operation).toBe("tool.shell.exec");
    expect(r.final_review_required).toBe(true);
    expect(r.decision).toBe("ask");
  });
});


describe("approval grant helpers", () => {
  it("builds a reusable grant from an approval evaluation", () => {
    const cmd = toolCommand("file.write", { path: "docs/a.md" }, ["fs:write"]);
    const evaluation = evaluateApproval(cmd, [], { actor: "alice", now: 1 });
    const grant = approvalGrantFromEvaluation(evaluation, { created_by: "alice", expires_at: 9999 });
    expect(grant.operation).toBe("tool.file.write");
    expect(grant.target).toBe("docs/a.md");
    expect(grant.actor).toBe("alice");
  });
});

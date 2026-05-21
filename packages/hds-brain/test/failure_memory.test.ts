import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { ExecuteCommand } from "@blue-tanuki/protocol";
import {
  CompleteHistoryStore,
  FailureMemoryStore,
  candidateFromCommand,
  extractFailureSignatures,
  runPeriodicFailureMemoryVerification,
} from "../src/index.js";

function toolCommand(id = "cmd-1", requestId = "req-1", tool = "file.search", args: Record<string, unknown> = { query: "needle" }): ExecuteCommand {
  return {
    id,
    type: "tool_call",
    payload: {
      tool_name: tool,
      arguments: args,
    },
    constraints: {
      allowed_tools: [tool],
      allowed_capabilities: ["fs:read"],
    },
    upstream_decision: {
      frame_goal: "test command",
      model_abstraction: "test",
      commit_hash: `hash-${requestId}`,
      commit_decision: "ASSERT",
    },
  };
}

describe("FailureMemoryStore", () => {
  it("creates signatures, updates hit count, preserves evidence, transitions state, and persists", () => {
    const dir = mkdtempSync(join(tmpdir(), "failure-memory-"));
    const file = join(dir, "failure-memory.json");
    try {
      const store = new FailureMemoryStore({ filepath: file, now: () => new Date("2026-01-01T00:00:00.000Z") });
      const candidate = candidateFromCommand(toolCommand());
      const signature = store.addSignature({
        scope: candidate.scope,
        failure_type: "bad_command",
        input_pattern: candidate.input_pattern,
        action_pattern: candidate.action_pattern,
        context_pattern: candidate.context_pattern,
        evidence_log_ids: ["log-1"],
        state: "draft",
        confidence: 0.6,
        severity: "medium",
      });

      expect(signature.evidence_log_ids).toEqual(["log-1"]);
      store.updateHitCount(signature.id, 2, ["log-2"]);
      store.markState(signature.id, "shadow");
      store.markState(signature.id, "active");
      store.markState(signature.id, "retired");

      const reloaded = new FailureMemoryStore({ filepath: file });
      const loaded = reloaded.get(signature.id);
      expect(loaded?.hit_count).toBe(2);
      expect(loaded?.state).toBe("retired");
      expect(loaded?.evidence_log_ids).toEqual(["log-1", "log-2"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects stale rules and decays non-critical confidence", () => {
    const store = new FailureMemoryStore({ now: () => new Date("2026-01-20T00:00:00.000Z") });
    const signature = store.addSignature({
      scope: "tool",
      failure_type: "repeat_error",
      input_pattern: "tool",
      action_pattern: "tool",
      context_pattern: "{}",
      state: "active",
      severity: "low",
      confidence: 0.8,
      last_seen_at: "2026-01-01T00:00:00.000Z",
    });

    expect(store.staleRules().map((rule) => rule.id)).toContain(signature.id);
    const decayed = store.decayOldRules();
    expect(decayed[0]?.confidence).toBeLessThan(0.8);
  });
});

describe("Pre-execution failure gate", () => {
  it("enforces exact match blocks as configured", () => {
    const store = new FailureMemoryStore();
    const candidate = candidateFromCommand(toolCommand());
    store.addSignature({
      scope: candidate.scope,
      failure_type: "bad_command",
      input_pattern: candidate.input_pattern,
      action_pattern: candidate.action_pattern,
      context_pattern: candidate.context_pattern,
      state: "active",
      suppression_policy: "block",
      severity: "critical",
      confidence: 0.95,
      match_level: 0,
      notes: "never_probe_justification:test permanent exact block",
    });

    expect(store.evaluateGate(candidate).decision).toBe("block");
  });

  it("matches normalized command variants and requires approval", () => {
    const store = new FailureMemoryStore();
    const ruleCandidate = candidateFromCommand(toolCommand("cmd-a", "req-a", "file.search", {
      path: "/tmp/a/550e8400-e29b-41d4-a716-446655440000/input.txt",
    }));
    const nextCandidate = candidateFromCommand(toolCommand("cmd-b", "req-b", "file.search", {
      path: "/tmp/a/550e8400-e29b-41d4-a716-446655440001/input.txt",
    }));
    store.addSignature({
      scope: ruleCandidate.scope,
      failure_type: "wrong_file",
      input_pattern: ruleCandidate.input_pattern,
      action_pattern: ruleCandidate.action_pattern,
      context_pattern: ruleCandidate.context_pattern,
      state: "active",
      suppression_policy: "require_approval",
      severity: "high",
      confidence: 0.9,
      match_level: 1,
    });

    const result = store.evaluateGate(nextCandidate);
    expect(result.decision).toBe("require_approval");
    expect(result.matches[0]?.match_level).toBe(1);
  });

  it("never auto-blocks broad semantic matches", () => {
    const store = new FailureMemoryStore();
    store.addSignature({
      scope: "llm_output",
      failure_type: "hallucination",
      input_pattern: "invented package version and fabricated release note",
      action_pattern: "summarize dependency release",
      context_pattern: "release note summary",
      state: "active",
      suppression_policy: "block",
      severity: "critical",
      confidence: 1,
      match_level: 3,
    });

    const result = store.evaluateGate({
      scope: "llm_output",
      input_pattern: "fabricated package version in release summary",
      action_pattern: "draft release summary",
      context_pattern: "release note summary",
    });
    expect(result.decision).not.toBe("block");
    expect(["warn", "downrank"]).toContain(result.decision);
  });

  it("uses conservative defaults for boundary violations and low-confidence rules", () => {
    const store = new FailureMemoryStore();
    const boundary = store.addSignature({
      scope: "boundary",
      failure_type: "boundary_violation",
      input_pattern: "invalid inbound",
      action_pattern: "authority boundary",
      context_pattern: "{}",
      state: "active",
      severity: "critical",
      confidence: 0.95,
      match_level: 0,
      notes: "never_probe_justification:boundary safety",
    });
    const low = store.addSignature({
      scope: "tool",
      failure_type: "repeat_error",
      input_pattern: "flaky command",
      action_pattern: "flaky command",
      context_pattern: "{}",
      state: "active",
      severity: "high",
      confidence: 0.2,
      match_level: 0,
    });

    expect(store.get(boundary.id)?.suppression_policy).toBe("block");
    expect(store.get(low.id)?.suppression_policy).toBe("warn");
  });

  it("does not enforce retired rules", () => {
    const store = new FailureMemoryStore();
    const candidate = candidateFromCommand(toolCommand());
    store.addSignature({
      scope: candidate.scope,
      failure_type: "bad_command",
      input_pattern: candidate.input_pattern,
      action_pattern: candidate.action_pattern,
      context_pattern: candidate.context_pattern,
      state: "retired",
      suppression_policy: "block",
      severity: "critical",
      confidence: 1,
      match_level: 0,
    });

    expect(store.evaluateGate(candidate).decision).toBe("allow");
  });
});

describe("Failure signature extraction and periodic verifier", () => {
  it("extracts failed command results into structured signatures", () => {
    const command = toolCommand("cmd-fail");
    const signatures = extractFailureSignatures({
      kind: "command_result",
      command,
      feedback: {
        command_id: command.id,
        status: "failed",
        error: "Tool not registered: file.search",
        metrics: { duration_ms: 1 },
      },
      evidence_log_id: "evidence-1",
    });

    expect(signatures).toHaveLength(1);
    expect(signatures[0]).toMatchObject({
      failure_type: "bad_command",
      evidence_log_ids: ["evidence-1"],
    });
  });

  it("detects repeated failures, unconverted events, stale blocks, and emits a structured report", () => {
    const history = new CompleteHistoryStore();
    history.append({
      kind: "execution_history",
      request_id: "req-1",
      command_id: "cmd-1",
      payload: {
        command: { type: "tool_call", operation: "file.search" },
        status: "failed",
        error: "Tool not registered: file.search",
      },
    });
    history.append({
      kind: "execution_history",
      request_id: "req-2",
      command_id: "cmd-2",
      payload: {
        command: { type: "tool_call", operation: "file.search" },
        status: "failed",
        error: "Tool not registered: file.search",
      },
    });
    const staleStore = new FailureMemoryStore({ now: () => new Date("2026-02-10T00:00:00.000Z") });
    staleStore.addSignature({
      scope: "tool",
      failure_type: "bad_command",
      input_pattern: "old blocked command",
      action_pattern: "old blocked command",
      context_pattern: "{}",
      state: "active",
      suppression_policy: "block",
      severity: "high",
      confidence: 0.9,
      match_level: 0,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      next_revalidation_at: "2026-01-31T00:00:00.000Z",
    });

    const report = runPeriodicFailureMemoryVerification({
      entries: history.all(),
      existing_rules: staleStore.list(),
      trigger: "before_release",
      now: new Date("2026-02-10T00:00:00.000Z"),
    });

    expect(report.detected_failures.length).toBe(2);
    expect(report.repeated_failures).toHaveLength(1);
    expect(report.recommended_rules.length).toBeGreaterThan(0);
    expect(report.recommended_rules[0]?.evidence_log_ids.length).toBeGreaterThan(0);
    expect(report.stale_rules).toHaveLength(1);
    expect(report.unresolved_risks.join("\n")).toContain("failure event not converted");
  });
});

describe("Failure rule revalidation and safety boundaries", () => {
  it("revalidates sandbox block rules and preserves never-probe critical rules", () => {
    const store = new FailureMemoryStore({ now: () => new Date("2026-03-01T00:00:00.000Z") });
    const sandbox = store.addSignature({
      scope: "test",
      failure_type: "test_regression",
      input_pattern: "test fail",
      action_pattern: "pnpm test",
      context_pattern: "{}",
      state: "active",
      suppression_policy: "block",
      severity: "high",
      confidence: 0.9,
      match_level: 0,
      probe_policy: "sandbox",
      next_revalidation_at: "2026-02-28T00:00:00.000Z",
    });
    const never = store.addSignature({
      scope: "boundary",
      failure_type: "boundary_violation",
      input_pattern: "credential exfil",
      action_pattern: "external send",
      context_pattern: "{}",
      state: "active",
      suppression_policy: "block",
      severity: "critical",
      confidence: 1,
      match_level: 0,
      probe_policy: "never",
      notes: "never_probe_justification:credential boundary",
    });

    const sandboxResult = store.applyRevalidation(sandbox.id, "still_valid", "sandbox still fails");
    const neverResult = store.applyRevalidation(never.id, "still_valid", "should not probe");

    expect(sandboxResult.probed).toBe(true);
    expect(store.get(sandbox.id)?.last_validated_at).toBe("2026-03-01T00:00:00.000Z");
    expect(neverResult.probed).toBe(false);
    expect(store.get(never.id)?.state).toBe("active");
  });

  it("moves false positives to probation or retired and does not auto-retire critical rules", () => {
    const store = new FailureMemoryStore({ now: () => new Date("2026-04-20T00:00:00.000Z") });
    const falsePositive = store.addSignature({
      scope: "tool",
      failure_type: "repeat_error",
      input_pattern: "too broad",
      action_pattern: "too broad",
      context_pattern: "{}",
      state: "active",
      suppression_policy: "block",
      severity: "medium",
      confidence: 0.8,
      match_level: 0,
      probe_policy: "sandbox",
    });
    const critical = store.addSignature({
      scope: "authority",
      failure_type: "boundary_violation",
      input_pattern: "critical authority",
      action_pattern: "critical authority",
      context_pattern: "{}",
      state: "active",
      suppression_policy: "block",
      severity: "critical",
      confidence: 1,
      match_level: 0,
      last_seen_at: "2025-01-01T00:00:00.000Z",
      probe_policy: "never",
      notes: "never_probe_justification:authority safety",
    });

    const result = store.applyRevalidation(falsePositive.id, "false_positive", "matched unrelated action");
    store.decayOldRules();

    expect(result.next_state).toBe("probation");
    expect(store.get(falsePositive.id)?.suppression_policy).toBe("warn");
    expect(store.get(critical.id)?.state).toBe("active");
    expect(store.get(critical.id)?.confidence).toBe(1);
  });

  it("keeps LLM proposals non-authoritative", () => {
    const store = new FailureMemoryStore();
    const proposed = store.addLLMProposal({
      scope: "llm_output",
      failure_type: "hallucination",
      input_pattern: "summary",
      action_pattern: "summarize",
      context_pattern: "release",
      proposed_severity: "critical",
      proposed_confidence: 1,
      proposed_suppression_policy: "block",
    });

    expect(proposed.state).toBe("draft");
    expect(proposed.match_level).toBe(3);
    expect(proposed.suppression_policy).not.toBe("block");
    expect(proposed.notes).toContain("llm_proposal_non_authoritative");
  });
});

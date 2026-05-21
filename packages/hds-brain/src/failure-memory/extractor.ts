import { stableJson } from "../complete-history/codec.js";
import type {
  CompleteHistoryEntry,
} from "../complete-history/index.js";
import {
  commandActionPattern,
} from "./normalize.js";
import type {
  FailureExtractionInput,
  FailureScope,
  FailureSeverity,
  FailureSignatureInput,
  FailureType,
} from "./types.js";

export function extractFailureSignatures(input: FailureExtractionInput): FailureSignatureInput[] {
  if (input.kind === "complete_history") return extractFromCompleteHistory(input.entry);
  if (input.kind === "command_result") {
    if (input.feedback.status !== "failed") return [];
    return [signatureInput({
      scope: commandScope(input.command.type, input.command.type === "tool_call" ? input.command.payload.tool_name : undefined),
      failure_type: classifyFailure(input.feedback.error),
      action_pattern: commandActionPattern(input.command),
      result_pattern: input.feedback.error ?? "failed",
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: severityForError(input.feedback.error),
    })];
  }
  if (input.kind === "tool_result") {
    if (input.status !== "failed") return [];
    return [signatureInput({
      scope: "tool",
      failure_type: classifyFailure(input.error),
      action_pattern: input.tool_name,
      result_pattern: input.error ?? "failed",
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: severityForError(input.error),
    })];
  }
  if (input.kind === "test_result") {
    if (input.status !== "failed") return [];
    return [signatureInput({
      scope: "test",
      failure_type: "test_regression",
      action_pattern: input.test_name,
      result_pattern: input.error ?? "test_failed",
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: "high",
    })];
  }
  if (input.kind === "workflow_result") {
    if (input.status !== "failed") return [];
    return [signatureInput({
      scope: "workflow",
      failure_type: classifyFailure(input.error),
      action_pattern: input.workflow,
      result_pattern: input.error ?? "workflow_failed",
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: severityForError(input.error),
    })];
  }
  if (input.kind === "llm_output_validation") {
    if (input.ok) return [];
    return [signatureInput({
      scope: "llm_output",
      failure_type: classifyLLMFailure(input.error),
      action_pattern: input.validator,
      result_pattern: input.error ?? "llm_output_validation_failed",
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: "medium",
      match_level: 3,
    })];
  }
  if (input.kind === "authority_boundary") {
    if (!boundaryFailure(input.reason, input.decision)) return [];
    return [signatureInput({
      scope: input.reason.includes("gateway") ? "boundary" : "authority",
      failure_type: "boundary_violation",
      action_pattern: input.decision,
      result_pattern: input.reason,
      evidence_log_ids: input.evidence_log_id ? [input.evidence_log_id] : [],
      severity: "critical",
      confidence: 0.95,
      match_level: 1,
    })];
  }
  return [];
}

export function extractFromCompleteHistory(entry: CompleteHistoryEntry): FailureSignatureInput[] {
  if (entry.kind === "execution_history") {
    const payload = asRecord(entry.payload);
    if (payload.status !== "failed") return [];
    const command = asRecord(payload.command);
    const operation = stringValue(command.operation) || stringValue(command.type) || "unknown_command";
    const commandType = stringValue(command.type);
    const error = stringValue(payload.error) || "execution_failed";
    return [signatureInput({
      scope: commandScope(commandType, operation),
      failure_type: classifyFailure(error),
      action_pattern: stableJson(command),
      context_pattern: stableJson({
        actor: entry.actor,
        source: entry.source,
        request_id: entry.request_id,
      }),
      result_pattern: error,
      evidence_log_ids: [entry.id],
      severity: severityForError(error),
    })];
  }
  if (entry.kind === "hds_decision") {
    const payload = asRecord(entry.payload);
    const decision = stringValue(payload.decision);
    const reason = stringValue(payload.reason);
    if (!boundaryFailure(reason, decision) && decision !== "FAIL") return [];
    return [signatureInput({
      scope: reason.includes("boundary") ? "boundary" : "authority",
      failure_type: reason.includes("boundary") ? "boundary_violation" : "logic_drift",
      action_pattern: stableJson({
        decision,
        reason,
        command_present: payload.command !== null,
      }),
      context_pattern: stableJson({
        actor: payload.actor,
        process: payload.process,
      }),
      result_pattern: reason,
      evidence_log_ids: [entry.id],
      severity: reason.includes("boundary") ? "critical" : "high",
      confidence: reason.includes("boundary") ? 0.95 : 0.8,
      match_level: reason.includes("boundary") ? 1 : 2,
    })];
  }
  if (entry.kind === "approval_history") {
    const payload = asRecord(entry.payload);
    const event = stringValue(payload.event);
    const reason = stringValue(payload.reason);
    if (!event.includes("rejected") && !event.includes("denied") && !reason.includes("manual_correction")) return [];
    return [signatureInput({
      scope: "workflow",
      failure_type: reason.includes("manual_correction") ? "repeated_manual_correction" : classifyFailure(reason),
      action_pattern: stableJson(payload.command ?? {}),
      context_pattern: stableJson({
        actor: entry.actor,
        event,
        operation: payload.operation,
      }),
      result_pattern: reason || event,
      evidence_log_ids: [entry.id],
      severity: event.includes("denied") ? "high" : "medium",
      match_level: 1,
    })];
  }
  if (entry.kind === "final_output") {
    const payload = asRecord(entry.payload);
    const releaseDecision = stringValue(payload.release_decision);
    const reason = stringValue(payload.reason);
    if (releaseDecision !== "block" && releaseDecision !== "hold") return [];
    return [signatureInput({
      scope: "llm_output",
      failure_type: classifyLLMFailure(reason),
      action_pattern: stableJson({
        command_type: payload.command_type,
        output_kind: payload.output_kind,
      }),
      result_pattern: reason || releaseDecision,
      evidence_log_ids: [entry.id],
      severity: releaseDecision === "block" ? "high" : "medium",
      match_level: 3,
    })];
  }
  return [];
}

function signatureInput(input: {
  scope: FailureScope;
  failure_type: FailureType;
  action_pattern: string;
  result_pattern?: string;
  context_pattern?: string;
  evidence_log_ids?: readonly string[];
  severity?: FailureSeverity;
  confidence?: number;
  match_level?: FailureSignatureInput["match_level"];
}): FailureSignatureInput {
  return {
    scope: input.scope,
    failure_type: input.failure_type,
    input_pattern: input.action_pattern,
    action_pattern: input.action_pattern,
    context_pattern: input.context_pattern ?? "{}",
    result_pattern: input.result_pattern,
    evidence_log_ids: input.evidence_log_ids ?? [],
    confidence: input.confidence ?? 0.65,
    severity: input.severity ?? "medium",
    state: "shadow",
    match_level: input.match_level ?? 1,
  };
}

function commandScope(commandType: string, operation?: string): FailureScope {
  if (commandType === "llm_call") return "llm_output";
  if (commandType === "channel_send") return "workflow";
  if (operation?.startsWith("file.")) return "file";
  if (operation?.includes("test")) return "test";
  if (commandType === "tool_call") return "tool";
  return "command";
}

function classifyFailure(error: string | undefined): FailureType {
  const text = (error ?? "").toLowerCase();
  if (text.includes("boundary") || text.includes("forbidden") || text.includes("dangerous")) return "boundary_violation";
  if (text.includes("permission") || text.includes("eacces") || text.includes("denied") || text.includes("not allowed")) return "permission_error";
  if (text.includes("enoent") || text.includes("not found") || text.includes("not registered") || text.includes("bad command")) return "bad_command";
  if (text.includes("expected") || text.includes("assert") || text.includes("test failed") || text.includes("regression")) return "test_regression";
  if (text.includes("timeout") || text.includes("network") || text.includes("econn") || text.includes("environment")) return "environment_error";
  if (text.includes("wrong file") || text.includes("wrong_file")) return "wrong_file";
  if (text.includes("manual correction")) return "repeated_manual_correction";
  if (text.includes("warning")) return "unresolved_warning";
  if (text.includes("no progress")) return "no_progress";
  return "repeat_error";
}

function classifyLLMFailure(error: string | undefined): FailureType {
  const text = (error ?? "").toLowerCase();
  if (text.includes("hallucinat") || text.includes("invented")) return "hallucination";
  if (text.includes("drift")) return "logic_drift";
  return "hallucination";
}

function severityForError(error: string | undefined): FailureSeverity {
  const type = classifyFailure(error);
  if (type === "boundary_violation") return "critical";
  if (type === "permission_error" || type === "test_regression" || type === "wrong_file") return "high";
  if (type === "environment_error" || type === "bad_command") return "medium";
  return "medium";
}

function boundaryFailure(reason: string, decision: string): boolean {
  const text = `${reason} ${decision}`.toLowerCase();
  return text.includes("boundary") || text.includes("suspend") || text.includes("fail");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

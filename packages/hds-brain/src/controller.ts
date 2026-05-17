import { createHash, randomUUID } from "node:crypto";
import type {
  InboundRequest,
  ExecuteCommand,
  ExecuteFeedback,
  UpstreamDecision,
  LLMCallPayload,
} from "@blue-tanuki/protocol";
import type {
  ApprovalGateLog,
  AuthorityEventLog,
  CommandLifecycleLog,
  CommandLifecyclePhase,
  ControllerState,
  DecisionLog,
  MemoryReferenceLog,
  PolicyConfig,
  ResumeAuditTrace,
  ResumeVerdict,
  RuntimeInvariantsLog,
  ScheduleLifecycleEvent,
  ScheduleLifecycleLog,
  SuspendedRequest,
} from "./types.js";
import { frame } from "./frame.js";
import { model } from "./model.js";
import { commit } from "./commit.js";
import { AuditLog } from "./audit.js";
import { normalizeForDetection } from "./normalization.js";
import {
  DetectorRegistry,
  createDefaultDetectorRegistry,
} from "./detectors/index.js";
import { DEFAULT_POLICY } from "./policy.js";
import { routeAction } from "./action_router.js";
import type { ApprovalEvaluation } from "./approval_policy.js";
import {
  buildOutputAuditLog,
  type OutputAuditInput,
  type OutputAuditLog,
} from "./output_audit.js";
import {
  buildRuntimeInvariantEvidence,
  type RuntimeInvariantEvidenceOptions,
  type RuntimeInvariantEvidenceReport,
  type RuntimeInvariantValues,
} from "./runtime_invariants.js";
import { fReferenceForId } from "./f_reference.js";

interface LongTermMemoryPort {
  capture(log: DecisionLog): unknown;
  recent(n: number): readonly unknown[];
  all?: () => readonly unknown[];
  size?: () => number;
  verify?: () => boolean;
}

interface CapturedMemoryReference {
  request_id: string;
  f_reference?: string;
  entry_hash: string;
}

export interface HDSRuntimeSnapshot {
  state: ControllerState;
  suspended: readonly SuspendedRequest[];
  inflight: Array<{ command_id: string; request_id: string; commit_hash: string; decision: string }>;
  audit: { entries: number; chain_valid: boolean };
  memory: { configured: boolean; entries?: number; chain_valid?: boolean };
  invariants: RuntimeInvariantValues;
  runtime_invariants: RuntimeInvariantEvidenceReport;
}

/**
 * HDSUpperController — Phase 1.
 *
 * Receives inbound requests, runs F→M→C, produces commands for downstream,
 * consumes feedback, maintains audit chain, and manages the SUSPEND/RESUME
 * state machine.
 *
 * Critical invariants:
 *   1. This class NEVER calls an LLM. All LLM/tool/channel actions are
 *      emitted as commands and executed by BLUE-TANUKI core.
 *   2. RESUME is HUMAN-ONLY in Phase 1. There is no executor-feedback path
 *      that can lift a SUSPEND. This preserves the upstream containment
 *      property: a misbehaving downstream cannot escalate its own privileges.
 */
export interface ControllerOptions {
  policy?: PolicyConfig;
  detectors?: DetectorRegistry;
  audit?: AuditLog;
  memory?: LongTermMemoryPort;
  llm_route?: LLMCommandRoute;
}

export interface LLMCommandRoute {
  backend_hint?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeout_ms?: number;
}

export interface ResumeAuditOptions {
  actor?: string;
  token_kind?: ResumeAuditTrace["token_kind"];
}

function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (v: unknown): unknown => {
    if (v === undefined) return "[undefined]";
    if (typeof v === "bigint") return v.toString();
    if (typeof v !== "object" || v === null) return v;
    if (seen.has(v)) return "[circular]";
    seen.add(v);
    if (Array.isArray(v)) return v.map((item) => normalize(item));
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      out[key] = normalize((v as Record<string, unknown>)[key]);
    }
    return out;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function securityCommit(kind: string, reason: string, bind: unknown): import("./types.js").CommitResult {
  const triggered_thresholds = [`security:${kind}`];
  const hash = sha256({
    kind,
    reason,
    bind,
    decision: "FAIL",
    triggered_thresholds,
  });
  return {
    decision: "FAIL",
    reason: `${kind}:${reason}`,
    hash,
    triggered_thresholds,
  };
}

function processAuthorityViolation(f: DecisionLog["frame"]): string | null {
  const { actor, process } = f;
  if (!process.actor_policy.allowed_actor_kinds.includes(actor.actor_kind)) {
    return `actor_kind ${actor.actor_kind} not allowed for ${process.process_id}`;
  }
  if (process.actor_policy.owner_required && actor.actor_kind !== "owner") {
    return `${process.process_id} requires owner actor`;
  }
  if (process.trigger.kind === "webhook" && actor.actor_kind !== "webhook") {
    return "webhook trigger requires webhook actor";
  }
  if (process.trigger.kind === "cron" && actor.actor_kind !== "cron" && actor.actor_kind !== "system" && actor.actor_kind !== "owner") {
    return "cron trigger requires cron/system/owner actor";
  }
  return null;
}

function commandExecutionPolicyViolation(command: ExecuteCommand, process: DecisionLog["frame"]["process"]): string | null {
  const policy = process.execution_policy;
  if (!policy.allowed_command_types.includes(command.type)) {
    return `command_type ${command.type} not allowed for ${process.process_id}`;
  }

  if (command.type === "tool_call") {
    const toolName = command.payload.tool_name;
    if (!policy.allowed_tools.includes(toolName)) {
      return `tool ${toolName} not allowed for ${process.process_id}`;
    }
  }

  const allowedCaps = new Set(policy.allowed_capabilities);
  const caps = command.constraints?.allowed_capabilities ?? [];
  for (const cap of caps) {
    if (!allowedCaps.has(cap)) {
      return `capability ${cap} not allowed for ${process.process_id}`;
    }
  }

  const timeout = command.constraints?.timeout_ms;
  if (timeout !== undefined && timeout > policy.timeout_ms) {
    return `timeout_ms ${timeout} exceeds ${process.process_id} limit ${policy.timeout_ms}`;
  }

  return null;
}

function trustedChannelSendFromMetadata(meta: Record<string, unknown>): import("@blue-tanuki/protocol").ChannelSendPayload | null {
  if (meta["blue_tanuki.authority_context"] !== "gateway_internal_v1") return null;
  const channel = stringMeta(meta, "blue_tanuki.channel_send.channel");
  const target = stringMeta(meta, "blue_tanuki.channel_send.target");
  const content = stringMeta(meta, "blue_tanuki.channel_send.content");
  if (!channel || !target || !content) return null;
  return { channel, target, content };
}

function stringMeta(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export class HDSUpperController {
  private state: ControllerState = "IDLE";
  private readonly audit: AuditLog;
  private readonly policy: PolicyConfig;
  private readonly detectors: DetectorRegistry;
  private readonly memory?: LongTermMemoryPort;
  private readonly llm_route: LLMCommandRoute;

  /** Commands awaiting executor feedback (already ASSERTed). */
  private readonly inflight = new Map<string, DecisionLog>();

  /** Requests halted by SUSPEND, awaiting human verdict via resume(). */
  private readonly suspended = new Map<string, SuspendedRequest>();

  /** Cached original requests for suspended ones, so resume() can re-emit. */
  private readonly suspendedRequests = new Map<string, InboundRequest>();

  constructor(opts: ControllerOptions = {}) {
    this.policy = opts.policy ?? DEFAULT_POLICY;
    this.detectors = opts.detectors ?? createDefaultDetectorRegistry();
    this.audit = opts.audit ?? new AuditLog();
    this.memory = opts.memory;
    this.llm_route = opts.llm_route ?? {};
  }

  /**
   * Run F→M→C on an inbound request.
   *   - ASSERT       → emit command (returned in `command`)
   *   - SUSPEND      → store as suspended; no command emitted
   *   - OUT_OF_SCOPE → audit only; no command
   *   - FAIL         → audit only; no command
   */
  decide(req: InboundRequest): {
    log: DecisionLog;
    command: ExecuteCommand | null;
  } {
    const input = normalizeForDetection(req.content);
    const authorityReq: InboundRequest = {
      ...req,
      content: input.normalized_content,
    };
    const f = frame(authorityReq, {
      default_policy: this.policy,
      memory_reader: this.memory,
    });
    const m = model(authorityReq, f, this.policy, this.detectors);

    const processViolation = processAuthorityViolation(f);
    let c = processViolation
      ? securityCommit("process_authority_denied", processViolation, {
          request_id: req.id,
          actor: f.actor,
          process: f.process.process_id,
        })
      : commit(m, this.policy);

    let log: DecisionLog = {
      request_id: req.id,
      input,
      frame: f,
      model: m,
      commit: c,
      timestamp: Date.now(),
    };

    let command: ExecuteCommand | null = null;
    if (c.decision === "ASSERT") {
      const candidate = this.buildCommand(authorityReq, log);
      const commandViolation = commandExecutionPolicyViolation(candidate, f.process);
      if (commandViolation) {
        c = securityCommit("process_execution_policy_denied", commandViolation, {
          request_id: req.id,
          actor: f.actor,
          process: f.process.process_id,
          command_type: candidate.type,
          command_id: candidate.id,
          prior_commit_hash: c.hash,
        });
        log = { ...log, commit: c, timestamp: Date.now() };
      } else {
        command = candidate;
      }
    }

    this.audit.append(log);
    this.captureMemoryReference(log);

    switch (c.decision) {
      case "ASSERT": {
        if (!command) {
          throw new Error("ASSERT without command after process execution policy");
        }
        this.state = "DECIDED";
        this.inflight.set(command.id, log);
        return { log, command };
      }
      case "SUSPEND": {
        this.state = "SUSPENDED";
        this.suspended.set(req.id, {
          request_id: req.id,
          log,
          suspended_at: Date.now(),
          reason: c.reason,
        });
        this.suspendedRequests.set(req.id, authorityReq);
        return { log, command: null };
      }
      case "OUT_OF_SCOPE":
      case "FAIL": {
        this.state = "DECIDED";
        return { log, command: null };
      }
      default: {
        const neverDecision = c.decision as never;
        throw new Error(`unknown HDS decision: ${String(neverDecision)}`);
      }
    }
  }

  /**
   * Human-only RESUME. Pass the request_id of a suspended request and a
   * verdict. Returns:
   *   - log     : a fresh DecisionLog entry recording the human verdict
   *   - command : the lifted ExecuteCommand if verdict==="approve", else null
   *   - request : the originating InboundRequest. Returned for ALL verdicts
   *               so callers (e.g. gateway serve.ts) can route resume-driven
   *               outputs back to the originating channel/user without
   *               having to maintain a parallel cache of suspended requests.
   *
   * Audit gets a fresh entry recording the human verdict for traceability.
   */
  resume(request_id: string, verdict: ResumeVerdict, opts: ResumeAuditOptions = {}): {
    log: DecisionLog;
    command: ExecuteCommand | null;
    request: InboundRequest;
  } {
    const susp = this.suspended.get(request_id);
    const req = this.suspendedRequests.get(request_id);
    if (!susp || !req) {
      throw new Error(`resume: no suspended request with id=${request_id}`);
    }

    this.state = "AWAITING_RESUME";

    // Map verdict → effective decision for the resume audit entry.
    const lifted: "ASSERT" | "FAIL" | "OUT_OF_SCOPE" =
      verdict === "approve"
        ? "ASSERT"
        : verdict === "reject"
        ? "FAIL"
        : "OUT_OF_SCOPE";

    const now = Date.now();
    const actor = opts.actor?.trim() || "unknown";
    const token_kind = opts.token_kind ?? "resume";
    const resumeHash = sha256({
      kind: "human_resume",
      previous_commit_hash: susp.log.commit.hash,
      request_id: susp.request_id,
      verdict,
      actor,
      token_kind,
      effective_decision: lifted,
      suspended_reason: susp.reason,
      timestamp: now,
    });

    const resumeLog: DecisionLog = {
      request_id: susp.request_id,
      input: susp.log.input,
      resume: {
        verdict,
        actor,
        token_kind,
      },
      frame: susp.log.frame,
      model: susp.log.model,
      commit: {
        decision: lifted,
        reason: `human_resume:${verdict} (was SUSPEND: ${susp.reason})`,
        hash: resumeHash,
        triggered_thresholds: [...susp.log.commit.triggered_thresholds, `human_resume:${verdict}`],
      },
      timestamp: now,
    };
    this.audit.append(resumeLog);
    if (verdict === "approve") {
      this.captureMemoryReference(resumeLog);
    }

    this.suspended.delete(request_id);
    this.suspendedRequests.delete(request_id);
    this.state = "DECIDED";

    if (verdict === "approve") {
      const command = this.buildCommand(req, resumeLog);
      this.inflight.set(command.id, resumeLog);
      return { log: resumeLog, command, request: req };
    }
    return { log: resumeLog, command: null, request: req };
  }

  /** Record approval gate evaluation after HDS ASSERT and before executor execution. */
  onApprovalEvaluation(evaluation: ApprovalEvaluation, opts: { request_id?: string | null } = {}): void {
    const request_id = opts.request_id ?? this.inflight.get(evaluation.context.command_id)?.request_id ?? null;
    const approvalLog: ApprovalGateLog = {
      kind: "approval_gate",
      request_id,
      command_id: evaluation.context.command_id,
      upstream_commit_hash: evaluation.context.upstream_commit_hash,
      evaluation,
      timestamp: Date.now(),
    };
    this.audit.append(approvalLog);
    this.onAuthorityEvent(
      evaluation.decision === "allow"
        ? "approval_allowed"
        : evaluation.decision === "deny"
        ? "approval_denied"
        : "approval_asked",
      {
        request_id,
        command_id: evaluation.context.command_id,
        actor: evaluation.context.actor,
        reason: evaluation.reason,
        evaluation,
        grant_id: evaluation.matched_grant_id,
      },
    );
  }

  /** Append an explicit authority-ledger event into the same audit hash-chain. */
  onAuthorityEvent(
    event: AuthorityEventLog["event"],
    opts: {
      request_id?: string | null;
      command_id?: string;
      grant_id?: string;
      actor?: string;
      reason?: string;
      evaluation?: ApprovalEvaluation;
    } = {},
  ): void {
    const log: AuthorityEventLog = {
      kind: "authority_event",
      event,
      request_id: opts.request_id ?? null,
      command_id: opts.command_id,
      grant_id: opts.grant_id,
      actor: opts.actor?.trim() || "system",
      reason: opts.reason ?? event,
      operation: opts.evaluation?.context.operation,
      target_scope: opts.evaluation?.context.target_scope,
      risk: opts.evaluation?.risk,
      authority_trace: opts.evaluation?.authority_trace,
      timestamp: Date.now(),
    };
    this.audit.append(log);
  }

  /** Record pre-executor command lifecycle events without pretending executor ran. */
  onCommandLifecycle(command_id: string, phase: CommandLifecyclePhase, opts: { actor?: string; reason?: string } = {}): void {
    const sourceLog = this.inflight.get(command_id);
    const lifecycleLog: CommandLifecycleLog = {
      kind: "command_lifecycle",
      phase,
      request_id: sourceLog?.request_id ?? null,
      command_id,
      upstream_commit_hash: sourceLog?.commit.hash ?? null,
      upstream_decision: sourceLog?.commit.decision ?? null,
      actor: opts.actor?.trim() || "system",
      reason: opts.reason ?? phase,
      timestamp: Date.now(),
    };
    this.audit.append(lifecycleLog);
    if (phase === "approval_rejected" || phase === "approval_cancelled") this.inflight.delete(command_id);
  }

  /** Record runtime schedule lifecycle without feeding it back into authority. */
  onScheduleLifecycle(
    event: ScheduleLifecycleEvent,
    opts: Omit<ScheduleLifecycleLog, "kind" | "event" | "timestamp">,
  ): void {
    const log: ScheduleLifecycleLog = {
      kind: "schedule_lifecycle",
      event,
      ...opts,
      timestamp: Date.now(),
    };
    this.audit.append(log);
  }

  private captureMemoryReference(log: DecisionLog): void {
    const captured = this.memory?.capture(log);
    if (!isCapturedMemoryReference(captured)) return;
    const referenceLog: MemoryReferenceLog = {
      kind: "memory_reference",
      event: "memory.write",
      request_id: log.request_id,
      memory_id: captured.request_id,
      f_reference: captured.f_reference ?? fReferenceForId(captured.request_id),
      entry_hash: captured.entry_hash,
      source: "hds_ltm",
      used_for_authority: false,
      reason: "hds_ltm_capture",
      summary: {
        goal: log.frame.goal,
        problem_definition_id: log.frame.problem_definition_id,
        abstraction: log.model.abstraction,
      },
      timestamp: Date.now(),
    };
    this.audit.append(referenceLog);
  }

  /**
   * Consume executor feedback for an in-flight (already ASSERTed) command.
   * Phase 1: feedback is recorded but cannot transition state away from a
   * SUSPENDED entry — that boundary is enforced by design.
   */
  onFeedback(fb: ExecuteFeedback): void {
    const sourceLog = this.inflight.get(fb.command_id);
    const feedbackLog = {
      kind: "executor_feedback" as const,
      request_id: sourceLog?.request_id ?? null,
      command_id: fb.command_id,
      upstream_commit_hash: sourceLog?.commit.hash ?? null,
      upstream_decision: sourceLog?.commit.decision ?? null,
      known_command: sourceLog !== undefined,
      feedback: {
        status: fb.status,
        result_present: fb.result !== undefined,
        result_digest: fb.result === undefined ? undefined : sha256(fb.result),
        error: fb.error,
        metrics: fb.metrics,
      },
      timestamp: Date.now(),
    };
    this.audit.append(feedbackLog);

    if (sourceLog) {
      this.inflight.delete(fb.command_id);
    }
  }

  /** Record result/output release before a user-visible or external handoff. */
  onOutputAudit(input: Omit<OutputAuditInput, "request_id"> & { request_id?: string | null }): OutputAuditLog {
    const sourceLog = this.inflight.get(input.command.id);
    const log = buildOutputAuditLog({
      ...input,
      request_id: input.request_id ?? sourceLog?.request_id ?? null,
    });
    this.audit.append(log);
    return log;
  }

  /** Build and append runtime invariant evidence into the HDS audit chain. */
  onRuntimeInvariantsEvidence(opts: {
    request_id?: string | null;
    reason?: string;
    report?: RuntimeInvariantEvidenceReport;
    evidence_options?: RuntimeInvariantEvidenceOptions;
    timestamp?: number;
  } = {}): RuntimeInvariantsLog {
    const report = opts.report ?? buildRuntimeInvariantEvidence(opts.evidence_options);
    const log: RuntimeInvariantsLog = {
      kind: "runtime_invariants",
      request_id: opts.request_id ?? null,
      event: "runtime_invariants.evidence",
      all_ok: report.all_ok,
      report_digest: report.report_digest,
      evidence_count: report.evidence.length,
      values: report.values,
      report,
      used_for_authority: false,
      reason: opts.reason ?? "runtime_invariants_evidence",
      timestamp: opts.timestamp ?? Date.now(),
    };
    this.audit.append(log);
    return log;
  }

  getState(): ControllerState {
    return this.state;
  }

  getAudit(): AuditLog {
    return this.audit;
  }

  /**
   * List currently suspended requests for human review.
   */
  listSuspended(): readonly SuspendedRequest[] {
    return Array.from(this.suspended.values());
  }

  getRuntimeSnapshot(opts: { runtime_invariants?: RuntimeInvariantEvidenceReport } = {}): HDSRuntimeSnapshot {
    const runtime_invariants = opts.runtime_invariants ?? buildRuntimeInvariantEvidence();
    return {
      state: this.state,
      suspended: this.listSuspended(),
      inflight: Array.from(this.inflight.entries()).map(([command_id, log]) => ({
        command_id,
        request_id: log.request_id,
        commit_hash: log.commit.hash,
        decision: log.commit.decision,
      })),
      audit: {
        entries: this.audit.size(),
        chain_valid: this.audit.verify(),
      },
      memory: {
        configured: this.memory !== undefined,
        entries: this.memory?.size?.(),
        chain_valid: this.memory?.verify?.(),
      },
      invariants: runtime_invariants.values,
      runtime_invariants,
    };
  }

  private buildCommand(req: InboundRequest, log: DecisionLog): ExecuteCommand {
    const upstream_decision: UpstreamDecision = {
      frame_goal: log.frame.goal,
      model_abstraction: log.model.abstraction,
      commit_hash: log.commit.hash,
      commit_decision: log.commit.decision,
    };

    // S7 action routing: explicit safe tool requests may become tool_call.
    // Unknown explicit tool requests become noop instead of being passed to
    // the LLM as ordinary text.
    const action = routeAction(req);
    if (action?.type === "tool_call") {
      return {
        id: randomUUID(),
        type: "tool_call",
        payload: {
          tool_name: action.tool_name,
          arguments: action.arguments,
        },
        constraints: {
          allowed_tools: [action.tool_name],
          allowed_capabilities: action.allowed_capabilities,
          timeout_ms: action.timeout_ms,
        },
        upstream_decision,
      };
    }
    if (action?.type === "noop") {
      return {
        id: randomUUID(),
        type: "noop",
        payload: { reason: action.reason },
        upstream_decision,
      };
    }

    const scheduledSend = trustedChannelSendFromMetadata(req.metadata ?? {});
    if (scheduledSend) {
      return {
        id: randomUUID(),
        type: "channel_send",
        payload: scheduledSend,
        constraints: {
          allowed_capabilities: ["channel:send"],
          timeout_ms: Math.min(this.llm_route.timeout_ms ?? 30_000, 30_000),
        },
        upstream_decision,
      };
    }

    // Default routing: emit llm_call with the request content.
    //
    // session_id (Phase 4-S2): set to `${channel}:${user}` so the
    // executor's SessionStore can scope history retrieval and append.
    // HDS-BRAIN itself does NOT read the history — judgement is always
    // on the latest inbound request only. The session_id is upstream's
    // declaration of WHERE the executor should persist, not a signal
    // that HDS-BRAIN is consuming past context.
    const llmPayload: LLMCallPayload = {
      messages: [{ role: "user", content: req.content }],
      session_id: `${req.channel}:${req.user}`,
      backend_hint: this.llm_route.backend_hint,
      model: this.llm_route.model,
      temperature: this.llm_route.temperature,
    };

    const max_tokens = this.llm_route.max_tokens ?? 1024;
    const timeout_ms = this.llm_route.timeout_ms ?? 30_000;

    return {
      id: randomUUID(),
      type: "llm_call",
      payload: llmPayload,
      constraints: { max_tokens, timeout_ms },
      upstream_decision,
    };
  }
}

function isCapturedMemoryReference(value: unknown): value is CapturedMemoryReference {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Partial<CapturedMemoryReference>).request_id === "string" &&
    typeof (value as Partial<CapturedMemoryReference>).entry_hash === "string"
  );
}

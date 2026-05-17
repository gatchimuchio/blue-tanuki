import { createHash } from "node:crypto";
import { FINAL_REVIEW_OPERATIONS, type ApprovalOperation } from "./approval_policy.js";

export const RUNTIME_INVARIANTS_SCHEMA_VERSION = "phase12-s3-runtime-invariants-v1";

export type RuntimeInvariantKey =
  | "hds_calls_llm"
  | "process_policy_enforced"
  | "external_metadata_can_escalate_authority"
  | "memory_used_for_authority"
  | "complete_history_used_for_authority"
  | "final_review_boundary_enforced_by_approval_gate";

export interface RuntimeInvariantValues {
  hds_calls_llm: boolean;
  process_policy_enforced: boolean;
  external_metadata_can_escalate_authority: boolean;
  memory_used_for_authority: boolean;
  complete_history_used_for_authority: boolean;
  final_review_boundary_enforced_by_approval_gate: boolean;
}

export type RuntimeInvariantExpectedValues = {
  hds_calls_llm: false;
  process_policy_enforced: true;
  external_metadata_can_escalate_authority: false;
  memory_used_for_authority: false;
  complete_history_used_for_authority: false;
  final_review_boundary_enforced_by_approval_gate: true;
};

export const EXPECTED_RUNTIME_INVARIANTS: RuntimeInvariantExpectedValues = {
  hds_calls_llm: false,
  process_policy_enforced: true,
  external_metadata_can_escalate_authority: false,
  memory_used_for_authority: false,
  complete_history_used_for_authority: false,
  final_review_boundary_enforced_by_approval_gate: true,
};

export type RuntimeInvariantGuarantee = "structural" | "runtime";

export interface RuntimeInvariantEvidenceItem {
  key: RuntimeInvariantKey;
  expected: boolean;
  actual: boolean;
  ok: boolean;
  guarantee: RuntimeInvariantGuarantee;
  evidence: string[];
  metadata?: Record<string, unknown>;
  used_for_authority: false;
}

export interface RuntimeInvariantEvidenceReport {
  schema_version: typeof RUNTIME_INVARIANTS_SCHEMA_VERSION;
  generated_at_ms: number;
  values: RuntimeInvariantValues;
  all_ok: boolean;
  evidence: RuntimeInvariantEvidenceItem[];
  report_digest: string;
  runtime_invariants_used_for_authority: false;
}

export interface RuntimeInvariantEvidenceOptions {
  generated_at_ms?: number;
  actuals?: Partial<Record<RuntimeInvariantKey, boolean>>;
}

const REQUIRED_FINAL_REVIEW_OPERATIONS: ApprovalOperation[] = [
  "tool.call",
  "tool.file.delete",
  "tool.shell.exec",
  "external.send",
  "credential.access",
  "settings.write",
  "schedule.create",
  "schedule.update",
  "schedule.delete",
  "browser.automation",
  "github.write",
  "google.write",
  "payment.charge",
  "unknown",
];

export function buildRuntimeInvariantEvidence(
  opts: RuntimeInvariantEvidenceOptions = {},
): RuntimeInvariantEvidenceReport {
  const actuals = opts.actuals ?? {};
  const finalReviewBoundaryPresent = REQUIRED_FINAL_REVIEW_OPERATIONS.every((operation) =>
    FINAL_REVIEW_OPERATIONS.has(operation),
  );
  const values: RuntimeInvariantValues = {
    hds_calls_llm: actuals.hds_calls_llm ?? EXPECTED_RUNTIME_INVARIANTS.hds_calls_llm,
    process_policy_enforced: actuals.process_policy_enforced ?? EXPECTED_RUNTIME_INVARIANTS.process_policy_enforced,
    external_metadata_can_escalate_authority:
      actuals.external_metadata_can_escalate_authority ??
      EXPECTED_RUNTIME_INVARIANTS.external_metadata_can_escalate_authority,
    memory_used_for_authority:
      actuals.memory_used_for_authority ?? EXPECTED_RUNTIME_INVARIANTS.memory_used_for_authority,
    complete_history_used_for_authority:
      actuals.complete_history_used_for_authority ??
      EXPECTED_RUNTIME_INVARIANTS.complete_history_used_for_authority,
    final_review_boundary_enforced_by_approval_gate:
      actuals.final_review_boundary_enforced_by_approval_gate ?? finalReviewBoundaryPresent,
  };
  const evidence: RuntimeInvariantEvidenceItem[] = [
    item("hds_calls_llm", values.hds_calls_llm, "structural", [
      "packages/hds-brain emits llm_call command envelopes but has no LLM backend dependency.",
      "runtime_invariants.test scans HDS-BRAIN imports for downstream LLM/core clients.",
    ]),
    item("process_policy_enforced", values.process_policy_enforced, "runtime", [
      "HDSUpperController checks process authority before commit and command execution policy before command emission.",
      "controller and policy tests cover denied actor/process/tool capability paths.",
    ]),
    item("external_metadata_can_escalate_authority", values.external_metadata_can_escalate_authority, "runtime", [
      "External channel metadata cannot override actor/process authority unless gateway-owned internal metadata is present.",
      "boundary_policy tests cover external metadata conflict as non-auto-allow material.",
    ]),
    item("memory_used_for_authority", values.memory_used_for_authority, "structural", [
      "MemoryTrace.used_for_authority is a literal false field.",
      "Long-term memory and F-reference hits are context/audit material only.",
    ]),
    item("complete_history_used_for_authority", values.complete_history_used_for_authority, "structural", [
      "CompleteHistoryStore entries and exports carry non-authority flags.",
      "Complete history is append/verify/replay/export substrate, not an approval or policy source.",
    ]),
    item("final_review_boundary_enforced_by_approval_gate", values.final_review_boundary_enforced_by_approval_gate, "runtime", [
      "FINAL_REVIEW_OPERATIONS is evaluated by Approval Gate before executor execution.",
      "full_access and reusable grants do not bypass L3 final-review operations.",
    ], {
      required_final_review_operations: REQUIRED_FINAL_REVIEW_OPERATIONS,
      configured_final_review_operations: Array.from(FINAL_REVIEW_OPERATIONS).sort(),
    }),
  ];
  const all_ok = evidence.every((entry) => entry.ok);
  const digestInput: Omit<RuntimeInvariantEvidenceReport, "report_digest"> = {
    schema_version: RUNTIME_INVARIANTS_SCHEMA_VERSION,
    generated_at_ms: opts.generated_at_ms ?? Date.now(),
    values,
    all_ok,
    evidence,
    runtime_invariants_used_for_authority: false,
  };
  return {
    ...digestInput,
    report_digest: sha256Hex(digestInput),
  };
}

export function runtimeInvariantValuesOk(values: RuntimeInvariantValues): boolean {
  return (
    values.hds_calls_llm === EXPECTED_RUNTIME_INVARIANTS.hds_calls_llm &&
    values.process_policy_enforced === EXPECTED_RUNTIME_INVARIANTS.process_policy_enforced &&
    values.external_metadata_can_escalate_authority ===
      EXPECTED_RUNTIME_INVARIANTS.external_metadata_can_escalate_authority &&
    values.memory_used_for_authority === EXPECTED_RUNTIME_INVARIANTS.memory_used_for_authority &&
    values.complete_history_used_for_authority ===
      EXPECTED_RUNTIME_INVARIANTS.complete_history_used_for_authority &&
    values.final_review_boundary_enforced_by_approval_gate ===
      EXPECTED_RUNTIME_INVARIANTS.final_review_boundary_enforced_by_approval_gate
  );
}

export function runtimeInvariantReportOk(report: RuntimeInvariantEvidenceReport): boolean {
  return (
    report.schema_version === RUNTIME_INVARIANTS_SCHEMA_VERSION &&
    report.runtime_invariants_used_for_authority === false &&
    report.all_ok === true &&
    report.report_digest === runtimeInvariantReportDigest(report) &&
    runtimeInvariantValuesOk(report.values) &&
    report.evidence.every((entry) => entry.ok && entry.used_for_authority === false)
  );
}

export function runtimeInvariantReportDigest(report: RuntimeInvariantEvidenceReport): string {
  const { report_digest: _reportDigest, ...digestInput } = report;
  return sha256Hex(digestInput);
}

function item(
  key: RuntimeInvariantKey,
  actual: boolean,
  guarantee: RuntimeInvariantGuarantee,
  evidence: string[],
  metadata?: Record<string, unknown>,
): RuntimeInvariantEvidenceItem {
  const expected = EXPECTED_RUNTIME_INVARIANTS[key];
  const entry: RuntimeInvariantEvidenceItem = {
    key,
    expected,
    actual,
    ok: actual === expected,
    guarantee,
    evidence,
    used_for_authority: false,
  };
  if (metadata !== undefined) {
    entry.metadata = metadata;
  }
  return entry;
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

function sha256Hex(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

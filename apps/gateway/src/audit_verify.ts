import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AuditEntry } from "@blue-tanuki/hds-brain";
import { AUDIT_FILENAME } from "./audit_config.js";

export type AuditVerifyStatus = "ok" | "empty" | "broken" | "setup_error";

export interface AuditVerifyFailure {
  index: number;
  reason:
    | "invalid_json"
    | "invalid_entry_shape"
    | "index_mismatch"
    | "prev_hash_mismatch"
    | "entry_hash_mismatch";
  detail: string;
  expected?: string | number;
  actual?: string | number;
}

export interface AuditVerifyReport {
  status: AuditVerifyStatus;
  exit_code: 0 | 1 | 2;
  filepath: string | null;
  entry_count: number;
  chain_valid: boolean;
  failure: AuditVerifyFailure | null;
  detail: string;
  timestamp: string;
}

export interface AuditVerifyOptions {
  env?: NodeJS.ProcessEnv;
}

interface AuditEntryShape {
  index: unknown;
  log: unknown;
  prev_hash: unknown;
  entry_hash: unknown;
}

export function runAuditVerify(opts: AuditVerifyOptions = {}): AuditVerifyReport {
  const env = opts.env ?? process.env;
  const dir = env.BLUE_TANUKI_AUDIT_DIR;
  const timestamp = new Date().toISOString();

  if (!dir) {
    return {
      status: "setup_error",
      exit_code: 2,
      filepath: null,
      entry_count: 0,
      chain_valid: false,
      failure: null,
      detail: "BLUE_TANUKI_AUDIT_DIR is unset; nothing to verify",
      timestamp,
    };
  }

  const filepath = path.join(path.resolve(dir), AUDIT_FILENAME);
  if (!existsSync(filepath)) {
    return {
      status: "empty",
      exit_code: 0,
      filepath,
      entry_count: 0,
      chain_valid: true,
      failure: null,
      detail: `no audit file at '${filepath}' (chain has not been written yet)`,
      timestamp,
    };
  }

  const lines = readFileSync(filepath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  let prevHash = "GENESIS";

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      return broken(filepath, lineIndex, lines.length, timestamp, {
        index: lineIndex,
        reason: "invalid_json",
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    const entry = parsed as AuditEntryShape;
    if (!isAuditEntryShape(entry)) {
      return broken(filepath, lineIndex, lines.length, timestamp, {
        index: lineIndex,
        reason: "invalid_entry_shape",
        detail: "entry must contain numeric index, string prev_hash, string entry_hash, and log",
      });
    }

    const expectedIndex = lineIndex;
    if (entry.index !== expectedIndex) {
      return broken(filepath, lineIndex, lines.length, timestamp, {
        index: lineIndex,
        reason: "index_mismatch",
        detail: "entry index does not match JSONL order",
        expected: expectedIndex,
        actual: entry.index,
      });
    }

    if (entry.prev_hash !== prevHash) {
      return broken(filepath, lineIndex, lines.length, timestamp, {
        index: entry.index,
        reason: "prev_hash_mismatch",
        detail: "entry prev_hash does not match previous entry_hash",
        expected: prevHash,
        actual: entry.prev_hash,
      });
    }

    const expectedHash = computeAuditEntryHash(entry as AuditEntry);
    if (entry.entry_hash !== expectedHash) {
      return broken(filepath, lineIndex, lines.length, timestamp, {
        index: entry.index,
        reason: "entry_hash_mismatch",
        detail: "entry_hash does not match SHA-256(index|prev_hash|JSON.stringify(log))",
        expected: expectedHash,
        actual: entry.entry_hash,
      });
    }

    prevHash = entry.entry_hash;
  }

  return {
    status: lines.length === 0 ? "empty" : "ok",
    exit_code: 0,
    filepath,
    entry_count: lines.length,
    chain_valid: true,
    failure: null,
    detail:
      lines.length === 0
        ? "audit file is empty"
        : `verified ${lines.length} entries; chain integrity OK`,
    timestamp,
  };
}

export function formatAuditVerifyTextReport(report: AuditVerifyReport): string {
  const status =
    report.status === "ok"
      ? "OK"
      : report.status === "empty"
      ? "EMPTY"
      : report.status === "broken"
      ? "BROKEN"
      : "SETUP-ERROR";
  const lines = [
    `blue-tanuki audit-verify - ${status} (${report.timestamp})`,
    `  filepath:    ${report.filepath ?? "(none)"}`,
    `  entries:     ${report.entry_count}`,
    `  chain_valid: ${report.chain_valid}`,
    `  detail:      ${report.detail}`,
  ];
  if (report.failure) {
    lines.push(
      `  failure:     index=${report.failure.index} reason=${report.failure.reason}`,
    );
    if (report.failure.expected !== undefined || report.failure.actual !== undefined) {
      lines.push(`  expected:    ${String(report.failure.expected)}`);
      lines.push(`  actual:      ${String(report.failure.actual)}`);
    }
  }
  lines.push("");
  lines.push(`Exit code: ${report.exit_code}`);
  return lines.join(os.EOL);
}

export function formatAuditVerifyJsonReport(report: AuditVerifyReport): string {
  return JSON.stringify(report, null, 2);
}

function computeAuditEntryHash(entry: AuditEntry): string {
  return createHash("sha256")
    .update(`${entry.index}|${entry.prev_hash}|${JSON.stringify(entry.log)}`)
    .digest("hex");
}

function isAuditEntryShape(entry: AuditEntryShape): entry is AuditEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.index === "number" &&
    "log" in entry &&
    typeof entry.prev_hash === "string" &&
    typeof entry.entry_hash === "string"
  );
}

function broken(
  filepath: string,
  loadedEntries: number,
  lineCount: number,
  timestamp: string,
  failure: AuditVerifyFailure,
): AuditVerifyReport {
  return {
    status: "broken",
    exit_code: 1,
    filepath,
    entry_count: Math.min(loadedEntries, lineCount),
    chain_valid: false,
    failure,
    detail: `chain verification failed at entry index ${failure.index}: ${failure.detail}`,
    timestamp,
  };
}

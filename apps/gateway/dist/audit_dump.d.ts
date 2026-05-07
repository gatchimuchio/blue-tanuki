import { type AuditEntry } from "@blue-tanuki/hds-brain";
/**
 * audit-dump — read the persisted hash-chain from disk, verify it, and emit
 * either a human-readable text report or a JSON dump of the chain.
 *
 * Design goals:
 *   - Read-only. NEVER appends, mutates, or rotates the file.
 *   - Deterministic exit code mapping:
 *       0 = chain valid (or empty: no file → emits 'empty' status, exit 0)
 *       1 = chain broken (load-time verification failed)
 *       2 = setup error (BLUE_TANUKI_AUDIT_DIR unset)
 *   - Two output formats: human-readable (default) and JSON (--json).
 *
 * What we deliberately do NOT do:
 *   - We don't accept arbitrary file paths via flag. Source of truth is
 *     BLUE_TANUKI_AUDIT_DIR + AUDIT_FILENAME, matching the gateway runtime.
 *     Letting `--audit-dump --file=/somewhere/else` would invite divergent
 *     ad-hoc audit corpora that drift from the live chain.
 *   - We don't print full DecisionLog content by default. The text view shows
 *     a one-line-per-entry summary (index, decision, hash prefix, request_id).
 *     Use --json for the full structured dump.
 */
export type AuditDumpStatus = "ok" | "empty" | "broken" | "setup_error";
export interface AuditDumpReport {
    status: AuditDumpStatus;
    exit_code: 0 | 1 | 2;
    /** Resolved file path inspected. May be null when setup_error. */
    filepath: string | null;
    /** Number of entries successfully loaded. 0 when empty/broken/setup_error. */
    entry_count: number;
    /** Whether the loaded chain verified end-to-end. False when broken. */
    chain_valid: boolean;
    /** Human-readable detail (single line). */
    detail: string;
    /** Full chain entries. Empty when status !== "ok". */
    entries: AuditEntry[];
    /** ISO-8601 UTC timestamp of dump generation. */
    timestamp: string;
}
export interface AuditDumpOptions {
    /** Override env source. Defaults to process.env. */
    env?: NodeJS.ProcessEnv;
}
/**
 * Run the audit-dump procedure. Pure: no I/O beyond reading the audit file.
 */
export declare function runAuditDump(opts?: AuditDumpOptions): AuditDumpReport;
/** Render the report as a one-line-per-entry text view. */
export declare function formatAuditTextReport(report: AuditDumpReport): string;
/** Render the report as JSON with full chain data. */
export declare function formatAuditJsonReport(report: AuditDumpReport): string;
//# sourceMappingURL=audit_dump.d.ts.map
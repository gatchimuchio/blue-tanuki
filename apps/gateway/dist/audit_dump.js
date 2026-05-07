import { existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { AuditLog } from "@blue-tanuki/hds-brain";
import { AUDIT_FILENAME } from "./audit_config.js";
/**
 * Run the audit-dump procedure. Pure: no I/O beyond reading the audit file.
 */
export function runAuditDump(opts = {}) {
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
            detail: "BLUE_TANUKI_AUDIT_DIR is unset; nothing to dump",
            entries: [],
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
            detail: `no audit file at '${filepath}' (chain has not been written yet)`,
            entries: [],
            timestamp,
        };
    }
    // Constructing AuditLog with filepath triggers loadFromFile() which
    // throws on broken chain. We catch and surface as a structured report
    // rather than letting the CLI crash unhandled.
    try {
        const log = new AuditLog({ filepath });
        const entries = log.list();
        const valid = log.verify();
        return {
            status: valid ? "ok" : "broken",
            exit_code: valid ? 0 : 1,
            filepath,
            entry_count: entries.length,
            chain_valid: valid,
            detail: valid
                ? `loaded ${entries.length} entries; chain verified`
                : `loaded ${entries.length} entries; chain DOES NOT verify`,
            entries: [...entries],
            timestamp,
        };
    }
    catch (e) {
        return {
            status: "broken",
            exit_code: 1,
            filepath,
            entry_count: 0,
            chain_valid: false,
            detail: `chain load failed: ${e.message}`,
            entries: [],
            timestamp,
        };
    }
}
/** Render the report as a one-line-per-entry text view. */
export function formatAuditTextReport(report) {
    const lines = [];
    const status = report.status === "ok"
        ? "OK"
        : report.status === "empty"
            ? "EMPTY"
            : report.status === "broken"
                ? "BROKEN"
                : "SETUP-ERROR";
    lines.push(`blue-tanuki audit-dump — ${status} (${report.timestamp})`);
    lines.push(`  filepath:    ${report.filepath ?? "(none)"}`);
    lines.push(`  entries:     ${report.entry_count}`);
    lines.push(`  chain_valid: ${report.chain_valid}`);
    lines.push(`  detail:      ${report.detail}`);
    if (report.entries.length > 0) {
        lines.push("");
        lines.push("entries:");
        for (const e of report.entries) {
            const hashShort = e.entry_hash.slice(0, 12);
            if ("commit" in e.log) {
                const reqId = e.log.request_id;
                const dec = e.log.commit.decision;
                lines.push(`  [${String(e.index).padStart(4, "0")}] ${dec.padEnd(18)} ${hashShort}… request_id=${reqId}`);
            }
            else if (e.log.kind === "executor_feedback") {
                const status = `FEEDBACK:${e.log.feedback.status}`;
                const reqId = e.log.request_id ?? "(unknown)";
                const known = e.log.known_command ? "known" : "unknown";
                lines.push(`  [${String(e.index).padStart(4, "0")}] ${status.padEnd(18)} ${hashShort}… request_id=${reqId} command_id=${e.log.command_id} ${known}`);
            }
            else if (e.log.kind === "approval_gate") {
                const ev = e.log.evaluation;
                const status = `APPROVAL:${ev.decision}`;
                const reqId = e.log.request_id ?? "(unknown)";
                lines.push(`  [${String(e.index).padStart(4, "0")}] ${status.padEnd(18)} ${hashShort}… request_id=${reqId} command_id=${e.log.command_id} op=${ev.context.operation} risk=${ev.risk} authority=${ev.authority_trace.black_box_boundary}`);
            }
            else if (e.log.kind === "authority_event") {
                const status = `AUTH:${e.log.event}`;
                const reqId = e.log.request_id ?? "(unknown)";
                lines.push(`  [${String(e.index).padStart(4, "0")}] ${status.padEnd(18)} ${hashShort}… request_id=${reqId} command_id=${e.log.command_id ?? "(none)"} grant_id=${e.log.grant_id ?? "(none)"} actor=${e.log.actor}`);
            }
            else if (e.log.kind === "command_lifecycle") {
                const status = `COMMAND:${e.log.phase}`;
                const reqId = e.log.request_id ?? "(unknown)";
                lines.push(`  [${String(e.index).padStart(4, "0")}] ${status.padEnd(18)} ${hashShort}… request_id=${reqId} command_id=${e.log.command_id} actor=${e.log.actor}`);
            }
        }
    }
    lines.push("");
    lines.push(`Exit code: ${report.exit_code}`);
    return lines.join(os.EOL);
}
/** Render the report as JSON with full chain data. */
export function formatAuditJsonReport(report) {
    return JSON.stringify(report, null, 2);
}
//# sourceMappingURL=audit_dump.js.map
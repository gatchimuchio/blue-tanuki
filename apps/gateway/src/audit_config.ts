import * as fs from "node:fs";
import * as path from "node:path";
import { AuditLog } from "@blue-tanuki/hds-brain";

/**
 * Audit configuration — extracted from main.ts so that test code can
 * import AUDIT_FILENAME / buildAuditLog without triggering the top-level
 * `main()` invocation in main.ts.
 *
 * The single-filename + single-directory contract is documented here as the
 * boundary between the runtime (gateway) and the on-disk format. Anyone
 * else (e.g. the audit-dump CLI) that needs to find the same file must
 * import from this module so the location stays in lock-step.
 */

/**
 * Filename used inside BLUE_TANUKI_AUDIT_DIR. A single, append-only file
 * keeps the hash-chain continuous across restarts: `loadFromFile()` rebuilds
 * the in-memory chain from this file and verifies it on startup. Operators
 * who want rotation should stop the gateway and `mv audit.jsonl audit-N.jsonl`
 * out-of-band; from the chain's perspective each file is a self-contained
 * log starting at GENESIS.
 */
export const AUDIT_FILENAME = "audit.jsonl";

/**
 * Build the AuditLog from env. Default is in-memory only; set
 * BLUE_TANUKI_AUDIT_DIR to enable JSONL persistence with hash-chain
 * continuity across restarts.
 *
 * Behavior:
 *   - unset                  → in-memory only (existing default, no I/O).
 *   - set, dir absent        → mkdir -p the dir; first append() creates the file.
 *   - set, file exists       → load chain, verify, throw on broken chain.
 *
 * Failure mode is deliberately loud: if a previously-persisted chain is
 * tampered with on disk, the gateway must NOT start as if nothing happened.
 * Operators get an explicit error and the audit-dump CLI to inspect.
 */
export function buildAuditLog(): AuditLog {
  const dir = process.env.BLUE_TANUKI_AUDIT_DIR;
  if (!dir) {
    return new AuditLog();
  }
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  const filepath = path.join(resolved, AUDIT_FILENAME);
  return new AuditLog({ filepath });
}

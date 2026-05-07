/**
 * Structured logger — minimal, dependency-free.
 *
 * Design intent (Phase 4-S3):
 *   1. Replace ad-hoc `console.log("[scope] ...")` calls in gateway entry
 *      points with a logger that knows about scopes and structured fields.
 *   2. Keep the text format byte-compatible with the previous prefix style
 *      so operators reading existing runbooks see the same shape, and tests
 *      that grep stdout (smoke scripts, etc.) continue to match.
 *   3. Optional JSON mode for machine ingestion (CI, log aggregators).
 *      JSON-mode output is one object per line with fixed top-level keys:
 *        ts, level, scope, msg, ...fields
 *
 * What this is NOT:
 *   - Not a full observability stack. No spans, no metrics export.
 *   - Not async. Writes go straight to stdout/stderr; reordering is best-effort.
 *   - Not a replacement for the audit chain. Logs are operational; the
 *     hash-chain is the tamper-evident record. They serve different purposes.
 *
 * Environment variables:
 *   BLUE_TANUKI_LOG_FORMAT = "text" (default) | "json"
 *   BLUE_TANUKI_LOG_LEVEL  = "debug" | "info" (default) | "warn" | "error"
 *
 * Failure mode: if either env var is malformed, we fall back to defaults
 * silently. Logging itself must never crash a process.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "text" | "json";
export interface LoggerOptions {
    scope?: string;
    level?: LogLevel;
    format?: LogFormat;
    /** Defaults to process.stdout.write / process.stderr.write. */
    out?: (line: string) => void;
    err?: (line: string) => void;
    /** Defaults to () => new Date().toISOString(). Override for deterministic tests. */
    now?: () => string;
}
export interface Logger {
    debug(msg: string, fields?: Record<string, unknown>): void;
    info(msg: string, fields?: Record<string, unknown>): void;
    warn(msg: string, fields?: Record<string, unknown>): void;
    error(msg: string, fields?: Record<string, unknown>): void;
    /** Create a child logger with a sub-scope. */
    child(scope: string): Logger;
}
/**
 * Construct a logger. Pass {scope} to set the prefix (e.g. "gateway").
 */
export declare function createLogger(opts?: LoggerOptions): Logger;
//# sourceMappingURL=logger.d.ts.map
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
const LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
function parseLevel(raw) {
    if (!raw)
        return "info";
    const v = raw.toLowerCase();
    if (v === "debug" || v === "info" || v === "warn" || v === "error") {
        return v;
    }
    return "info";
}
function parseFormat(raw) {
    if (raw === "json")
        return "json";
    return "text";
}
/**
 * Resolve effective options from env + explicit overrides. Explicit options
 * take precedence; env fills in the rest with safe defaults.
 */
function resolve(opts) {
    const env = (typeof process !== "undefined" ? process.env : {});
    return {
        scope: opts.scope ?? "blue-tanuki",
        level: opts.level ?? parseLevel(env.BLUE_TANUKI_LOG_LEVEL),
        format: opts.format ?? parseFormat(env.BLUE_TANUKI_LOG_FORMAT),
        out: opts.out ??
            ((line) => {
                process.stdout.write(line + "\n");
            }),
        err: opts.err ??
            ((line) => {
                process.stderr.write(line + "\n");
            }),
        now: opts.now ?? (() => new Date().toISOString()),
    };
}
class LoggerImpl {
    scope;
    level;
    format;
    out;
    err;
    now;
    constructor(opts = {}) {
        const r = resolve(opts);
        this.scope = r.scope;
        this.level = r.level;
        this.format = r.format;
        this.out = r.out;
        this.err = r.err;
        this.now = r.now;
    }
    debug(msg, fields) {
        this.write("debug", msg, fields);
    }
    info(msg, fields) {
        this.write("info", msg, fields);
    }
    warn(msg, fields) {
        this.write("warn", msg, fields);
    }
    error(msg, fields) {
        this.write("error", msg, fields);
    }
    child(scope) {
        return new LoggerImpl({
            scope,
            level: this.level,
            format: this.format,
            out: this.out,
            err: this.err,
            now: this.now,
        });
    }
    write(level, msg, fields) {
        if (LEVELS[level] < LEVELS[this.level])
            return;
        const sink = level === "warn" || level === "error" ? this.err : this.out;
        if (this.format === "json") {
            sink(this.renderJson(level, msg, fields));
        }
        else {
            sink(this.renderText(level, msg, fields));
        }
    }
    renderText(level, msg, fields) {
        const fieldsPart = fields && Object.keys(fields).length > 0
            ? " " +
                Object.entries(fields)
                    .map(([k, v]) => `${k}=${formatFieldText(v)}`)
                    .join(" ")
            : "";
        // Level appears only for warn/error to keep info lines visually identical
        // to the legacy `[scope] msg` style and avoid breaking smoke-script greps.
        const levelTag = level === "warn" || level === "error" ? `${level.toUpperCase()} ` : "";
        return `[${this.scope}] ${levelTag}${msg}${fieldsPart}`;
    }
    renderJson(level, msg, fields) {
        const obj = {
            ts: this.now(),
            level,
            scope: this.scope,
            msg,
        };
        if (fields) {
            for (const [k, v] of Object.entries(fields)) {
                // Avoid clobbering reserved keys.
                if (k === "ts" || k === "level" || k === "scope" || k === "msg")
                    continue;
                obj[k] = v;
            }
        }
        return JSON.stringify(obj);
    }
}
function formatFieldText(v) {
    if (v === null)
        return "null";
    if (v === undefined)
        return "undefined";
    if (typeof v === "string") {
        // Quote only when it contains whitespace, '=', or '"'; otherwise keep it
        // bare so log lines stay compact and grep-friendly.
        if (/[\s="]/.test(v))
            return JSON.stringify(v);
        return v;
    }
    if (typeof v === "number" || typeof v === "boolean")
        return String(v);
    try {
        return JSON.stringify(v);
    }
    catch {
        return String(v);
    }
}
/**
 * Construct a logger. Pass {scope} to set the prefix (e.g. "gateway").
 */
export function createLogger(opts = {}) {
    return new LoggerImpl(opts);
}
//# sourceMappingURL=logger.js.map
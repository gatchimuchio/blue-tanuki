/**
 * doctor — environment diagnostic for blue-tanuki gateway.
 *
 * Design goals:
 *   - Zero side effects beyond a brief listen-probe on the configured port.
 *   - Deterministic exit code mapping:
 *       0 = all checks pass
 *       1 = one or more warnings (non-blocking; e.g. optional env unset)
 *       2 = one or more errors (blocks `serve` from starting cleanly)
 *   - Two output formats: human-readable (default) and JSON (--json).
 *
 * What we check:
 *   - Node.js version >= 22.14 (engines.node in root package.json)
 *   - Required env: WEBCHAT_TOKEN / WEBCHAT_RESUME_TOKEN present
 *     (length-only; never log values)
 *   - Optional env: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, DISCORD_BOT_TOKEN,
 *                   ANTHROPIC_API_KEY (presence only)
 *   - WEBCHAT_PORT is bindable (probe by binding then closing)
 *   - BLUE_TANUKI_SESSION_DIR (if set) is writable / can be created
 *   - BLUE_TANUKI_AUDIT_DIR   (if set) is writable / can be created
 *   - LLM_BACKEND consistency (stub / anthropic / openai-compatible)
 *
 * What we do NOT check:
 *   - Live Slack / Discord / Anthropic API connectivity. Those are
 *     side-effecting, slow, and outside doctor's promise of being a
 *     fast, hermetic local probe. Those go in 4-8 (live-fire smoke).
 */
export type CheckLevel = "ok" | "warn" | "error";
export interface CheckResult {
    /** Stable identifier used in JSON output and tests. */
    id: string;
    level: CheckLevel;
    /** Short label shown in the human-readable header. */
    label: string;
    /** Free-form details (one line preferred). */
    detail: string;
}
export interface DoctorReport {
    ok: boolean;
    exit_code: 0 | 1 | 2;
    /** ISO-8601 UTC timestamp. */
    timestamp: string;
    checks: CheckResult[];
}
export interface DoctorOptions {
    /** When true, run port-binding probe. Default true; tests pass false. */
    probe_port?: boolean;
    /** Override env source. Defaults to process.env. */
    env?: NodeJS.ProcessEnv;
    /** Override Node version. Defaults to process.versions.node. */
    node_version?: string;
    /** Override repo root for manifest validation. Used by tests. */
    manifest_root?: string;
}
/**
 * Required minimum Node.js version, mirroring root package.json
 * "engines.node". Kept as a literal here so doctor stays self-contained;
 * a Phase 5+ improvement would read it from package.json at boot.
 */
export declare const MIN_NODE_VERSION = "22.14.0";
/** Compare two semver-like strings. Returns -1/0/1. */
export declare function compareSemver(a: string, b: string): number;
/**
 * Run all checks and return a structured report.
 */
export declare function runDoctor(opts?: DoctorOptions): Promise<DoctorReport>;
/** Render a report in human-readable text form. */
export declare function formatTextReport(report: DoctorReport): string;
/** Render a report as JSON suitable for CI pipes. */
export declare function formatJsonReport(report: DoctorReport): string;
//# sourceMappingURL=doctor.d.ts.map
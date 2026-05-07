import { promises as fs } from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { manifestPathFor, readManifest, } from "@blue-tanuki/protocol";
import { buildLLMCommandRouteFromEnv, listConfiguredLLMProviders, } from "./llm_config.js";
/**
 * Required minimum Node.js version, mirroring root package.json
 * "engines.node". Kept as a literal here so doctor stays self-contained;
 * a Phase 5+ improvement would read it from package.json at boot.
 */
export const MIN_NODE_VERSION = "22.14.0";
const EXPECTED_MANIFEST_PACKAGES = [
    "packages/protocol",
    "packages/channel-base",
    "packages/channel-webchat",
    "packages/channel-slack",
    "packages/channel-discord",
    "packages/hds-brain",
    "packages/blue-tanuki",
];
/** Compare two semver-like strings. Returns -1/0/1. */
export function compareSemver(a, b) {
    const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
    const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da > db)
            return 1;
        if (da < db)
            return -1;
    }
    return 0;
}
function checkNodeVersion(actual) {
    const ok = compareSemver(actual, MIN_NODE_VERSION) >= 0;
    return {
        id: "node_version",
        level: ok ? "ok" : "error",
        label: "Node.js version",
        detail: ok
            ? `${actual} (>= ${MIN_NODE_VERSION})`
            : `${actual} is below required ${MIN_NODE_VERSION}`,
    };
}
function checkRequiredEnv(env, name) {
    const v = env[name];
    if (!v) {
        return {
            id: `env:${name}`,
            level: "error",
            label: `env ${name}`,
            detail: "missing (required)",
        };
    }
    if (v.length < 8) {
        return {
            id: `env:${name}`,
            level: "warn",
            label: `env ${name}`,
            detail: `present but suspiciously short (length=${v.length})`,
        };
    }
    return {
        id: `env:${name}`,
        level: "ok",
        label: `env ${name}`,
        detail: `present (length=${v.length})`,
    };
}
function checkOptionalEnv(env, name) {
    const v = env[name];
    if (!v) {
        return {
            id: `env:${name}`,
            level: "warn",
            label: `env ${name}`,
            detail: "unset (optional)",
        };
    }
    return {
        id: `env:${name}`,
        level: "ok",
        label: `env ${name}`,
        detail: `present (length=${v.length})`,
    };
}
function checkWebchatTokenSeparation(env) {
    if (!env.WEBCHAT_TOKEN || !env.WEBCHAT_RESUME_TOKEN) {
        return {
            id: "webchat_token_separation",
            level: "error",
            label: "WebChat token split",
            detail: "WEBCHAT_TOKEN and WEBCHAT_RESUME_TOKEN are both required",
        };
    }
    if (env.WEBCHAT_TOKEN === env.WEBCHAT_RESUME_TOKEN) {
        return {
            id: "webchat_token_separation",
            level: "error",
            label: "WebChat token split",
            detail: "WEBCHAT_RESUME_TOKEN must differ from WEBCHAT_TOKEN",
        };
    }
    return {
        id: "webchat_token_separation",
        level: "ok",
        label: "WebChat token split",
        detail: "inbound and resume tokens differ",
    };
}
function checkSettingsToken(env) {
    const token = env.BLUE_TANUKI_SETTINGS_TOKEN;
    if (!token) {
        return {
            id: "settings_token",
            level: "ok",
            label: "settings token",
            detail: "unset (settings window disabled)",
        };
    }
    if (token.length < 16) {
        return {
            id: "settings_token",
            level: "error",
            label: "settings token",
            detail: "BLUE_TANUKI_SETTINGS_TOKEN must be at least 16 characters",
        };
    }
    if (token === env.WEBCHAT_TOKEN || token === env.WEBCHAT_RESUME_TOKEN) {
        return {
            id: "settings_token",
            level: "error",
            label: "settings token",
            detail: "BLUE_TANUKI_SETTINGS_TOKEN must differ from WebChat tokens",
        };
    }
    return {
        id: "settings_token",
        level: "ok",
        label: "settings token",
        detail: `present (length=${token.length})`,
    };
}
function envValue(env, ...names) {
    for (const name of names) {
        const v = env[name];
        if (v && v.trim().length > 0)
            return v;
    }
    return undefined;
}
function checkLlmBackend(env) {
    const backend = (envValue(env, "LLM_BACKEND", "LLM_DEFAULT_BACKEND") ?? "stub")
        .trim()
        .toLowerCase();
    let configuredProviders;
    try {
        configuredProviders = listConfiguredLLMProviders(env).map((name) => name.toLowerCase());
    }
    catch (e) {
        return {
            id: "llm_backend",
            level: "error",
            label: "LLM_BACKEND",
            detail: `invalid LLM_PROVIDERS_JSON: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
    if (backend === "stub") {
        return {
            id: "llm_backend",
            level: "ok",
            label: "LLM_BACKEND",
            detail: "stub (offline-safe default)",
        };
    }
    if (backend === "anthropic" || backend === "claude") {
        const key = env.ANTHROPIC_API_KEY;
        if (!key) {
            return {
                id: "llm_backend",
                level: "error",
                label: "LLM_BACKEND",
                detail: `${backend} but ANTHROPIC_API_KEY is unset`,
            };
        }
        return {
            id: "llm_backend",
            level: "ok",
            label: "LLM_BACKEND",
            detail: `${backend} with API key present`,
        };
    }
    if (backend === "openai" || backend === "openai-compatible") {
        const model = envValue(env, "OPENAI_COMPAT_MODEL", "OPENAI_MODEL", "LLM_MODEL");
        const key = envValue(env, "OPENAI_COMPAT_API_KEY", "OPENAI_API_KEY", "LLM_API_KEY");
        const endpoint = envValue(env, "OPENAI_COMPAT_ENDPOINT", "OPENAI_ENDPOINT", "LLM_ENDPOINT");
        if (!model) {
            return {
                id: "llm_backend",
                level: "error",
                label: "LLM_BACKEND",
                detail: `${backend} but no model is set (OPENAI_COMPAT_MODEL/OPENAI_MODEL/LLM_MODEL)`,
            };
        }
        if (backend === "openai-compatible" && !endpoint) {
            return {
                id: "llm_backend",
                level: "error",
                label: "LLM_BACKEND",
                detail: "openai-compatible but no endpoint is set (OPENAI_COMPAT_ENDPOINT/LLM_ENDPOINT)",
            };
        }
        if (backend === "openai" && !key) {
            return {
                id: "llm_backend",
                level: "error",
                label: "LLM_BACKEND",
                detail: "openai but no API key is set (OPENAI_API_KEY/LLM_API_KEY)",
            };
        }
        return {
            id: "llm_backend",
            level: "ok",
            label: "LLM_BACKEND",
            detail: backend === "openai"
                ? "openai with model/API key present"
                : "openai-compatible with model/endpoint present",
        };
    }
    if (configuredProviders.includes(backend)) {
        return {
            id: "llm_backend",
            level: "ok",
            label: "LLM_BACKEND",
            detail: `${backend} registered via LLM_PROVIDERS_JSON`,
        };
    }
    return {
        id: "llm_backend",
        level: "error",
        label: "LLM_BACKEND",
        detail: `unknown value '${backend}' (expected stub | anthropic | openai | openai-compatible | LLM_PROVIDERS_JSON name/alias)`,
    };
}
function checkLlmCommandRoute(env) {
    try {
        const route = buildLLMCommandRouteFromEnv(env);
        const providers = listConfiguredLLMProviders(env).map((name) => name.toLowerCase());
        const hint = route.backend_hint?.trim().toLowerCase();
        if (hint && !providers.includes(hint)) {
            return {
                id: "llm_command_route",
                level: "error",
                label: "LLM command route",
                detail: `backend_hint '${route.backend_hint}' is not registered`,
            };
        }
        return {
            id: "llm_command_route",
            level: "ok",
            label: "LLM command route",
            detail: `backend=${route.backend_hint ?? "(registry default)"}, ` +
                `model=${route.model ?? "(provider default)"}, ` +
                `max_tokens=${route.max_tokens ?? 1024}, ` +
                `timeout_ms=${route.timeout_ms ?? 30_000}`,
        };
    }
    catch (e) {
        return {
            id: "llm_command_route",
            level: "error",
            label: "LLM command route",
            detail: e instanceof Error ? e.message : String(e),
        };
    }
}
async function probePort(port, host) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        const finish = (level, detail) => {
            srv.close(() => resolve({
                id: "port",
                level,
                label: `port ${host}:${port}`,
                detail,
            }));
        };
        srv.once("error", (e) => {
            const reason = e.code ?? e.message;
            // Don't keep listening if we never bound; close is harmless on
            // an unbound server but we resolve directly to be explicit.
            resolve({
                id: "port",
                level: "error",
                label: `port ${host}:${port}`,
                detail: `cannot bind: ${reason}`,
            });
        });
        srv.listen(port, host, () => {
            finish("ok", "bindable");
        });
    });
}
async function checkSessionDir(env) {
    const dir = env.BLUE_TANUKI_SESSION_DIR;
    if (!dir) {
        return {
            id: "session_dir",
            level: "ok",
            label: "BLUE_TANUKI_SESSION_DIR",
            detail: "unset (memory-only sessions)",
        };
    }
    const resolved = path.resolve(dir);
    try {
        await fs.mkdir(resolved, { recursive: true });
    }
    catch (e) {
        return {
            id: "session_dir",
            level: "error",
            label: "BLUE_TANUKI_SESSION_DIR",
            detail: `cannot create '${resolved}': ${e.message}`,
        };
    }
    // Probe writability with a tmp file.
    const probe = path.join(resolved, `.btnk-doctor-${process.pid}.tmp`);
    try {
        await fs.writeFile(probe, "doctor-probe", "utf8");
        await fs.unlink(probe);
    }
    catch (e) {
        return {
            id: "session_dir",
            level: "error",
            label: "BLUE_TANUKI_SESSION_DIR",
            detail: `not writable at '${resolved}': ${e.message}`,
        };
    }
    return {
        id: "session_dir",
        level: "ok",
        label: "BLUE_TANUKI_SESSION_DIR",
        detail: `${resolved} (writable)`,
    };
}
/**
 * Audit log directory (Phase 4-S3). Same probe pattern as session_dir:
 * unset is OK (in-memory audit), set must be creatable + writable.
 *
 * We do NOT verify chain integrity here. doctor's promise is fast hermetic
 * environment checks; chain verification is what `--audit-dump` is for.
 * Keeping the two separate avoids a slow doctor on long-running deployments.
 */
async function checkAuditDir(env) {
    const dir = env.BLUE_TANUKI_AUDIT_DIR;
    if (!dir) {
        return {
            id: "audit_dir",
            level: "ok",
            label: "BLUE_TANUKI_AUDIT_DIR",
            detail: "unset (in-memory audit only)",
        };
    }
    const resolved = path.resolve(dir);
    try {
        await fs.mkdir(resolved, { recursive: true });
    }
    catch (e) {
        return {
            id: "audit_dir",
            level: "error",
            label: "BLUE_TANUKI_AUDIT_DIR",
            detail: `cannot create '${resolved}': ${e.message}`,
        };
    }
    const probe = path.join(resolved, `.btnk-doctor-audit-${process.pid}.tmp`);
    try {
        await fs.writeFile(probe, "doctor-probe", "utf8");
        await fs.unlink(probe);
    }
    catch (e) {
        return {
            id: "audit_dir",
            level: "error",
            label: "BLUE_TANUKI_AUDIT_DIR",
            detail: `not writable at '${resolved}': ${e.message}`,
        };
    }
    return {
        id: "audit_dir",
        level: "ok",
        label: "BLUE_TANUKI_AUDIT_DIR",
        detail: `${resolved} (writable)`,
    };
}
async function locateRepoRoot() {
    // Locate the repo by walking up from this module to find pnpm-workspace.yaml.
    const here = path.dirname(fileURLToPath(import.meta.url));
    let cur = here;
    for (let i = 0; i < 8; i++) {
        if (await fs
            .stat(path.join(cur, "pnpm-workspace.yaml"))
            .then(() => true)
            .catch(() => false)) {
            return cur;
        }
        const parent = path.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    return null;
}
async function checkBundledManifests(rootOverride) {
    const root = rootOverride ? path.resolve(rootOverride) : await locateRepoRoot();
    if (!root) {
        return {
            id: "manifests",
            level: "warn",
            label: "plugin manifests",
            detail: "repo root not located; manifest check skipped",
        };
    }
    const failures = [];
    for (const rel of EXPECTED_MANIFEST_PACKAGES) {
        const pkgDir = path.join(root, rel);
        try {
            const manifest = await readManifest(manifestPathFor(pkgDir));
            const pkgRaw = await fs.readFile(path.join(pkgDir, "package.json"), "utf8");
            const pkg = JSON.parse(pkgRaw);
            if (manifest.name !== pkg.name) {
                failures.push(`${rel}: name mismatch (${manifest.name} != ${String(pkg.name)})`);
            }
            if (manifest.version !== pkg.version) {
                failures.push(`${rel}: version mismatch (${manifest.version} != ${String(pkg.version)})`);
            }
            if (manifest.entry !== "./dist/index.js") {
                failures.push(`${rel}: entry must be ./dist/index.js`);
            }
            if (typeof pkg.main === "string" && manifest.entry !== pkg.main) {
                failures.push(`${rel}: entry mismatch with package main`);
            }
        }
        catch (e) {
            failures.push(`${rel}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    if (failures.length > 0) {
        return {
            id: "manifests",
            level: "error",
            label: "plugin manifests",
            detail: failures.join("; "),
        };
    }
    return {
        id: "manifests",
        level: "ok",
        label: "plugin manifests",
        detail: `${EXPECTED_MANIFEST_PACKAGES.length} manifests valid`,
    };
}
/**
 * Run all checks and return a structured report.
 */
export async function runDoctor(opts = {}) {
    const env = opts.env ?? process.env;
    const node_version = opts.node_version ?? process.versions.node;
    const checks = [];
    checks.push(checkNodeVersion(node_version));
    checks.push(checkRequiredEnv(env, "WEBCHAT_TOKEN"));
    checks.push(checkRequiredEnv(env, "WEBCHAT_RESUME_TOKEN"));
    checks.push(checkWebchatTokenSeparation(env));
    checks.push(checkSettingsToken(env));
    checks.push(checkOptionalEnv(env, "SLACK_BOT_TOKEN"));
    checks.push(checkOptionalEnv(env, "SLACK_APP_TOKEN"));
    checks.push(checkOptionalEnv(env, "DISCORD_BOT_TOKEN"));
    checks.push(checkOptionalEnv(env, "ANTHROPIC_API_KEY"));
    checks.push(checkLlmBackend(env));
    checks.push(checkLlmCommandRoute(env));
    checks.push(await checkSessionDir(env));
    checks.push(await checkAuditDir(env));
    checks.push(await checkBundledManifests(opts.manifest_root));
    if (opts.probe_port !== false) {
        const port = parseInt(env.WEBCHAT_PORT ?? "8787", 10);
        const host = env.WEBCHAT_HOST ?? "127.0.0.1";
        checks.push(await probePort(port, host));
    }
    const has_error = checks.some((c) => c.level === "error");
    const has_warn = checks.some((c) => c.level === "warn");
    const exit_code = has_error ? 2 : has_warn ? 1 : 0;
    return {
        ok: !has_error,
        exit_code,
        timestamp: new Date().toISOString(),
        checks,
    };
}
/** Render a report in human-readable text form. */
export function formatTextReport(report) {
    const lines = [];
    const status = report.exit_code === 0
        ? "OK"
        : report.exit_code === 1
            ? "WARN"
            : "ERROR";
    lines.push(`blue-tanuki doctor — ${status} (${report.timestamp})`);
    lines.push("");
    for (const c of report.checks) {
        const mark = c.level === "ok" ? "✓" : c.level === "warn" ? "!" : "✗";
        lines.push(`  ${mark} ${c.label.padEnd(28)} ${c.detail}`);
    }
    lines.push("");
    lines.push(`Summary: ${report.checks.filter((c) => c.level === "ok").length} ok, ` +
        `${report.checks.filter((c) => c.level === "warn").length} warn, ` +
        `${report.checks.filter((c) => c.level === "error").length} error.`);
    lines.push(`Exit code: ${report.exit_code}`);
    return lines.join(os.EOL);
}
/** Render a report as JSON suitable for CI pipes. */
export function formatJsonReport(report) {
    return JSON.stringify(report, null, 2);
}
//# sourceMappingURL=doctor.js.map
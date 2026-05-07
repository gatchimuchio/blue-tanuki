import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { manifestPathFor, readManifest, } from "@blue-tanuki/protocol";
const CORE_PACKAGE = "@blue-tanuki/core";
const HDS_PACKAGE = "@blue-tanuki/hds-brain";
const BUILTIN_TOOL_PERMISSIONS = [
    "tool:echo",
    "tool:file.search",
    "fs:read",
    "tool:http.fetch",
    "network:http",
];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertPackageJson(value, filepath) {
    if (!isRecord(value)) {
        throw new Error(`${filepath}: package.json must be an object`);
    }
    if (typeof value.name !== "string" || value.name.length === 0) {
        throw new Error(`${filepath}: package.json name is required`);
    }
    if (typeof value.version !== "string" || value.version.length === 0) {
        throw new Error(`${filepath}: package.json version is required`);
    }
    if (value.main !== undefined && typeof value.main !== "string") {
        throw new Error(`${filepath}: package.json main must be a string`);
    }
    return {
        name: value.name,
        version: value.version,
        main: value.main,
    };
}
function assertInside(parent, child, label) {
    const rel = path.relative(parent, child);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`${label}: path escapes workspace/package boundary`);
    }
}
async function pathExists(filepath) {
    return await fs
        .stat(filepath)
        .then(() => true)
        .catch(() => false);
}
async function readPackageJson(packageDir) {
    const filepath = path.join(packageDir, "package.json");
    const raw = await fs.readFile(filepath, "utf8");
    return assertPackageJson(JSON.parse(raw), filepath);
}
function validateManifestMetadata(packageDir, pkg, manifest) {
    if (manifest.name !== pkg.name) {
        throw new Error(`${packageDir}: manifest name mismatch (${manifest.name} != ${pkg.name})`);
    }
    if (manifest.version !== pkg.version) {
        throw new Error(`${packageDir}: manifest version mismatch (${manifest.version} != ${pkg.version})`);
    }
    if (manifest.entry !== "./dist/index.js") {
        throw new Error(`${packageDir}: manifest entry must be ./dist/index.js`);
    }
    if (pkg.main && manifest.entry !== pkg.main) {
        throw new Error(`${packageDir}: manifest entry mismatch with package.json main`);
    }
}
export async function findWorkspaceRoot(start = path.dirname(fileURLToPath(import.meta.url))) {
    let cur = path.resolve(start);
    for (let i = 0; i < 10; i += 1) {
        if (await pathExists(path.join(cur, "pnpm-workspace.yaml"))) {
            return cur;
        }
        const parent = path.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    throw new Error("plugin loader: pnpm-workspace.yaml not found");
}
export function parseWorkspacePackagePatterns(raw) {
    const patterns = [];
    let inPackages = false;
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#"))
            continue;
        if (trimmed === "packages:") {
            inPackages = true;
            continue;
        }
        if (!inPackages)
            continue;
        if (!trimmed.startsWith("-")) {
            if (!line.startsWith(" ") && !line.startsWith("\t"))
                inPackages = false;
            continue;
        }
        const pattern = trimmed
            .replace(/^-\s*/, "")
            .replace(/^["']/, "")
            .replace(/["']$/, "")
            .trim();
        if (pattern.length > 0)
            patterns.push(pattern);
    }
    return patterns;
}
async function expandWorkspacePattern(root, pattern) {
    const normalized = pattern.replace(/\\/g, "/");
    if (!normalized.includes("*")) {
        const dir = path.resolve(root, normalized);
        assertInside(root, dir, `workspace pattern ${pattern}`);
        return (await pathExists(path.join(dir, "package.json"))) ? [dir] : [];
    }
    if (!normalized.endsWith("/*") || normalized.slice(0, -2).includes("*")) {
        throw new Error(`plugin loader: unsupported workspace pattern '${pattern}'`);
    }
    const base = path.resolve(root, normalized.slice(0, -2));
    assertInside(root, base, `workspace pattern ${pattern}`);
    const entries = await fs
        .readdir(base, { withFileTypes: true })
        .catch(() => []);
    const dirs = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const dir = path.join(base, entry.name);
        if (await pathExists(path.join(dir, "package.json"))) {
            dirs.push(dir);
        }
    }
    return dirs.sort();
}
export async function discoverWorkspacePackageDirs(root) {
    const raw = await fs.readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
    const patterns = parseWorkspacePackagePatterns(raw);
    const dirs = new Set();
    for (const pattern of patterns) {
        for (const dir of await expandWorkspacePattern(root, pattern)) {
            dirs.add(path.resolve(dir));
        }
    }
    return Array.from(dirs).sort();
}
async function resolveManifestEntry(packageDir, manifest, allowTsFallback) {
    const entry = path.resolve(packageDir, manifest.entry);
    assertInside(packageDir, entry, `${manifest.name} entry`);
    if (await pathExists(entry)) {
        return entry;
    }
    const fallback = path.resolve(packageDir, "src", "index.ts");
    if (allowTsFallback &&
        manifest.entry === "./dist/index.js" &&
        await pathExists(fallback)) {
        return fallback;
    }
    throw new Error(`${manifest.name}: entry not found at ${entry}`);
}
function verifyExportBindings(plugin) {
    if (!plugin.module)
        return;
    for (const [key, exportName] of Object.entries(plugin.manifest.exports)) {
        if (exportName === "*")
            continue;
        if (!(exportName in plugin.module)) {
            throw new Error(`${plugin.manifest.name}: manifest export '${key}' points to missing '${exportName}'`);
        }
    }
}
export async function loadWorkspacePlugins(opts = {}) {
    const root = opts.root ? path.resolve(opts.root) : await findWorkspaceRoot();
    const packageDirs = await discoverWorkspacePackageDirs(root);
    const plugins = [];
    for (const packageDir of packageDirs) {
        assertInside(root, packageDir, "workspace package");
        const manifestPath = manifestPathFor(packageDir);
        if (!await pathExists(manifestPath))
            continue;
        const pkg = await readPackageJson(packageDir);
        const manifest = await readManifest(manifestPath);
        validateManifestMetadata(packageDir, pkg, manifest);
        const plugin = {
            package_dir: packageDir,
            package_json: pkg,
            manifest,
        };
        if (opts.import_modules !== false) {
            const entry = await resolveManifestEntry(packageDir, manifest, opts.allow_ts_fallback ?? true);
            plugin.module = await import(pathToFileURL(entry).href);
        }
        verifyExportBindings(plugin);
        plugins.push(plugin);
    }
    return plugins.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}
export class PluginRuntime {
    root;
    plugins;
    byName = new Map();
    constructor(root, plugins) {
        this.root = root;
        this.plugins = plugins;
        for (const plugin of plugins) {
            if (this.byName.has(plugin.manifest.name)) {
                throw new Error(`plugin loader: duplicate plugin ${plugin.manifest.name}`);
            }
            this.byName.set(plugin.manifest.name, plugin);
        }
    }
    get(name) {
        const plugin = this.byName.get(name);
        if (!plugin) {
            throw new Error(`plugin loader: missing required plugin ${name}`);
        }
        return plugin;
    }
    permissionsFor(name) {
        return new Set(this.get(name).manifest.permissions);
    }
    requirePermissions(packageName, required, action) {
        const declared = this.permissionsFor(packageName);
        const missing = required.filter((permission) => !declared.has(permission));
        if (missing.length > 0) {
            throw new Error(`plugin permission denied: ${action} requires ${missing.join(", ")} ` +
                `but ${packageName} did not declare them`);
        }
    }
    getExport(packageName, key) {
        const plugin = this.get(packageName);
        if (!plugin.module) {
            throw new Error(`plugin loader: module not imported for ${packageName}`);
        }
        const exportName = plugin.manifest.exports[key] ?? plugin.manifest.exports.default;
        if (!exportName) {
            throw new Error(`${packageName}: manifest does not declare export '${key}'`);
        }
        if (exportName === "*")
            return plugin.module;
        const value = plugin.module[exportName];
        if (value === undefined) {
            throw new Error(`${packageName}: export '${exportName}' is missing`);
        }
        return value;
    }
    registerTools(registry) {
        this.requirePermissions(CORE_PACKAGE, BUILTIN_TOOL_PERMISSIONS, "register built-in tools");
        const register = this.getExport(CORE_PACKAGE, "tools");
        if (typeof register !== "function") {
            throw new Error(`${CORE_PACKAGE}: export 'tools' must be a register function`);
        }
        register(registry);
    }
    createChannel(opts) {
        this.requirePermissions(opts.package_name, opts.required_permissions, opts.action);
        const ctor = this.getExport(opts.package_name, opts.export_key ?? "channel");
        if (typeof ctor !== "function") {
            throw new Error(`${opts.package_name}: channel export must be a constructor`);
        }
        return new ctor(...(opts.constructor_args ?? []));
    }
    enforceSessionConfig(env) {
        if (!env.BLUE_TANUKI_SESSION_DIR)
            return;
        this.requirePermissions(CORE_PACKAGE, ["fs:read:session_dir", "fs:write:session_dir", "fs:append:session_dir"], "configure BLUE_TANUKI_SESSION_DIR");
    }
    enforceAuditConfig(env) {
        if (!env.BLUE_TANUKI_AUDIT_DIR)
            return;
        this.requirePermissions(HDS_PACKAGE, ["fs:append:audit_dir"], "configure BLUE_TANUKI_AUDIT_DIR");
    }
    enforceLLMConfig(env) {
        const backend = envValue(env, "LLM_BACKEND", "LLM_DEFAULT_BACKEND") ?? "stub";
        const hasProviderConfig = Boolean(envValue(env, "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENAI_COMPAT_API_KEY", "LLM_API_KEY", "OPENAI_COMPAT_ENDPOINT", "OPENAI_ENDPOINT", "LLM_ENDPOINT", "LLM_PROVIDERS_JSON"));
        if (backend.trim().toLowerCase() !== "stub" || hasProviderConfig) {
            this.requirePermissions(CORE_PACKAGE, ["network:llm-provider"], "configure non-stub LLM provider");
        }
        const secretNames = [
            "ANTHROPIC_API_KEY",
            "OPENAI_API_KEY",
            "OPENAI_COMPAT_API_KEY",
            "LLM_API_KEY",
            "OPENAI_COMPAT_HEADERS_JSON",
            "LLM_HEADERS_JSON",
        ].filter((name) => envValue(env, name));
        for (const name of providerSecretEnvNames(env)) {
            secretNames.push(name);
        }
        for (const name of Array.from(new Set(secretNames))) {
            this.requirePermissions(CORE_PACKAGE, [`secrets:${name}`], `read ${name}`);
        }
    }
}
export async function loadPluginRuntime(opts = {}) {
    const root = opts.root ? path.resolve(opts.root) : await findWorkspaceRoot();
    const plugins = await loadWorkspacePlugins({ ...opts, root });
    return new PluginRuntime(root, plugins);
}
function envValue(env, ...names) {
    for (const name of names) {
        const value = env[name];
        if (value && value.trim().length > 0)
            return value;
    }
    return undefined;
}
function providerSecretEnvNames(env) {
    const raw = envValue(env, "LLM_PROVIDERS_JSON");
    if (!raw)
        return [];
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.providers)
            ? parsed.providers
            : [];
    const names = [];
    for (const row of rows) {
        if (!isRecord(row))
            continue;
        if (typeof row.api_key === "string" ||
            (isRecord(row.headers) && Object.keys(row.headers).length > 0)) {
            names.push("LLM_PROVIDERS_JSON");
        }
        if (typeof row.api_key_env === "string" && row.api_key_env.length > 0) {
            names.push(row.api_key_env);
        }
        if (typeof row.headers_env === "string" && row.headers_env.length > 0) {
            names.push(row.headers_env);
        }
    }
    return names;
}
//# sourceMappingURL=plugin_loader.js.map
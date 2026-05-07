import { lookup as dnsLookup } from "node:dns/promises";
import { promises as fs } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import { BlockList, isIP } from "node:net";
import * as path from "node:path";
import { echoTool } from "./registry.js";
const HTTP_REDIRECT_LIMIT = 3;
const HTTP_FETCH_TIMEOUT_MS = 15_000;
const BLOCKED_IPS = new BlockList();
const SECRET_DENY_COMPONENTS = new Set([
    ".aws",
    ".azure",
    ".env",
    ".git",
    ".gcloud",
    ".netrc",
    ".npmrc",
    ".pypirc",
    ".ssh",
    "credentials",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "id_rsa",
    "secret",
    "secrets",
]);
const SECRET_DENY_SUFFIXES = [".key", ".pem", ".p12", ".pfx"];
for (const [address, prefix, type] of [
    ["0.0.0.0", 8, "ipv4"],
    ["10.0.0.0", 8, "ipv4"],
    ["100.64.0.0", 10, "ipv4"],
    ["127.0.0.0", 8, "ipv4"],
    ["169.254.0.0", 16, "ipv4"],
    ["172.16.0.0", 12, "ipv4"],
    ["192.0.0.0", 24, "ipv4"],
    ["192.0.2.0", 24, "ipv4"],
    ["192.168.0.0", 16, "ipv4"],
    ["198.18.0.0", 15, "ipv4"],
    ["198.51.100.0", 24, "ipv4"],
    ["203.0.113.0", 24, "ipv4"],
    ["224.0.0.0", 4, "ipv4"],
    ["240.0.0.0", 4, "ipv4"],
    ["::", 128, "ipv6"],
    ["::1", 128, "ipv6"],
    ["fc00::", 7, "ipv6"],
    ["fe80::", 10, "ipv6"],
    ["ff00::", 8, "ipv6"],
    ["2001:db8::", 32, "ipv6"],
]) {
    BLOCKED_IPS.addSubnet(address, prefix, type);
}
function stringArg(args, name, required = true) {
    const value = args[name];
    if (typeof value === "string" && value.length > 0)
        return value;
    if (required)
        throw new Error(`${name} must be a non-empty string`);
    return undefined;
}
function positiveIntArg(args, name, fallback, max) {
    const value = args[name];
    if (value === undefined)
        return fallback;
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return Math.min(value, max);
}
function pathInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
function displayPath(filepath) {
    return filepath.replace(/\\/g, "/");
}
function isSecretLikeRelativePath(rel) {
    const normalized = rel.replace(/\\/g, "/");
    const parts = normalized.split("/").filter((part) => part.length > 0);
    return parts.some((part) => {
        const lower = part.toLowerCase();
        if (SECRET_DENY_COMPONENTS.has(lower))
            return true;
        if (lower.startsWith(".env."))
            return true;
        return SECRET_DENY_SUFFIXES.some((suffix) => lower.endsWith(suffix));
    });
}
function assertNotSecretLike(rel, label) {
    if (isSecretLikeRelativePath(rel)) {
        throw new Error(`file.search denied secret-like path: ${label}`);
    }
}
async function sandboxRootFromEnv(env) {
    const raw = env.BLUE_TANUKI_FILE_ROOT;
    if (!raw || raw.trim().length === 0) {
        throw new Error("BLUE_TANUKI_FILE_ROOT is required for file.search");
    }
    const resolved = path.resolve(raw);
    const real = await fs.realpath(resolved);
    const stat = await fs.stat(real);
    if (!stat.isDirectory()) {
        throw new Error("BLUE_TANUKI_FILE_ROOT must be a directory");
    }
    return real;
}
async function resolveFileSearchRoot(rootArg, sandboxRoot) {
    const lexical = path.isAbsolute(rootArg)
        ? path.resolve(rootArg)
        : path.resolve(sandboxRoot, rootArg);
    if (!pathInside(sandboxRoot, lexical)) {
        throw new Error("file.search root must stay within BLUE_TANUKI_FILE_ROOT");
    }
    const lexicalRel = path.relative(sandboxRoot, lexical);
    assertNotSecretLike(lexicalRel, displayPath(lexicalRel || "."));
    const real = await fs.realpath(lexical);
    if (!pathInside(sandboxRoot, real)) {
        throw new Error("file.search root escapes BLUE_TANUKI_FILE_ROOT via symlink");
    }
    const realRel = path.relative(sandboxRoot, real);
    assertNotSecretLike(realRel, displayPath(realRel || "."));
    return real;
}
async function* walkFiles(root, sandboxRoot) {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist") {
            continue;
        }
        const full = path.join(root, entry.name);
        const rel = path.relative(sandboxRoot, full);
        if (isSecretLikeRelativePath(rel)) {
            continue;
        }
        const real = await fs.realpath(full);
        if (!pathInside(sandboxRoot, real)) {
            throw new Error(`file.search path escapes BLUE_TANUKI_FILE_ROOT via symlink: ${displayPath(rel)}`);
        }
        if (entry.isDirectory()) {
            yield* walkFiles(real, sandboxRoot);
        }
        else if (entry.isFile()) {
            yield real;
        }
    }
}
function parseHttpUrl(raw) {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("url must use http or https");
    }
    if (url.username || url.password) {
        throw new Error("url credentials are not allowed");
    }
    return url;
}
function hostnameFor(url) {
    const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
    if (hostname.length === 0)
        throw new Error("url hostname is required");
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
        throw new Error("http.fetch denied localhost target");
    }
    return hostname;
}
function enforceHttpAllowlist(hostname, env) {
    const raw = env.BLUE_TANUKI_HTTP_ALLOWLIST;
    if (!raw || raw.trim().length === 0)
        return;
    const entries = raw
        .split(/[,\s]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0);
    if (entries.length === 0)
        return;
    const allowed = entries.some((entry) => {
        const suffix = entry.startsWith(".") ? entry.slice(1) : entry;
        return hostname === suffix || hostname.endsWith(`.${suffix}`);
    });
    if (!allowed) {
        throw new Error(`http.fetch denied host outside BLUE_TANUKI_HTTP_ALLOWLIST: ${hostname}`);
    }
}
function ipv4FromMappedIPv6(address) {
    const match = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
    return match?.[1];
}
function assertPublicAddress(hostname, resolved) {
    const mapped = ipv4FromMappedIPv6(resolved.address);
    if (mapped) {
        assertPublicAddress(hostname, { address: mapped, family: 4 });
        return;
    }
    if (resolved.address.toLowerCase().startsWith("::ffff:")) {
        throw new Error(`http.fetch denied non-public address for ${hostname}: ${resolved.address}`);
    }
    const detected = isIP(resolved.address);
    if (detected !== resolved.family) {
        throw new Error(`http.fetch could not validate resolved address for ${hostname}`);
    }
    const type = resolved.family === 6 ? "ipv6" : "ipv4";
    if (BLOCKED_IPS.check(resolved.address, type)) {
        throw new Error(`http.fetch denied non-public address for ${hostname}: ${resolved.address}`);
    }
}
async function defaultResolveHost(hostname) {
    const records = await dnsLookup(hostname, { all: true, verbatim: true });
    return records.map((record) => {
        if (record.family !== 4 && record.family !== 6) {
            throw new Error(`http.fetch unsupported address family for ${hostname}`);
        }
        return { address: record.address, family: record.family };
    });
}
async function resolvePublicTarget(url, env, resolveHost) {
    const hostname = hostnameFor(url);
    enforceHttpAllowlist(hostname, env);
    const addresses = await resolveHost(hostname);
    if (addresses.length === 0) {
        throw new Error(`http.fetch DNS lookup returned no addresses for ${hostname}`);
    }
    for (const address of addresses) {
        assertPublicAddress(hostname, address);
    }
    const selected = addresses[0];
    return {
        url,
        hostname,
        address: selected.address,
        family: selected.family,
    };
}
function hostHeaderFor(url) {
    const defaultPort = (url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443");
    return defaultPort ? url.hostname : url.host;
}
function headerString(value) {
    if (Array.isArray(value))
        return value[0] ?? null;
    if (typeof value === "number")
        return String(value);
    return value ?? null;
}
async function defaultHttpRequest(target, method, maxBytes) {
    return await new Promise((resolve, reject) => {
        const url = target.url;
        const requestFn = url.protocol === "https:" ? https.request : http.request;
        const lookup = (_hostname, _options, callback) => {
            callback(null, target.address, target.family);
        };
        let finished = false;
        const finish = (result) => {
            if (finished)
                return;
            finished = true;
            resolve(result);
        };
        const fail = (error) => {
            if (finished)
                return;
            finished = true;
            reject(error);
        };
        const req = requestFn({
            protocol: url.protocol,
            hostname: target.hostname,
            port: url.port ? Number(url.port) : undefined,
            path: `${url.pathname}${url.search}`,
            method,
            headers: {
                Host: hostHeaderFor(url),
            },
            lookup,
            servername: target.hostname,
            timeout: HTTP_FETCH_TIMEOUT_MS,
        }, (res) => {
            const status = res.statusCode ?? 0;
            const contentType = headerString(res.headers["content-type"]);
            const location = headerString(res.headers.location);
            if (method === "HEAD") {
                res.resume();
                finish({
                    status,
                    ok: status >= 200 && status < 300,
                    content_type: contentType,
                    location,
                    body: "",
                    truncated: false,
                });
                return;
            }
            const chunks = [];
            let seenBytes = 0;
            let keptBytes = 0;
            let truncated = false;
            res.on("data", (chunk) => {
                if (finished)
                    return;
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                seenBytes += buf.length;
                if (keptBytes < maxBytes) {
                    const keep = buf.subarray(0, maxBytes - keptBytes);
                    chunks.push(keep);
                    keptBytes += keep.length;
                }
                if (seenBytes >= maxBytes) {
                    truncated = true;
                    res.destroy();
                    finish({
                        status,
                        ok: status >= 200 && status < 300,
                        content_type: contentType,
                        location,
                        body: Buffer.concat(chunks).toString("utf8"),
                        truncated,
                    });
                }
            });
            res.on("end", () => {
                finish({
                    status,
                    ok: status >= 200 && status < 300,
                    content_type: contentType,
                    location,
                    body: Buffer.concat(chunks).toString("utf8"),
                    truncated,
                });
            });
            res.on("error", (error) => {
                if (!finished)
                    fail(error);
            });
        });
        req.on("timeout", () => {
            req.destroy(new Error(`http.fetch timed out after ${HTTP_FETCH_TIMEOUT_MS}ms`));
        });
        req.on("error", (error) => {
            if (!finished)
                fail(error);
        });
        req.end();
    });
}
function isRedirect(status) {
    return status === 301 || status === 302 || status === 303 ||
        status === 307 || status === 308;
}
export async function invokeHttpFetch(args, opts = {}) {
    const rawUrl = stringArg(args, "url");
    const method = (stringArg(args, "method", false) ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
        throw new Error("method must be GET or HEAD");
    }
    const maxBytes = positiveIntArg(args, "max_bytes", 64_000, 512_000);
    const env = opts.env ?? process.env;
    const resolveHost = opts.resolveHost ?? defaultResolveHost;
    const request = opts.request ?? defaultHttpRequest;
    let url = parseHttpUrl(rawUrl);
    for (let redirects = 0;; redirects += 1) {
        const target = await resolvePublicTarget(url, env, resolveHost);
        const res = await request(target, method, maxBytes);
        if (isRedirect(res.status) && res.location) {
            if (redirects >= HTTP_REDIRECT_LIMIT) {
                throw new Error(`http.fetch redirect limit exceeded (${HTTP_REDIRECT_LIMIT})`);
            }
            url = parseHttpUrl(new URL(res.location, url).href);
            continue;
        }
        return {
            url: url.href,
            status: res.status,
            ok: res.ok,
            content_type: res.content_type,
            body: res.body,
            truncated: res.truncated,
        };
    }
}
export async function invokeFileSearch(args, opts = {}) {
    const env = opts.env ?? process.env;
    const sandboxRoot = await sandboxRootFromEnv(env);
    const root = await resolveFileSearchRoot(stringArg(args, "root"), sandboxRoot);
    const query = stringArg(args, "query");
    const maxResults = positiveIntArg(args, "max_results", 20, 100);
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) {
        throw new Error("root must be a directory");
    }
    const matches = [];
    let visited = 0;
    for await (const file of walkFiles(root, sandboxRoot)) {
        if (matches.length >= maxResults || visited >= 1_000)
            break;
        visited += 1;
        const data = await fs.readFile(file);
        if (data.includes(0))
            continue;
        const text = data.toString("utf8");
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? "";
            if (line.includes(query)) {
                matches.push({
                    path: path.relative(root, file).replace(/\\/g, "/"),
                    line_number: i + 1,
                    line: line.length > 240 ? `${line.slice(0, 237)}...` : line,
                });
                if (matches.length >= maxResults)
                    break;
            }
        }
    }
    return {
        root,
        sandbox_root: sandboxRoot,
        query,
        visited_files: visited,
        matches,
    };
}
export const fileSearchTool = {
    name: "file.search",
    description: "Read-only text search under a requested root directory.",
    required_capabilities: ["tool:file.search", "fs:read"],
    async invoke(args) {
        return await invokeFileSearch(args);
    },
};
export const httpFetchTool = {
    name: "http.fetch",
    description: "GET or HEAD an HTTP(S) URL and return a bounded response body.",
    required_capabilities: ["tool:http.fetch", "network:http"],
    async invoke(args) {
        return await invokeHttpFetch(args);
    },
};
export function registerBuiltinTools(registry) {
    registry.register(echoTool);
    registry.register(fileSearchTool);
    registry.register(httpFetchTool);
}
//# sourceMappingURL=builtin.js.map
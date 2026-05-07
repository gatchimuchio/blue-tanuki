const TOOL_SPECS = {
    echo: {
        allowed_capabilities: ["tool:echo"],
        timeout_ms: 5_000,
    },
    "file.search": {
        allowed_capabilities: ["tool:file.search", "fs:read"],
        timeout_ms: 10_000,
    },
    "http.fetch": {
        allowed_capabilities: ["tool:http.fetch", "network:http"],
        timeout_ms: 15_000,
    },
};
/**
 * Route explicit tool requests to a bounded command envelope.
 *
 * Supported content forms:
 *   - tool:file.search root=. query=needle max_results=5
 *   - tool:http.fetch url=https://example.com method=HEAD
 *   - /tool echo text="hello"
 *   - tool:http.fetch {"url":"https://example.com","method":"GET"}
 *
 * Supported metadata forms:
 *   - metadata["blue_tanuki.tool_call"] = { tool_name, arguments }
 *   - metadata.tool_call = { tool_name, arguments }
 */
export function routeAction(req) {
    const fromMetadata = routeMetadata(req);
    if (fromMetadata)
        return fromMetadata;
    return routeContent(req.content);
}
function routeMetadata(req) {
    const raw = req.metadata?.["blue_tanuki.tool_call"] ?? req.metadata?.["tool_call"];
    if (raw === undefined)
        return null;
    if (!isRecord(raw)) {
        return { type: "noop", reason: "tool_call metadata must be an object" };
    }
    const toolName = stringField(raw, "tool_name") ?? stringField(raw, "tool");
    if (!toolName) {
        return { type: "noop", reason: "tool_call metadata missing tool_name" };
    }
    const argsRaw = raw.arguments ?? raw.args ?? {};
    if (!isRecord(argsRaw)) {
        return { type: "noop", reason: "tool_call metadata arguments must be an object" };
    }
    return buildToolRoute(toolName, { ...argsRaw });
}
function routeContent(content) {
    const trimmed = content.trim();
    const match = /^(?:tool:([A-Za-z0-9_.-]+)|\/tool\s+([A-Za-z0-9_.-]+))(?:\s+([\s\S]*))?$/.exec(trimmed);
    if (!match)
        return null;
    const toolName = match[1] ?? match[2] ?? "";
    const rest = (match[3] ?? "").trim();
    let args;
    try {
        args = parseArgs(rest);
    }
    catch (e) {
        return {
            type: "noop",
            reason: e instanceof Error ? e.message : String(e),
        };
    }
    return buildToolRoute(toolName, args);
}
function buildToolRoute(toolName, args) {
    const spec = TOOL_SPECS[toolName];
    if (!spec) {
        return { type: "noop", reason: `unsupported tool: ${toolName}` };
    }
    return {
        type: "tool_call",
        tool_name: toolName,
        arguments: coerceToolArgs(toolName, args),
        allowed_capabilities: [...spec.allowed_capabilities],
        timeout_ms: spec.timeout_ms,
    };
}
function parseArgs(rest) {
    if (!rest)
        return {};
    if (rest.startsWith("{")) {
        const parsed = JSON.parse(rest);
        if (!isRecord(parsed)) {
            throw new Error("tool arguments JSON must be an object");
        }
        return { ...parsed };
    }
    const out = {};
    for (const token of tokenize(rest)) {
        const eq = token.indexOf("=");
        if (eq <= 0) {
            throw new Error(`tool argument must be key=value: ${token}`);
        }
        const key = token.slice(0, eq);
        const value = token.slice(eq + 1);
        out[key] = value;
    }
    return out;
}
function tokenize(input) {
    const tokens = [];
    let current = "";
    let quote = null;
    let escaped = false;
    for (const ch of input) {
        if (escaped) {
            current += ch;
            escaped = false;
            continue;
        }
        if (ch === "\\") {
            escaped = true;
            continue;
        }
        if (quote) {
            if (ch === quote) {
                quote = null;
            }
            else {
                current += ch;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (/\s/.test(ch)) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            continue;
        }
        current += ch;
    }
    if (escaped)
        current += "\\";
    if (quote)
        throw new Error("unterminated quoted tool argument");
    if (current.length > 0)
        tokens.push(current);
    return tokens;
}
function coerceToolArgs(toolName, args) {
    const next = { ...args };
    if (toolName === "file.search") {
        coercePositiveInt(next, "max_results");
    }
    if (toolName === "http.fetch") {
        coercePositiveInt(next, "max_bytes");
        if (typeof next.method === "string") {
            next.method = next.method.toUpperCase();
        }
    }
    return next;
}
function coercePositiveInt(args, key) {
    const value = args[key];
    if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
        args[key] = parseInt(value, 10);
    }
}
function stringField(obj, key) {
    const value = obj[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
//# sourceMappingURL=action_router.js.map
const DEFAULT_MAX_CHARS = 4_000;
export function renderCommandOutput(cmd, feedback, opts = {}) {
    const maxChars = opts.max_chars ?? DEFAULT_MAX_CHARS;
    if (cmd.type === "channel_send")
        return null;
    if (feedback.status === "failed") {
        return truncate(`[failed:${cmd.type}] ${feedback.error ?? "command failed"}`, maxChars);
    }
    if (feedback.status === "suspended") {
        return truncate(`[suspended:${cmd.type}]`, maxChars);
    }
    switch (cmd.type) {
        case "llm_call":
            return renderLLMResult(feedback.result, maxChars);
        case "tool_call":
            return truncate(`[tool:${cmd.payload.tool_name}]\n${stableJson(feedback.result)}`, maxChars);
        case "noop": {
            const reason = readReason(cmd.payload);
            return truncate(reason ? `[noop] ${reason}` : "[noop]", maxChars);
        }
    }
}
function renderLLMResult(result, maxChars) {
    if (isRecord(result) && typeof result.content === "string") {
        return truncate(result.content, maxChars);
    }
    if (typeof result === "string") {
        return truncate(result, maxChars);
    }
    return null;
}
function readReason(payload) {
    if (!isRecord(payload))
        return undefined;
    const reason = payload.reason;
    return typeof reason === "string" && reason.length > 0 ? reason : undefined;
}
function stableJson(value) {
    return JSON.stringify(normalize(value), null, 2);
}
function normalize(value) {
    if (Array.isArray(value))
        return value.map(normalize);
    if (!isRecord(value))
        return value;
    const out = {};
    for (const key of Object.keys(value).sort()) {
        out[key] = normalize(value[key]);
    }
    return out;
}
function truncate(value, maxChars) {
    if (value.length <= maxChars)
        return value;
    const marker = `\n[truncated ${value.length - maxChars} chars]`;
    return `${value.slice(0, Math.max(0, maxChars - marker.length))}${marker}`;
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
//# sourceMappingURL=result_render.js.map
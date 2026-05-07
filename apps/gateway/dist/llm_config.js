import { AnthropicBackend, LLMRegistry, OpenAICompatibleBackend, StubBackend, } from "@blue-tanuki/core";
function envValue(env, ...names) {
    for (const name of names) {
        const value = env[name];
        if (value && value.trim().length > 0)
            return value;
    }
    return undefined;
}
function stringOrUndefined(value) {
    return typeof value === "string" && value.trim().length > 0
        ? value
        : undefined;
}
function stringArray(value, field) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value)) {
        throw new Error(`${field} must be an array of strings`);
    }
    return value.map((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
            throw new Error(`${field}[${index}] must be a non-empty string`);
        }
        return item;
    });
}
function headersFromObject(parsed, label) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${label} must be an object`);
    }
    const headers = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
            headers[key] = value;
        }
        else if (typeof value === "number" ||
            typeof value === "boolean") {
            headers[key] = String(value);
        }
        else {
            throw new Error(`${label}.${key} must be string/number/boolean`);
        }
    }
    return headers;
}
function parseHeadersJson(raw) {
    if (!raw)
        return {};
    const parsed = JSON.parse(raw);
    return headersFromObject(parsed, "LLM headers JSON");
}
function parseProvidersJson(raw, env) {
    if (!raw)
        return [];
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.providers)
            ? parsed.providers
            : undefined;
    if (!rows) {
        throw new Error("LLM_PROVIDERS_JSON must be an array or { providers: [...] }");
    }
    return rows.map((row, index) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
            throw new Error(`LLM_PROVIDERS_JSON[${index}] must be an object`);
        }
        const obj = row;
        const name = stringOrUndefined(obj.name);
        if (!name) {
            throw new Error(`LLM_PROVIDERS_JSON[${index}].name is required`);
        }
        const type = stringOrUndefined(obj.type) ?? "openai-compatible";
        if (type !== "openai-compatible") {
            throw new Error(`LLM_PROVIDERS_JSON[${index}].type '${type}' is not supported`);
        }
        const endpoint = stringOrUndefined(obj.endpoint);
        if (!endpoint) {
            throw new Error(`LLM_PROVIDERS_JSON[${index}].endpoint is required`);
        }
        const model = stringOrUndefined(obj.model);
        if (!model) {
            throw new Error(`LLM_PROVIDERS_JSON[${index}].model is required`);
        }
        const apiKeyEnv = stringOrUndefined(obj.api_key_env);
        const apiKey = stringOrUndefined(obj.api_key) ??
            (apiKeyEnv ? envValue(env, apiKeyEnv) : undefined);
        const headersEnv = stringOrUndefined(obj.headers_env);
        const headersFromEnv = headersEnv
            ? parseHeadersJson(envValue(env, headersEnv))
            : {};
        const inlineHeaders = obj.headers === undefined
            ? {}
            : headersFromObject(obj.headers, `LLM_PROVIDERS_JSON[${index}].headers`);
        return {
            name,
            type,
            endpoint,
            model,
            apiKey,
            headers: { ...headersFromEnv, ...inlineHeaders },
            aliases: stringArray(obj.aliases, `LLM_PROVIDERS_JSON[${index}].aliases`),
        };
    });
}
function wantsBackend(env, name) {
    return (envValue(env, "LLM_BACKEND", "LLM_DEFAULT_BACKEND") ?? "stub")
        .trim()
        .toLowerCase() === name;
}
function parsePositiveIntEnv(env, name) {
    const raw = envValue(env, name);
    if (!raw)
        return undefined;
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}
function parseTemperatureEnv(env) {
    const raw = envValue(env, "BLUE_TANUKI_LLM_TEMPERATURE");
    if (!raw)
        return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 2) {
        throw new Error("BLUE_TANUKI_LLM_TEMPERATURE must be between 0 and 2");
    }
    return value;
}
export function buildLLMBackendFromEnv(env = process.env) {
    const registry = new LLMRegistry();
    registry.register(new StubBackend());
    const anthropicKey = envValue(env, "ANTHROPIC_API_KEY");
    if (anthropicKey || wantsBackend(env, "anthropic") || wantsBackend(env, "claude")) {
        registry.register(new AnthropicBackend(anthropicKey ?? "", envValue(env, "ANTHROPIC_MODEL", "LLM_MODEL") ?? "claude-opus-4-7", envValue(env, "ANTHROPIC_ENDPOINT") ??
            "https://api.anthropic.com/v1/messages", envValue(env, "ANTHROPIC_API_VERSION") ?? "2023-06-01"), ["claude"]);
    }
    const openaiEndpoint = envValue(env, "OPENAI_COMPAT_ENDPOINT", "OPENAI_ENDPOINT", "LLM_ENDPOINT");
    const openaiModel = envValue(env, "OPENAI_COMPAT_MODEL", "OPENAI_MODEL", "LLM_MODEL");
    const openaiKey = envValue(env, "OPENAI_COMPAT_API_KEY", "OPENAI_API_KEY", "LLM_API_KEY");
    const wantsNativeOpenAI = wantsBackend(env, "openai") || Boolean(envValue(env, "OPENAI_API_KEY"));
    const wantsOpenAICompatible = wantsBackend(env, "openai-compatible") || wantsBackend(env, "openai");
    if ((openaiEndpoint && openaiModel) || (openaiKey && openaiModel) || wantsOpenAICompatible) {
        const endpoint = openaiEndpoint ??
            (wantsNativeOpenAI ? "https://api.openai.com/v1/chat/completions" : "");
        registry.register(new OpenAICompatibleBackend({
            name: "openai-compatible",
            endpoint,
            defaultModel: openaiModel ?? "",
            apiKey: openaiKey,
            headers: parseHeadersJson(envValue(env, "OPENAI_COMPAT_HEADERS_JSON", "LLM_HEADERS_JSON")),
        }), ["openai"]);
    }
    for (const provider of parseProvidersJson(envValue(env, "LLM_PROVIDERS_JSON"), env)) {
        registry.register(new OpenAICompatibleBackend({
            name: provider.name,
            endpoint: provider.endpoint,
            defaultModel: provider.model,
            apiKey: provider.apiKey,
            headers: provider.headers,
        }), provider.aliases);
    }
    const defaultBackend = envValue(env, "LLM_BACKEND", "LLM_DEFAULT_BACKEND") ?? "stub";
    registry.setDefault(defaultBackend);
    return registry;
}
export function buildLLMCommandRouteFromEnv(env = process.env) {
    return {
        backend_hint: envValue(env, "BLUE_TANUKI_LLM_BACKEND_HINT"),
        model: envValue(env, "BLUE_TANUKI_LLM_MODEL"),
        temperature: parseTemperatureEnv(env),
        max_tokens: parsePositiveIntEnv(env, "BLUE_TANUKI_LLM_MAX_TOKENS"),
        timeout_ms: parsePositiveIntEnv(env, "BLUE_TANUKI_LLM_TIMEOUT_MS"),
    };
}
export function describeLLMCommandRoute(env = process.env) {
    const route = buildLLMCommandRouteFromEnv(env);
    return {
        backend_hint: route.backend_hint ?? "(registry default)",
        model: route.model ?? "(provider default)",
        temperature: route.temperature === undefined ? "(provider default)" : String(route.temperature),
        max_tokens: route.max_tokens === undefined ? "1024" : String(route.max_tokens),
        timeout_ms: route.timeout_ms === undefined ? "30000" : String(route.timeout_ms),
    };
}
export function listConfiguredLLMProviders(env = process.env) {
    const names = new Set(["stub"]);
    if (envValue(env, "ANTHROPIC_API_KEY") || wantsBackend(env, "anthropic")) {
        names.add("anthropic");
    }
    const openaiConfigured = Boolean(envValue(env, "OPENAI_COMPAT_ENDPOINT", "OPENAI_ENDPOINT", "LLM_ENDPOINT") &&
        envValue(env, "OPENAI_COMPAT_MODEL", "OPENAI_MODEL", "LLM_MODEL"));
    if (openaiConfigured ||
        wantsBackend(env, "openai") ||
        wantsBackend(env, "openai-compatible")) {
        names.add("openai-compatible");
    }
    for (const provider of parseProvidersJson(envValue(env, "LLM_PROVIDERS_JSON"), env)) {
        names.add(provider.name);
        for (const alias of provider.aliases) {
            names.add(alias);
        }
    }
    return Array.from(names).sort();
}
export function describeLLMConfig(env = process.env) {
    return {
        default_backend: envValue(env, "LLM_BACKEND", "LLM_DEFAULT_BACKEND") ?? "stub",
        openai_compatible_configured: Boolean(envValue(env, "OPENAI_COMPAT_ENDPOINT", "OPENAI_ENDPOINT", "LLM_ENDPOINT") &&
            envValue(env, "OPENAI_COMPAT_MODEL", "OPENAI_MODEL", "LLM_MODEL")),
        anthropic_configured: Boolean(envValue(env, "ANTHROPIC_API_KEY")),
        configured_providers: listConfiguredLLMProviders(env),
    };
}
//# sourceMappingURL=llm_config.js.map
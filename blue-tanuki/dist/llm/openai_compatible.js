function normalizeEndpoint(endpoint) {
    const trimmed = endpoint.replace(/\/+$/, "");
    if (trimmed.endsWith("/chat/completions"))
        return trimmed;
    if (trimmed.endsWith("/v1"))
        return `${trimmed}/chat/completions`;
    return trimmed;
}
function extractText(choice) {
    const content = choice?.message?.content;
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .filter((part) => part.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("");
    }
    if (typeof choice?.text === "string")
        return choice.text;
    return "";
}
function tokenCount(data) {
    const usage = data.usage;
    if (!usage)
        return 0;
    if (typeof usage.total_tokens === "number")
        return usage.total_tokens;
    return (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
}
/**
 * Backend for OpenAI-compatible chat completion APIs.
 *
 * This covers OpenAI-compatible SaaS providers, OpenRouter-style routers,
 * vLLM, llama.cpp servers, Ollama's OpenAI endpoint, and similar local or
 * self-hosted runtimes. It is intentionally downstream-only: it answers a
 * request after HDS-BRAIN has already decided the command may run.
 */
export class OpenAICompatibleBackend {
    opts;
    name;
    endpoint;
    headers;
    constructor(opts) {
        this.opts = opts;
        if (!opts.defaultModel) {
            throw new Error("OpenAICompatibleBackend: defaultModel is required");
        }
        if (!opts.endpoint) {
            throw new Error("OpenAICompatibleBackend: endpoint is required");
        }
        this.name = opts.name ?? "openai-compatible";
        this.endpoint = normalizeEndpoint(opts.endpoint);
        this.headers = {
            "Content-Type": "application/json",
            ...(opts.headers ?? {}),
        };
        if (opts.apiKey && !this.headers.Authorization) {
            this.headers.Authorization = `Bearer ${opts.apiKey}`;
        }
    }
    async call(req) {
        const body = {
            model: req.model ?? this.opts.defaultModel,
            messages: req.messages,
        };
        if (req.max_tokens !== undefined)
            body.max_tokens = req.max_tokens;
        if (req.temperature !== undefined)
            body.temperature = req.temperature;
        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`${this.name}: API error ${res.status}: ${errText}`);
        }
        const data = (await res.json());
        return {
            content: extractText(data.choices?.[0]),
            tokens_used: tokenCount(data),
            model: data.model ?? body.model,
            raw: data,
        };
    }
}
//# sourceMappingURL=openai_compatible.js.map
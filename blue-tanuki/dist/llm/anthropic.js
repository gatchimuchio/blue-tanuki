/**
 * AnthropicBackend: calls api.anthropic.com /v1/messages.
 * Default model: claude-opus-4-7. Override via constructor or per-request.
 */
export class AnthropicBackend {
    apiKey;
    defaultModel;
    endpoint;
    apiVersion;
    name = "anthropic";
    constructor(apiKey, defaultModel = "claude-opus-4-7", endpoint = "https://api.anthropic.com/v1/messages", apiVersion = "2023-06-01") {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
        this.endpoint = endpoint;
        this.apiVersion = apiVersion;
        if (!apiKey) {
            throw new Error("AnthropicBackend: apiKey is required");
        }
    }
    async call(req) {
        const system = req.messages.find((m) => m.role === "system")?.content;
        const messages = req.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content }));
        const body = {
            model: req.model ?? this.defaultModel,
            max_tokens: req.max_tokens ?? 1024,
            messages,
        };
        if (system)
            body.system = system;
        if (req.temperature !== undefined)
            body.temperature = req.temperature;
        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": this.apiVersion,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`AnthropicBackend: API error ${res.status}: ${errText}`);
        }
        const data = (await res.json());
        const text = data.content
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text)
            .join("");
        return {
            content: text,
            tokens_used: data.usage.input_tokens + data.usage.output_tokens,
            model: data.model,
            raw: data,
        };
    }
}
//# sourceMappingURL=anthropic.js.map
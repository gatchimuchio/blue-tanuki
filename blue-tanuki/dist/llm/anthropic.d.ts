import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";
/**
 * AnthropicBackend: calls api.anthropic.com /v1/messages.
 * Default model: claude-opus-4-7. Override via constructor or per-request.
 */
export declare class AnthropicBackend implements LLMBackend {
    private readonly apiKey;
    private readonly defaultModel;
    private readonly endpoint;
    private readonly apiVersion;
    readonly name = "anthropic";
    constructor(apiKey: string, defaultModel?: string, endpoint?: string, apiVersion?: string);
    call(req: LLMRequest): Promise<LLMResponse>;
}
//# sourceMappingURL=anthropic.d.ts.map
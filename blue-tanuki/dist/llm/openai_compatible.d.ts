import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";
export interface OpenAICompatibleBackendOptions {
    apiKey?: string;
    defaultModel: string;
    endpoint: string;
    headers?: Record<string, string>;
    name?: string;
}
/**
 * Backend for OpenAI-compatible chat completion APIs.
 *
 * This covers OpenAI-compatible SaaS providers, OpenRouter-style routers,
 * vLLM, llama.cpp servers, Ollama's OpenAI endpoint, and similar local or
 * self-hosted runtimes. It is intentionally downstream-only: it answers a
 * request after HDS-BRAIN has already decided the command may run.
 */
export declare class OpenAICompatibleBackend implements LLMBackend {
    private readonly opts;
    readonly name: string;
    private readonly endpoint;
    private readonly headers;
    constructor(opts: OpenAICompatibleBackendOptions);
    call(req: LLMRequest): Promise<LLMResponse>;
}
//# sourceMappingURL=openai_compatible.d.ts.map
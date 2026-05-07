/**
 * LLM backend abstraction.
 *
 * BLUE-TANUKI treats LLMs as one tool among many. Any provider (Anthropic,
 * OpenAI, Google, local Ollama, etc.) implements this interface and becomes
 * pluggable.
 *
 * Key design point vs OpenClaw: in BLUE-TANUKI, the LLM is invoked downstream,
 * after upstream HDS-BRAIN has already decided ASSERT. The LLM does not control
 * the agent's state — HDS-BRAIN does.
 */
export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface LLMRequest {
    messages: LLMMessage[];
    backend_hint?: string;
    max_tokens?: number;
    temperature?: number;
    model?: string;
}
export interface LLMResponse {
    content: string;
    tokens_used: number;
    model: string;
    raw?: unknown;
}
export interface LLMBackend {
    readonly name: string;
    call(req: LLMRequest): Promise<LLMResponse>;
}
//# sourceMappingURL=base.d.ts.map
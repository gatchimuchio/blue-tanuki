import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";

interface AnthropicAPIResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

/**
 * AnthropicBackend: calls api.anthropic.com /v1/messages.
 * Default model: claude-opus-4-7. Override via constructor or per-request.
 */
export class AnthropicBackend implements LLMBackend {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string = "claude-opus-4-7",
    private readonly endpoint: string = "https://api.anthropic.com/v1/messages",
    private readonly apiVersion: string = "2023-06-01",
  ) {
    if (!apiKey) {
      throw new Error("AnthropicBackend: apiKey is required");
    }
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: req.model ?? this.defaultModel,
      max_tokens: req.max_tokens ?? 1024,
      messages,
    };
    if (system) body.system = system;
    if (req.temperature !== undefined) body.temperature = req.temperature;

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

    const data = (await res.json()) as AnthropicAPIResponse;
    const text = data.content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text!)
      .join("");

    return {
      content: text,
      tokens_used: data.usage.input_tokens + data.usage.output_tokens,
      model: data.model,
      raw: data,
    };
  }
}

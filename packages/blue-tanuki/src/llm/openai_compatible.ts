import type { LLMBackend, LLMMessage, LLMRequest, LLMResponse } from "./base.js";

type OpenAIContentPart = {
  type?: string;
  text?: string;
};

type OpenAIChoice = {
  message?: {
    content?: string | OpenAIContentPart[];
  };
  text?: string;
};

type OpenAICompatibleAPIResponse = {
  choices?: OpenAIChoice[];
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
};

export interface OpenAICompatibleBackendOptions {
  apiKey?: string;
  defaultModel: string;
  endpoint: string;
  headers?: Record<string, string>;
  name?: string;
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return trimmed;
}

function extractText(choice: OpenAIChoice | undefined): string {
  const content = choice?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }
  if (typeof choice?.text === "string") return choice.text;
  return "";
}

function tokenCount(data: OpenAICompatibleAPIResponse): number {
  const usage = data.usage;
  if (!usage) return 0;
  if (typeof usage.total_tokens === "number") return usage.total_tokens;
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
export class OpenAICompatibleBackend implements LLMBackend {
  readonly name: string;
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly opts: OpenAICompatibleBackendOptions) {
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

  async call(req: LLMRequest): Promise<LLMResponse> {
    const body: {
      model: string;
      messages: LLMMessage[];
      max_tokens?: number;
      temperature?: number;
    } = {
      model: req.model ?? this.opts.defaultModel,
      messages: req.messages,
    };
    if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
    if (req.temperature !== undefined) body.temperature = req.temperature;

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `${this.name}: API error ${res.status}: ${errText}`,
      );
    }

    const data = (await res.json()) as OpenAICompatibleAPIResponse;
    return {
      content: extractText(data.choices?.[0]),
      tokens_used: tokenCount(data),
      model: data.model ?? body.model,
      raw: data,
    };
  }
}

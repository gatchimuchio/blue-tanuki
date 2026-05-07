import { describe, expect, it } from "vitest";
import { LLMRegistry } from "@blue-tanuki/core";
import {
  buildLLMBackendFromEnv,
  buildLLMCommandRouteFromEnv,
  describeLLMCommandRoute,
  describeLLMConfig,
} from "../src/llm_config.js";

describe("buildLLMBackendFromEnv", () => {
  it("defaults to an offline stub registry", async () => {
    const llm = buildLLMBackendFromEnv({});
    expect(llm).toBeInstanceOf(LLMRegistry);
    const res = await llm.call({
      messages: [{ role: "user", content: "hello" }],
    });
    expect(res.content).toContain("hello");
    expect(describeLLMConfig({}).default_backend).toBe("stub");
  });

  it("registers OpenAI-compatible APIs without making them the only option", () => {
    const llm = buildLLMBackendFromEnv({
      LLM_BACKEND: "stub",
      LLM_ENDPOINT: "http://localhost:11434/v1",
      LLM_MODEL: "local-model",
    });
    const registry = llm as LLMRegistry;
    expect(registry.list()).toEqual(["openai-compatible", "stub"]);
    expect(registry.resolve("openai").name).toBe("openai-compatible");
  });

  it("fails closed when the default backend is requested but incomplete", () => {
    expect(() =>
      buildLLMBackendFromEnv({
        LLM_BACKEND: "openai-compatible",
        LLM_MODEL: "model-without-endpoint",
      }),
    ).toThrow(/endpoint/);
  });

  it("registers named OpenAI-compatible providers from LLM_PROVIDERS_JSON", () => {
    const providers = JSON.stringify([
      {
        name: "local-fast",
        type: "openai-compatible",
        endpoint: "http://localhost:11434/v1",
        model: "llama-local",
        aliases: ["fast"],
        headers: { "X-Route": "local" },
      },
    ]);
    const llm = buildLLMBackendFromEnv({
      LLM_BACKEND: "fast",
      LLM_PROVIDERS_JSON: providers,
    });
    const registry = llm as LLMRegistry;

    expect(registry.resolve().name).toBe("local-fast");
    expect(registry.resolve("local-fast").name).toBe("local-fast");
    expect(registry.resolve("fast").name).toBe("local-fast");
    expect(describeLLMConfig({ LLM_PROVIDERS_JSON: providers }).configured_providers).toEqual([
      "fast",
      "local-fast",
      "stub",
    ]);
  });

  it("rejects malformed provider catalog entries", () => {
    expect(() =>
      buildLLMBackendFromEnv({
        LLM_PROVIDERS_JSON: JSON.stringify([{ name: "broken", model: "m" }]),
      }),
    ).toThrow(/endpoint/);
  });

  it("builds an upstream LLM command route from explicit BLUE_TANUKI env", () => {
    const route = buildLLMCommandRouteFromEnv({
      BLUE_TANUKI_LLM_BACKEND_HINT: "fast",
      BLUE_TANUKI_LLM_MODEL: "route-model",
      BLUE_TANUKI_LLM_TEMPERATURE: "0.3",
      BLUE_TANUKI_LLM_MAX_TOKENS: "123",
      BLUE_TANUKI_LLM_TIMEOUT_MS: "4567",
    });

    expect(route).toEqual({
      backend_hint: "fast",
      model: "route-model",
      temperature: 0.3,
      max_tokens: 123,
      timeout_ms: 4567,
    });
    expect(describeLLMCommandRoute({}).backend_hint).toBe("(registry default)");
  });

  it("rejects invalid upstream LLM route env", () => {
    expect(() =>
      buildLLMCommandRouteFromEnv({
        BLUE_TANUKI_LLM_TEMPERATURE: "3",
      }),
    ).toThrow(/TEMPERATURE/);
    expect(() =>
      buildLLMCommandRouteFromEnv({
        BLUE_TANUKI_LLM_MAX_TOKENS: "0",
      }),
    ).toThrow(/MAX_TOKENS/);
  });
});

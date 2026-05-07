import { describe, it, expect } from "vitest";
import { LLMRegistry } from "../src/llm/registry.js";
import type { LLMBackend, LLMRequest, LLMResponse } from "../src/llm/base.js";

class NamedBackend implements LLMBackend {
  readonly seen: LLMRequest[] = [];

  constructor(readonly name: string) {}

  async call(req: LLMRequest): Promise<LLMResponse> {
    this.seen.push(req);
    return {
      content: `from:${this.name}`,
      tokens_used: 0,
      model: this.name,
    };
  }
}

describe("LLMRegistry", () => {
  it("routes to the default backend when no hint is present", async () => {
    const stub = new NamedBackend("stub");
    const fast = new NamedBackend("fast");
    const registry = new LLMRegistry()
      .register(stub)
      .register(fast)
      .setDefault("fast");

    const res = await registry.call({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(res.content).toBe("from:fast");
    expect(stub.seen).toHaveLength(0);
    expect(fast.seen).toHaveLength(1);
  });

  it("routes backend_hint aliases without leaking the hint downstream", async () => {
    const claude = new NamedBackend("anthropic");
    const registry = new LLMRegistry().register(claude, ["claude"]);

    await registry.call({
      backend_hint: "claude",
      messages: [{ role: "user", content: "hi" }],
      model: "m",
    });

    expect(claude.seen).toHaveLength(1);
    expect(claude.seen[0].backend_hint).toBeUndefined();
    expect(claude.seen[0].model).toBe("m");
  });

  it("fails closed on unknown hints", async () => {
    const registry = new LLMRegistry().register(new NamedBackend("stub"));
    await expect(
      registry.call({
        backend_hint: "missing",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/missing/);
  });
});

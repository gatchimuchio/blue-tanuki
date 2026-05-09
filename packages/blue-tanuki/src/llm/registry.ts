import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Runtime-selectable backend registry.
 *
 * The registry itself implements LLMBackend so Executor can keep depending on
 * one narrow interface. HDS-BRAIN may attach backend_hint to a command; the
 * registry then resolves that hint to a concrete downstream provider.
 */
export class LLMRegistry implements LLMBackend {
  readonly name = "registry";
  private readonly backends = new Map<string, LLMBackend>();
  private readonly primaryNames = new Set<string>();
  private defaultName: string | undefined;

  constructor(defaultName?: string) {
    this.defaultName = defaultName ? normalizeName(defaultName) : undefined;
  }

  register(backend: LLMBackend, aliases: readonly string[] = []): this {
    const primary = normalizeName(backend.name);
    if (!primary) {
      throw new Error("LLMRegistry: backend name is required");
    }
    this.backends.set(primary, backend);
    this.primaryNames.add(primary);
    for (const alias of aliases) {
      const key = normalizeName(alias);
      if (key) this.backends.set(key, backend);
    }
    if (!this.defaultName) this.defaultName = primary;
    return this;
  }

  setDefault(name: string): this {
    const key = normalizeName(name);
    if (!this.backends.has(key)) {
      throw new Error(
        `LLMRegistry: default backend '${name}' is not registered; available=${this.list().join(", ")}`,
      );
    }
    this.defaultName = key;
    return this;
  }

  list(): string[] {
    return Array.from(this.primaryNames).sort();
  }

  resolve(hint?: string): LLMBackend {
    const key = normalizeName(hint ?? this.defaultName ?? "");
    if (!key) {
      throw new Error("LLMRegistry: no default backend configured");
    }
    const backend = this.backends.get(key);
    if (!backend) {
      throw new Error(
        `LLMRegistry: backend '${hint ?? key}' is not registered; available=${this.list().join(", ")}`,
      );
    }
    return backend;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    const backend = this.resolve(req.backend_hint);
    return await backend.call({
      ...req,
      backend_hint: undefined,
    });
  }
}

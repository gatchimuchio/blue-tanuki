import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";
/**
 * Runtime-selectable backend registry.
 *
 * The registry itself implements LLMBackend so Executor can keep depending on
 * one narrow interface. HDS-BRAIN may attach backend_hint to a command; the
 * registry then resolves that hint to a concrete downstream provider.
 */
export declare class LLMRegistry implements LLMBackend {
    readonly name = "registry";
    private readonly backends;
    private readonly primaryNames;
    private defaultName;
    constructor(defaultName?: string);
    register(backend: LLMBackend, aliases?: readonly string[]): this;
    setDefault(name: string): this;
    list(): string[];
    resolve(hint?: string): LLMBackend;
    call(req: LLMRequest): Promise<LLMResponse>;
}
//# sourceMappingURL=registry.d.ts.map
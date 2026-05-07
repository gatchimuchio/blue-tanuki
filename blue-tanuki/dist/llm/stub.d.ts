import type { LLMBackend, LLMRequest, LLMResponse } from "./base.js";
/**
 * StubBackend: deterministic echo. Used for Phase 0 smoke tests
 * and for offline development when no API key is available.
 */
export declare class StubBackend implements LLMBackend {
    readonly name = "stub";
    call(req: LLMRequest): Promise<LLMResponse>;
}
//# sourceMappingURL=stub.d.ts.map
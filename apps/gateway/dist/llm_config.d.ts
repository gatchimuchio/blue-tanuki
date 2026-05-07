import { type LLMBackend } from "@blue-tanuki/core";
import type { LLMCommandRoute } from "@blue-tanuki/hds-brain";
type Env = Record<string, string | undefined>;
export declare function buildLLMBackendFromEnv(env?: Env): LLMBackend;
export declare function buildLLMCommandRouteFromEnv(env?: Env): LLMCommandRoute;
export declare function describeLLMCommandRoute(env?: Env): {
    backend_hint: string;
    model: string;
    temperature: string;
    max_tokens: string;
    timeout_ms: string;
};
export declare function listConfiguredLLMProviders(env?: Env): string[];
export declare function describeLLMConfig(env?: Env): {
    default_backend: string;
    openai_compatible_configured: boolean;
    anthropic_configured: boolean;
    configured_providers: string[];
};
export {};
//# sourceMappingURL=llm_config.d.ts.map
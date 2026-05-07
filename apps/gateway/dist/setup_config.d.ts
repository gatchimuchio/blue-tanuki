export type SetupProviderKind = "stub" | "anthropic" | "openai" | "openai-compatible";
export interface SetupLlmConfig {
    provider: SetupProviderKind;
    model?: string;
    endpoint?: string;
    api_key?: string;
    api_key_env?: string;
    backend_hint?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
}
export interface SetupWebChatConfig {
    host: string;
    port: number;
    token: string;
    resume_token: string;
}
export interface SetupPathConfig {
    file_root: string;
    session_dir: string;
    audit_dir: string;
}
export interface BlueTanukiSetupConfig {
    schema_version: 1;
    llm: SetupLlmConfig;
    webchat: SetupWebChatConfig;
    paths: SetupPathConfig;
    settings: {
        token: string;
    };
}
export interface SetupDefaultsOptions {
    base_dir?: string;
    token_bytes?: number;
}
export interface RenderEnvOptions {
    include_header?: boolean;
    source_env?: Record<string, string | undefined>;
}
export declare function generateSetupToken(bytes?: number): string;
export declare function createDefaultSetupConfig(options?: SetupDefaultsOptions): BlueTanukiSetupConfig;
export declare function validateSetupConfig(config: BlueTanukiSetupConfig): BlueTanukiSetupConfig;
export declare function setupConfigFromEnv(env: Record<string, string | undefined>): BlueTanukiSetupConfig;
export declare function setupConfigToEnv(config: BlueTanukiSetupConfig, options?: RenderEnvOptions): Record<string, string>;
export declare function renderSetupEnvFile(config: BlueTanukiSetupConfig, options?: RenderEnvOptions): string;
//# sourceMappingURL=setup_config.d.ts.map
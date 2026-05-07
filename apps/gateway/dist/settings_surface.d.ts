import type { WebChatSettingsSurface } from "@blue-tanuki/channel-webchat";
import { type SetupProviderKind } from "./setup_config.js";
import { describeLLMCommandRoute } from "./llm_config.js";
import type { PluginRuntime } from "./plugin_loader.js";
type Env = Record<string, string | undefined>;
export interface SettingsSurfaceOptions {
    env?: NodeJS.ProcessEnv;
    plugins: PluginRuntime;
}
export interface SettingsSnapshot {
    schema_version: 1;
    env_file: string | null;
    writable: boolean;
    llm: {
        provider: SetupProviderKind;
        model: string | null;
        endpoint: string | null;
        api_key_set: boolean;
        temperature: number | null;
        max_tokens: number | null;
        timeout_ms: number | null;
        configured_providers: string[];
        command_route: ReturnType<typeof describeLLMCommandRoute>;
    };
    webchat: {
        host: string;
        port: number;
        token_set: boolean;
        resume_token_set: boolean;
        settings_token_set: boolean;
    };
    paths: {
        file_root: string;
        session_dir: string;
        audit_dir: string;
    };
    plugins: Array<{
        name: string;
        kind: string;
        permissions: string[];
    }>;
}
export declare function settingsSurfaceAllowed(env: Env): boolean;
export declare function buildSettingsSnapshot(env: Env, plugins: PluginRuntime): SettingsSnapshot;
export declare function updateSettingsEnvFile(body: Record<string, unknown>, env: Env): Promise<{
    output_path: string;
    backup_path?: string;
    restart_required: true;
    env_keys: string[];
}>;
export declare function createWebChatSettingsSurface(opts: SettingsSurfaceOptions): WebChatSettingsSurface | undefined;
export declare function renderSettingsHtml(): string;
export {};
//# sourceMappingURL=settings_surface.d.ts.map
import { type BlueTanukiSetupConfig, type SetupProviderKind } from "./setup_config.js";
import { type DoctorReport } from "./doctor.js";
export interface SetupCliOptions {
    yes?: boolean;
    force?: boolean;
    no_doctor?: boolean;
    json?: boolean;
    output?: string;
    base_dir?: string;
    provider?: SetupProviderKind;
    model?: string;
    endpoint?: string;
    api_key?: string;
    api_key_env?: string;
    host?: string;
    port?: number;
    file_root?: string;
    session_dir?: string;
    audit_dir?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
}
export interface SetupCommandIO {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdin?: NodeJS.ReadableStream;
    stdout?: NodeJS.WritableStream;
    stderr?: NodeJS.WritableStream;
}
export interface SetupResult {
    output_path: string;
    backup_path?: string;
    config: BlueTanukiSetupConfig;
    env_keys: string[];
    doctor?: DoctorReport;
}
export declare function parseSetupArgs(args: string[]): SetupCliOptions;
export declare function buildSetupConfigFromOptions(opts: SetupCliOptions, cwd?: any): BlueTanukiSetupConfig;
export declare function runSetupCommand(args?: string[], io?: SetupCommandIO): Promise<SetupResult>;
export declare function runSetupCli(args?: string[], io?: SetupCommandIO): Promise<void>;
//# sourceMappingURL=setup.d.ts.map
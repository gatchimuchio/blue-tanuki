export interface ParsedEnvFile {
    values: Record<string, string>;
    warnings: string[];
}
export interface LoadEnvFileOptions {
    env?: NodeJS.ProcessEnv;
    override?: boolean;
}
export interface LoadEnvFileResult {
    path: string;
    applied: string[];
    skipped: string[];
    warnings: string[];
}
export interface WriteEnvFileOptions {
    mode?: number;
    backup?: boolean;
    backup_label?: string;
}
export interface WriteEnvFileResult {
    path: string;
    backup_path?: string;
}
export declare function parseEnvFile(raw: string): ParsedEnvFile;
export declare function loadEnvFile(filePath: string, options?: LoadEnvFileOptions): Promise<LoadEnvFileResult>;
export declare function backupEnvFileIfExists(filePath: string, label?: string): Promise<string | undefined>;
export declare function writeEnvFileAtomic(filePath: string, content: string, options?: WriteEnvFileOptions): Promise<WriteEnvFileResult>;
export declare function envFilePathFromArgv(argv: string[], env?: NodeJS.ProcessEnv): string | undefined;
export declare function stripEnvFileArgs(argv: string[]): string[];
export declare function loadEnvFileFromArgv(argv: string[], env?: NodeJS.ProcessEnv): Promise<LoadEnvFileResult | undefined>;
//# sourceMappingURL=env_file.d.ts.map
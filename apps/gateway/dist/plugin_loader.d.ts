import { type PluginManifest } from "@blue-tanuki/protocol";
import type { ToolRegistry } from "@blue-tanuki/core";
type PluginModule = Record<string, unknown>;
type Env = Record<string, string | undefined>;
interface PackageJson {
    name: string;
    version: string;
    main?: string;
}
export interface WorkspacePlugin {
    package_dir: string;
    package_json: PackageJson;
    manifest: PluginManifest;
    module?: PluginModule;
}
export interface PluginRuntimeOptions {
    root?: string;
    import_modules?: boolean;
    allow_ts_fallback?: boolean;
}
export interface ChannelPluginOptions {
    package_name: string;
    export_key?: string;
    constructor_args?: unknown[];
    required_permissions: readonly string[];
    action: string;
}
export declare function findWorkspaceRoot(start?: string): Promise<string>;
export declare function parseWorkspacePackagePatterns(raw: string): string[];
export declare function discoverWorkspacePackageDirs(root: string): Promise<string[]>;
export declare function loadWorkspacePlugins(opts?: PluginRuntimeOptions): Promise<WorkspacePlugin[]>;
export declare class PluginRuntime {
    readonly root: string;
    readonly plugins: readonly WorkspacePlugin[];
    private readonly byName;
    constructor(root: string, plugins: readonly WorkspacePlugin[]);
    get(name: string): WorkspacePlugin;
    permissionsFor(name: string): Set<string>;
    requirePermissions(packageName: string, required: readonly string[], action: string): void;
    getExport(packageName: string, key: string): unknown;
    registerTools(registry: ToolRegistry): void;
    createChannel<T>(opts: ChannelPluginOptions): T;
    enforceSessionConfig(env: Env): void;
    enforceAuditConfig(env: Env): void;
    enforceLLMConfig(env: Env): void;
}
export declare function loadPluginRuntime(opts?: PluginRuntimeOptions): Promise<PluginRuntime>;
export {};
//# sourceMappingURL=plugin_loader.d.ts.map
/**
 * Tool registry.
 *
 * Phase 0 ships an empty registry plus a tiny `echo` tool for smoke testing.
 * Phase 1+ will register OpenClaw-equivalent tools:
 *   - browser, canvas, file_ops, web_fetch, sessions, cron, channels.*
 */
export interface ToolContext {
    command_id: string;
    upstream_commit_hash: string;
}
export type ToolCapability = string;
export interface Tool {
    readonly name: string;
    readonly description: string;
    readonly required_capabilities?: readonly ToolCapability[];
    invoke(args: Record<string, unknown>, ctx: ToolContext): Promise<unknown>;
}
export declare class ToolRegistry {
    private readonly tools;
    register(tool: Tool): void;
    get(name: string): Tool | undefined;
    list(): readonly Tool[];
    listCapabilities(): readonly ToolCapability[];
}
/**
 * Phase 0 sample tool. Removed/replaced in Phase 1.
 */
export declare const echoTool: Tool;
//# sourceMappingURL=registry.d.ts.map
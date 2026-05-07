/**
 * Tool registry.
 *
 * Phase 0 ships an empty registry plus a tiny `echo` tool for smoke testing.
 * Phase 1+ will register OpenClaw-equivalent tools:
 *   - browser, canvas, file_ops, web_fetch, sessions, cron, channels.*
 */
export class ToolRegistry {
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool already registered: ${tool.name}`);
        }
        this.tools.set(tool.name, tool);
    }
    get(name) {
        return this.tools.get(name);
    }
    list() {
        return Array.from(this.tools.values());
    }
    listCapabilities() {
        const caps = new Set();
        for (const tool of this.tools.values()) {
            for (const cap of tool.required_capabilities ?? []) {
                caps.add(cap);
            }
        }
        return Array.from(caps).sort();
    }
}
/**
 * Phase 0 sample tool. Removed/replaced in Phase 1.
 */
export const echoTool = {
    name: "echo",
    description: "Returns its arguments verbatim. Phase 0 smoke test only.",
    required_capabilities: ["tool:echo"],
    async invoke(args) {
        return { echoed: args };
    },
};
//# sourceMappingURL=registry.js.map
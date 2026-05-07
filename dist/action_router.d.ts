import type { InboundRequest } from "@blue-tanuki/protocol";
export interface ToolActionRoute {
    type: "tool_call";
    tool_name: string;
    arguments: Record<string, unknown>;
    allowed_capabilities: string[];
    timeout_ms: number;
}
export interface NoopActionRoute {
    type: "noop";
    reason: string;
}
export type ActionRoute = ToolActionRoute | NoopActionRoute | null;
/**
 * Route explicit tool requests to a bounded command envelope.
 *
 * Supported content forms:
 *   - tool:file.search root=. query=needle max_results=5
 *   - tool:http.fetch url=https://example.com method=HEAD
 *   - /tool echo text="hello"
 *   - tool:http.fetch {"url":"https://example.com","method":"GET"}
 *
 * Supported metadata forms:
 *   - metadata["blue_tanuki.tool_call"] = { tool_name, arguments }
 *   - metadata.tool_call = { tool_name, arguments }
 */
export declare function routeAction(req: InboundRequest): ActionRoute;
//# sourceMappingURL=action_router.d.ts.map
import { type Tool } from "./registry.js";
type Env = Record<string, string | undefined>;
export interface ResolvedAddress {
    address: string;
    family: 4 | 6;
}
export interface HttpFetchTarget {
    url: URL;
    hostname: string;
    address: string;
    family: 4 | 6;
}
export interface HttpFetchResponse {
    status: number;
    ok: boolean;
    content_type: string | null;
    location: string | null;
    body: string;
    truncated: boolean;
}
export interface HttpFetchOptions {
    env?: Env;
    resolveHost?: (hostname: string) => Promise<ResolvedAddress[]>;
    request?: (target: HttpFetchTarget, method: "GET" | "HEAD", maxBytes: number) => Promise<HttpFetchResponse>;
}
export interface FileSearchOptions {
    env?: Env;
}
export declare function invokeHttpFetch(args: Record<string, unknown>, opts?: HttpFetchOptions): Promise<unknown>;
export declare function invokeFileSearch(args: Record<string, unknown>, opts?: FileSearchOptions): Promise<unknown>;
export declare const fileSearchTool: Tool;
export declare const httpFetchTool: Tool;
export declare function registerBuiltinTools(registry: {
    register(tool: Tool): void;
}): void;
export {};
//# sourceMappingURL=builtin.d.ts.map
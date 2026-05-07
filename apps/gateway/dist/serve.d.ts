/**
 * Gateway serve mode.
 *
 * Wires HDS-BRAIN, the executor, WebChat, Slack, and Discord. HDS-BRAIN
 * remains the upstream state owner; LLM calls stay downstream.
 */
interface ServeShutdown {
    shutdown: () => Promise<void>;
}
export declare function serve(): Promise<ServeShutdown>;
export declare function runServe(): Promise<void>;
export {};
//# sourceMappingURL=serve.d.ts.map
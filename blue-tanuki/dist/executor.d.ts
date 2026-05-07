import type { ExecuteCommand, ExecuteFeedback, ChannelSendPayload } from "@blue-tanuki/protocol";
import type { LLMBackend } from "./llm/base.js";
import type { ToolRegistry } from "./tools/registry.js";
import type { SessionStore } from "./sessions/types.js";
/**
 * Minimal dispatcher contract used by the Executor for channel_send.
 * Kept structurally minimal so this package does not have to depend on
 * @blue-tanuki/channel-base directly. Anything implementing this shape works.
 */
export interface ChannelDispatcher {
    dispatch(payload: ChannelSendPayload, meta: {
        command_id: string;
        upstream_commit_hash: string;
    }): Promise<{
        delivered: boolean;
        external_id?: string;
        error?: string;
    }>;
}
export interface ExecutorDeps {
    llm: LLMBackend;
    tools: ToolRegistry;
    /**
     * Optional. When omitted, channel_send falls back to console.log
     * (Phase 0/1 behavior). When present, channel_send is routed via the
     * dispatcher and translates the result into ExecuteFeedback.
     */
    dispatcher?: ChannelDispatcher;
    /**
     * Optional. When present and an llm_call payload carries a session_id,
     * the executor (a) prepends retained history to the messages array
     * before invoking the LLM and (b) appends the current user message
     * and the assistant reply on success.
     *
     * When omitted, llm_call behaves as in Phase 1-3: messages are passed
     * through to the backend unchanged and nothing is persisted.
     */
    session_store?: SessionStore;
    /**
     * Optional. Maximum history messages to retrieve per llm_call. When
     * omitted, all retained history is prepended. Useful when the cap on
     * the SessionStore is large but per-call context should be smaller.
     */
    history_limit?: number;
}
/**
 * Executor: the top-level dispatcher for BLUE-TANUKI.
 *
 * Receives ExecuteCommand from HDS-BRAIN, switches on command type,
 * routes to the right subsystem, returns ExecuteFeedback.
 *
 * Critical: this layer enforces command constraints (timeout, allowed_tools,
 * allowed_capabilities). Upstream HDS-BRAIN sets the policy; the Executor is
 * the gatekeeper that applies it at the moment of execution.
 */
export declare class Executor {
    private readonly deps;
    constructor(deps: ExecutorDeps);
    execute(cmd: ExecuteCommand): Promise<ExecuteFeedback>;
    private executeLLMCall;
    private executeToolCall;
    private executeChannelSend;
    private withTimeout;
}
//# sourceMappingURL=executor.d.ts.map
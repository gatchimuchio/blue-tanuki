import { z } from "zod";
/**
 * Decision values returned by HDS-BRAIN's commit phase.
 * - ASSERT       : Execute. Pass command to BLUE-TANUKI.
 * - SUSPEND      : Hold. Wait for resolution (human/external signal).
 * - OUT_OF_SCOPE : Outside protected scope. No action.
 * - FAIL         : Reject. Audit-only.
 */
export const DecisionSchema = z.enum([
    "ASSERT",
    "SUSPEND",
    "OUT_OF_SCOPE",
    "FAIL",
]);
/**
 * The upstream (HDS-BRAIN) decision attached to every command sent downstream.
 * Used for audit traceability — every executor action carries the F→M→C trace.
 */
export const UpstreamDecisionSchema = z.object({
    frame_goal: z.string(),
    model_abstraction: z.string(),
    commit_hash: z.string(),
    commit_decision: DecisionSchema,
});
/**
 * LLM call payload (one of the executor's primary command types).
 */
export const LLMCallPayloadSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
    })),
    /**
     * Optional downstream provider selector. This is a routing hint, not an
     * authority signal: HDS-BRAIN still owns the ASSERT/SUSPEND/FAIL decision,
     * and the executor resolves the hint against its configured registry.
     */
    backend_hint: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    /**
     * Optional session identifier. When set, the executor's SessionStore
     * (if configured) will (a) prepend retained history before calling the
     * LLM, and (b) append the current user message and the assistant's
     * reply on success. When unset, history is not consulted nor written.
     *
     * Convention used by the gateway: `${channel}:${user}` (e.g.
     * `slack:U12345`, `webchat:bob`). The executor treats it opaquely.
     */
    session_id: z.string().optional(),
});
/**
 * Tool call payload.
 */
export const ToolCallPayloadSchema = z.object({
    tool_name: z.string(),
    arguments: z.record(z.unknown()),
});
/**
 * Channel send payload (e.g. reply on Slack/Discord/WebChat).
 */
export const ChannelSendPayloadSchema = z.object({
    channel: z.string(),
    target: z.string(),
    content: z.string(),
});
/**
 * Runtime capability strings enforced by the executor.
 *
 * Capability names are intentionally free-form but non-empty. Built-in
 * conventions include:
 *   - tool:<name>
 *   - fs:read
 *   - fs:write
 *   - network:http
 *   - shell:probe
 *   - channel:send
 */
export const ToolCapabilitySchema = z.string().min(1);
/**
 * Constraints attached to a command. Set by upstream, enforced by executor.
 */
export const CommandConstraintsSchema = z.object({
    max_tokens: z.number().int().positive().optional(),
    timeout_ms: z.number().int().positive().optional(),
    allowed_tools: z.array(z.string().min(1)).optional(),
    allowed_capabilities: z.array(ToolCapabilitySchema).optional(),
});
/**
 * Discriminated union of all command shapes.
 * BLUE-TANUKI executor switches on `type`.
 */
export const ExecuteCommandSchema = z.discriminatedUnion("type", [
    z.object({
        id: z.string(),
        type: z.literal("llm_call"),
        payload: LLMCallPayloadSchema,
        constraints: CommandConstraintsSchema.optional(),
        upstream_decision: UpstreamDecisionSchema,
    }),
    z.object({
        id: z.string(),
        type: z.literal("tool_call"),
        payload: ToolCallPayloadSchema,
        constraints: CommandConstraintsSchema.optional(),
        upstream_decision: UpstreamDecisionSchema,
    }),
    z.object({
        id: z.string(),
        type: z.literal("channel_send"),
        payload: ChannelSendPayloadSchema,
        constraints: CommandConstraintsSchema.optional(),
        upstream_decision: UpstreamDecisionSchema,
    }),
    z.object({
        id: z.string(),
        type: z.literal("noop"),
        payload: z.object({}).passthrough(),
        constraints: CommandConstraintsSchema.optional(),
        upstream_decision: UpstreamDecisionSchema,
    }),
]);
/**
 * Feedback from BLUE-TANUKI executor back to HDS-BRAIN.
 * Used by HDS-BRAIN to update its state machine.
 */
export const ExecuteFeedbackSchema = z.object({
    command_id: z.string(),
    status: z.enum(["success", "failed", "suspended"]),
    result: z.unknown().optional(),
    error: z.string().optional(),
    metrics: z.object({
        duration_ms: z.number(),
        tokens_used: z.number().optional(),
        tool_calls: z.number().optional(),
    }),
});
/**
 * Inbound request that reaches HDS-BRAIN. Channel-agnostic.
 * BLUE-TANUKI's channel adapters normalize raw channel events into this shape.
 */
export const InboundRequestSchema = z.object({
    id: z.string(),
    channel: z.string(),
    user: z.string(),
    content: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.unknown()).optional(),
});
//# sourceMappingURL=types.js.map
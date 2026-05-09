import { z } from "zod";
/**
 * Decision values returned by HDS-BRAIN's commit phase.
 * - ASSERT       : Execute. Pass command to BLUE-TANUKI.
 * - SUSPEND      : Hold. Wait for resolution (human/external signal).
 * - OUT_OF_SCOPE : Outside protected scope. No action.
 * - FAIL         : Reject. Audit-only.
 */
export declare const DecisionSchema: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
export type Decision = z.infer<typeof DecisionSchema>;
/**
 * The upstream (HDS-BRAIN) decision attached to every command sent downstream.
 * Used for audit traceability — every executor action carries the F→M→C trace.
 */
export declare const UpstreamDecisionSchema: z.ZodObject<{
    frame_goal: z.ZodString;
    model_abstraction: z.ZodString;
    commit_hash: z.ZodString;
    commit_decision: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
}, "strip", z.ZodTypeAny, {
    frame_goal: string;
    model_abstraction: string;
    commit_hash: string;
    commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
}, {
    frame_goal: string;
    model_abstraction: string;
    commit_hash: string;
    commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
}>;
export type UpstreamDecision = z.infer<typeof UpstreamDecisionSchema>;
/**
 * LLM call payload (one of the executor's primary command types).
 */
export declare const LLMCallPayloadSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">;
    /**
     * Optional downstream provider selector. This is a routing hint, not an
     * authority signal: HDS-BRAIN still owns the ASSERT/SUSPEND/FAIL decision,
     * and the executor resolves the hint against its configured registry.
     */
    backend_hint: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    /**
     * Optional session identifier. When set, the executor's SessionStore
     * (if configured) will (a) prepend retained history before calling the
     * LLM, and (b) append the current user message and the assistant's
     * reply on success. When unset, history is not consulted nor written.
     *
     * Convention used by the gateway: `${channel}:${user}` (e.g.
     * `slack:U12345`, `webchat:bob`). The executor treats it opaquely.
     */
    session_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    messages: {
        role: "system" | "user" | "assistant";
        content: string;
    }[];
    backend_hint?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    session_id?: string | undefined;
}, {
    messages: {
        role: "system" | "user" | "assistant";
        content: string;
    }[];
    backend_hint?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    session_id?: string | undefined;
}>;
export type LLMCallPayload = z.infer<typeof LLMCallPayloadSchema>;
/**
 * Tool call payload.
 */
export declare const ToolCallPayloadSchema: z.ZodObject<{
    tool_name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    tool_name: string;
    arguments: Record<string, unknown>;
}, {
    tool_name: string;
    arguments: Record<string, unknown>;
}>;
export type ToolCallPayload = z.infer<typeof ToolCallPayloadSchema>;
/**
 * Channel send payload (e.g. reply on Slack/Discord/WebChat).
 */
export declare const ChannelSendPayloadSchema: z.ZodObject<{
    channel: z.ZodString;
    target: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    channel: string;
    target: string;
}, {
    content: string;
    channel: string;
    target: string;
}>;
export type ChannelSendPayload = z.infer<typeof ChannelSendPayloadSchema>;
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
export declare const ToolCapabilitySchema: z.ZodString;
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;
/**
 * Constraints attached to a command. Set by upstream, enforced by executor.
 */
export declare const CommandConstraintsSchema: z.ZodObject<{
    max_tokens: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    allowed_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allowed_capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    max_tokens?: number | undefined;
    timeout_ms?: number | undefined;
    allowed_tools?: string[] | undefined;
    allowed_capabilities?: string[] | undefined;
}, {
    max_tokens?: number | undefined;
    timeout_ms?: number | undefined;
    allowed_tools?: string[] | undefined;
    allowed_capabilities?: string[] | undefined;
}>;
export type CommandConstraints = z.infer<typeof CommandConstraintsSchema>;
/**
 * Discriminated union of all command shapes.
 * BLUE-TANUKI executor switches on `type`.
 */
export declare const ExecuteCommandSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"llm_call">;
    payload: z.ZodObject<{
        messages: z.ZodArray<z.ZodObject<{
            role: z.ZodEnum<["system", "user", "assistant"]>;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            role: "system" | "user" | "assistant";
            content: string;
        }, {
            role: "system" | "user" | "assistant";
            content: string;
        }>, "many">;
        /**
         * Optional downstream provider selector. This is a routing hint, not an
         * authority signal: HDS-BRAIN still owns the ASSERT/SUSPEND/FAIL decision,
         * and the executor resolves the hint against its configured registry.
         */
        backend_hint: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        /**
         * Optional session identifier. When set, the executor's SessionStore
         * (if configured) will (a) prepend retained history before calling the
         * LLM, and (b) append the current user message and the assistant's
         * reply on success. When unset, history is not consulted nor written.
         *
         * Convention used by the gateway: `${channel}:${user}` (e.g.
         * `slack:U12345`, `webchat:bob`). The executor treats it opaquely.
         */
        session_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        messages: {
            role: "system" | "user" | "assistant";
            content: string;
        }[];
        backend_hint?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        session_id?: string | undefined;
    }, {
        messages: {
            role: "system" | "user" | "assistant";
            content: string;
        }[];
        backend_hint?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        session_id?: string | undefined;
    }>;
    constraints: z.ZodOptional<z.ZodObject<{
        max_tokens: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        allowed_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allowed_capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }>>;
    upstream_decision: z.ZodObject<{
        frame_goal: z.ZodString;
        model_abstraction: z.ZodString;
        commit_hash: z.ZodString;
        commit_decision: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
    }, "strip", z.ZodTypeAny, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "llm_call";
    id: string;
    payload: {
        messages: {
            role: "system" | "user" | "assistant";
            content: string;
        }[];
        backend_hint?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        session_id?: string | undefined;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}, {
    type: "llm_call";
    id: string;
    payload: {
        messages: {
            role: "system" | "user" | "assistant";
            content: string;
        }[];
        backend_hint?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        session_id?: string | undefined;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"tool_call">;
    payload: z.ZodObject<{
        tool_name: z.ZodString;
        arguments: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        tool_name: string;
        arguments: Record<string, unknown>;
    }, {
        tool_name: string;
        arguments: Record<string, unknown>;
    }>;
    constraints: z.ZodOptional<z.ZodObject<{
        max_tokens: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        allowed_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allowed_capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }>>;
    upstream_decision: z.ZodObject<{
        frame_goal: z.ZodString;
        model_abstraction: z.ZodString;
        commit_hash: z.ZodString;
        commit_decision: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
    }, "strip", z.ZodTypeAny, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "tool_call";
    id: string;
    payload: {
        tool_name: string;
        arguments: Record<string, unknown>;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}, {
    type: "tool_call";
    id: string;
    payload: {
        tool_name: string;
        arguments: Record<string, unknown>;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"channel_send">;
    payload: z.ZodObject<{
        channel: z.ZodString;
        target: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        channel: string;
        target: string;
    }, {
        content: string;
        channel: string;
        target: string;
    }>;
    constraints: z.ZodOptional<z.ZodObject<{
        max_tokens: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        allowed_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allowed_capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }>>;
    upstream_decision: z.ZodObject<{
        frame_goal: z.ZodString;
        model_abstraction: z.ZodString;
        commit_hash: z.ZodString;
        commit_decision: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
    }, "strip", z.ZodTypeAny, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "channel_send";
    id: string;
    payload: {
        content: string;
        channel: string;
        target: string;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}, {
    type: "channel_send";
    id: string;
    payload: {
        content: string;
        channel: string;
        target: string;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"noop">;
    payload: z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>;
    constraints: z.ZodOptional<z.ZodObject<{
        max_tokens: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        allowed_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allowed_capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }, {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    }>>;
    upstream_decision: z.ZodObject<{
        frame_goal: z.ZodString;
        model_abstraction: z.ZodString;
        commit_hash: z.ZodString;
        commit_decision: z.ZodEnum<["ASSERT", "SUSPEND", "OUT_OF_SCOPE", "FAIL"]>;
    }, "strip", z.ZodTypeAny, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }, {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "noop";
    id: string;
    payload: {} & {
        [k: string]: unknown;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}, {
    type: "noop";
    id: string;
    payload: {} & {
        [k: string]: unknown;
    };
    upstream_decision: {
        frame_goal: string;
        model_abstraction: string;
        commit_hash: string;
        commit_decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL";
    };
    constraints?: {
        max_tokens?: number | undefined;
        timeout_ms?: number | undefined;
        allowed_tools?: string[] | undefined;
        allowed_capabilities?: string[] | undefined;
    } | undefined;
}>]>;
export type ExecuteCommand = z.infer<typeof ExecuteCommandSchema>;
/**
 * Feedback from BLUE-TANUKI executor back to HDS-BRAIN.
 * Used by HDS-BRAIN to update its state machine.
 */
export declare const ExecuteFeedbackSchema: z.ZodObject<{
    command_id: z.ZodString;
    status: z.ZodEnum<["success", "failed", "suspended"]>;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    metrics: z.ZodObject<{
        duration_ms: z.ZodNumber;
        tokens_used: z.ZodOptional<z.ZodNumber>;
        tool_calls: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number;
        tokens_used?: number | undefined;
        tool_calls?: number | undefined;
    }, {
        duration_ms: number;
        tokens_used?: number | undefined;
        tool_calls?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "failed" | "suspended";
    command_id: string;
    metrics: {
        duration_ms: number;
        tokens_used?: number | undefined;
        tool_calls?: number | undefined;
    };
    result?: unknown;
    error?: string | undefined;
}, {
    status: "success" | "failed" | "suspended";
    command_id: string;
    metrics: {
        duration_ms: number;
        tokens_used?: number | undefined;
        tool_calls?: number | undefined;
    };
    result?: unknown;
    error?: string | undefined;
}>;
export type ExecuteFeedback = z.infer<typeof ExecuteFeedbackSchema>;
/**
 * Inbound request that reaches HDS-BRAIN. Channel-agnostic.
 * BLUE-TANUKI's channel adapters normalize raw channel events into this shape.
 */
export declare const InboundRequestSchema: z.ZodObject<{
    id: z.ZodString;
    channel: z.ZodString;
    user: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodNumber;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    user: string;
    content: string;
    channel: string;
    id: string;
    timestamp: number;
    metadata?: Record<string, unknown> | undefined;
}, {
    user: string;
    content: string;
    channel: string;
    id: string;
    timestamp: number;
    metadata?: Record<string, unknown> | undefined;
}>;
export type InboundRequest = z.infer<typeof InboundRequestSchema>;
//# sourceMappingURL=types.d.ts.map
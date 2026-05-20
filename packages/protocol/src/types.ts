import { z } from "zod";

const DangerousObjectKeySchema = z.string().refine(
  (key) => key !== "__proto__" && key !== "prototype" && key !== "constructor",
  "dangerous object key is not allowed",
);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(DangerousObjectKeySchema, JsonValueSchema.optional()),
  ]),
);

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
export type Decision = z.infer<typeof DecisionSchema>;

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
export type UpstreamDecision = z.infer<typeof UpstreamDecisionSchema>;

/**
 * LLM call payload (one of the executor's primary command types).
 */
export const LLMCallPayloadSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
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
export type LLMCallPayload = z.infer<typeof LLMCallPayloadSchema>;

/**
 * Tool call payload.
 */
export const ToolCallPayloadSchema = z.object({
  tool_name: z.string(),
  arguments: z.record(z.unknown()),
});
export type ToolCallPayload = z.infer<typeof ToolCallPayloadSchema>;

/**
 * Channel send payload (e.g. reply on Slack/Discord/WebChat).
 */
export const ChannelSendPayloadSchema = z.object({
  channel: z.string(),
  target: z.string(),
  content: z.string(),
});
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
 *   - network:<host>
 *   - shell:probe
 *   - shell:exec
 *   - channel:send
 */
export const ToolCapabilitySchema = z.string().min(1);
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;

/**
 * Constraints attached to a command. Set by upstream, enforced by executor.
 */
export const CommandConstraintsSchema = z.object({
  max_tokens: z.number().int().positive().optional(),
  timeout_ms: z.number().int().positive().optional(),
  allowed_tools: z.array(z.string().min(1)).optional(),
  allowed_capabilities: z.array(ToolCapabilitySchema).optional(),
});
export type CommandConstraints = z.infer<typeof CommandConstraintsSchema>;

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
export type ExecuteCommand = z.infer<typeof ExecuteCommandSchema>;

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
export type ExecuteFeedback = z.infer<typeof ExecuteFeedbackSchema>;

/**
 * Inbound request that reaches HDS-BRAIN. Channel-agnostic.
 * BLUE-TANUKI's channel adapters normalize raw channel events into this shape.
 */
export const InboundRequestSchema = z.object({
  id: z.string().min(1).max(200),
  channel: z.string().min(1).max(80),
  user: z.string().min(1).max(200),
  content: z.string().max(200_000),
  timestamp: z.number().finite().nonnegative(),
  metadata: z.record(DangerousObjectKeySchema, JsonValueSchema.optional()).optional(),
}).strict();
export type InboundRequest = z.infer<typeof InboundRequestSchema>;

export type InboundRequestBoundaryFailureReason =
  | "schema_validation_failed"
  | "canonicalization_failed";

export interface InboundRequestBoundaryFailure {
  ok: false;
  reason: InboundRequestBoundaryFailureReason;
  issues: string[];
}

export interface InboundRequestBoundarySuccess {
  ok: true;
  request: InboundRequest;
}

export type InboundRequestBoundaryResult =
  | InboundRequestBoundarySuccess
  | InboundRequestBoundaryFailure;

export function parseInboundRequestAtBoundary(raw: unknown): InboundRequestBoundaryResult {
  const parsed = InboundRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "schema_validation_failed",
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`),
    };
  }
  try {
    return {
      ok: true,
      request: normalizeInboundRequestForAuthority(parsed.data),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "canonicalization_failed",
      issues: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export function normalizeInboundRequestForAuthority(request: InboundRequest): InboundRequest {
  return {
    id: normalizeScalar(request.id, "id"),
    channel: normalizeScalar(request.channel, "channel"),
    user: normalizeScalar(request.user, "user"),
    content: request.content.normalize("NFKC"),
    timestamp: request.timestamp,
    ...(request.metadata ? { metadata: canonicalJsonObject(request.metadata) } : {}),
  };
}

function normalizeScalar(value: string, field: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (normalized.length === 0) {
    throw new Error(`${field} normalized to empty string`);
  }
  if (normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
    throw new Error(`${field} contains path-like traversal characters`);
  }
  return normalized;
}

function canonicalJsonObject(value: Record<string, JsonValue | undefined>): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const [key, item] of Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) {
    if (item === undefined) continue;
    const normalizedKey = normalizeMetadataKey(key);
    out[normalizedKey] = canonicalJsonValue(item);
  }
  return out;
}

function canonicalJsonValue(value: JsonValue): JsonValue {
  if (typeof value === "string") return value.normalize("NFKC");
  if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item));
  if (value && typeof value === "object") return canonicalJsonObject(value);
  return value;
}

function normalizeMetadataKey(key: string): string {
  const normalized = key.normalize("NFKC").trim();
  if (normalized.length === 0) {
    throw new Error("metadata key normalized to empty string");
  }
  if (normalized === "__proto__" || normalized === "prototype" || normalized === "constructor") {
    throw new Error(`metadata key is not allowed: ${normalized}`);
  }
  return normalized;
}

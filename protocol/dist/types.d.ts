import { z } from "zod";
/**
 * Decision values returned by HDS-BRAIN's commit phase.
 * - ASSERT       : Execute. Pass command to BLUE-TANUKI.
 * - SUSPEND      : Hold. Wait for resolution (human/external signal).
 * - OUT_OF_SCOPE : Outside protected scope. No action.
 * - FAIL         : Reject. Audit-only.
 */
export declare const DecisionSchema: any;
export type Decision = z.infer<typeof DecisionSchema>;
/**
 * The upstream (HDS-BRAIN) decision attached to every command sent downstream.
 * Used for audit traceability — every executor action carries the F→M→C trace.
 */
export declare const UpstreamDecisionSchema: any;
export type UpstreamDecision = z.infer<typeof UpstreamDecisionSchema>;
/**
 * LLM call payload (one of the executor's primary command types).
 */
export declare const LLMCallPayloadSchema: any;
export type LLMCallPayload = z.infer<typeof LLMCallPayloadSchema>;
/**
 * Tool call payload.
 */
export declare const ToolCallPayloadSchema: any;
export type ToolCallPayload = z.infer<typeof ToolCallPayloadSchema>;
/**
 * Channel send payload (e.g. reply on Slack/Discord/WebChat).
 */
export declare const ChannelSendPayloadSchema: any;
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
export declare const ToolCapabilitySchema: any;
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;
/**
 * Constraints attached to a command. Set by upstream, enforced by executor.
 */
export declare const CommandConstraintsSchema: any;
export type CommandConstraints = z.infer<typeof CommandConstraintsSchema>;
/**
 * Discriminated union of all command shapes.
 * BLUE-TANUKI executor switches on `type`.
 */
export declare const ExecuteCommandSchema: any;
export type ExecuteCommand = z.infer<typeof ExecuteCommandSchema>;
/**
 * Feedback from BLUE-TANUKI executor back to HDS-BRAIN.
 * Used by HDS-BRAIN to update its state machine.
 */
export declare const ExecuteFeedbackSchema: any;
export type ExecuteFeedback = z.infer<typeof ExecuteFeedbackSchema>;
/**
 * Inbound request that reaches HDS-BRAIN. Channel-agnostic.
 * BLUE-TANUKI's channel adapters normalize raw channel events into this shape.
 */
export declare const InboundRequestSchema: any;
export type InboundRequest = z.infer<typeof InboundRequestSchema>;
//# sourceMappingURL=types.d.ts.map
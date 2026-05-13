import type { InboundRequest } from "@blue-tanuki/protocol";
import type { ActorRef, FrameResult, HDSProcessDefinition, MemoryTrace, PolicyConfig } from "./types.js";
import { resolveActor, resolveProcess } from "./process.js";
import { buildMemoryTrace, type MemoryReaderPort } from "./memory_trace.js";

/**
 * Optional frame configuration: lets the gateway decide which policy
 * to attach to a request, e.g. by channel, user, or content prefix.
 *
 * If no resolver is provided, all requests map to the policy's
 * problem_definition_id (single-policy mode).
 */
export interface FrameConfig {
  default_policy: PolicyConfig;
  resolve?: (req: InboundRequest) => string | undefined;
  /**
   * Upstream-owned deterministic memory reader. HDS-BRAIN may attach memory
   * hits to the audit frame, but the current release never lets those hits expand authority.
   */
  memory_reader?: MemoryReaderPort;
  /** Override actor/process resolution for tests or higher-level gateway policy. */
  actor?: ActorRef;
  process?: HDSProcessDefinition;
  /**
   * Override protected_values per request, if needed.
   * Falls back to a conservative default.
   */
  protected_values?: string[];
}

const DEFAULT_PROTECTED_VALUES = [
  "user_safety",
  "audit_traceability",
  "no_irreversible_action",
  "authority_non_bypass",
];

/**
 * F (Frame) phase.
 *
 * Responsibilities:
 *   - Resolve actor/process before any downstream action.
 *   - Attach deterministic memory hits as traceable context, not authority.
 *   - Extract goal (truncated content as a stand-in for richer NLP later).
 *   - Attach protected_values from config.
 *   - Construct world closure W=(X,R,M).
 *   - Resolve which problem_definition_id this request maps to.
 *
 * This layer never calls an LLM. Goal "extraction" is structural truncation;
 * memory retrieval is exact/tag/recent only and is explicitly non-authority.
 */
export function frame(req: InboundRequest, config?: FrameConfig): FrameResult {
  const actor = config?.actor ?? resolveActor(req);
  const process = config?.process ?? resolveProcess(req, actor);
  const memory_trace: MemoryTrace = buildMemoryTrace(req, process, config?.memory_reader);
  const problem_definition_id =
    config?.resolve?.(req) ?? config?.default_policy.problem_definition_id ?? "default_v1";

  return {
    actor,
    process,
    memory_trace,
    goal: req.content.slice(0, 200),
    protected_values: config?.protected_values ?? DEFAULT_PROTECTED_VALUES,
    world_closure: {
      x: [req.channel, req.user, actor.actor_kind, process.process_id],
      r: ["request_response", "actor_process_binding"],
      m: ["text", "hds_authority_plane"],
    },
    problem_definition_id,
  };
}

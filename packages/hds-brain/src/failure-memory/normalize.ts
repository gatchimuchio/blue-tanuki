import type { ExecuteCommand } from "@blue-tanuki/protocol";
import { stableJson } from "../complete-history/codec.js";
import type { FailureGateCandidate, FailureScope } from "./types.js";

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const ISO_RE = /\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(?:\.\d+)?z\b/gi;
const LONG_HEX_RE = /\b[0-9a-f]{32,}\b/gi;
const UNIX_PATH_RE = /(?:^|\s)(\/(?:[\w.-]+\/)+[\w.-]+)/g;
const WINDOWS_PATH_RE = /\b[a-z]:\\(?:[^\\\s]+\\)+[^\\\s]+/gi;

export function normalizeFailurePattern(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(ISO_RE, "<timestamp>")
    .replace(UUID_RE, "<id>")
    .replace(LONG_HEX_RE, "<hash>")
    .replace(WINDOWS_PATH_RE, "<path>")
    .replace(UNIX_PATH_RE, " <path>")
    .replace(/\b\d{10,}\b/g, "<number>")
    .replace(/\s+/g, " ")
    .trim();
}

export function commandOperation(command: ExecuteCommand): string {
  if (command.type === "tool_call") return command.payload.tool_name;
  if (command.type === "llm_call") return "llm_call";
  if (command.type === "channel_send") return `channel_send:${command.payload.channel}`;
  return "noop";
}

export function commandActionPattern(command: ExecuteCommand): string {
  const base = {
    type: command.type,
    operation: commandOperation(command),
    constraints: command.constraints ?? {},
  };
  if (command.type === "tool_call") {
    return stableJson({
      ...base,
      arguments: command.payload.arguments,
    });
  }
  if (command.type === "llm_call") {
    return stableJson({
      ...base,
      messages: command.payload.messages,
      backend_hint: command.payload.backend_hint,
      model: command.payload.model,
      temperature: command.payload.temperature,
    });
  }
  if (command.type === "channel_send") {
    return stableJson({
      ...base,
      channel: command.payload.channel,
      target: command.payload.target,
      content: command.payload.content,
    });
  }
  return stableJson(base);
}

export function candidateFromCommand(
  command: ExecuteCommand,
  context: Record<string, unknown> = {},
): FailureGateCandidate {
  return {
    scope: commandScope(command),
    input_pattern: stableJson({
      upstream_decision: command.upstream_decision.commit_decision,
      frame_goal: command.upstream_decision.frame_goal,
    }),
    action_pattern: commandActionPattern(command),
    context_pattern: stableJson(context),
    command,
    context,
  };
}

export function structuralKey(scope: FailureScope, pattern: string): string {
  const normalized = normalizeFailurePattern(pattern);
  const parsed = parseJsonObject(pattern);
  if (parsed) {
    const operation = stringValue(parsed.operation);
    const type = stringValue(parsed.type);
    const tool = stringValue(parsed.tool_name);
    if (operation || type || tool) {
      return [scope, type, operation, tool].filter(Boolean).join(":");
    }
  }
  const tokens = normalized
    .split(/[^a-z0-9_.:-]+/g)
    .filter((token) => token.length >= 3 && token !== "path" && token !== "number")
    .slice(0, 5);
  return [scope, ...tokens].join(":");
}

export function semanticOverlap(left: string, right: string): number {
  const a = new Set(semanticTokens(left));
  const b = new Set(semanticTokens(right));
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count += 1;
  }
  return count;
}

function commandScope(command: ExecuteCommand): FailureScope {
  if (command.type === "tool_call") {
    const name = command.payload.tool_name;
    if (name.startsWith("file.")) return "file";
    if (name.includes("test")) return "test";
    return "tool";
  }
  if (command.type === "llm_call") return "llm_output";
  if (command.type === "channel_send") return "workflow";
  return "command";
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function semanticTokens(value: string): string[] {
  return normalizeFailurePattern(value)
    .split(/[^a-z0-9_.:-]+/g)
    .filter((token) => token.length >= 4 && !["with", "from", "that", "this", "path"].includes(token));
}

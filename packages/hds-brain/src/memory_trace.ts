import type { InboundRequest } from "@blue-tanuki/protocol";
import type {
  HDSProcessDefinition,
  MemoryHit,
  MemoryReadPolicy,
  MemoryTrace,
} from "./types.js";
import type { MemoryEntry } from "./long-term-memory/index.js";

export interface MemoryReaderPort {
  recent(n: number): readonly unknown[];
  all?: () => readonly unknown[];
  findByRequestId?: (request_id: string) => unknown | null;
  findByTag?: (tag: string, limit?: number) => readonly unknown[];
}

export function buildMemoryTrace(
  req: InboundRequest,
  process: HDSProcessDefinition,
  reader?: MemoryReaderPort,
): MemoryTrace {
  const policy = process.memory_policy;
  if (!policy.enabled || !reader || !policy.allowed_sources.includes("hds_ltm")) {
    return emptyTrace(policy, process.process_id);
  }

  const candidates = collectCandidates(reader, policy);
  const hits: MemoryHit[] = [];
  const seen = new Set<string>();

  const add = (entry: MemoryEntry, reason: MemoryHit["reason"], matched_on?: string): void => {
    if (hits.length >= policy.max_hits) return;
    if (seen.has(entry.entry_hash)) return;
    seen.add(entry.entry_hash);
    hits.push({
      source: "hds_ltm",
      memory_id: entry.request_id,
      entry_hash: entry.entry_hash,
      reason,
      matched_on,
      summary: {
        goal: entry.goal,
        problem_definition_id: entry.problem_definition_id,
        abstraction: entry.abstraction,
      },
    });
  };

  if (policy.retrieval_modes.includes("exact")) {
    for (const exact of exactKeys(req)) {
      const direct = reader.findByRequestId?.(exact);
      if (isMemoryEntry(direct)) add(direct, "exact", exact);
      for (const entry of candidates) {
        if (entry.request_id === exact) add(entry, "exact", exact);
      }
    }
  }

  if (policy.retrieval_modes.includes("tag")) {
    const tags = tagKeys(req, process);
    for (const tag of tags) {
      const direct = reader.findByTag?.(tag, policy.max_hits);
      if (direct) {
        for (const entry of direct) if (isMemoryEntry(entry)) add(entry, "tag", tag);
      }
      for (const entry of candidates) {
        if (entryMatchesTag(entry, tag)) add(entry, "tag", tag);
      }
    }
  }

  if (policy.retrieval_modes.includes("recent")) {
    for (const entry of reader.recent(policy.max_hits)) {
      if (isMemoryEntry(entry)) add(entry, "recent");
    }
  }

  return {
    policy_id: policy.policy_id,
    process_id: process.process_id,
    used_for_authority: false,
    hits,
  };
}

function emptyTrace(policy: MemoryReadPolicy, process_id: string): MemoryTrace {
  return {
    policy_id: policy.policy_id,
    process_id,
    used_for_authority: false,
    hits: [],
  };
}

function collectCandidates(reader: MemoryReaderPort, policy: MemoryReadPolicy): MemoryEntry[] {
  const raw = reader.all ? reader.all() : reader.recent(Math.max(policy.max_hits * 5, policy.max_hits));
  return raw.filter(isMemoryEntry).slice(-Math.max(policy.max_hits * 20, policy.max_hits));
}

function exactKeys(req: InboundRequest): string[] {
  const meta = req.metadata ?? {};
  return [
    stringField(meta, "request_id"),
    stringField(meta, "source_request_id"),
    stringField(meta, "reference_request_id"),
    stringField(meta, "blue_tanuki.reference_request_id"),
  ].filter((v): v is string => Boolean(v));
}

function tagKeys(req: InboundRequest, process: HDSProcessDefinition): string[] {
  const tags = new Set<string>();
  tags.add(req.channel.toLowerCase());
  tags.add(req.user.toLowerCase());
  tags.add(process.process_kind);
  const tool = toolName(req.content) ?? toolNameFromMetadata(req.metadata ?? {});
  if (tool) tags.add(tool.toLowerCase());
  return Array.from(tags).filter((tag) => tag.length > 0);
}

function entryMatchesTag(entry: MemoryEntry, tag: string): boolean {
  const hay = [
    entry.goal,
    entry.problem_definition_id,
    entry.abstraction,
    entry.actor?.actor_id ?? "",
    entry.actor?.actor_kind ?? "",
    entry.actor?.trust_level ?? "",
    entry.process?.process_id ?? "",
    entry.process?.process_kind ?? "",
    ...(entry.tags ?? []),
    ...entry.closure.x,
    ...entry.closure.r,
    ...entry.closure.m,
  ].join("\n").toLowerCase();
  return hay.includes(tag.toLowerCase());
}

function toolName(content: string): string | undefined {
  const match = /^(?:tool:([A-Za-z0-9_.-]+)|\/tool\s+([A-Za-z0-9_.-]+))/.exec(content.trim());
  return match?.[1] ?? match?.[2];
}

function toolNameFromMetadata(meta: Record<string, unknown>): string | undefined {
  const raw = meta["blue_tanuki.tool_call"] ?? meta.tool_call;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = (raw as Record<string, unknown>).tool_name ?? (raw as Record<string, unknown>).tool;
  return typeof value === "string" ? value : undefined;
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isMemoryEntry(value: unknown): value is MemoryEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Partial<MemoryEntry>;
  return typeof v.request_id === "string" && typeof v.entry_hash === "string" && typeof v.goal === "string" && typeof v.problem_definition_id === "string" && typeof v.abstraction === "string" && Boolean(v.closure);
}

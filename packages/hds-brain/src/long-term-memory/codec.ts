import type { MemoryEntry } from "./types.js";

export type MemoryEntryHashInput = Omit<MemoryEntry, "entry_hash">;

/**
 * Stable field order for hash input. This keeps verification independent of
 * incidental object construction order. Optional fields are omitted when absent
 * so legacy JSONL entries from earlier phases continue to verify.
 */
export function canonicalizeMemoryEntry(entry: MemoryEntryHashInput): string {
  return JSON.stringify({
    index: entry.index,
    request_id: entry.request_id,
    timestamp: entry.timestamp,
    closure: {
      x: [...entry.closure.x],
      r: [...entry.closure.r],
      m: [...entry.closure.m],
    },
    goal: entry.goal,
    problem_definition_id: entry.problem_definition_id,
    abstraction: entry.abstraction,
    actor: entry.actor,
    process: entry.process,
    commit: entry.commit,
    tags: entry.tags ? [...entry.tags] : undefined,
    prev_hash: entry.prev_hash,
  });
}

export function encodeMemoryEntry(entry: MemoryEntry): string {
  return JSON.stringify({
    index: entry.index,
    request_id: entry.request_id,
    timestamp: entry.timestamp,
    closure: {
      x: [...entry.closure.x],
      r: [...entry.closure.r],
      m: [...entry.closure.m],
    },
    goal: entry.goal,
    problem_definition_id: entry.problem_definition_id,
    abstraction: entry.abstraction,
    actor: entry.actor,
    process: entry.process,
    commit: entry.commit,
    tags: entry.tags ? [...entry.tags] : undefined,
    entry_hash: entry.entry_hash,
    prev_hash: entry.prev_hash,
  });
}

export function decodeMemoryEntry(line: string): MemoryEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (err) {
    throw new Error(`LongTermMemoryStore: malformed JSONL entry: ${(err as Error).message}`);
  }

  if (!isMemoryEntry(parsed)) {
    throw new Error("LongTermMemoryStore: malformed memory entry");
  }
  return parsed;
}

function isMemoryEntry(value: unknown): value is MemoryEntry {
  if (!isRecord(value)) return false;
  if (!isNonNegativeInteger(value.index)) return false;
  if (typeof value.request_id !== "string") return false;
  if (typeof value.timestamp !== "number") return false;
  if (!isClosure(value.closure)) return false;
  if (typeof value.goal !== "string") return false;
  if (typeof value.problem_definition_id !== "string") return false;
  if (typeof value.abstraction !== "string") return false;
  if (value.actor !== undefined && !isRecord(value.actor)) return false;
  if (value.process !== undefined && !isRecord(value.process)) return false;
  if (value.commit !== undefined && !isRecord(value.commit)) return false;
  if (value.tags !== undefined && !isStringArray(value.tags)) return false;
  if (typeof value.entry_hash !== "string") return false;
  if (typeof value.prev_hash !== "string") return false;
  return true;
}

function isClosure(value: unknown): value is MemoryEntry["closure"] {
  if (!isRecord(value)) return false;
  return isStringArray(value.x) && isStringArray(value.r) && isStringArray(value.m);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

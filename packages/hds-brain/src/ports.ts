import type { AuditEntry } from "./audit.js";
import type { PolicyConfig } from "./types.js";

export interface HDSLLMPort {
  readonly kind: "llm";
}

export interface HDSMemoryPort {
  recent(n: number): readonly unknown[];
  all?: () => readonly unknown[];
  findByRequestId?: (request_id: string) => unknown | null;
  findByTag?: (tag: string, limit?: number) => readonly unknown[];
}

export interface HDSHistoryEvent {
  id: string;
  kind: string;
  timestamp: number;
  payload: unknown;
  used_for_authority: false;
}

export interface HDSHistoryPort {
  append(event: HDSHistoryEvent): void | Promise<void>;
  verify?(): boolean;
  recent?(n: number): readonly HDSHistoryEvent[];
}

export interface HDSAuditPort {
  append(log: unknown): unknown;
  verify(): boolean;
  list(): readonly AuditEntry[];
}

export interface HDSPolicyPort {
  load(): PolicyConfig;
  verify?(): boolean;
}

export interface HDSClockPort {
  nowMs(): number;
  nowIso(): string;
  monotonic?(): number;
}

export const COMPLETE_HISTORY_SCHEMA_VERSION = "phase12-s2-complete-history-v1";

export type CompleteHistoryKind =
  | "user_input"
  | "llm_history"
  | "hds_decision"
  | "approval_history"
  | "execution_history"
  | "audit_history"
  | "final_output";

export interface CompleteHistoryAppendInput {
  kind: CompleteHistoryKind;
  payload: unknown;
  request_id?: string | null;
  command_id?: string | null;
  actor?: string;
  source?: string;
  timestamp?: number;
}

export interface CompleteHistoryEntry {
  schema_version: typeof COMPLETE_HISTORY_SCHEMA_VERSION;
  index: number;
  id: string;
  kind: CompleteHistoryKind;
  request_id: string | null;
  command_id: string | null;
  actor?: string;
  source?: string;
  payload: unknown;
  payload_digest: string;
  used_for_authority: false;
  timestamp: number;
  prev_hash: string;
  entry_hash: string;
}

export interface CompleteHistoryReplayFilter {
  kind?: CompleteHistoryKind;
  request_id?: string | null;
  command_id?: string | null;
}

export interface CompleteHistoryExport {
  schema_version: typeof COMPLETE_HISTORY_SCHEMA_VERSION;
  exported_at: number;
  entries: CompleteHistoryEntry[];
  entries_count: number;
  chain_valid: boolean;
  complete_history_used_for_authority: false;
}

export interface CompleteHistoryStoreOptions {
  filepath?: string;
  max_entries?: number;
}

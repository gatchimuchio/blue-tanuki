import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  completeHistoryEntryHash,
  decodeCompleteHistoryEntry,
  encodeCompleteHistoryEntry,
  sha256Hex,
} from "./codec.js";
import {
  COMPLETE_HISTORY_SCHEMA_VERSION,
  type CompleteHistoryAppendInput,
  type CompleteHistoryEntry,
  type CompleteHistoryExport,
  type CompleteHistoryReplayFilter,
  type CompleteHistoryStoreOptions,
} from "./types.js";

export class CompleteHistoryStore {
  private entries: CompleteHistoryEntry[] = [];
  private skipped = 0;
  private readonly filepath?: string;
  private readonly max_entries: number;

  constructor(opts: CompleteHistoryStoreOptions = {}) {
    this.filepath = opts.filepath;
    this.max_entries = opts.max_entries ?? Number.POSITIVE_INFINITY;
    if (this.filepath && existsSync(this.filepath)) {
      this.loadFromFile();
    } else if (this.filepath) {
      const dir = dirname(this.filepath);
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  append(input: CompleteHistoryAppendInput): CompleteHistoryEntry | null {
    if (this.entries.length >= this.max_entries) {
      this.skipped += 1;
      return null;
    }
    const prev_hash = this.entries.length === 0 ? "GENESIS" : this.entries[this.entries.length - 1]!.entry_hash;
    const withoutHash: Omit<CompleteHistoryEntry, "entry_hash"> = {
      schema_version: COMPLETE_HISTORY_SCHEMA_VERSION,
      index: this.entries.length,
      id: randomUUID(),
      kind: input.kind,
      request_id: input.request_id ?? null,
      command_id: input.command_id ?? null,
      actor: input.actor,
      source: input.source,
      payload: input.payload,
      payload_digest: sha256Hex(input.payload),
      used_for_authority: false,
      timestamp: input.timestamp ?? Date.now(),
      prev_hash,
    };
    const entry: CompleteHistoryEntry = {
      ...withoutHash,
      entry_hash: completeHistoryEntryHash(withoutHash),
    };
    if (this.filepath) {
      appendFileSync(this.filepath, encodeCompleteHistoryEntry(entry) + "\n");
    }
    this.entries.push(entry);
    return entry;
  }

  verify(): boolean {
    let prev_hash = "GENESIS";
    for (let i = 0; i < this.entries.length; i += 1) {
      const entry = this.entries[i]!;
      if (entry.index !== i) return false;
      if (entry.prev_hash !== prev_hash) return false;
      if (entry.used_for_authority !== false) return false;
      const expectedPayloadDigest = sha256Hex(entry.payload);
      if (entry.payload_digest !== expectedPayloadDigest) return false;
      const { entry_hash: _entryHash, ...withoutHash } = entry;
      const expectedEntryHash = completeHistoryEntryHash(withoutHash);
      if (entry.entry_hash !== expectedEntryHash) return false;
      prev_hash = entry.entry_hash;
    }
    return true;
  }

  replay(filter: CompleteHistoryReplayFilter = {}): readonly CompleteHistoryEntry[] {
    return this.entries
      .filter((entry) => {
        if (filter.kind !== undefined && entry.kind !== filter.kind) return false;
        if (filter.request_id !== undefined && entry.request_id !== filter.request_id) return false;
        if (filter.command_id !== undefined && entry.command_id !== filter.command_id) return false;
        return true;
      })
      .map(cloneEntry);
  }

  exportSnapshot(opts: { exported_at?: number } = {}): CompleteHistoryExport {
    return {
      schema_version: COMPLETE_HISTORY_SCHEMA_VERSION,
      exported_at: opts.exported_at ?? Date.now(),
      entries: this.all(),
      entries_count: this.entries.length,
      chain_valid: this.verify(),
      complete_history_used_for_authority: false,
    };
  }

  exportJson(opts: { exported_at?: number } = {}): string {
    return JSON.stringify(this.exportSnapshot(opts), null, 2);
  }

  all(): CompleteHistoryEntry[] {
    return this.entries.map(cloneEntry);
  }

  size(): number {
    return this.entries.length;
  }

  skippedCount(): number {
    return this.skipped;
  }

  private loadFromFile(): void {
    if (!this.filepath) return;
    const raw = readFileSync(this.filepath, "utf8");
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    this.entries = lines.map(decodeCompleteHistoryEntry);
    if (!this.verify()) {
      throw new Error(`CompleteHistoryStore: chain verification failed on load from ${this.filepath}`);
    }
  }
}

function cloneEntry(entry: CompleteHistoryEntry): CompleteHistoryEntry {
  return structuredClone(entry);
}

import type { AuditRecord } from "./types.js";
/**
 * Append-only audit log with hash-chain.
 * Each entry's hash includes the previous entry's hash, making the log
 * tamper-evident: any modification breaks the chain on `verify()`.
 *
 * Phase 1: optional JSONL file persistence + load-time chain verification.
 *
 * Concurrency note: file writes use synchronous appendFileSync to keep the
 * chain ordering atomic per process. Multi-process writers are not supported
 * in Phase 1; if needed, Phase 2+ should add a write-mutex or single-writer
 * daemon.
 */
export interface AuditEntry {
    index: number;
    log: AuditRecord;
    prev_hash: string;
    entry_hash: string;
}
export interface AuditOptions {
    /**
     * Path to a JSONL file for persistence. If provided and the file exists,
     * the chain is loaded and verified on construction.
     */
    filepath?: string;
}
export declare class AuditLog {
    private entries;
    private readonly filepath?;
    constructor(opts?: AuditOptions);
    append(log: AuditRecord): AuditEntry;
    /**
     * Verify the chain. Returns true iff all hashes are consistent.
     */
    verify(): boolean;
    list(): readonly AuditEntry[];
    size(): number;
    private computeHash;
    private loadFromFile;
}
//# sourceMappingURL=audit.d.ts.map
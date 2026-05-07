import type { DecisionLog } from "../types.js";
import type { MemoryEntry, MemoryStoreOptions } from "./types.js";
export declare class LongTermMemoryStore {
    private readonly filepath?;
    private readonly max_entries;
    private entries;
    private skipped_captures;
    constructor(opts?: MemoryStoreOptions);
    /**
     * Conditional write. Skips non-ASSERT / non-TCP-closed logs and never
     * propagates persistence write failures into the controller path.
     */
    capture(log: DecisionLog): MemoryEntry | null;
    /** Read most recent N entries, newest first. */
    recent(n: number): readonly MemoryEntry[];
    /** Read all entries in insertion order. */
    all(): readonly MemoryEntry[];
    /** Deterministic tag lookup over stored structural fields. Newest first. */
    findByTag(tag: string, limit?: number): readonly MemoryEntry[];
    /** Deterministic actor lookup. Newest first. */
    findByActor(actor_id: string, limit?: number): readonly MemoryEntry[];
    /** Deterministic process lookup. Newest first. */
    findByProcess(process_id: string, limit?: number): readonly MemoryEntry[];
    /** Deterministic request id lookup. */
    findByRequestId(request_id: string): MemoryEntry | null;
    size(): number;
    skippedCount(): number;
    verify(): boolean;
    private createEntry;
    private computeHash;
    private loadFromFile;
}
//# sourceMappingURL=store.d.ts.map
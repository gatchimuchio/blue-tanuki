import type { MemoryEntry } from "./types.js";
export type MemoryEntryHashInput = Omit<MemoryEntry, "entry_hash">;
/**
 * Stable field order for hash input. This keeps verification independent of
 * incidental object construction order. Optional fields are omitted when absent
 * so legacy JSONL entries from earlier phases continue to verify.
 */
export declare function canonicalizeMemoryEntry(entry: MemoryEntryHashInput): string;
export declare function encodeMemoryEntry(entry: MemoryEntry): string;
export declare function decodeMemoryEntry(line: string): MemoryEntry;
//# sourceMappingURL=codec.d.ts.map
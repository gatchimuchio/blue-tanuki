import type { InboundRequest } from "@blue-tanuki/protocol";
import type { HDSProcessDefinition, MemoryTrace } from "./types.js";
export interface MemoryReaderPort {
    recent(n: number): readonly unknown[];
    all?: () => readonly unknown[];
    findByRequestId?: (request_id: string) => unknown | null;
    findByTag?: (tag: string, limit?: number) => readonly unknown[];
}
export declare function buildMemoryTrace(req: InboundRequest, process: HDSProcessDefinition, reader?: MemoryReaderPort): MemoryTrace;
//# sourceMappingURL=memory_trace.d.ts.map
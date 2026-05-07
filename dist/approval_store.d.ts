import type { ApprovalGrant } from "./approval_policy.js";
export interface ApprovalGrantStore {
    list(): readonly ApprovalGrant[];
    add(grant: ApprovalGrant): ApprovalGrant;
    revoke(id: string): boolean;
    clearExpired(now?: number): number;
    size(): number;
}
export declare class MemoryApprovalGrantStore implements ApprovalGrantStore {
    protected grants: Map<string, ApprovalGrant>;
    constructor(initial?: readonly ApprovalGrant[]);
    list(): readonly ApprovalGrant[];
    add(grant: ApprovalGrant): ApprovalGrant;
    revoke(id: string): boolean;
    clearExpired(now?: number): number;
    size(): number;
    protected afterMutation(): void;
}
export declare class JsonFileApprovalGrantStore extends MemoryApprovalGrantStore {
    private readonly filepath;
    constructor(filepath: string);
    protected afterMutation(): void;
    private persist;
}
//# sourceMappingURL=approval_store.d.ts.map
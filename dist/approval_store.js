import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
export class MemoryApprovalGrantStore {
    grants = new Map();
    constructor(initial = []) { for (const grant of initial)
        this.grants.set(grant.id, grant); }
    list() { return Array.from(this.grants.values()).sort((a, b) => a.created_at - b.created_at); }
    add(grant) { this.grants.set(grant.id, grant); this.afterMutation(); return grant; }
    revoke(id) { const grant = this.grants.get(id); if (!grant || !grant.revocable)
        return false; const deleted = this.grants.delete(id); if (deleted)
        this.afterMutation(); return deleted; }
    clearExpired(now = Date.now()) { let n = 0; for (const [id, grant] of this.grants.entries()) {
        if (grant.expires_at !== null && grant.expires_at <= now) {
            this.grants.delete(id);
            n++;
        }
    } if (n > 0)
        this.afterMutation(); return n; }
    size() { return this.grants.size; }
    afterMutation() { }
}
export class JsonFileApprovalGrantStore extends MemoryApprovalGrantStore {
    filepath;
    constructor(filepath) {
        super(loadGrants(filepath));
        this.filepath = filepath;
        const dir = dirname(filepath);
        if (dir && !existsSync(dir))
            mkdirSync(dir, { recursive: true });
        if (!existsSync(filepath))
            this.persist();
    }
    afterMutation() { this.persist(); }
    persist() { writeFileSync(this.filepath, JSON.stringify({ version: 1, grants: this.list() }, null, 2) + "\n", "utf8"); }
}
function loadGrants(filepath) { if (!existsSync(filepath))
    return []; const raw = readFileSync(filepath, "utf8").trim(); if (!raw)
    return []; const parsed = JSON.parse(raw); if (Array.isArray(parsed))
    return parseGrantArray(parsed); if (isRecord(parsed) && Array.isArray(parsed.grants))
    return parseGrantArray(parsed.grants); throw new Error(`ApprovalGrantStore: invalid grants file: ${filepath}`); }
function parseGrantArray(values) { return values.map((value, index) => { if (!isRecord(value))
    throw new Error(`ApprovalGrantStore: grant[${index}] must be object`); for (const key of ["id", "mode", "decision", "operation", "target_scope", "risk", "actor", "created_by", "created_at", "expires_at", "revocable"])
    if (!(key in value))
        throw new Error(`ApprovalGrantStore: grant[${index}] missing ${key}`); return value; }); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
//# sourceMappingURL=approval_store.js.map
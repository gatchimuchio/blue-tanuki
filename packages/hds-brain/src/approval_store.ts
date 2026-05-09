import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ApprovalGrant } from "./approval_policy.js";

export interface ApprovalGrantStore {
  list(): readonly ApprovalGrant[];
  add(grant: ApprovalGrant): ApprovalGrant;
  revoke(id: string): boolean;
  clearExpired(now?: number): number;
  size(): number;
}

export class MemoryApprovalGrantStore implements ApprovalGrantStore {
  protected grants = new Map<string, ApprovalGrant>();
  constructor(initial: readonly ApprovalGrant[] = []) { for (const grant of initial) this.grants.set(grant.id, grant); }
  list(): readonly ApprovalGrant[] { return Array.from(this.grants.values()).sort((a, b) => a.created_at - b.created_at); }
  add(grant: ApprovalGrant): ApprovalGrant { this.grants.set(grant.id, grant); this.afterMutation(); return grant; }
  revoke(id: string): boolean { const grant = this.grants.get(id); if (!grant || !grant.revocable) return false; const deleted = this.grants.delete(id); if (deleted) this.afterMutation(); return deleted; }
  clearExpired(now = Date.now()): number { let n = 0; for (const [id, grant] of this.grants.entries()) { if (grant.expires_at !== null && grant.expires_at <= now) { this.grants.delete(id); n++; } } if (n > 0) this.afterMutation(); return n; }
  size(): number { return this.grants.size; }
  protected afterMutation(): void {}
}

export class JsonFileApprovalGrantStore extends MemoryApprovalGrantStore {
  constructor(private readonly filepath: string) { super(loadGrants(filepath)); const dir = dirname(filepath); if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true }); if (!existsSync(filepath)) this.persist(); }
  protected override afterMutation(): void { this.persist(); }
  private persist(): void { writeFileSync(this.filepath, JSON.stringify({ version: 1, grants: this.list() }, null, 2) + "\n", "utf8"); }
}

function loadGrants(filepath: string): ApprovalGrant[] { if (!existsSync(filepath)) return []; const raw = readFileSync(filepath, "utf8").trim(); if (!raw) return []; const parsed = JSON.parse(raw) as unknown; if (Array.isArray(parsed)) return parseGrantArray(parsed); if (isRecord(parsed) && Array.isArray(parsed.grants)) return parseGrantArray(parsed.grants); throw new Error(`ApprovalGrantStore: invalid grants file: ${filepath}`); }
function parseGrantArray(values: unknown[]): ApprovalGrant[] { return values.map((value, index) => { if (!isRecord(value)) throw new Error(`ApprovalGrantStore: grant[${index}] must be object`); for (const key of ["id", "mode", "decision", "operation", "target_scope", "risk", "actor", "created_by", "created_at", "expires_at", "revocable"]) if (!(key in value)) throw new Error(`ApprovalGrantStore: grant[${index}] missing ${key}`); return value as unknown as ApprovalGrant; }); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

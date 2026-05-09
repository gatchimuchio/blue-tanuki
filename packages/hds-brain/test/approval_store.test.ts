import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApprovalGrant } from "../src/approval_policy.js";
import { JsonFileApprovalGrantStore, MemoryApprovalGrantStore } from "../src/approval_store.js";

function grant(id: string, expires_at: number | null = null) {
  return buildApprovalGrant({ id, mode: "remember_this_decision", decision: "allow", operation: "llm.call", target_scope: "task_type", target: "llm_call", risk: "low", actor: "*", created_by: "test", created_at: 1, expires_at });
}

describe("ApprovalGrantStore", () => {
  it("adds, revokes, and clears expired grants in memory", () => {
    const store = new MemoryApprovalGrantStore();
    store.add(grant("g1"));
    store.add(grant("g2", 10));
    expect(store.size()).toBe(2);
    expect(store.clearExpired(11)).toBe(1);
    expect(store.revoke("g1")).toBe(true);
    expect(store.size()).toBe(0);
  });

  it("persists grants to JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "approval-store-"));
    try {
      const file = join(dir, "grants.json");
      const a = new JsonFileApprovalGrantStore(file);
      a.add(grant("g1"));
      const b = new JsonFileApprovalGrantStore(file);
      expect(b.size()).toBe(1);
      expect(b.list()[0]?.id).toBe("g1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuditLog } from "../src/audit.js";
import type { DecisionLog } from "../src/types.js";

function makeLog(id: string): DecisionLog {
  return {
    request_id: id,
    frame: {
      goal: "g",
      protected_values: ["v"],
      world_closure: { x: ["a"], r: ["b"], m: ["c"] },
      problem_definition_id: "p",
    },
    model: {
      abstraction: "abs",
      structure: {},
      scoring: { axis_scores: [], weights: {}, aggregate: 0 },
    },
    commit: {
      decision: "ASSERT",
      reason: "ok",
      hash: "h",
      triggered_thresholds: [],
    },
    timestamp: 0,
  };
}

describe("AuditLog (in-memory)", () => {
  it("starts empty and verifies", () => {
    const a = new AuditLog();
    expect(a.size()).toBe(0);
    expect(a.verify()).toBe(true);
  });

  it("chains entries with prev_hash linkage", () => {
    const a = new AuditLog();
    const e1 = a.append(makeLog("r1"));
    const e2 = a.append(makeLog("r2"));
    expect(e1.prev_hash).toBe("GENESIS");
    expect(e2.prev_hash).toBe(e1.entry_hash);
    expect(a.verify()).toBe(true);
  });

  it("detects tampering", () => {
    const a = new AuditLog();
    a.append(makeLog("r1"));
    a.append(makeLog("r2"));
    // Tamper: mutate the inner log of entry 0
    const entries = a.list() as Array<{ log: DecisionLog }>;
    entries[0]!.log.commit.reason = "tampered";
    expect(a.verify()).toBe(false);
  });
});

describe("AuditLog (JSONL persistence)", () => {
  let tmpDir: string;
  let filepath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "audit-test-"));
    filepath = join(tmpDir, "audit.jsonl");
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes JSONL on append", () => {
    const a = new AuditLog({ filepath });
    a.append(makeLog("r1"));
    a.append(makeLog("r2"));
    const lines = readFileSync(filepath, "utf8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.log.request_id).toBe("r1");
  });

  it("reloads chain from file and verifies", () => {
    const a = new AuditLog({ filepath });
    a.append(makeLog("r1"));
    a.append(makeLog("r2"));
    const reloaded = new AuditLog({ filepath });
    expect(reloaded.size()).toBe(2);
    expect(reloaded.verify()).toBe(true);
  });

  it("throws on load when chain is broken", () => {
    const a = new AuditLog({ filepath });
    a.append(makeLog("r1"));
    a.append(makeLog("r2"));

    // Corrupt: rewrite first line with mismatched hash
    const lines = readFileSync(filepath, "utf8").split("\n").filter(Boolean);
    const parsed0 = JSON.parse(lines[0]!);
    parsed0.entry_hash = "deadbeef";
    const tampered = [JSON.stringify(parsed0), lines[1]].join("\n") + "\n";
    writeFileSync(filepath, tampered);

    expect(() => new AuditLog({ filepath })).toThrow(/chain verification failed/);
  });
});

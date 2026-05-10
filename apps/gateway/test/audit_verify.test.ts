import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuditLog } from "@blue-tanuki/hds-brain";
import type { DecisionLog } from "@blue-tanuki/hds-brain";
import { AUDIT_FILENAME } from "../src/audit_config.js";
import {
  formatAuditVerifyTextReport,
  runAuditVerify,
} from "../src/audit_verify.js";

function makeLog(id: string): DecisionLog {
  return {
    request_id: id,
    frame: {
      goal: "g",
      protected_values: [],
      world_closure: { x: [], r: [], m: [] },
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

describe("runAuditVerify", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "audit-verify-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns setup_error when BLUE_TANUKI_AUDIT_DIR is unset", () => {
    const r = runAuditVerify({ env: {} });
    expect(r.status).toBe("setup_error");
    expect(r.exit_code).toBe(2);
    expect(r.chain_valid).toBe(false);
  });

  it("returns empty when audit file does not exist yet", () => {
    const r = runAuditVerify({ env: { BLUE_TANUKI_AUDIT_DIR: tmpDir } });
    expect(r.status).toBe("empty");
    expect(r.exit_code).toBe(0);
    expect(r.chain_valid).toBe(true);
  });

  it("verifies a valid persisted hash-chain", () => {
    const filepath = join(tmpDir, AUDIT_FILENAME);
    const log = new AuditLog({ filepath });
    log.append(makeLog("r1"));
    log.append(makeLog("r2"));

    const r = runAuditVerify({ env: { BLUE_TANUKI_AUDIT_DIR: tmpDir } });

    expect(r.status).toBe("ok");
    expect(r.exit_code).toBe(0);
    expect(r.entry_count).toBe(2);
    expect(r.chain_valid).toBe(true);
    expect(r.failure).toBeNull();
  });

  it("detects a tampered middle entry and reports its index", () => {
    const filepath = join(tmpDir, AUDIT_FILENAME);
    const log = new AuditLog({ filepath });
    log.append(makeLog("r1"));
    log.append(makeLog("r2"));
    log.append(makeLog("r3"));
    const lines = readFileSync(filepath, "utf8").split(/\r?\n/).filter(Boolean);
    const second = JSON.parse(lines[1]!);
    second.log.request_id = "tampered";
    writeFileSync(
      filepath,
      [lines[0], JSON.stringify(second), lines[2]].join("\n") + "\n",
    );

    const r = runAuditVerify({ env: { BLUE_TANUKI_AUDIT_DIR: tmpDir } });

    expect(r.status).toBe("broken");
    expect(r.exit_code).toBe(1);
    expect(r.chain_valid).toBe(false);
    expect(r.failure).toMatchObject({
      index: 1,
      reason: "entry_hash_mismatch",
    });
  });

  it("detects index order mismatch", () => {
    const filepath = join(tmpDir, AUDIT_FILENAME);
    const log = new AuditLog({ filepath });
    log.append(makeLog("r1"));
    log.append(makeLog("r2"));
    const lines = readFileSync(filepath, "utf8").split(/\r?\n/).filter(Boolean);
    writeFileSync(filepath, [lines[1], lines[0]].join("\n") + "\n");

    const r = runAuditVerify({ env: { BLUE_TANUKI_AUDIT_DIR: tmpDir } });

    expect(r.status).toBe("broken");
    expect(r.failure).toMatchObject({
      index: 0,
      reason: "index_mismatch",
    });
  });

  it("text report includes the failure index", () => {
    const filepath = join(tmpDir, AUDIT_FILENAME);
    writeFileSync(filepath, "not-json\n");
    const txt = formatAuditVerifyTextReport(
      runAuditVerify({ env: { BLUE_TANUKI_AUDIT_DIR: tmpDir } }),
    );

    expect(txt).toMatch(/BROKEN/);
    expect(txt).toMatch(/index=0/);
    expect(txt).toMatch(/Exit code: 1/);
  });
});

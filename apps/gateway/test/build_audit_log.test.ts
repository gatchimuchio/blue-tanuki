import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAuditLog, AUDIT_FILENAME } from "../src/audit_config.js";

describe("buildAuditLog", () => {
  let prevEnv: string | undefined;

  beforeEach(() => {
    prevEnv = process.env.BLUE_TANUKI_AUDIT_DIR;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.BLUE_TANUKI_AUDIT_DIR;
    else process.env.BLUE_TANUKI_AUDIT_DIR = prevEnv;
  });

  it("returns an in-memory AuditLog when env is unset", () => {
    delete process.env.BLUE_TANUKI_AUDIT_DIR;
    const log = buildAuditLog();
    log.append({
      request_id: "r1",
      frame: {
        goal: "g",
        protected_values: [],
        world_closure: { x: [], r: [], m: [] },
        problem_definition_id: "p",
      },
      model: {
        abstraction: "a",
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
    });
    expect(log.size()).toBe(1);
    expect(log.verify()).toBe(true);
  });

  it("creates the dir and produces a file-backed AuditLog when env set", () => {
    const dir = mkdtempSync(join(tmpdir(), "build-audit-"));
    const sub = join(dir, "nested");
    process.env.BLUE_TANUKI_AUDIT_DIR = sub;
    try {
      const log = buildAuditLog();
      log.append({
        request_id: "r1",
        frame: {
          goal: "g",
          protected_values: [],
          world_closure: { x: [], r: [], m: [] },
          problem_definition_id: "p",
        },
        model: {
          abstraction: "a",
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
      });
      const expected = join(sub, AUDIT_FILENAME);
      expect(existsSync(expected)).toBe(true);
      expect(statSync(expected).size).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reloads chain from disk on second construction (continuity)", () => {
    const dir = mkdtempSync(join(tmpdir(), "build-audit-r-"));
    process.env.BLUE_TANUKI_AUDIT_DIR = dir;
    try {
      const a = buildAuditLog();
      a.append({
        request_id: "r1",
        frame: {
          goal: "g",
          protected_values: [],
          world_closure: { x: [], r: [], m: [] },
          problem_definition_id: "p",
        },
        model: {
          abstraction: "a",
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
      });
      const b = buildAuditLog();
      expect(b.size()).toBe(1);
      expect(b.verify()).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

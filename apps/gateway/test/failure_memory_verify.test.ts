import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { CompleteHistoryStore } from "@blue-tanuki/hds-brain";
import {
  formatFailureMemoryVerifyText,
  runFailureMemoryVerify,
} from "../src/failure_memory_verify.js";

describe("failure-memory verify CLI support", () => {
  it("scans persisted complete history and produces a manual verification report", () => {
    const dir = mkdtempSync(join(tmpdir(), "failure-memory-verify-"));
    try {
      const historyFile = join(dir, "complete-history.jsonl");
      const memoryFile = join(dir, "failure-memory.json");
      const history = new CompleteHistoryStore({ filepath: historyFile });
      history.append({
        kind: "execution_history",
        request_id: "req-1",
        command_id: "cmd-1",
        payload: {
          command: { type: "tool_call", operation: "file.search" },
          status: "failed",
          error: "Tool not registered: file.search",
        },
      });

      const report = runFailureMemoryVerify({
        trigger: "manual",
        env: {
          BLUE_TANUKI_COMPLETE_HISTORY_FILE: historyFile,
          BLUE_TANUKI_FAILURE_MEMORY_FILE: memoryFile,
        },
      });
      const text = formatFailureMemoryVerifyText(report);

      expect(report.detected_failures).toHaveLength(1);
      expect(report.recommended_rules).toHaveLength(1);
      expect(text).toContain("failure-memory-verify");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

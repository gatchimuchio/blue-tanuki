import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HDSUpperController } from "../src/controller.js";
import type { MemoryTrace } from "../src/types.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(packageRoot, "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return sourceFiles(full);
    return entry.endsWith(".ts") ? [full] : [];
  });
}

function importsFrom(source: string): string[] {
  const imports: string[] = [];
  const importRe = /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source)) !== null) {
    imports.push(match[1]!);
  }
  return imports;
}

describe("HDS runtime invariant structural guards", () => {
  it("keeps HDS-BRAIN dependency graph free of downstream LLM/core clients", () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(["@blue-tanuki/protocol"]);
    expect(Object.keys(pkg.devDependencies ?? {})).not.toEqual(
      expect.arrayContaining([
        "@blue-tanuki/core",
        "@blue-tanuki/channel-slack",
        "@blue-tanuki/channel-discord",
        "openai",
        "@anthropic-ai/sdk",
      ]),
    );
  });

  it("does not import downstream LLM, channel, gateway, or core modules from src", () => {
    const forbidden = [
      /^@blue-tanuki\/core$/,
      /^@blue-tanuki\/channel-/,
      /^@blue-tanuki\/gateway$/,
      /^openai$/,
      /^@anthropic-ai\/sdk$/,
      /\/llm(\/|$)/,
    ];

    const violations = sourceFiles(srcRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return importsFrom(source)
        .filter((moduleName) => forbidden.some((pattern) => pattern.test(moduleName)))
        .map((moduleName) => `${relative(packageRoot, file)} -> ${moduleName}`);
    });

    expect(violations).toEqual([]);
  });

  it("types memory traces as non-authority data", () => {
    const proveLiteralFalse = (trace: MemoryTrace): false => trace.used_for_authority;

    expect(
      proveLiteralFalse({
        policy_id: "test.memory",
        process_id: "chat.process",
        used_for_authority: false,
        hits: [],
      }),
    ).toBe(false);
  });

  it("keeps the public runtime snapshot values stable", () => {
    const snapshot = new HDSUpperController().getRuntimeSnapshot();

    expect(snapshot.invariants).toEqual({
      hds_calls_llm: false,
      process_policy_enforced: true,
      external_metadata_can_escalate_authority: false,
      memory_used_for_authority: false,
      complete_history_used_for_authority: false,
      final_review_boundary_enforced_by_approval_gate: true,
    });
  });
});

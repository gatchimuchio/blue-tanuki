import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  assertPluginReviewAccepted,
  reviewPluginPackage,
} from "../src/plugin_review_gate.js";

let root: string;

async function writePackage(
  opts: {
    name?: string;
    manifestName?: string;
    kind?: "channel" | "tool" | "llm" | "detector" | "core";
    permissions?: string[];
    description?: string;
    scripts?: Record<string, string>;
    review?: boolean;
    reviewPatch?: Record<string, unknown>;
    source?: string;
  } = {},
): Promise<string> {
  const dir = path.join(root, "plugin");
  const name = opts.name ?? "@third-party/example-channel";
  const kind = opts.kind ?? "channel";
  await fs.mkdir(path.join(dir, "dist"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({
      name,
      version: "1.2.3",
      type: "module",
      main: "./dist/index.js",
      scripts: opts.scripts,
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "blue-tanuki.plugin.json"),
    JSON.stringify({
      name: opts.manifestName ?? name,
      version: "1.2.3",
      kind,
      entry: "./dist/index.js",
      exports: kind === "core" ? { default: "*" } : { [kind]: "PluginEntry" },
      permissions: opts.permissions ?? ["network:example.com", "secrets:EXAMPLE_TOKEN"],
      description: opts.description ?? "Example Layer B plugin.",
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "dist", "index.js"),
    opts.source ?? "export class PluginEntry {}\n",
    "utf8",
  );
  if (opts.review !== false) {
    await fs.writeFile(
      path.join(dir, "blue-tanuki.review.json"),
      JSON.stringify({
        schema_version: 1,
        layer: "B",
        support_status: "preview",
        conformance: {
          tests_present: true,
          permission_enforcement: true,
          metadata_non_authority: true,
          typed_failures: true,
        },
        audit: {
          request_id_traceable: true,
          operation_traceable: true,
          result_digest: true,
          owner_next_action: true,
        },
        safety: {
          hds_authority_non_bypass: true,
          approval_gate_non_bypass: true,
          runtime_invariants_preserved: true,
          no_external_metadata_authority: true,
        },
        disable_revoke: {
          disable_supported: true,
          revoke_supported: true,
          fail_closed_after_disable: true,
          audit_history_preserved: true,
        },
        failure_modes: [
          {
            code: "example_not_configured",
            recoverable: false,
            owner_next_action: "Disable the plugin or configure the declared token.",
          },
        ],
        external_dynamic_imports: false,
        hot_reload: false,
        final_review_required_capabilities_declared: true,
        ...opts.reviewPatch,
      }),
      "utf8",
    );
  }
  return dir;
}

describe("Plugin Review Gate", () => {
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-plugin-review-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("accepts a complete Layer B submission without executing its entry", async () => {
    const dir = await writePackage();
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("accept");
    expect(result.used_for_authority).toBe(false);
    expect(result.layer_b_review_used_for_authority).toBe(false);
    expect(result.review_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(() => assertPluginReviewAccepted(result)).not.toThrow();
  });

  it("rejects missing review metadata for Layer B submissions", async () => {
    const dir = await writePackage({ review: false });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("blue-tanuki.review.json is required");
  });

  it("rejects wildcard capabilities", async () => {
    const dir = await writePackage({ permissions: ["network:*"] });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("wildcard capability is not allowed");
  });

  it("rejects metadata drift from package.json", async () => {
    const dir = await writePackage({ manifestName: "@third-party/wrong" });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("manifest name mismatch");
  });

  it("rejects Layer B submissions that claim kind=core", async () => {
    const dir = await writePackage({ kind: "core" });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("Layer B submissions cannot declare kind=core");
  });

  it("rejects hidden lifecycle scripts and runtime dynamic imports", async () => {
    const dir = await writePackage({
      scripts: { postinstall: "node install.js" },
      source: "export async function PluginEntry() { return import('left-pad'); }\n",
    });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("lifecycle scripts are not allowed");
    expect(result.failures.join("\n")).toContain("runtime dynamic import is not allowed");
  });

  it("rejects WhatsApp-specific submissions", async () => {
    const dir = await writePackage({
      name: "@third-party/whatsapp-adapter",
      description: "WhatsApp Web automation adapter",
      permissions: ["network:web.whatsapp.com"],
    });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("forbidden plugin scope");
  });

  it("requires explicit final-review metadata for privileged capabilities", async () => {
    const dir = await writePackage({
      permissions: ["tool:shell.exec", "shell:exec"],
      reviewPatch: { final_review_required_capabilities_declared: false },
    });
    const result = await reviewPluginPackage(dir);

    expect(result.decision).toBe("reject");
    expect(result.failures.join("\n")).toContain("final-review capabilities require explicit review metadata");
  });

  it("accepts bundled workspace packages through the basic non-submission gate", async () => {
    const dir = await writePackage({ kind: "core", review: false });
    const result = await reviewPluginPackage(dir, { mode: "bundled" });

    expect(result.decision).toBe("accept");
    expect(result.mode).toBe("bundled");
  });
});

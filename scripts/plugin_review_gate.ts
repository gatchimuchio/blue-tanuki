import * as path from "node:path";
import {
  reviewPluginPackage,
  type PluginReviewResult,
} from "../apps/gateway/src/plugin_review_gate.js";

function argValues(name: string): string[] {
  const out: string[] = [];
  const prefix = `${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === name && process.argv[i + 1]) {
      out.push(process.argv[i + 1]!);
      i += 1;
    } else if (arg?.startsWith(prefix)) {
      out.push(arg.slice(prefix.length));
    }
  }
  return out;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function printText(result: PluginReviewResult): void {
  const status = result.decision === "accept" ? "PASS" : "FAIL";
  console.log(`[plugin-review] ${status} ${result.manifest_name ?? result.package_dir}`);
  console.log(`  mode: ${result.mode}`);
  console.log(`  digest: ${result.review_digest}`);
  console.log(`  authority: used_for_authority=${result.used_for_authority}`);
  for (const check of result.checks) {
    console.log(`  ${check.level.toUpperCase().padEnd(4)} ${check.id} ${check.detail}`);
  }
}

async function main(): Promise<void> {
  const packages = argValues("--package");
  const json = hasArg("--json");
  const mode = hasArg("--bundled") ? "bundled" : "submission";
  if (packages.length === 0) {
    console.error("usage: pnpm plugin:review -- --package <plugin-package-dir> [--json] [--bundled]");
    process.exit(2);
  }

  const results = await Promise.all(
    packages.map((pkg) => reviewPluginPackage(path.resolve(pkg), { mode })),
  );

  if (json) {
    console.log(JSON.stringify({ schema_version: 1, results }, null, 2));
  } else {
    for (const result of results) {
      printText(result);
    }
  }

  if (results.some((result) => result.decision !== "accept")) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[plugin-review] CRASH ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

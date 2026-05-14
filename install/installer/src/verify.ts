import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface InstallerPreflightResult {
  ok: boolean;
  node_version: string;
  repo_root: string;
  package_json: boolean;
  lockfile: boolean;
  gateway_entry: "dist" | "source";
  issues: string[];
  next_action: string;
}

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 14;

function repoRootFromCwd(cwd: string): string {
  return path.resolve(cwd);
}

function nodeVersionOk(version: string): boolean {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR);
}

export function runInstallerPreflight(cwd = process.cwd()): InstallerPreflightResult {
  const repoRoot = repoRootFromCwd(cwd);
  const issues: string[] = [];
  const packageJson = existsSync(path.join(repoRoot, "package.json"));
  const lockfile = existsSync(path.join(repoRoot, "pnpm-lock.yaml"));
  const distMain = existsSync(path.join(repoRoot, "apps/gateway/dist/main.js"));
  const sourceMain = existsSync(path.join(repoRoot, "apps/gateway/src/main.ts"));

  if (!nodeVersionOk(process.version)) {
    issues.push(`Node.js ${process.version} is below required >=22.14.0`);
  }
  if (!packageJson) issues.push("package.json not found at repository root");
  if (!lockfile) issues.push("pnpm-lock.yaml not found at repository root");
  if (!distMain && !sourceMain) {
    issues.push("gateway entry not found; run from the BLUE-TANUKI repository root");
  }

  return {
    ok: issues.length === 0,
    node_version: process.version,
    repo_root: repoRoot,
    package_json: packageJson,
    lockfile,
    gateway_entry: distMain ? "dist" : "source",
    issues,
    next_action:
      issues.length === 0
        ? "Run pnpm installer:run to start guided first-run setup."
        : "Fix the listed preflight issue, then rerun installer verification.",
  };
}

function main(): void {
  const result = runInstallerPreflight();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}

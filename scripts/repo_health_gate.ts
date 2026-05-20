import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

const root = process.cwd();

const FORBIDDEN_FILES = [
  "scripts/pnpm_exec.mjs",
  "scripts/pnpm-exec.mjs",
  "scripts/pnpm_exec.js",
] as const;

const PRODUCTION_ENTRYPOINTS = [
  "apps/gateway/src/main.ts",
  "apps/gateway/src/runtime.ts",
  "apps/gateway/src/serve.ts",
] as const;

const FORBIDDEN_STATIC_IMPORTS = [
  "./doctor.js",
  "./setup.js",
  "./audit_dump.js",
  "./audit_verify.js",
  "./repair.js",
  "../install",
  "install/installer",
] as const;

const CORE_RELEASE_ALLOWLIST = [
  "packages/hds-brain",
  "packages/protocol",
  "packages/blue-tanuki",
  "packages/channel-base",
  "packages/channel-webchat",
  "packages/channel-telegram",
  "apps/gateway",
] as const;

const PREVIEW_PACKAGE_PATHS = [
  "packages/channel-slack",
  "packages/channel-discord",
  "packages/channel-teams",
  "packages/channel-line",
  "packages/operator-daily",
  "packages/operator-developer",
  "packages/operator-writing",
  "install/installer",
  "install/resident",
  "install/windows",
  "install/macos",
] as const;

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function fail(message: string): never {
  throw new Error(`repo health gate failed: ${message}`);
}

function assertForbiddenFilesAbsent(): void {
  for (const rel of FORBIDDEN_FILES) {
    if (existsSync(path.join(root, rel))) fail(`forbidden file exists: ${rel}`);
  }
}

function assertNoForbiddenProductionImports(): void {
  const staticImport = /^\s*import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm;
  for (const rel of PRODUCTION_ENTRYPOINTS) {
    const text = read(rel);
    for (const match of text.matchAll(staticImport)) {
      const specifier = match[1] ?? "";
      if (FORBIDDEN_STATIC_IMPORTS.some((forbidden) => specifier.includes(forbidden))) {
        fail(`${rel}: forbidden static production import ${specifier}`);
      }
    }
  }
}

function assertPackageScriptsUseNativePnpm(): void {
  const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    if (/pnpm[_-]?exec|scripts\/pnpm/i.test(script)) {
      fail(`package script ${name} uses a custom pnpm wrapper`);
    }
  }
}

function assertPreviewScopeDocumented(): void {
  const inventory = read("docs/repository-health-inventory.md");
  const preview = read("docs/preview-scope.md");
  for (const rel of CORE_RELEASE_ALLOWLIST) {
    if (!inventory.includes(rel)) fail(`inventory missing core release path ${rel}`);
  }
  for (const rel of PREVIEW_PACKAGE_PATHS) {
    if (!inventory.includes(rel) || !preview.includes(rel)) {
      fail(`preview/archive path is not documented in both inventory and preview scope: ${rel}`);
    }
  }
}

function assertReleaseBundleDeclaresCoreBoundary(): void {
  const release = read("scripts/create_release_bundle.ts");
  if (!release.includes("CORE_RELEASE_PATHS")) {
    fail("release bundle creator must declare CORE_RELEASE_PATHS");
  }
  for (const rel of PREVIEW_PACKAGE_PATHS) {
    if (release.includes(`\"${rel}\"`) || release.includes(`'${rel}'`)) {
      fail(`release core bundle allowlist includes preview/archive path: ${rel}`);
    }
  }
}

function main(): void {
  assertForbiddenFilesAbsent();
  assertNoForbiddenProductionImports();
  assertPackageScriptsUseNativePnpm();
  assertPreviewScopeDocumented();
  assertReleaseBundleDeclaresCoreBoundary();
  process.stdout.write("repo health gate passed\n");
}

main();

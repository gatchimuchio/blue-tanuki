import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  manifestPathFor,
  readManifest,
  type PluginManifest,
} from "@blue-tanuki/protocol";

type ReviewMode = "bundled" | "submission";
type ReviewDecision = "accept" | "reject";
type ReviewLevel = "pass" | "fail";

interface PackageJson {
  name: string;
  version: string;
  main?: string;
  scripts?: Record<string, unknown>;
}

export interface PluginReviewOptions {
  mode?: ReviewMode;
  require_entry_exists?: boolean;
}

export interface PluginReviewCheck {
  id: string;
  level: ReviewLevel;
  detail: string;
}

export interface PluginReviewResult {
  schema_version: 1;
  decision: ReviewDecision;
  mode: ReviewMode;
  package_dir: string;
  manifest_name?: string;
  manifest_kind?: string;
  support_status?: string;
  checks: PluginReviewCheck[];
  failures: string[];
  used_for_authority: false;
  layer_b_review_used_for_authority: false;
  review_digest: string;
}

interface ReviewMetadata {
  schema_version?: unknown;
  layer?: unknown;
  support_status?: unknown;
  conformance?: Record<string, unknown>;
  audit?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  disable_revoke?: Record<string, unknown>;
  failure_modes?: unknown;
  external_dynamic_imports?: unknown;
  hot_reload?: unknown;
  final_review_required_capabilities_declared?: unknown;
}

const REVIEW_METADATA_FILE = "blue-tanuki.review.json";
const PRIMARY_EXPORT_BY_KIND: Record<string, string> = {
  channel: "channel",
  tool: "tool",
  llm: "llm",
  detector: "detector",
};

const ALLOWED_PERMISSION_PREFIXES = new Set([
  "browser",
  "channel",
  "email",
  "external",
  "fs",
  "github",
  "google",
  "memory",
  "network",
  "notify",
  "process",
  "schedule",
  "secret",
  "secrets",
  "shell",
  "tool",
]);

const FINAL_REVIEW_PERMISSION_PATTERNS = [
  /^external:send$/,
  /^email:send$/,
  /^channel:send$/,
  /^shell:exec$/,
  /^process:/,
  /^browser:act$/,
  /^tool:shell\.exec$/,
  /^tool:github\.write$/,
  /^tool:gmail\.write$/,
  /^tool:google\.[^.]+\.write$/,
  /^tool:browser\.automation$/,
  /^github:.*\.write$/,
  /^google:.*\.write$/,
  /^schedule:(create|update|delete)$/,
];

const FORBIDDEN_TEXT_PATTERNS = [
  /baileys/i,
  /\bwaha\b/i,
  /whatsapp/i,
  /whatsapp web/i,
  /twilio whatsapp/i,
  /agent-driven authority/i,
  /approval bypass/i,
  /final-review bypass/i,
  /verified 5-minute/i,
  /5-minute setup guarantee/i,
  /\bemotion functionality\b/i,
];

export async function reviewPluginPackage(
  packageDir: string,
  opts: PluginReviewOptions = {},
): Promise<PluginReviewResult> {
  const mode = opts.mode ?? "submission";
  const resolvedPackageDir = path.resolve(packageDir);
  const checks: PluginReviewCheck[] = [];
  let manifest: PluginManifest | undefined;
  let metadata: ReviewMetadata | undefined;

  const add = (id: string, level: ReviewLevel, detail: string): void => {
    checks.push({ id, level, detail });
  };

  const pkg = await readPackageJsonSafe(resolvedPackageDir);
  if (!pkg) {
    add("package_json", "fail", "package.json is missing or invalid");
    return finalize(mode, resolvedPackageDir, undefined, undefined, undefined, checks);
  }
  add("package_json", "pass", "package metadata readable");

  try {
    manifest = await readManifest(manifestPathFor(resolvedPackageDir));
    add("manifest_schema", "pass", "manifest schema valid");
  } catch (e) {
    add("manifest_schema", "fail", e instanceof Error ? e.message : String(e));
    return finalize(mode, resolvedPackageDir, undefined, undefined, undefined, checks);
  }

  reviewMetadataDrift(resolvedPackageDir, pkg, manifest, add);
  await reviewEntryPath(resolvedPackageDir, manifest, mode, opts, add);
  await reviewConfigSchema(resolvedPackageDir, manifest, add);
  reviewExports(manifest, mode, add);
  reviewPermissions(manifest.permissions, add);
  reviewForbiddenText(manifest, add);

  if (mode === "submission") {
    metadata = await readReviewMetadata(resolvedPackageDir, add);
    reviewSubmissionKind(manifest, add);
    reviewPackageLifecycleScripts(pkg, add);
    await reviewDynamicImports(resolvedPackageDir, add);
    reviewMetadataEvidence(manifest, metadata, add);
  }

  return finalize(
    mode,
    resolvedPackageDir,
    manifest.name,
    manifest.kind,
    supportStatus(metadata),
    checks,
  );
}

export function assertPluginReviewAccepted(result: PluginReviewResult): void {
  if (result.decision === "accept") return;
  throw new Error(
    `Plugin Review Gate rejected ${result.manifest_name ?? result.package_dir}: ` +
      result.failures.join("; "),
  );
}

function finalize(
  mode: ReviewMode,
  packageDir: string,
  manifestName: string | undefined,
  manifestKind: string | undefined,
  supportStatusValue: string | undefined,
  checks: PluginReviewCheck[],
): PluginReviewResult {
  const failures = checks
    .filter((check) => check.level === "fail")
    .map((check) => `${check.id}: ${check.detail}`);
  const partial = {
    schema_version: 1 as const,
    decision: failures.length === 0 ? "accept" as const : "reject" as const,
    mode,
    package_dir: packageDir,
    manifest_name: manifestName,
    manifest_kind: manifestKind,
    support_status: supportStatusValue,
    checks,
    failures,
    used_for_authority: false as const,
    layer_b_review_used_for_authority: false as const,
  };
  return {
    ...partial,
    review_digest: digest(partial),
  };
}

async function readPackageJsonSafe(packageDir: string): Promise<PackageJson | undefined> {
  try {
    const raw = await fs.readFile(path.join(packageDir, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return undefined;
    if (typeof parsed.name !== "string" || parsed.name.length === 0) return undefined;
    if (typeof parsed.version !== "string" || parsed.version.length === 0) return undefined;
    const scripts = isRecord(parsed.scripts) ? parsed.scripts : undefined;
    return {
      name: parsed.name,
      version: parsed.version,
      main: typeof parsed.main === "string" ? parsed.main : undefined,
      scripts,
    };
  } catch {
    return undefined;
  }
}

function reviewMetadataDrift(
  packageDir: string,
  pkg: PackageJson,
  manifest: PluginManifest,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  if (manifest.name !== pkg.name) {
    add("metadata_name", "fail", `manifest name mismatch (${manifest.name} != ${pkg.name})`);
  } else {
    add("metadata_name", "pass", "manifest name matches package.json");
  }

  if (manifest.version !== pkg.version) {
    add("metadata_version", "fail", `manifest version mismatch (${manifest.version} != ${pkg.version})`);
  } else {
    add("metadata_version", "pass", "manifest version matches package.json");
  }

  if (pkg.main && manifest.entry !== pkg.main) {
    add("metadata_entry", "fail", `manifest entry mismatch with package main in ${packageDir}`);
  } else {
    add("metadata_entry", "pass", "manifest entry matches package main");
  }
}

async function reviewEntryPath(
  packageDir: string,
  manifest: PluginManifest,
  mode: ReviewMode,
  opts: PluginReviewOptions,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): Promise<void> {
  if (!manifest.entry.startsWith("./")) {
    add("entry_path", "fail", "entry must be a relative ./ path");
    return;
  }
  const entry = path.resolve(packageDir, manifest.entry);
  if (!isInside(packageDir, entry)) {
    add("entry_path", "fail", "entry escapes package boundary");
    return;
  }
  add("entry_path", "pass", "entry stays inside package boundary");

  const requireEntry = opts.require_entry_exists ?? mode === "submission";
  if (!requireEntry) return;
  if (await pathExists(entry)) {
    add("entry_exists", "pass", "entry file exists");
    return;
  }
  const sourceFallback = path.resolve(packageDir, "src", "index.ts");
  if (mode === "bundled" && await pathExists(sourceFallback)) {
    add("entry_exists", "pass", "source fallback exists for bundled workspace package");
    return;
  }
  add("entry_exists", "fail", `entry file not found at ${entry}`);
}

async function reviewConfigSchema(
  packageDir: string,
  manifest: PluginManifest,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): Promise<void> {
  if (!manifest.config_schema) {
    add("config_schema", "pass", "no config schema declared");
    return;
  }
  if (!manifest.config_schema.startsWith("./")) {
    add("config_schema", "fail", "config_schema must be a relative ./ path");
    return;
  }
  const schemaPath = path.resolve(packageDir, manifest.config_schema);
  if (!isInside(packageDir, schemaPath)) {
    add("config_schema", "fail", "config_schema escapes package boundary");
    return;
  }
  if (!await pathExists(schemaPath)) {
    add("config_schema", "fail", `config_schema not found at ${schemaPath}`);
    return;
  }
  add("config_schema", "pass", "config_schema exists inside package boundary");
}

function reviewExports(
  manifest: PluginManifest,
  mode: ReviewMode,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  const exportName = PRIMARY_EXPORT_BY_KIND[manifest.kind];
  if (!exportName) {
    add("exports", mode === "submission" ? "fail" : "pass", `${manifest.kind} is not a Layer B extension kind`);
    return;
  }
  if (manifest.exports[exportName] || manifest.exports.default) {
    add("exports", "pass", `${manifest.kind} export declared`);
    return;
  }
  add("exports", "fail", `manifest must declare exports.${exportName} or exports.default`);
}

function reviewPermissions(
  permissions: readonly string[],
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  const failures: string[] = [];
  for (const permission of permissions) {
    if (permission === "*" || permission.includes(":*")) {
      failures.push(`${permission}: wildcard capability is not allowed`);
      continue;
    }
    const prefix = permission.split(":", 1)[0] ?? "";
    if (!ALLOWED_PERMISSION_PREFIXES.has(prefix)) {
      failures.push(`${permission}: unsupported capability prefix`);
    }
  }
  if (failures.length > 0) {
    add("permissions", "fail", failures.join("; "));
  } else {
    add("permissions", "pass", `${permissions.length} permissions are explicit`);
  }
}

function reviewForbiddenText(
  manifest: PluginManifest,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  const haystack = [
    manifest.name,
    manifest.description ?? "",
    manifest.permissions.join(" "),
  ].join("\n");
  const hit = FORBIDDEN_TEXT_PATTERNS.find((pattern) => pattern.test(haystack));
  if (hit) {
    add("forbidden_scope", "fail", `forbidden plugin scope matched ${hit}`);
    return;
  }
  add("forbidden_scope", "pass", "no rejected scope claims found");
}

async function readReviewMetadata(
  packageDir: string,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): Promise<ReviewMetadata | undefined> {
  const metadataPath = path.join(packageDir, REVIEW_METADATA_FILE);
  let raw: string;
  try {
    raw = await fs.readFile(metadataPath, "utf8");
  } catch {
    add("review_metadata", "fail", `${REVIEW_METADATA_FILE} is required for Layer B submissions`);
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    add("review_metadata", "fail", `invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
  if (!isRecord(parsed)) {
    add("review_metadata", "fail", "review metadata must be an object");
    return undefined;
  }
  const secretLike = /"(token|api_key|secret|bearer|password)"\s*:\s*"[^"]{8,}"/i;
  if (secretLike.test(raw)) {
    add("review_metadata_redaction", "fail", "review metadata appears to contain secret-like values");
  } else {
    add("review_metadata_redaction", "pass", "review metadata is redacted");
  }
  add("review_metadata", "pass", "review metadata readable");
  return parsed;
}

function reviewSubmissionKind(
  manifest: PluginManifest,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  if (manifest.kind === "core") {
    add("submission_kind", "fail", "Layer B submissions cannot declare kind=core");
    return;
  }
  add("submission_kind", "pass", `${manifest.kind} is a Layer B extension kind`);
}

function reviewPackageLifecycleScripts(
  pkg: PackageJson,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  const blocked = ["preinstall", "install", "postinstall", "prepare", "prepack", "postpack"];
  const hits = blocked.filter((name) => typeof pkg.scripts?.[name] === "string");
  if (hits.length > 0) {
    add("lifecycle_scripts", "fail", `hidden install/package lifecycle scripts are not allowed: ${hits.join(", ")}`);
    return;
  }
  add("lifecycle_scripts", "pass", "no install/package lifecycle scripts declared");
}

async function reviewDynamicImports(
  packageDir: string,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): Promise<void> {
  const files = await listSourceFiles(packageDir);
  const offenders: string[] = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    if (/\bimport\s*\(/.test(text)) {
      offenders.push(path.relative(packageDir, file).replace(/\\/g, "/"));
    }
  }
  if (offenders.length > 0) {
    add("dynamic_imports", "fail", `runtime dynamic import is not allowed: ${offenders.join(", ")}`);
    return;
  }
  add("dynamic_imports", "pass", "no runtime dynamic import found");
}

function reviewMetadataEvidence(
  manifest: PluginManifest,
  metadata: ReviewMetadata | undefined,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  if (!metadata) return;
  requireEqual("review_schema", metadata.schema_version, 1, add);
  requireEqual("review_layer", metadata.layer, "B", add);
  if (
    metadata.support_status !== "preview" &&
    metadata.support_status !== "first-party-preview" &&
    metadata.support_status !== "first-party"
  ) {
    add("support_status", "fail", "support_status must be preview, first-party-preview, or first-party");
  } else {
    add("support_status", "pass", `support_status=${metadata.support_status}`);
  }

  requireAllTrue("conformance", metadata.conformance, [
    "tests_present",
    "permission_enforcement",
    "metadata_non_authority",
    "typed_failures",
  ], add);
  requireAllTrue("audit", metadata.audit, [
    "request_id_traceable",
    "operation_traceable",
    "result_digest",
    "owner_next_action",
  ], add);
  requireAllTrue("safety", metadata.safety, [
    "hds_authority_non_bypass",
    "approval_gate_non_bypass",
    "runtime_invariants_preserved",
    "no_external_metadata_authority",
  ], add);
  requireAllTrue("disable_revoke", metadata.disable_revoke, [
    "disable_supported",
    "revoke_supported",
    "fail_closed_after_disable",
    "audit_history_preserved",
  ], add);

  if (metadata.external_dynamic_imports !== false) {
    add("external_dynamic_imports", "fail", "external_dynamic_imports must be false");
  } else {
    add("external_dynamic_imports", "pass", "external dynamic imports denied");
  }

  if (metadata.hot_reload !== false) {
    add("hot_reload", "fail", "hot_reload must be false for v1.0");
  } else {
    add("hot_reload", "pass", "hot reload denied");
  }

  if (!Array.isArray(metadata.failure_modes) || metadata.failure_modes.length === 0) {
    add("failure_modes", "fail", "at least one failure mode with owner next action is required");
  } else {
    add("failure_modes", "pass", `${metadata.failure_modes.length} failure mode(s) documented`);
  }

  const needsFinalReviewDeclaration = manifest.permissions.some((permission) =>
    FINAL_REVIEW_PERMISSION_PATTERNS.some((pattern) => pattern.test(permission)),
  );
  if (needsFinalReviewDeclaration && metadata.final_review_required_capabilities_declared !== true) {
    add("final_review_declaration", "fail", "final-review capabilities require explicit review metadata");
  } else {
    add("final_review_declaration", "pass", "final-review capability boundary declared or not required");
  }
}

function requireEqual(
  id: string,
  actual: unknown,
  expected: unknown,
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  if (actual !== expected) {
    add(id, "fail", `expected ${String(expected)}, got ${String(actual)}`);
  } else {
    add(id, "pass", `${id} ok`);
  }
}

function requireAllTrue(
  section: string,
  record: Record<string, unknown> | undefined,
  keys: readonly string[],
  add: (id: string, level: ReviewLevel, detail: string) => void,
): void {
  if (!record) {
    add(section, "fail", `${section} metadata is required`);
    return;
  }
  const missing = keys.filter((key) => record[key] !== true);
  if (missing.length > 0) {
    add(section, "fail", `${section} flags must be true: ${missing.join(", ")}`);
  } else {
    add(section, "pass", `${section} evidence complete`);
  }
}

async function listSourceFiles(packageDir: string): Promise<string[]> {
  const roots = ["src", "dist"].map((rel) => path.join(packageDir, rel));
  const out: string[] = [];
  for (const root of roots) {
    await walk(root, out);
  }
  return out.filter((file) => /\.(js|mjs|cjs|ts|tsx)$/.test(file));
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

async function pathExists(file: string): Promise<boolean> {
  return await fs.stat(file).then(() => true).catch(() => false);
}

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel.length === 0 || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function supportStatus(metadata: ReviewMetadata | undefined): string | undefined {
  return typeof metadata?.support_status === "string" ? metadata.support_status : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

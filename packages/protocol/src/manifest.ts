import { promises as fs } from "node:fs";
import { z } from "zod";

/**
 * Plugin manifest spec — Phase 5-S2.
 *
 * Each blue-tanuki package may carry a `blue-tanuki.plugin.json` file in
 * its package root. The manifest declares what kind of extension it is,
 * where its entry point lives, and what runtime permissions it expects.
 *
 * Phase 4-S2/S5-S1 scope:
 *   - Spec the schema and ship a manifest file in every existing package.
 *   - Provide read/validate utilities (this module).
 *   - Validate manifests in tests and doctor.
 *
 * Phase 5-S2:
 *   - Gateway loader consumes workspace manifests at boot.
 *   - Permission enforcement lands with the loader so there is no enforcement
 *     gap.
 *
 * External npm plugin discovery remains out of scope; the active loader is
 * workspace-only.
 */

/**
 * Kinds of extensions blue-tanuki recognises.
 *   - "core"     : library or runtime piece. Not pluggable today.
 *                  Declared so every package has a manifest.
 *   - "channel"  : inbound and/or outbound channel adapter.
 *   - "llm"      : LLM backend implementation.
 *   - "tool"     : executor tool registered into ToolRegistry.
 *   - "detector" : HDS-BRAIN axis detector.
 */
export const PluginKindSchema = z.enum([
  "core",
  "channel",
  "llm",
  "tool",
  "detector",
]);
export type PluginKind = z.infer<typeof PluginKindSchema>;

/**
 * Permission scopes that a plugin may request. Format: "<scope>:<target>".
 * Phase 4-S2 records these as documentation only; Phase 5+ enforces.
 *
 * Standard scopes:
 *   - network:<host>      : outbound HTTP/WS to <host>. "*" reserved for
 *                           future use; do not declare in production
 *                           manifests.
 *   - network:listen      : opens a listening socket.
 *   - secrets:<env_var>   : reads <env_var> from process.env.
 *   - fs:read:<rel_path>  : reads under <rel_path> relative to package root.
 *   - fs:append:<rel_path>: appends under <rel_path> (logs, sessions, etc).
 *   - fs:write:<rel_path> : writes (read-modify-write or rename) under
 *                           <rel_path>.
 *
 * The string itself is free-form (z.string()) so the schema does not
 * have to be revved every time a new scope is added; the conventions
 * above are documentation, not validation.
 */
export const PermissionSchema = z.string().min(1);

export const PluginManifestSchema = z.object({
  /** Package name. Must match package.json name for the loader to find it. */
  name: z.string().min(1),
  /** Semver. Should match package.json version. */
  version: z.string().min(1),
  /** What kind of extension this is. Determines wiring at boot. */
  kind: PluginKindSchema,
  /**
   * Path to the entry module relative to the package root. Typically
   * the same as package.json "main", but kept explicit so the loader
   * does not need to re-read package.json.
   */
  entry: z.string().min(1),
  /**
   * Named exports of the entry module. The loader imports `entry` and
   * resolves the named exports below. The named export under the key
   * matching `kind` (e.g. "channel" → exports.channel) is the primary
   * extension class; "default" is the fallback.
   */
  exports: z.record(z.string()).default({}),
  /**
   * Path to a config schema (JSON Schema or zod-printed JSON) that
   * describes accepted runtime options. Optional for now.
   */
  config_schema: z.string().optional(),
  /**
   * Declared runtime permissions. See PermissionSchema doc for scopes.
   */
  permissions: z.array(PermissionSchema).default([]),
  /** Free-form, single-line description. Optional. */
  description: z.string().optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * Read and validate a manifest file from disk.
 * Throws a descriptive Error on parse / validation failure.
 */
export async function readManifest(manifest_path: string): Promise<PluginManifest> {
  let raw: string;
  try {
    raw = await fs.readFile(manifest_path, "utf8");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    throw new Error(
      `readManifest: cannot read ${manifest_path}: ${err.code ?? err.message}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `readManifest: invalid JSON at ${manifest_path}: ${(e as Error).message}`,
    );
  }
  const result = PluginManifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`readManifest: schema mismatch at ${manifest_path}: ${issues}`);
  }
  return result.data;
}

/** Synchronous validate-only helper for already-parsed JSON. */
export function validateManifest(input: unknown): PluginManifest {
  return PluginManifestSchema.parse(input);
}

/**
 * Conventional filename for plugin manifests at a package root.
 */
export const MANIFEST_FILENAME = "blue-tanuki.plugin.json";

/**
 * Build the conventional manifest path for a given package directory.
 */
export function manifestPathFor(package_dir: string): string {
  return `${package_dir.replace(/[\\/]+$/, "")}/${MANIFEST_FILENAME}`;
}

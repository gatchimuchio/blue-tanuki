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
export declare const PluginKindSchema: any;
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
export declare const PermissionSchema: any;
export declare const PluginManifestSchema: any;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
/**
 * Read and validate a manifest file from disk.
 * Throws a descriptive Error on parse / validation failure.
 */
export declare function readManifest(manifest_path: string): Promise<PluginManifest>;
/** Synchronous validate-only helper for already-parsed JSON. */
export declare function validateManifest(input: unknown): PluginManifest;
/**
 * Conventional filename for plugin manifests at a package root.
 */
export declare const MANIFEST_FILENAME = "blue-tanuki.plugin.json";
/**
 * Build the conventional manifest path for a given package directory.
 */
export declare function manifestPathFor(package_dir: string): string;
//# sourceMappingURL=manifest.d.ts.map
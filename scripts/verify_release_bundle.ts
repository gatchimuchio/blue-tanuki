import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

interface PackageJson {
  version: string;
}

interface ReleaseManifest {
  schema_version?: number;
  name?: string;
  version?: string;
  archive?: {
    file?: string;
    size_bytes?: number;
    sha256?: string;
  };
  sha256_file?: string;
  required_paths?: string[];
  installer_paths?: string[];
  boundaries?: {
    unsigned_source_bundle?: boolean;
    secrets_included?: boolean;
    external_dynamic_imports_included?: boolean;
  };
}

const root = process.cwd();

const REQUIRED_ARCHIVE_PATHS = [
  "install/README.md",
  "install/windows/install.ps1",
  "install/windows/uninstall.ps1",
  "install/macos/install.sh",
  "install/macos/uninstall.sh",
  "install/linux/install.sh",
  "install/linux/uninstall.sh",
  "apps/gateway/dist/main.js",
  "packages/channel-webchat/dist/webchat.js",
  "packages/channel-telegram/dist/telegram.js",
  "apps/gateway/dist/approval_runtime.js",
  "packages/hds-brain/dist/approval_store.js",
  "docs/phase7-s2-approval-gate-execution-bridge.md",
  "docs/phase7-s3-full-access-default.md",
  "docs/phase7-s4-transparent-full-access-authority.md",
] as const;

const FORBIDDEN_SEGMENTS = new Set([
  "node_modules",
  ".codex-tmp",
  ".blue-tanuki",
  "release",
  ".git",
]);

const FORBIDDEN_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "blue-tanuki.env",
  "id_rsa",
  "id_ed25519",
  ".npmrc",
]);

function isForbiddenFileName(name: string): boolean {
  const lower = name.toLowerCase();
  if (FORBIDDEN_BASENAMES.has(name) || FORBIDDEN_BASENAMES.has(lower)) return true;
  if (lower.startsWith("blue-tanuki.env.") && lower.endsWith(".bak")) return true;
  if (lower.endsWith(".env.bak")) return true;
  if (lower.endsWith(".env.local.bak")) return true;
  if (lower.endsWith(".pem")) return true;
  if (lower.endsWith(".p12")) return true;
  if (lower.endsWith(".pfx")) return true;
  if (lower.endsWith(".key")) return true;
  return false;
}

function argValue(name: string): string | undefined {
  const prefix = `${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === name) return process.argv[i + 1];
    if (arg?.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function readPackage(): PackageJson {
  return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as PackageJson;
}

function defaultArchivePath(): string {
  const pkg = readPackage();
  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  return path.join(root, "release", `blue-tanuki-${pkg.version}-source-bundle.${ext}`);
}

function artifactBase(outFile: string): string {
  if (outFile.endsWith(".tar.gz")) {
    return outFile.slice(0, -".tar.gz".length);
  }
  return outFile.slice(0, -path.extname(outFile).length);
}

function integrityPaths(outFile: string): { shaFile: string; manifestFile: string } {
  const base = artifactBase(outFile);
  return {
    shaFile: `${base}.sha256`,
    manifestFile: `${base}.manifest.json`,
  };
}

function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function readSha256File(file: string): string {
  const firstToken = readFileSync(file, "utf8").trim().split(/\s+/)[0];
  if (!firstToken || !/^[a-f0-9]{64}$/i.test(firstToken)) {
    throw new Error(`${file}: invalid sha256 file`);
  }
  return firstToken.toLowerCase();
}

function readManifest(file: string): ReleaseManifest {
  return JSON.parse(readFileSync(file, "utf8")) as ReleaseManifest;
}

function assertExists(file: string): void {
  if (!existsSync(file)) {
    throw new Error(`missing release file: ${file}`);
  }
}

function assertManifest(
  manifest: ReleaseManifest,
  archiveFile: string,
  shaFile: string,
  actualSha: string,
): void {
  const archiveName = path.basename(archiveFile);
  const shaName = path.basename(shaFile);
  const sizeBytes = statSync(archiveFile).size;

  if (manifest.schema_version !== 1) {
    throw new Error("manifest schema_version must be 1");
  }
  if (manifest.name !== "blue-tanuki") {
    throw new Error("manifest name must be blue-tanuki");
  }
  if (manifest.archive?.file !== archiveName) {
    throw new Error("manifest archive file does not match release file");
  }
  if (manifest.archive?.size_bytes !== sizeBytes) {
    throw new Error("manifest archive size does not match release file");
  }
  if (manifest.archive?.sha256?.toLowerCase() !== actualSha) {
    throw new Error("manifest archive sha256 does not match release file");
  }
  if (manifest.sha256_file !== shaName) {
    throw new Error("manifest sha256_file does not match checksum file");
  }
  if (manifest.boundaries?.unsigned_source_bundle !== true) {
    throw new Error("manifest must declare unsigned_source_bundle=true");
  }
  if (manifest.boundaries?.secrets_included !== false) {
    throw new Error("manifest must declare secrets_included=false");
  }
  if (manifest.boundaries?.external_dynamic_imports_included !== false) {
    throw new Error("manifest must declare external_dynamic_imports_included=false");
  }
}

function parseArchiveList(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function listTarEntries(archiveFile: string): string[] {
  const result = spawnSync("tar", ["-tf", archiveFile], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`tar list failed: ${result.stderr || result.stdout}`);
  }
  return parseArchiveList(result.stdout);
}

function listZipEntries(archiveFile: string): string[] {
  const unzip = spawnSync("unzip", ["-Z1", archiveFile], { encoding: "utf8" });
  if (unzip.status === 0) {
    return parseArchiveList(unzip.stdout);
  }

  const pyScript =
    "import sys,zipfile\n" +
    "with zipfile.ZipFile(sys.argv[1]) as z:\n" +
    "    sys.stdout.write('\\n'.join(z.namelist()))\n";
  for (const py of ["python3", "python"]) {
    const result = spawnSync(py, ["-c", pyScript, archiveFile], { encoding: "utf8" });
    if (result.status === 0) {
      return parseArchiveList(result.stdout);
    }
  }

  // On Windows, bsdtar commonly supports zip listing even though GNU tar on
  // Linux does not. Keep it as a final cross-platform fallback.
  const tar = spawnSync("tar", ["-tf", archiveFile], { encoding: "utf8" });
  if (tar.status === 0) {
    return parseArchiveList(tar.stdout);
  }

  throw new Error(
    `zip list failed: ${unzip.stderr || unzip.stdout || tar.stderr || tar.stdout}`,
  );
}

function listArchiveEntries(archiveFile: string): string[] {
  if (archiveFile.endsWith(".tar.gz") || archiveFile.endsWith(".tgz")) {
    return listTarEntries(archiveFile);
  }
  if (archiveFile.endsWith(".zip")) {
    return listZipEntries(archiveFile);
  }
  throw new Error(`unsupported archive extension: ${archiveFile}`);
}

function entryMatches(entries: string[], required: string): boolean {
  return entries.some((entry) => entry === required || entry === `blue-tanuki/${required}`);
}

function assertRequiredEntries(entries: string[]): void {
  for (const required of REQUIRED_ARCHIVE_PATHS) {
    if (!entryMatches(entries, required)) {
      throw new Error(`archive missing required entry: ${required}`);
    }
  }
}

function assertSafeEntries(entries: string[]): void {
  for (const entry of entries) {
    if (entry.startsWith("/") || /^[A-Za-z]:\//.test(entry)) {
      throw new Error(`archive contains absolute entry: ${entry}`);
    }
    const parts = entry.split("/").filter(Boolean);
    if (parts.includes("..")) {
      throw new Error(`archive contains traversal entry: ${entry}`);
    }
    for (const part of parts) {
      if (FORBIDDEN_SEGMENTS.has(part)) {
        throw new Error(`archive contains forbidden directory: ${entry}`);
      }
    }
    const base = parts.at(-1);
    if (base && isForbiddenFileName(base)) {
      throw new Error(`archive contains forbidden secret-like file: ${entry}`);
    }
  }
}

function main(): void {
  const archiveFile = path.resolve(argValue("--file") ?? defaultArchivePath());
  const { shaFile, manifestFile } = integrityPaths(archiveFile);

  assertExists(archiveFile);
  assertExists(shaFile);
  assertExists(manifestFile);

  const actualSha = sha256File(archiveFile);
  const expectedSha = readSha256File(shaFile);
  if (actualSha !== expectedSha) {
    throw new Error("release archive sha256 does not match checksum file");
  }

  const manifest = readManifest(manifestFile);
  assertManifest(manifest, archiveFile, shaFile, actualSha);

  const entries = listArchiveEntries(archiveFile);
  assertRequiredEntries(entries);
  assertSafeEntries(entries);

  console.log(`[release:verify] PASS ${archiveFile}`);
  console.log(`[release:verify] sha256 ${actualSha}`);
}

main();

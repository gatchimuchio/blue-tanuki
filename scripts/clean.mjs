import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const containerDirs = ["apps", "packages"];

function assertSafeDistPath(target) {
  const resolved = resolve(target);
  const rel = relative(root, resolved);
  if (rel.startsWith("..") || rel === "" || rel.includes(`..${sep}`)) {
    throw new Error(`refusing to clean outside repository: ${resolved}`);
  }
  if (basename(resolved) !== "dist") {
    throw new Error(`refusing to clean non-dist path: ${resolved}`);
  }
  return resolved;
}

function assertSafeBuildInfoPath(target) {
  const resolved = resolve(target);
  const rel = relative(root, resolved);
  if (rel.startsWith("..") || rel === "" || rel.includes(`..${sep}`)) {
    throw new Error(`refusing to clean outside repository: ${resolved}`);
  }
  if (basename(resolved) !== "tsconfig.tsbuildinfo") {
    throw new Error(`refusing to clean non-tsbuildinfo path: ${resolved}`);
  }
  return resolved;
}

const removed = [];

for (const container of containerDirs) {
  const containerPath = join(root, container);
  if (!existsSync(containerPath)) continue;
  for (const entry of readdirSync(containerPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dist = assertSafeDistPath(join(containerPath, entry.name, "dist"));
    if (existsSync(dist)) {
      rmSync(dist, { recursive: true, force: true });
      removed.push(relative(root, dist).replaceAll("\\", "/"));
    }
    const buildInfo = assertSafeBuildInfoPath(join(containerPath, entry.name, "tsconfig.tsbuildinfo"));
    if (existsSync(buildInfo)) {
      rmSync(buildInfo, { force: true });
      removed.push(relative(root, buildInfo).replaceAll("\\", "/"));
    }
  }
}

for (const item of removed) {
  console.log(`removed ${item}`);
}
if (removed.length === 0) {
  console.log("nothing to clean");
}

import { spawnSync } from "node:child_process";

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error("[pnpm-exec] npm_execpath is not set; run this through pnpm.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isNodeEntrypoint = /\.(c|m)?js$/i.test(npmExecPath);
const command = isNodeEntrypoint ? process.execPath : npmExecPath;
const commandArgs = isNodeEntrypoint ? [npmExecPath, ...args] : args;

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  shell: process.platform === "win32" && !isNodeEntrypoint,
});

if (result.error) {
  console.error(`[pnpm-exec] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

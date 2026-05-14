import { spawn } from "node:child_process";
import * as path from "node:path";
import { runDoctor, type DoctorReport } from "../../../apps/gateway/src/doctor.js";
import { runSetupCommand, type SetupResult } from "../../../apps/gateway/src/setup.js";
import {
  setupConfigToEnv,
  type SetupProviderKind,
} from "../../../apps/gateway/src/setup_config.js";
import { llmSetupArgs } from "./api_provisioning.js";
import { runInstallerPreflight, type InstallerPreflightResult } from "./verify.js";

export interface InstallerFlowOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  env_file?: string;
  base_dir?: string;
  provider?: SetupProviderKind;
  model?: string;
  endpoint?: string;
  api_key?: string;
  api_key_env?: string;
  temperature?: number;
  max_tokens?: number;
  timeout_ms?: number;
  host?: string;
  port?: number;
  force?: boolean;
  skip_install?: boolean;
  skip_build?: boolean;
  no_doctor?: boolean;
  no_serve?: boolean;
  json?: boolean;
}

export interface InstallerFlowResult {
  preflight: InstallerPreflightResult;
  setup: SetupResult;
  doctor?: DoctorReport;
  settings_url: string;
  serve_started: boolean;
  next_action: string;
}

function runCommand(
  cwd: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

function setupArgs(opts: InstallerFlowOptions): string[] {
  const args = [
    "--yes",
    "--output",
    opts.env_file ?? path.join(".blue-tanuki", "blue-tanuki.env"),
    "--base-dir",
    opts.base_dir ?? ".blue-tanuki",
    ...llmSetupArgs(opts),
  ];
  if (opts.host) args.push("--host", opts.host);
  if (opts.port !== undefined) args.push("--port", String(opts.port));
  if (opts.force) args.push("--force");
  args.push("--no-doctor");
  return args;
}

export async function runInstallerFlow(
  opts: InstallerFlowOptions = {},
): Promise<InstallerFlowResult> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const env = { ...process.env, ...(opts.env ?? {}) };
  const preflight = runInstallerPreflight(cwd);
  if (!preflight.ok) {
    throw new Error(`installer preflight failed: ${preflight.issues.join("; ")}`);
  }

  if (!opts.skip_install) {
    await runCommand(cwd, "corepack", ["enable"], env);
    await runCommand(cwd, "corepack", ["prepare", "pnpm@9.12.0", "--activate"], env);
    await runCommand(cwd, "pnpm", ["install", "--frozen-lockfile"], env);
  }

  if (!opts.skip_build) {
    await runCommand(cwd, "pnpm", ["build"], env);
  }

  const setup = await runSetupCommand(setupArgs(opts), { cwd, env });
  const setupEnv = setupConfigToEnv(setup.config, { source_env: env });
  const mergedEnv = {
    ...env,
    ...setupEnv,
    BLUE_TANUKI_ENV_FILE: setup.output_path,
  };
  const doctor = opts.no_doctor
    ? undefined
    : await runDoctor({
        env: mergedEnv,
        probe_port: false,
      });
  const settingsUrl = `http://${setup.config.webchat.host}:${setup.config.webchat.port}/settings`;

  if (!opts.no_serve) {
    const mainEntry = path.join(cwd, "apps/gateway/dist/main.js");
    spawn(
      process.execPath,
      [mainEntry, "--env-file", setup.output_path, "--serve"],
      {
        cwd,
        env: mergedEnv,
        stdio: "inherit",
        detached: false,
      },
    );
  }

  return {
    preflight,
    setup,
    doctor,
    settings_url: settingsUrl,
    serve_started: opts.no_serve !== true,
    next_action: opts.no_serve
      ? `Start the gateway with pnpm gateway:serve -- --env-file ${setup.output_path}, then open ${settingsUrl}.`
      : `Open ${settingsUrl} and use Verify LLM before saving provider changes.`,
  };
}

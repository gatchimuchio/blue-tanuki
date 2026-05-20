import { createLogger } from "@blue-tanuki/core";
import { loadEnvFileFromArgv } from "./env_file.js";

const gatewayLog = createLogger({ scope: "gateway" });

function writeStdout(text: string): void {
  process.stdout.write(text + "\n");
}

async function runDoctorCli(): Promise<void> {
  const { runDoctor, formatTextReport, formatJsonReport } = await import(
    "./doctor.js"
  );
  const json = process.argv.includes("--json");
  const mode = process.argv.includes("--strict")
    ? "strict"
    : process.argv.includes("--preview")
    ? "preview"
    : "core";
  const report = await runDoctor({ mode });
  if (json) {
    writeStdout(formatJsonReport(report));
  } else {
    writeStdout(formatTextReport(report));
  }
  process.exit(report.exit_code);
}

async function runAuditDumpCli(): Promise<void> {
  const { runAuditDump, formatAuditTextReport, formatAuditJsonReport } =
    await import("./audit_dump.js");
  const json = process.argv.includes("--json");
  const report = runAuditDump();
  if (json) {
    writeStdout(formatAuditJsonReport(report));
  } else {
    writeStdout(formatAuditTextReport(report));
  }
  process.exit(report.exit_code);
}

async function runAuditVerifyCli(): Promise<void> {
  const {
    runAuditVerify,
    formatAuditVerifyTextReport,
    formatAuditVerifyJsonReport,
  } = await import("./audit_verify.js");
  const json = process.argv.includes("--json");
  const report = runAuditVerify();
  if (json) {
    writeStdout(formatAuditVerifyJsonReport(report));
  } else {
    writeStdout(formatAuditVerifyTextReport(report));
  }
  process.exit(report.exit_code);
}

async function runSetupCliMode(): Promise<void> {
  const { runSetupCli } = await import("./setup.js");
  await runSetupCli(process.argv.slice(2));
}

async function runServeCliMode(): Promise<void> {
  const { runServe } = await import("./serve.js");
  await runServe();
}

async function runOneShotCliMode(argv: readonly string[]): Promise<void> {
  const { runCli } = await import("./runtime.js");
  await runCli(argv);
}

export async function runGatewayCliRouter(): Promise<void> {
  const envFile = await loadEnvFileFromArgv(process.argv.slice(2));
  if (envFile) {
    gatewayLog.info("env file loaded", {
      path: envFile.path,
      applied: envFile.applied.length,
      skipped: envFile.skipped.length,
      warnings: envFile.warnings.length,
    });
  }
  if (process.argv.includes("--setup")) {
    await runSetupCliMode();
    return;
  }
  if (process.argv.includes("--doctor")) {
    await runDoctorCli();
    return;
  }
  if (process.argv.includes("--audit-dump")) {
    await runAuditDumpCli();
    return;
  }
  if (process.argv.includes("--audit-verify")) {
    await runAuditVerifyCli();
    return;
  }
  const serveMode =
    process.argv.includes("--serve") || process.env.BLUE_TANUKI_SERVE === "1";
  if (serveMode) {
    await runServeCliMode();
    return;
  }
  await runOneShotCliMode(process.argv.slice(2));
}

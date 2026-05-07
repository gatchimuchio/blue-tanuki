import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { HDSUpperController, LongTermMemoryStore } from "@blue-tanuki/hds-brain";
import { Executor, ToolRegistry, MemorySessionStore, JsonFileSessionStore, createLogger, } from "@blue-tanuki/core";
import { runServe } from "./serve.js";
import { buildAuditLog, AUDIT_FILENAME } from "./audit_config.js";
import { buildLLMBackendFromEnv, buildLLMCommandRouteFromEnv, describeLLMCommandRoute, describeLLMConfig, } from "./llm_config.js";
import { renderCommandOutput } from "./result_render.js";
import { approvalDeniedFeedback, buildApprovalRuntime } from "./approval_runtime.js";
import { loadPluginRuntime } from "./plugin_loader.js";
import { loadEnvFileFromArgv, stripEnvFileArgs } from "./env_file.js";
// Re-export so existing call sites can keep importing from "./main.js"
// transparently. New code should prefer importing from "./audit_config.js".
export { buildAuditLog, AUDIT_FILENAME };
const gatewayLog = createLogger({ scope: "gateway" });
const hdsLog = createLogger({ scope: "hds-brain" });
const coreLog = createLogger({ scope: "blue-tanuki" });
const auditLog = createLogger({ scope: "audit" });
function writeStdout(text) {
    process.stdout.write(text + "\n");
}
/**
 * Gateway wires HDS-BRAIN (upstream) to BLUE-TANUKI/core (executor).
 *
 * Modes:
 *   - CLI one-shot: argv becomes one inbound message.
 *   - serve: long-running WebChat/Slack/Discord gateway.
 */
/**
 * Build the SessionStore from env. Default in CLI mode is in-memory only
 * (one-shot has nothing to persist across runs); set
 * BLUE_TANUKI_SESSION_DIR to use the JSON file backend.
 */
export function buildHDSMemoryStore(env = process.env) {
    const file = env.BLUE_TANUKI_MEMORY_FILE;
    const dir = env.BLUE_TANUKI_MEMORY_DIR;
    const max = parseInt(env.BLUE_TANUKI_MEMORY_CAP ?? "10000", 10);
    const max_entries = Number.isFinite(max) && max >= 0 ? max : 10_000;
    if (file)
        return new LongTermMemoryStore({ filepath: path.resolve(file), max_entries });
    if (dir)
        return new LongTermMemoryStore({ filepath: path.join(path.resolve(dir), "memory.jsonl"), max_entries });
    return new LongTermMemoryStore({ max_entries });
}
export function buildSessionStore(plugins, env = process.env) {
    plugins?.enforceSessionConfig(env);
    const dir = env.BLUE_TANUKI_SESSION_DIR;
    const cap = parseInt(env.BLUE_TANUKI_SESSION_CAP ?? "100", 10);
    if (dir) {
        return new JsonFileSessionStore({
            base_dir: path.resolve(dir),
            cap: Number.isFinite(cap) && cap >= 0 ? cap : 100,
        });
    }
    return new MemorySessionStore({
        cap: Number.isFinite(cap) && cap >= 0 ? cap : 100,
    });
}
async function runCli() {
    const userInput = stripEnvFileArgs(process.argv.slice(2))
        .filter((a) => a !== "--serve" &&
        a !== "--setup" &&
        a !== "--doctor" &&
        a !== "--audit-dump" &&
        a !== "--json")
        .join(" ")
        .trim();
    const content = userInput || "Hello, BLUE-TANUKI";
    const plugins = await loadPluginRuntime();
    plugins.enforceLLMConfig(process.env);
    plugins.enforceSessionConfig(process.env);
    plugins.enforceAuditConfig(process.env);
    gatewayLog.info("BLUE-TANUKI starting (CLI one-shot)");
    gatewayLog.info("LLM config", describeLLMConfig());
    gatewayLog.info("LLM command route", describeLLMCommandRoute());
    const tools = new ToolRegistry();
    plugins.registerTools(tools);
    const llm = buildLLMBackendFromEnv();
    const session_store = buildSessionStore(plugins);
    const hds = new HDSUpperController({
        audit: buildAuditLog(),
        memory: buildHDSMemoryStore(process.env),
        llm_route: buildLLMCommandRouteFromEnv(),
    });
    const approval = buildApprovalRuntime(process.env);
    const executor = new Executor({ llm, tools, session_store });
    const inbound = {
        id: randomUUID(),
        channel: "cli",
        user: "local-user",
        content,
        timestamp: Date.now(),
    };
    gatewayLog.info("inbound", {
        id: inbound.id,
        channel: inbound.channel,
        content: inbound.content,
    });
    const { log, command } = hds.decide(inbound);
    hdsLog.info("decision", {
        decision: log.commit.decision,
        aggregate: log.model.scoring.aggregate.toFixed(2),
        hash: log.commit.hash.slice(0, 12),
    });
    hdsLog.info("reason", { reason: log.commit.reason });
    hdsLog.info("triggered", {
        thresholds: log.commit.triggered_thresholds.join(", "),
    });
    for (const ax of log.model.scoring.axis_scores) {
        hdsLog.info("axis", {
            axis: ax.axis,
            score: ax.score.toFixed(2),
            detector: ax.detector,
            evidence: ax.evidence,
        });
    }
    if (!command) {
        if (log.commit.decision === "SUSPEND") {
            gatewayLog.info("SUSPENDED. Awaiting human resume.", {
                request_id: inbound.id,
            });
            gatewayLog.info('In Phase 1, resume via HDSUpperController#resume(id, "approve"|"reject"|"block").');
        }
        else {
            gatewayLog.info("halting (no command)", { decision: log.commit.decision });
        }
        auditLog.info("summary", {
            entries: hds.getAudit().size(),
            chain_valid: hds.getAudit().verify(),
        });
        return;
    }
    const approvalEval = approval.evaluate(command, inbound.user);
    hds.onApprovalEvaluation(approvalEval, { request_id: inbound.id });
    if (approvalEval.decision !== "allow") {
        hds.onCommandLifecycle(command.id, "approval_cancelled", { actor: inbound.user, reason: approvalEval.reason });
        const feedback = approvalDeniedFeedback(command, approvalEval.reason);
        coreLog.info("approval", { command: command.id.slice(0, 8), decision: approvalEval.decision, operation: approvalEval.context.operation, risk: approvalEval.risk, reason: approvalEval.reason });
        const output = renderCommandOutput(command, feedback);
        if (output)
            coreLog.info("command.output", { content: output });
        auditLog.info("summary", { entries: hds.getAudit().size(), chain_valid: hds.getAudit().verify() });
        return;
    }
    hds.onCommandLifecycle(command.id, "approval_approved", { actor: inbound.user, reason: approvalEval.reason });
    const feedback = await executor.execute(command);
    coreLog.info("command", {
        command: command.id.slice(0, 8),
        status: feedback.status,
        duration_ms: feedback.metrics.duration_ms,
    });
    if (feedback.status === "success" && command.type === "llm_call") {
        const result = feedback.result;
        coreLog.info("llm", {
            model: result.model,
            tokens: result.tokens_used,
        });
        coreLog.info("llm.content", { content: result.content });
    }
    else if (feedback.status === "failed") {
        coreLog.error("error", { error: feedback.error });
    }
    const output = renderCommandOutput(command, feedback);
    if (output && command.type !== "llm_call") {
        coreLog.info("command.output", { content: output });
    }
    hds.onFeedback(feedback);
    auditLog.info("summary", {
        entries: hds.getAudit().size(),
        chain_valid: hds.getAudit().verify(),
    });
}
async function runDoctorCli() {
    const { runDoctor, formatTextReport, formatJsonReport } = await import("./doctor.js");
    const json = process.argv.includes("--json");
    const report = await runDoctor();
    if (json) {
        writeStdout(formatJsonReport(report));
    }
    else {
        writeStdout(formatTextReport(report));
    }
    process.exit(report.exit_code);
}
async function runAuditDumpCli() {
    const { runAuditDump, formatAuditTextReport, formatAuditJsonReport } = await import("./audit_dump.js");
    const json = process.argv.includes("--json");
    const report = runAuditDump();
    if (json) {
        writeStdout(formatAuditJsonReport(report));
    }
    else {
        writeStdout(formatAuditTextReport(report));
    }
    process.exit(report.exit_code);
}
async function runSetupCliMode() {
    const { runSetupCli } = await import("./setup.js");
    await runSetupCli(process.argv.slice(2));
}
async function main() {
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
    const serveMode = process.argv.includes("--serve") || process.env.BLUE_TANUKI_SERVE === "1";
    if (serveMode) {
        await runServe();
        return;
    }
    await runCli();
}
main().catch((e) => {
    gatewayLog.error("fatal", {
        error: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
});
//# sourceMappingURL=main.js.map
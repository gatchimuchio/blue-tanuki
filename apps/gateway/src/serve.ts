import { HDSUpperController } from "@blue-tanuki/hds-brain";
import type { ApprovalEvaluation, DecisionLog } from "@blue-tanuki/hds-brain";
import {
  Executor,
  ToolRegistry,
  createLogger,
} from "@blue-tanuki/core";
import { buildHDSMemoryStore, buildSessionStore } from "./main.js";
import { buildAuditLog } from "./audit_config.js";
import {
  buildLLMBackendFromEnv,
  buildLLMCommandRouteFromEnv,
  describeLLMCommandRoute,
  describeLLMConfig,
} from "./llm_config.js";
import {
  InboundRouter,
  OutboundDispatcher,
  type InboundChannel,
  type OutboundChannel,
} from "@blue-tanuki/channel-base";
import type {
  ExecuteCommand,
  InboundRequest,
} from "@blue-tanuki/protocol";
import type {
  WebChatChannel,
  WebChatApprovalQueueItem,
  WebChatResumeContext,
} from "@blue-tanuki/channel-webchat";
import { renderCommandOutput } from "./result_render.js";
import { approvalDeniedFeedback, approvalRequiredMessage, buildApprovalRuntime } from "./approval_runtime.js";
import { loadPluginRuntime } from "./plugin_loader.js";
import { createWebChatSettingsSurface } from "./settings_surface.js";
import { DailyBriefCronChannel, dailyBriefCronFromEnv } from "./cron_channel.js";
import {
  auditDumpReportFromLog,
  formatAuditJsonReport,
  formatAuditTextReport,
} from "./audit_dump.js";

/**
 * Gateway serve mode.
 *
 * Wires HDS-BRAIN, the executor, WebChat, Slack, and Discord. HDS-BRAIN
 * remains the upstream state owner; LLM calls stay downstream.
 */

interface ServeShutdown {
  shutdown: () => Promise<void>;
}

const gatewayLog = createLogger({ scope: "gateway" });
const hdsLog = createLogger({ scope: "hds-brain" });
const coreLog = createLogger({ scope: "blue-tanuki" });
const auditLog = createLogger({ scope: "audit" });
const slackLog = createLogger({ scope: "slack" });
const discordLog = createLogger({ scope: "discord" });
const telegramLog = createLogger({ scope: "telegram" });
const cronLog = createLogger({ scope: "cron" });

interface PendingApproval {
  command: ExecuteCommand;
  log: DecisionLog;
  origin: InboundRequest;
  evaluation: ApprovalEvaluation;
  approval_token?: string;
  approval_token_expires_at_ms?: number;
}

/** Resolve the address to send replies back to. */
function replyTarget(req: InboundRequest): string {
  const m = req.metadata?.["reply_to"];
  return typeof m === "string" && m.length > 0 ? m : req.user;
}

export async function serve(): Promise<ServeShutdown> {
  const plugins = await loadPluginRuntime();
  plugins.enforceLLMConfig(process.env);
  plugins.enforceSessionConfig(process.env);
  plugins.enforceAuditConfig(process.env);

  gatewayLog.info("BLUE-TANUKI starting (Phase 5-S2: plugin-loaded serve mode)");
  gatewayLog.info("LLM config", describeLLMConfig());
  gatewayLog.info("LLM command route", describeLLMCommandRoute());

  const tools = new ToolRegistry();
  plugins.registerTools(tools);
  const llm = buildLLMBackendFromEnv();

  const hds = new HDSUpperController({
    audit: buildAuditLog(),
    memory: buildHDSMemoryStore(process.env),
    llm_route: buildLLMCommandRouteFromEnv(),
  });
  const approval = buildApprovalRuntime(process.env);
  const pendingApprovals = new Map<string, PendingApproval>();
  const router = new InboundRouter();
  const dispatcher = new OutboundDispatcher();

  const port = parseInt(process.env.WEBCHAT_PORT ?? "8787", 10);
  const webchatPermissions = [
    "network:listen",
    "secrets:WEBCHAT_TOKEN",
    "secrets:WEBCHAT_RESUME_TOKEN",
    ...(process.env.BLUE_TANUKI_SETTINGS_TOKEN
      ? ["secrets:BLUE_TANUKI_SETTINGS_TOKEN"]
      : []),
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-webchat",
    webchatPermissions,
    "read/register webchat channel",
  );
  const token = process.env.WEBCHAT_TOKEN;
  if (!token) {
    throw new Error("WEBCHAT_TOKEN is required for serve mode");
  }
  const resumeToken = process.env.WEBCHAT_RESUME_TOKEN;
  if (!resumeToken) {
    throw new Error("WEBCHAT_RESUME_TOKEN is required for serve mode");
  }
  if (resumeToken === token) {
    throw new Error("WEBCHAT_RESUME_TOKEN must differ from WEBCHAT_TOKEN");
  }

  // Forward declarations: resume/approval closures resolve at call time.
  // eslint-disable-next-line prefer-const
  let executor: Executor;
  let webchat: WebChatChannel;

  /**
   * Run a command through the executor, then mirror user-visible command
   * output back to the originating channel as a channel_send.
   */
  async function executeAndEcho(
    cmd: ExecuteCommand,
    log: DecisionLog,
    origin: InboundRequest,
    opts: { skip_approval?: boolean; actor?: string } = {},
  ): Promise<{ status: string }> {
    if (!opts.skip_approval) {
      const evaluation = approval.evaluate(cmd, opts.actor ?? origin.user);
      hds.onApprovalEvaluation(evaluation, { request_id: log.request_id });
      if (evaluation.decision === "ask") {
        hds.onCommandLifecycle(cmd.id, "approval_pending", { actor: opts.actor ?? origin.user, reason: evaluation.reason });
        const issued = await webchat.issueResumeApprovalToken(cmd.id);
        pendingApprovals.set(cmd.id, {
          command: cmd,
          log,
          origin,
          evaluation,
          approval_token: issued?.token,
          approval_token_expires_at_ms: issued?.expires_at_ms,
        });
        await dispatcher.dispatch(
          { channel: origin.channel, target: replyTarget(origin), content: approvalRequiredMessage(evaluation, cmd.id, issued?.token) },
          { command_id: `approval-${cmd.id}`, upstream_commit_hash: log.commit.hash },
        );
        return { status: "approval_required" };
      }
      if (evaluation.decision === "deny") {
        hds.onCommandLifecycle(cmd.id, "approval_rejected", { actor: opts.actor ?? origin.user, reason: evaluation.reason });
        const fb = approvalDeniedFeedback(cmd, evaluation.reason);
        const content = renderCommandOutput(cmd, fb);
        if (content) await dispatcher.dispatch({ channel: origin.channel, target: replyTarget(origin), content }, { command_id: cmd.id, upstream_commit_hash: log.commit.hash });
        return { status: "approval_denied" };
      }
      hds.onCommandLifecycle(cmd.id, "approval_approved", { actor: opts.actor ?? origin.user, reason: evaluation.reason });
    }
    const fb = await executor.execute(cmd);
    hds.onFeedback(fb);
    coreLog.info("command", { command: cmd.id.slice(0, 8), status: fb.status, duration_ms: fb.metrics.duration_ms });
    const content = renderCommandOutput(cmd, fb);
    if (content) await dispatcher.dispatch({ channel: origin.channel, target: replyTarget(origin), content }, { command_id: cmd.id, upstream_commit_hash: log.commit.hash });
    return { status: fb.status };
  }

  async function resumePendingApproval(command_id: string, verdict: "approve" | "reject" | "block", ctx: WebChatResumeContext): Promise<unknown> {
    const pending = pendingApprovals.get(command_id);
    if (!pending) return null;
    pendingApprovals.delete(command_id);
    if (verdict !== "approve") {
      hds.onCommandLifecycle(command_id, "approval_rejected", { actor: ctx.actor, reason: `human_approval:${verdict}` });
      await dispatcher.dispatch({ channel: pending.origin.channel, target: replyTarget(pending.origin), content: `[approval-${verdict}] command_id=${command_id}` }, { command_id: `approval-${verdict}-${command_id}`, upstream_commit_hash: pending.log.commit.hash });
      return { approval: verdict, executed: false };
    }
    if (ctx.approval?.remember || ctx.approval?.mode) {
      const grant = approval.remember(pending.evaluation, { actor: ctx.actor, mode: ctx.approval.mode, duration_ms: ctx.approval.duration_ms, note: `remembered from approval of command_id=${command_id}` });
      hds.onAuthorityEvent("grant_created", {
        request_id: pending.log.request_id,
        command_id,
        grant_id: grant.id,
        actor: ctx.actor,
        reason: `remembered from approval of command_id=${command_id}`,
        evaluation: pending.evaluation,
      });
    }
    hds.onCommandLifecycle(command_id, "approval_approved", { actor: ctx.actor, reason: "human_approval:approve" });
    const r = await executeAndEcho(pending.command, pending.log, pending.origin, { skip_approval: true, actor: ctx.actor });
    return { approval: "approve", executed: true, status: r.status };
  }

  webchat = plugins.createChannel<WebChatChannel>({
    package_name: "@blue-tanuki/channel-webchat",
    required_permissions: webchatPermissions,
    action: "register webchat channel",
    constructor_args: [{
      port,
      token,
      resume_token: resumeToken,
      host: process.env.WEBCHAT_HOST ?? "127.0.0.1",
      settings: createWebChatSettingsSurface({
        env: process.env,
        plugins,
      }),
      runtime: {
        getSnapshot: async () => ({
          hds: hds.getRuntimeSnapshot(),
          pending_approvals: pendingApprovalSnapshot(),
        }),
      },
      approval: {
        list: async () => pendingApprovalSnapshot(),
      },
      audit: {
        dump: async (format: "json" | "text") => {
          const report = auditDumpReportFromLog(hds.getAudit());
          return format === "text"
            ? {
                content_type: "text/plain; charset=utf-8",
                body: formatAuditTextReport(report),
              }
            : {
                content_type: "application/json",
                body: formatAuditJsonReport(report),
              };
        },
      },
      onResume: async (
        request_id: string,
        verdict: "approve" | "reject" | "block",
        ctx: WebChatResumeContext,
      ) => {
        const pending = await resumePendingApproval(request_id, verdict, ctx);
        if (pending) return pending;
        const { log, command, request } = hds.resume(request_id, verdict, { actor: ctx.actor, token_kind: ctx.token_kind });
        if (command) {
          const r = await executeAndEcho(command, log, request, { actor: ctx.actor });
          return { decision: log.commit.decision, executed: true, status: r.status };
        }
        return { decision: log.commit.decision, executed: false };
      },
    }],
  });

  function pendingApprovalSnapshot(): WebChatApprovalQueueItem[] {
    return Array.from(pendingApprovals.values()).map((p) => ({
      command_id: p.command.id,
      request_id: p.log.request_id,
      operation: p.evaluation.context.operation,
      risk: p.evaluation.risk,
      final_review_required: p.evaluation.final_review_required,
      reason: p.evaluation.reason,
      approval_token: p.approval_token,
      approval_token_expires_at_ms: p.approval_token_expires_at_ms,
      authority_trace: p.evaluation.authority_trace,
    }));
  }

  const telegramPermissions = [
    "network:api.telegram.org",
    "secrets:TELEGRAM_BOT_TOKEN",
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-telegram",
    telegramPermissions,
    "read/register telegram channel",
  );
  const telegram = plugins.createChannel<InboundChannel & OutboundChannel>({
    package_name: "@blue-tanuki/channel-telegram",
    required_permissions: telegramPermissions,
    action: "register telegram channel",
    constructor_args: [{
      bot_token: process.env.TELEGRAM_BOT_TOKEN,
      poll_interval_ms: parsePositiveInt(process.env.TELEGRAM_POLL_INTERVAL_MS),
      poll_timeout_sec: parsePositiveInt(process.env.TELEGRAM_POLL_TIMEOUT_SEC),
      log: (line: string) => telegramLog.info(line),
    }],
  });

  const cronConfig = dailyBriefCronFromEnv(process.env);
  const cron = cronConfig
    ? new DailyBriefCronChannel({
        ...cronConfig,
        log: (line: string) => cronLog.info(line),
      })
    : null;

  const slackPermissions = [
    "network:slack.com",
    "secrets:SLACK_BOT_TOKEN",
    "secrets:SLACK_APP_TOKEN",
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-slack",
    slackPermissions,
    "read/register slack channel",
  );
  const slack = plugins.createChannel<InboundChannel & OutboundChannel>({
    package_name: "@blue-tanuki/channel-slack",
    required_permissions: slackPermissions,
    action: "register slack channel",
    constructor_args: [{
      bot_token: process.env.SLACK_BOT_TOKEN,
      app_token: process.env.SLACK_APP_TOKEN,
      log: (line: string) => slackLog.info(line),
    }],
  });
  const discordPermissions = [
    "network:discord.com",
    "secrets:DISCORD_BOT_TOKEN",
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-discord",
    discordPermissions,
    "read/register discord channel",
  );
  const discord = plugins.createChannel<InboundChannel & OutboundChannel>({
    package_name: "@blue-tanuki/channel-discord",
    required_permissions: discordPermissions,
    action: "register discord channel",
    constructor_args: [{
      bot_token: process.env.DISCORD_BOT_TOKEN,
      log: (line: string) => discordLog.info(line),
    }],
  });

  router.register(webchat);
  router.register(telegram);
  router.register(slack);
  router.register(discord);
  if (cron) router.register(cron);

  dispatcher.register(webchat);
  dispatcher.register(telegram);
  dispatcher.register(slack);
  dispatcher.register(discord);

  executor = new Executor({
    llm,
    tools,
    dispatcher,
    session_store: buildSessionStore(plugins),
  });

  const handler = async (req: InboundRequest): Promise<void> => {
    const { log, command } = hds.decide(req);
    hdsLog.info("decision", {
      channel: req.channel,
      user: req.user,
      request_id: req.id.slice(0, 8),
      decision: log.commit.decision,
      hash: log.commit.hash.slice(0, 12),
    });

    if (command) {
      await executeAndEcho(command, log, req);
      return;
    }

    // No command means the upstream decision is sent back to the user.
    const issued =
      log.commit.decision === "SUSPEND"
        ? await webchat.issueResumeApprovalToken(req.id)
        : null;
    const human = humanizeDecision(
      log.commit.decision,
      log.commit.reason,
      req.id,
      issued?.token,
    );
    await dispatcher.dispatch(
      { channel: req.channel, target: replyTarget(req), content: human },
      { command_id: `notify-${req.id}`, upstream_commit_hash: log.commit.hash },
    );
  };

  await router.start(handler);
  gatewayLog.info("inbound channels", { channels: router.list().join(", ") });
  gatewayLog.info("outbound channels", { channels: dispatcher.list().join(", ") });
  gatewayLog.info("webchat listening", {
    url: `http://${process.env.WEBCHAT_HOST ?? "127.0.0.1"}:${port}`,
  });

  return {
    shutdown: async () => {
      gatewayLog.info("shutting down");
      await router.stop();
      auditLog.info("summary", {
        entries: hds.getAudit().size(),
        chain_valid: hds.getAudit().verify(),
      });
    },
  };
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function humanizeDecision(
  decision: "ASSERT" | "SUSPEND" | "OUT_OF_SCOPE" | "FAIL",
  reason: string,
  request_id: string,
  approval_token?: string,
): string {
  switch (decision) {
    case "SUSPEND":
      return `[suspended] Awaiting human review. reason=${reason} request_id=${request_id}${
        approval_token ? ` approval_token=${approval_token}` : ""
      }`;
    case "OUT_OF_SCOPE":
      return `[out-of-scope] Request not handled. reason=${reason}`;
    case "FAIL":
      return `[rejected] Request blocked by upstream policy. reason=${reason}`;
    case "ASSERT":
      // Should not be reached: ASSERT always carries a command.
      return `[ok] reason=${reason}`;
  }
}

export async function runServe(): Promise<void> {
  const handle = await serve();
  const onSignal = async (sig: string): Promise<void> => {
    gatewayLog.info("received signal", { signal: sig });
    await handle.shutdown();
    process.exit(0);
  };
  process.on("SIGINT", () => void onSignal("SIGINT"));
  process.on("SIGTERM", () => void onSignal("SIGTERM"));
}

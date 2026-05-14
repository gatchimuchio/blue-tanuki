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
  WebChatAuthorityTraceItem,
  WebChatResumeContext,
} from "@blue-tanuki/channel-webchat";
import {
  WRITING_OPERATOR_REQUIRED_PERMISSIONS,
  type WritingSurfaceSnapshot,
} from "@blue-tanuki/operator-writing";
import { renderCommandOutput } from "./result_render.js";
import { approvalDeniedFeedback, approvalRequiredMessage, buildApprovalRuntime } from "./approval_runtime.js";
import { loadPluginRuntime } from "./plugin_loader.js";
import { createWebChatSettingsSurface } from "./settings_surface.js";
import { CronSchedulerChannel, cronSchedulesFromEnv } from "./cron_channel.js";
import { googleDailyBriefProviderFromEnv } from "./google_daily_brief.js";
import {
  RuntimeScheduleManager,
  runtimeScheduleMutationCommand,
} from "./runtime_schedule.js";
import {
  auditDumpReportFromLog,
  formatAuditJsonReport,
  formatAuditTextReport,
} from "./audit_dump.js";
import { buildRuntimeStatusSnapshot } from "./runtime_status.js";
import { buildResidentNotificationsSnapshot } from "./resident_notifications.js";

/**
 * Gateway serve mode.
 *
 * Wires HDS-BRAIN, the executor, WebChat, Slack, Discord, Teams, and LINE. HDS-BRAIN
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
const teamsLog = createLogger({ scope: "teams" });
const lineLog = createLogger({ scope: "line" });
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
  const writingSurfaceSnapshot = plugins.getSurface<() => WritingSurfaceSnapshot>({
    package_name: "@blue-tanuki/operator-writing",
    required_permissions: WRITING_OPERATOR_REQUIRED_PERMISSIONS,
    action: "register writing operator surface",
  });

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
  const runtimeSchedules = await RuntimeScheduleManager.open({
    env: process.env,
    onLifecycle: (event, lifecycle) => {
      hds.onScheduleLifecycle(event, lifecycle);
    },
  });
  for (const tool of runtimeSchedules.tools()) tools.register(tool);
  const approval = buildApprovalRuntime(process.env);
  const pendingApprovals = new Map<string, PendingApproval>();
  const router = new InboundRouter();
  const dispatcher = new OutboundDispatcher();

  const port = parseInt(process.env.WEBCHAT_PORT ?? "8787", 10);
  const webchatPermissions = [
    "network:listen",
    "secrets:WEBCHAT_TOKEN",
    "secrets:WEBCHAT_RESUME_TOKEN",
    ...(process.env.WEBHOOK_TOKEN ? ["secrets:WEBHOOK_TOKEN"] : []),
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
  const cronTasks = cronSchedulesFromEnv(process.env);
  const cron = new CronSchedulerChannel({
    tasks: [...cronTasks, ...runtimeSchedules.activeCronTasks()],
    log: (line: string) => cronLog.info(line),
    content_provider: googleDailyBriefProviderFromEnv(process.env),
    onFire: (task) => {
      hds.onScheduleLifecycle("schedule.lifecycle.fired", {
        schedule_id: task.id,
        origin: task.origin,
        operation: "fire",
        actor: "blue-tanuki-cron",
        payload_hash: task.payload_hash,
        request_id: null,
      });
    },
  });
  runtimeSchedules.attachScheduler(cron);

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
        if (runtimeScheduleMutationCommand(cmd)) {
          const prepared = runtimeSchedules.preparePending(cmd, evaluation, {
            request_id: log.request_id,
            actor: opts.actor ?? origin.user,
          });
          if (!prepared.ok) {
            hds.onCommandLifecycle(cmd.id, "approval_rejected", {
              actor: opts.actor ?? origin.user,
              reason: prepared.message,
            });
            await dispatcher.dispatch(
              { channel: origin.channel, target: replyTarget(origin), content: prepared.message },
              { command_id: `schedule-rejected-${cmd.id}`, upstream_commit_hash: log.commit.hash },
            );
            return { status: "schedule_rejected" };
          }
        }
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
      runtimeSchedules.rejectPending(command_id, ctx.actor, `human_approval:${verdict}`);
      hds.onCommandLifecycle(command_id, "approval_rejected", { actor: ctx.actor, reason: `human_approval:${verdict}` });
      await dispatcher.dispatch({ channel: pending.origin.channel, target: replyTarget(pending.origin), content: `[approval-${verdict}] command_id=${command_id}` }, { command_id: `approval-${verdict}-${command_id}`, upstream_commit_hash: pending.log.commit.hash });
      return { approval: verdict, executed: false };
    }
    if (runtimeScheduleMutationCommand(pending.command) && !runtimeSchedules.hasPending(command_id)) {
      const content = "[schedule-expired] approval expired before activation. activated=false can_fire=false next_action=Submit the schedule request again and approve the new command_id.";
      hds.onCommandLifecycle(command_id, "approval_rejected", { actor: ctx.actor, reason: "schedule_approval_expired" });
      await dispatcher.dispatch({ channel: pending.origin.channel, target: replyTarget(pending.origin), content }, { command_id: `schedule-expired-${command_id}`, upstream_commit_hash: pending.log.commit.hash });
      return { approval: "approve", executed: false, status: "schedule_approval_expired" };
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
      webhook_token: process.env.WEBHOOK_TOKEN,
      host: process.env.WEBCHAT_HOST ?? "127.0.0.1",
      settings: createWebChatSettingsSurface({
        env: process.env,
        plugins,
      }),
      runtime: {
        getSnapshot: async () => {
          const hdsSnapshot = hds.getRuntimeSnapshot();
          const pendingApprovals = pendingApprovalSnapshot();
          const runtimeSchedulesCount = runtimeSchedules.activeCount();
          const pendingScheduleApprovalsCount = runtimeSchedules.pendingCount();
          return {
            ...buildRuntimeStatusSnapshot({
              gateway_status: "running",
              hds: hdsSnapshot,
              webchat_token: process.env.WEBCHAT_TOKEN,
              webchat_resume_token: process.env.WEBCHAT_RESUME_TOKEN,
              telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN,
              pending_approvals_count: pendingApprovals.length,
              runtime_schedules_count: runtimeSchedulesCount,
              pending_schedule_approvals_count: pendingScheduleApprovalsCount,
            }),
            hds: hdsSnapshot,
            pending_approvals: pendingApprovals,
            scheduled_tasks: cron.snapshot(),
            operator_surfaces: {
              writing: writingSurfaceSnapshot(),
            },
            runtime_schedules_count: runtimeSchedulesCount,
            pending_schedule_approvals_count: pendingScheduleApprovalsCount,
            runtime_schedules: runtimeSchedules.snapshot(),
          };
        },
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
      authority: {
        trace: async () => authorityTraceSnapshot(),
      },
      notifications: {
        list: async () => residentNotificationSnapshot(),
      },
      operators: {
        writing: {
          getSnapshot: async () => writingSurfaceSnapshot(),
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
      approval_level: p.evaluation.approval_level,
      final_review_required: p.evaluation.final_review_required,
      reason: p.evaluation.reason,
      approval_token: p.approval_token,
      approval_token_expires_at_ms: p.approval_token_expires_at_ms,
      authority_trace: p.evaluation.authority_trace,
    }));
  }

  function authorityTraceSnapshot(): WebChatAuthorityTraceItem[] {
    const items: WebChatAuthorityTraceItem[] = [];
    const auditEntries = hds.getAudit().list();
    const requestSources = new Map<
      string,
      { source_process_kind: string; source_channel: string }
    >();
    for (const entry of auditEntries) {
      const log = entry.log;
      if (!("kind" in log)) {
        requestSources.set(log.request_id, {
          source_process_kind: log.frame.process.process_kind,
          source_channel: log.frame.actor.channel,
        });
      }
    }

    for (const entry of auditEntries) {
      const log = entry.log;
      const base = {
        index: entry.index,
        entry_hash: entry.entry_hash,
        request_id: log.request_id ?? null,
        timestamp: log.timestamp,
      };

      if (!("kind" in log)) {
        for (const hit of log.frame.memory_trace.hits) {
          items.push({
            ...base,
            kind: "memory_reference",
            event: "memory.read",
            memory_id: hit.memory_id,
            f_reference: hit.f_reference,
            memory_entry_hash: hit.entry_hash,
            source: hit.source,
            used_for_authority: log.frame.memory_trace.used_for_authority,
            matched_on: hit.matched_on,
            reason: hit.reason,
            summary: hit.summary,
          });
        }
        continue;
      }

      if (log.kind === "approval_gate") {
        items.push({
          ...base,
          kind: "approval_gate",
          event: "approval_gate",
          command_id: log.command_id,
          actor: log.evaluation.context.actor,
          operation: log.evaluation.context.operation,
          risk: log.evaluation.risk,
          reason: log.evaluation.reason,
          decision: log.evaluation.decision,
          authority_trace: log.evaluation.authority_trace,
        });
        continue;
      }

      if (log.kind === "authority_event") {
        items.push({
          ...base,
          kind: "authority_event",
          event: log.event,
          command_id: log.command_id,
          actor: log.actor,
          operation: log.operation,
          risk: log.risk,
          reason: log.reason,
          authority_trace: log.authority_trace,
        });
        continue;
      }

      if (log.kind === "memory_reference") {
        items.push({
          ...base,
          kind: "memory_reference",
          event: log.event,
          memory_id: log.memory_id,
          f_reference: log.f_reference,
          memory_entry_hash: log.entry_hash,
          source: log.source,
          used_for_authority: log.used_for_authority,
          matched_on: log.matched_on,
          reason: log.reason,
          summary: log.summary,
        });
        continue;
      }

      if (log.kind === "executor_feedback") {
        const source = log.request_id
          ? requestSources.get(log.request_id)
          : undefined;
        items.push({
          ...base,
          kind: "executor_feedback",
          event: `executor.${log.feedback.status}`,
          command_id: log.command_id,
          status: log.feedback.status,
          error: log.feedback.error,
          known_command: log.known_command,
          source_process_kind: source?.source_process_kind,
          source_channel: source?.source_channel,
        });
        continue;
      }

      if (log.kind === "command_lifecycle") {
        items.push({
          ...base,
          kind: "command_lifecycle",
          event: log.phase,
          command_id: log.command_id,
          actor: log.actor,
          reason: log.reason,
        });
        continue;
      }

      if (log.kind === "schedule_lifecycle") {
        items.push({
          ...base,
          kind: "schedule_lifecycle",
          event: log.event,
          request_id: log.request_id ?? null,
          command_id: log.command_id,
          actor: log.actor,
          operation: log.operation,
          risk: log.risk,
          approval_level: log.approval_level,
          schedule_id: log.schedule_id,
          payload_hash: log.payload_hash,
          previous_payload_hash: log.previous_payload_hash,
        });
      }
    }
    return items;
  }

  function residentNotificationSnapshot() {
    return buildResidentNotificationsSnapshot({
      audit_chain_valid: hds.getAudit().verify(),
      pending_approvals: pendingApprovalSnapshot(),
      authority_trace: authorityTraceSnapshot(),
    });
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
  const teamsPermissions = [
    "network:graph.microsoft.com",
    "secrets:MICROSOFT_GRAPH_ACCESS_TOKEN",
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-teams",
    teamsPermissions,
    "read/register teams channel",
  );
  const teams = plugins.createChannel<InboundChannel & OutboundChannel>({
    package_name: "@blue-tanuki/channel-teams",
    required_permissions: teamsPermissions,
    action: "register teams channel",
    constructor_args: [{
      access_token: process.env.MICROSOFT_GRAPH_ACCESS_TOKEN,
      log: (line: string) => teamsLog.info(line),
    }],
  });
  const linePermissions = [
    "network:api.line.me",
    "secrets:LINE_CHANNEL_ACCESS_TOKEN",
  ] as const;
  plugins.requirePermissions(
    "@blue-tanuki/channel-line",
    linePermissions,
    "read/register line channel",
  );
  const line = plugins.createChannel<InboundChannel & OutboundChannel>({
    package_name: "@blue-tanuki/channel-line",
    required_permissions: linePermissions,
    action: "register line channel",
    constructor_args: [{
      channel_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      log: (lineText: string) => lineLog.info(lineText),
    }],
  });

  router.register(webchat);
  router.register(telegram);
  router.register(slack);
  router.register(discord);
  router.register(teams);
  router.register(line);
  router.register(cron);

  dispatcher.register(webchat);
  dispatcher.register(telegram);
  dispatcher.register(slack);
  dispatcher.register(discord);
  dispatcher.register(teams);
  dispatcher.register(line);

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

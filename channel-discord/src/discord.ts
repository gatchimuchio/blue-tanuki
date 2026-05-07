import { randomUUID } from "node:crypto";
import type {
  InboundRequest,
  ChannelSendPayload,
} from "@blue-tanuki/protocol";
import {
  withRetryBackoff,
  type BackoffOptions,
  type InboundChannel,
  type InboundHandler,
  type OutboundChannel,
  type SendMeta,
  type SendResult,
} from "@blue-tanuki/channel-base";
import type { DiscordTransport, DiscordPostResult } from "./transport.js";
import { DiscordJsTransport } from "./discordjs_transport.js";

export interface DiscordRetryConfig {
  max_retries: number;
  base_delay_ms: number;
  max_delay_ms: number;
  jitter_ratio: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface DiscordOptions {
  /** Bot token. Env: DISCORD_BOT_TOKEN. Absent → silent. */
  bot_token?: string;
  /** Inject a fake transport for tests. */
  transport?: DiscordTransport;
  /**
   * Outbound retry/backoff for rate-limit failures. discord.js itself
   * queues internally on 429; this is a *fallback* layer for the rare
   * cases where the SDK surfaces a rate-limit error rather than queueing.
   * Pass `false` to disable retries entirely. Default: 3 retries with
   * exponential backoff capped at 30s, ±20% jitter.
   */
  retry?: DiscordRetryConfig | false;
  log?: (line: string) => void;
}

const DEFAULT_RETRY: DiscordRetryConfig = {
  max_retries: 3,
  base_delay_ms: 500,
  max_delay_ms: 30_000,
  jitter_ratio: 0.2,
};

interface SentRecord {
  payload: ChannelSendPayload;
  meta: SendMeta;
  at: number;
  external_id: string;
  ok: boolean;
  error?: string;
}

/**
 * Discord channel — Phase 3 real-SDK integration.
 *
 * Mirror of SlackChannel: silent fallback on missing token, transport
 * dependency injection for tests, metadata-tagged inbound for reply routing.
 *
 * Inbound filtering invariants (enforced by DiscordJsTransport):
 *   - bot's own messages dropped
 *   - any other bot's messages dropped (echo loop prevention with other bots)
 *   - in guild text channels, only @-mentions trigger handling
 *   - DMs always handled
 *
 * Outbound:
 *   - target = Discord channel snowflake. The originating
 *     InboundRequest.metadata.reply_to carries this from inbound.
 */
export class DiscordChannel implements InboundChannel, OutboundChannel {
  readonly name = "discord";
  private readonly history: SentRecord[] = [];
  private silent = false;
  private started = false;
  private counter = 0;
  private transport: DiscordTransport | null = null;

  constructor(private readonly opts: DiscordOptions = {}) {}

  async start(handler: InboundHandler): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (this.opts.transport) {
      this.transport = this.opts.transport;
    } else if (this.opts.bot_token) {
      this.transport = new DiscordJsTransport({
        bot_token: this.opts.bot_token,
        log: this.opts.log,
      });
    } else {
      this.silent = true;
      this.log(
        "[discord] WARN DISCORD_BOT_TOKEN unset — running in silent mode",
      );
      return;
    }

    try {
      await this.transport.start(async (m) => {
        const inbound: InboundRequest = {
          id: randomUUID(),
          channel: "discord",
          user: m.user_display,
          content: m.text,
          timestamp: Date.now(),
          metadata: {
            reply_to: m.channel_id,
            discord_user_id: m.user_id,
            discord_channel_id: m.channel_id,
            discord_message_id: m.message_id,
            discord_guild_id: m.guild_id,
            is_dm: m.is_dm,
            is_mention: m.is_mention,
          },
        };
        try {
          await handler(inbound);
        } catch (e) {
          this.log(
            `[discord] inbound handler threw: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      });
      this.log("[discord] active");
    } catch (e) {
      this.silent = true;
      this.log(
        `[discord] WARN transport start failed (${e instanceof Error ? e.message : String(e)}); falling back to silent`,
      );
      this.transport = null;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    if (this.transport) {
      try {
        await this.transport.stop();
      } catch {
        /* ignore */
      }
      this.transport = null;
    }
  }

  async send(
    payload: ChannelSendPayload,
    meta: SendMeta,
  ): Promise<SendResult> {
    this.counter += 1;
    const at = Date.now();
    if (this.silent || !this.transport) {
      const external_id = `discord-silent-${meta.command_id}-${this.counter}`;
      this.history.push({
        payload,
        meta,
        at,
        external_id,
        ok: false,
        error: "silent_mode",
      });
      this.log(
        `[discord:silent] would-send target=${payload.target} commit=${meta.upstream_commit_hash.slice(0, 8)}… content="${truncate(payload.content, 80)}"`,
      );
      return { delivered: false, error: "silent_mode" };
    }

    const transport = this.transport;
    const retryCfg = this.opts.retry === false ? null : (this.opts.retry ?? DEFAULT_RETRY);

    const callOnce = (): Promise<DiscordPostResult> =>
      transport.postMessage({
        channel: payload.target,
        text: payload.content,
      });

    let r: DiscordPostResult;
    if (!retryCfg) {
      r = await callOnce();
    } else {
      const opts: BackoffOptions<DiscordPostResult> = {
        max_retries: retryCfg.max_retries,
        base_delay_ms: retryCfg.base_delay_ms,
        max_delay_ms: retryCfg.max_delay_ms,
        jitter_ratio: retryCfg.jitter_ratio,
        sleep: retryCfg.sleep,
        random: retryCfg.random,
        is_retryable: (signal) => {
          if (signal.kind === "throw") return true;
          const v = signal.value;
          if (v.ok) return false;
          if (typeof v.retry_after_ms === "number" && v.retry_after_ms > 0) return true;
          if (v.error && /rate.?limit|ratelimited|429|too_many/i.test(v.error)) return true;
          return false;
        },
        extract_retry_after_ms: (signal) =>
          signal.kind === "value" ? (signal.value.retry_after_ms ?? null) : null,
        on_retry: ({ attempt, delay_ms }) => {
          this.log(
            `[discord] retry attempt=${attempt} delay_ms=${delay_ms} target=${payload.target}`,
          );
        },
      };
      r = await withRetryBackoff(callOnce, opts);
    }

    const external_id = r.message_id ?? `discord-${meta.command_id}-${this.counter}`;
    this.history.push({
      payload,
      meta,
      at,
      external_id,
      ok: r.ok,
      error: r.error,
    });
    if (r.ok) {
      this.log(
        `[discord] sent target=${payload.target} message_id=${r.message_id ?? ""} commit=${meta.upstream_commit_hash.slice(0, 8)}…`,
      );
      return { delivered: true, external_id };
    }
    this.log(
      `[discord] FAILED target=${payload.target} error=${r.error ?? "unknown"}`,
    );
    return { delivered: false, error: r.error ?? "post_failed" };
  }

  getHistory(): readonly SentRecord[] {
    return [...this.history];
  }

  isSilent(): boolean {
    return this.silent;
  }

  private log(line: string): void {
    (this.opts.log ?? console.log)(line);
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

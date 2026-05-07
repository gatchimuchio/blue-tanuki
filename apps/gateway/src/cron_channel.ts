import { randomUUID } from "node:crypto";
import type { InboundRequest } from "@blue-tanuki/protocol";
import type { InboundChannel, InboundHandler } from "@blue-tanuki/channel-base";

export interface DailyBriefCronOptions {
  enabled?: boolean;
  channel: string;
  target: string;
  content: string;
  /** HH:MM local time. Default 07:00. */
  time?: string;
  /** For tests or smoke. If set, triggers every N ms instead of daily. */
  interval_ms?: number;
  log?: (line: string) => void;
  now?: () => Date;
}

/**
 * Minimal v0.1 cron source.
 *
 * It emits an internal cron InboundRequest. HDS-BRAIN still owns authority:
 * the cron request must pass cron.process and becomes a channel_send only via
 * the trusted gateway-internal metadata marker.
 */
export class DailyBriefCronChannel implements InboundChannel {
  readonly name = "cron";
  private timer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(private readonly opts: DailyBriefCronOptions) {}

  async start(handler: InboundHandler): Promise<void> {
    if (this.started) return;
    this.started = true;
    if (!this.opts.enabled) {
      this.log("[cron] disabled");
      return;
    }
    if (this.opts.interval_ms && this.opts.interval_ms > 0) {
      this.timer = setInterval(() => void this.fire(handler), this.opts.interval_ms);
      this.timer.unref?.();
      this.log(`[cron] daily brief interval enabled interval_ms=${this.opts.interval_ms}`);
      return;
    }
    this.scheduleNext(handler);
  }

  async stop(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.started = false;
  }

  private scheduleNext(handler: InboundHandler): void {
    const delay = delayUntilLocalTime(this.opts.time ?? "07:00", this.opts.now?.() ?? new Date());
    this.timer = setTimeout(() => {
      void this.fire(handler).finally(() => {
        if (this.started) this.scheduleNext(handler);
      });
    }, delay);
    this.timer.unref?.();
    this.log(`[cron] daily brief scheduled time=${this.opts.time ?? "07:00"} delay_ms=${delay}`);
  }

  private async fire(handler: InboundHandler): Promise<void> {
    const inbound: InboundRequest = {
      id: randomUUID(),
      channel: "cron",
      user: "blue-tanuki-cron",
      content: this.opts.content,
      timestamp: Date.now(),
      metadata: {
        "blue_tanuki.authority_context": "gateway_internal_v1",
        "blue_tanuki.actor_kind": "cron",
        "blue_tanuki.trust_level": "trusted",
        "blue_tanuki.process_kind": "cron",
        "blue_tanuki.channel_send.channel": this.opts.channel,
        "blue_tanuki.channel_send.target": this.opts.target,
        "blue_tanuki.channel_send.content": this.opts.content,
      },
    };
    this.log(`[cron] firing daily brief channel=${this.opts.channel} target=${this.opts.target}`);
    await handler(inbound);
  }

  private log(line: string): void {
    (this.opts.log ?? console.log)(line);
  }
}

export function dailyBriefCronFromEnv(env: Record<string, string | undefined> = process.env): DailyBriefCronOptions | null {
  const enabled = env.BLUE_TANUKI_DAILY_BRIEF_ENABLED === "1" || env.BLUE_TANUKI_DAILY_BRIEF_ENABLED === "true";
  if (!enabled) return null;
  const channel = env.BLUE_TANUKI_DAILY_BRIEF_CHANNEL ?? "telegram";
  const target = env.BLUE_TANUKI_DAILY_BRIEF_TARGET;
  if (!target) throw new Error("BLUE_TANUKI_DAILY_BRIEF_TARGET is required when daily brief is enabled");
  return {
    enabled,
    channel,
    target,
    content: env.BLUE_TANUKI_DAILY_BRIEF_CONTENT ?? "Daily Brief: no external integrations are enabled in v0.1. This is the scheduled-message smoke.",
    time: env.BLUE_TANUKI_DAILY_BRIEF_TIME ?? "07:00",
    interval_ms: parsePositiveInt(env.BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS),
  };
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function delayUntilLocalTime(hhmm: string, now: Date): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`invalid daily brief time: ${hhmm}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error(`invalid daily brief time: ${hhmm}`);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

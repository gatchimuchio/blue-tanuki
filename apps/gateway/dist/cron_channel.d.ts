import type { InboundChannel, InboundHandler } from "@blue-tanuki/channel-base";
export interface DailyBriefCronOptions {
  enabled?: boolean;
  channel: string;
  target: string;
  content: string;
  time?: string;
  interval_ms?: number;
  log?: (line: string) => void;
  now?: () => Date;
}
export declare class DailyBriefCronChannel implements InboundChannel {
  readonly name = "cron";
  private readonly opts;
  private timer;
  private started;
  constructor(opts: DailyBriefCronOptions);
  start(handler: InboundHandler): Promise<void>;
  stop(): Promise<void>;
  private scheduleNext;
  private fire;
  private log;
}
export declare function dailyBriefCronFromEnv(env?: Record<string, string | undefined>): DailyBriefCronOptions | null;
export declare function delayUntilLocalTime(hhmm: string, now: Date): number;

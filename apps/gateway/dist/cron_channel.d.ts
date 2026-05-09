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
export declare class DailyBriefCronChannel implements InboundChannel {
    private readonly opts;
    readonly name = "cron";
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
//# sourceMappingURL=cron_channel.d.ts.map
import type { ChannelSendPayload } from "@blue-tanuki/protocol";
import type { InboundChannel, InboundHandler, OutboundChannel, SendMeta, SendResult } from "@blue-tanuki/channel-base";
export type TelegramFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
export interface TelegramOptions {
    /** Telegram bot token. Env: TELEGRAM_BOT_TOKEN. Absent -> silent mode. */
    bot_token?: string;
    /** Poll interval. Default 1500ms. */
    poll_interval_ms?: number;
    /** Long-poll timeout seconds. Default 25. */
    poll_timeout_sec?: number;
    /** Dependency injection for tests. Default global fetch. */
    fetch?: TelegramFetch;
    log?: (line: string) => void;
}
interface SentRecord {
    payload: ChannelSendPayload;
    meta: SendMeta;
    at: number;
    external_id: string;
    ok: boolean;
    error?: string;
}
/**
 * Telegram Bot API channel.
 *
 * Design boundary:
 * - This adapter is pure I/O. It never calls an LLM and never decides authority.
 * - Inbound messages are normalized to InboundRequest and handed to HDS-BRAIN.
 * - Outbound target is the Telegram chat_id as string.
 * - Missing TELEGRAM_BOT_TOKEN results in silent mode so local WebChat remains usable.
 */
export declare class TelegramChannel implements InboundChannel, OutboundChannel {
    private readonly opts;
    readonly name = "telegram";
    private started;
    private silent;
    private stopped;
    private offset;
    private loop;
    private readonly history;
    private counter;
    constructor(opts?: TelegramOptions);
    start(handler: InboundHandler): Promise<void>;
    stop(): Promise<void>;
    send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
    getHistory(): readonly SentRecord[];
    isSilent(): boolean;
    private pollLoop;
    private normalize;
    private call;
    private log;
}
export {};
//# sourceMappingURL=telegram.d.ts.map
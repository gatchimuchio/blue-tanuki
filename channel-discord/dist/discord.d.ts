import type { ChannelSendPayload } from "@blue-tanuki/protocol";
import { type InboundChannel, type InboundHandler, type OutboundChannel, type SendMeta, type SendResult } from "@blue-tanuki/channel-base";
import type { DiscordTransport } from "./transport.js";
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
export declare class DiscordChannel implements InboundChannel, OutboundChannel {
    private readonly opts;
    readonly name = "discord";
    private readonly history;
    private silent;
    private started;
    private counter;
    private transport;
    constructor(opts?: DiscordOptions);
    start(handler: InboundHandler): Promise<void>;
    stop(): Promise<void>;
    send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
    getHistory(): readonly SentRecord[];
    isSilent(): boolean;
    private log;
}
export {};
//# sourceMappingURL=discord.d.ts.map
import type { ChannelSendPayload } from "@blue-tanuki/protocol";
import { type InboundChannel, type InboundHandler, type OutboundChannel, type SendMeta, type SendResult } from "@blue-tanuki/channel-base";
import type { SlackTransport } from "./transport.js";
export interface SlackRetryConfig {
    max_retries: number;
    base_delay_ms: number;
    max_delay_ms: number;
    jitter_ratio: number;
    /** Test-only injection of sleep; defaults to setTimeout. */
    sleep?: (ms: number) => Promise<void>;
    /** Test-only injection of RNG; defaults to Math.random. */
    random?: () => number;
}
export interface SlackOptions {
    /**
     * Bot token (xoxb-...). Env: SLACK_BOT_TOKEN.
     * If absent AND no `transport` is supplied, channel runs silent.
     */
    bot_token?: string;
    /**
     * App-level token (xapp-...) for Socket Mode. Env: SLACK_APP_TOKEN.
     * Required for the default Bolt-based transport. If absent AND no
     * `transport` is supplied, channel runs silent.
     */
    app_token?: string;
    /**
     * Inject a custom transport (typically a fake during tests).
     * When provided, takes precedence over bot_token/app_token defaults.
     */
    transport?: SlackTransport;
    /**
     * Outbound retry/backoff for rate-limit-style failures. The Slack SDK
     * already queues internally on 429; this is a *fallback* that gives a
     * few more attempts when the SDK eventually surfaces a rate-limit error.
     * Pass `false` to disable retries entirely. Default: 3 retries with
     * exponential backoff capped at 30s, ±20% jitter.
     */
    retry?: SlackRetryConfig | false;
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
 * Slack channel — Phase 3 real-SDK integration.
 *
 * Lifecycle:
 *   - silent mode: no token AND no injected transport → start() logs a
 *     warning, never produces inbound, send() fails fast with a structured
 *     error (still recorded in history for diagnostics). Matches Phase 2
 *     fail-soft behavior.
 *   - active mode: a transport is available → start() begins listening,
 *     inbound messages flow through the supplied InboundHandler.
 *
 * Inbound filtering invariants (enforced by BoltTransport, but SlackChannel
 * relies on these):
 *   - bot's own posts are dropped (echo loop prevention)
 *   - in public channels, only @-mentions of the bot trigger handling
 *   - DMs are always handled
 *
 * Outbound:
 *   - target = Slack channel id (Cxxx, Dxxx, or Gxxx)
 *   - When the originating InboundRequest has metadata.reply_to set,
 *     callers should use that as `payload.target`. SlackChannel itself
 *     does not consult metadata; it merely posts to the given target.
 *
 * Notes:
 *   - Rate limiting / backoff is deferred to Phase 4.
 *   - Threaded replies require the caller to pass thread_ts; not yet
 *     surfaced through ChannelSendPayload (would require a protocol
 *     extension). Phase 3 posts to the channel root.
 */
export declare class SlackChannel implements InboundChannel, OutboundChannel {
    private readonly opts;
    readonly name = "slack";
    private readonly history;
    private silent;
    private started;
    private counter;
    private transport;
    constructor(opts?: SlackOptions);
    start(handler: InboundHandler): Promise<void>;
    stop(): Promise<void>;
    send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
    /** Inspect what was sent (or attempted). Test/diagnostic only. */
    getHistory(): readonly SentRecord[];
    isSilent(): boolean;
    private log;
}
export {};
//# sourceMappingURL=slack.d.ts.map
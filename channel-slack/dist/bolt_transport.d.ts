import type { SlackInboundHandler, SlackPostResult, SlackTransport } from "./transport.js";
/**
 * BoltTransport — production Slack transport using `@slack/bolt` with
 * Socket Mode. Requires both `bot_token` (xoxb-...) and `app_token`
 * (xapp-...). The dependency on `@slack/bolt` is loaded lazily so that
 * test environments which inject a fake transport never need the SDK
 * installed at runtime (the import only fires inside start()).
 *
 * Inbound surface:
 *   - `message` events on every channel/DM the bot is in
 *   - `app_mention` events
 *
 * Outbound: chat.postMessage.
 *
 * NOT covered here (deferred to Phase 4+):
 *   - rate limiting / backoff
 *   - reaction-based interaction
 *   - block kit / threading replies beyond a passthrough thread_ts
 */
export declare class BoltTransport implements SlackTransport {
    private readonly opts;
    private app;
    private botUserId;
    private started;
    constructor(opts: {
        bot_token: string;
        app_token: string;
        log?: (line: string) => void;
    });
    start(handler: SlackInboundHandler): Promise<void>;
    stop(): Promise<void>;
    postMessage(args: {
        channel: string;
        text: string;
        thread_ts?: string;
    }): Promise<SlackPostResult>;
    getBotUserId(): string | undefined;
    private log;
}
//# sourceMappingURL=bolt_transport.d.ts.map
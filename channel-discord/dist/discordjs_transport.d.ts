import type { DiscordInboundHandler, DiscordPostResult, DiscordTransport } from "./transport.js";
/**
 * DiscordJsTransport — production transport using `discord.js` v14.
 * Lazy-loads the SDK so tests injecting a fake never need the dep.
 *
 * Intents: Guilds + GuildMessages + MessageContent + DirectMessages.
 *   - Guilds          : required to receive any guild events at all.
 *   - GuildMessages   : message events in guild text channels.
 *   - MessageContent  : actually receive `content` strings (privileged).
 *   - DirectMessages  : DM events.
 *
 * MessageContent is a "privileged intent" — Discord requires explicit
 * opt-in in the Developer Portal once a bot reaches 100+ guilds.
 */
export declare class DiscordJsTransport implements DiscordTransport {
    private readonly opts;
    private client;
    private botUserId;
    private started;
    constructor(opts: {
        bot_token: string;
        log?: (line: string) => void;
    });
    start(handler: DiscordInboundHandler): Promise<void>;
    private handleMessage;
    stop(): Promise<void>;
    postMessage(args: {
        channel: string;
        text: string;
    }): Promise<DiscordPostResult>;
    getBotUserId(): string | undefined;
    private log;
}
//# sourceMappingURL=discordjs_transport.d.ts.map
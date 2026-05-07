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
export class DiscordJsTransport {
    opts;
    client = null;
    botUserId;
    started = false;
    constructor(opts) {
        this.opts = opts;
    }
    async start(handler) {
        if (this.started)
            return;
        const djs = (await import("discord.js"));
        const intents = [
            djs.GatewayIntentBits.Guilds,
            djs.GatewayIntentBits.GuildMessages,
            djs.GatewayIntentBits.MessageContent,
            djs.GatewayIntentBits.DirectMessages,
        ];
        const client = new djs.Client({ intents });
        this.client = client;
        await new Promise((resolve, reject) => {
            const onReady = () => {
                this.botUserId = client.user?.id;
                resolve();
            };
            client.once(djs.Events.ClientReady, onReady);
            client.login(this.opts.bot_token).catch(reject);
        });
        client.on(djs.Events.MessageCreate, (...args) => {
            const msg = args[0];
            void this.handleMessage(msg, handler).catch((e) => {
                this.log(`[discord] inbound dispatch failed: ${e instanceof Error ? e.message : String(e)}`);
            });
        });
        this.started = true;
        this.log(`[discord] connected (bot_user_id=${this.botUserId ?? "unknown"})`);
    }
    async handleMessage(msg, handler) {
        if (!msg || !msg.id || !msg.channelId)
            return;
        // Ignore bot's own messages and other bots.
        if (msg.author?.bot)
            return;
        if (this.botUserId && msg.author?.id === this.botUserId)
            return;
        const isDm = !msg.guildId; // guild absent ⇒ DM
        const mentionTag = this.botUserId ? `<@${this.botUserId}>` : "";
        const altMentionTag = this.botUserId ? `<@!${this.botUserId}>` : "";
        const rawText = msg.content ?? "";
        const isMention = !!mentionTag &&
            (rawText.includes(mentionTag) || rawText.includes(altMentionTag));
        if (!isDm && !isMention)
            return;
        const cleanText = rawText
            .replace(mentionTag, "")
            .replace(altMentionTag, "")
            .trim();
        const display = msg.member?.displayName ?? msg.author?.username ?? msg.author?.id ?? "unknown";
        await handler({
            channel_id: msg.channelId,
            user_id: msg.author?.id ?? "unknown",
            user_display: display,
            text: cleanText,
            message_id: msg.id,
            is_dm: isDm,
            is_mention: isMention,
            guild_id: msg.guildId ?? undefined,
        });
    }
    async stop() {
        if (!this.started)
            return;
        this.started = false;
        const c = this.client;
        try {
            await c?.destroy?.();
        }
        catch {
            /* ignore */
        }
        this.client = null;
    }
    async postMessage(args) {
        const c = this.client;
        if (!c)
            return { ok: false, error: "not_started" };
        try {
            const ch = await c.channels.fetch(args.channel);
            if (!ch || !ch.isTextBased()) {
                return { ok: false, error: "channel_not_text_based" };
            }
            const sent = await ch.send(args.text);
            return { ok: true, message_id: sent.id };
        }
        catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
    }
    getBotUserId() {
        return this.botUserId;
    }
    log(line) {
        (this.opts.log ?? console.log)(line);
    }
}
//# sourceMappingURL=discordjs_transport.js.map
import { randomUUID } from "node:crypto";
import { withRetryBackoff, } from "@blue-tanuki/channel-base";
import { DiscordJsTransport } from "./discordjs_transport.js";
const DEFAULT_RETRY = {
    max_retries: 3,
    base_delay_ms: 500,
    max_delay_ms: 30_000,
    jitter_ratio: 0.2,
};
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
export class DiscordChannel {
    opts;
    name = "discord";
    history = [];
    silent = false;
    started = false;
    counter = 0;
    transport = null;
    constructor(opts = {}) {
        this.opts = opts;
    }
    async start(handler) {
        if (this.started)
            return;
        this.started = true;
        if (this.opts.transport) {
            this.transport = this.opts.transport;
        }
        else if (this.opts.bot_token) {
            this.transport = new DiscordJsTransport({
                bot_token: this.opts.bot_token,
                log: this.opts.log,
            });
        }
        else {
            this.silent = true;
            this.log("[discord] WARN DISCORD_BOT_TOKEN unset — running in silent mode");
            return;
        }
        try {
            await this.transport.start(async (m) => {
                const inbound = {
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
                }
                catch (e) {
                    this.log(`[discord] inbound handler threw: ${e instanceof Error ? e.message : String(e)}`);
                }
            });
            this.log("[discord] active");
        }
        catch (e) {
            this.silent = true;
            this.log(`[discord] WARN transport start failed (${e instanceof Error ? e.message : String(e)}); falling back to silent`);
            this.transport = null;
        }
    }
    async stop() {
        if (!this.started)
            return;
        this.started = false;
        if (this.transport) {
            try {
                await this.transport.stop();
            }
            catch {
                /* ignore */
            }
            this.transport = null;
        }
    }
    async send(payload, meta) {
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
            this.log(`[discord:silent] would-send target=${payload.target} commit=${meta.upstream_commit_hash.slice(0, 8)}… content="${truncate(payload.content, 80)}"`);
            return { delivered: false, error: "silent_mode" };
        }
        const transport = this.transport;
        const retryCfg = this.opts.retry === false ? null : (this.opts.retry ?? DEFAULT_RETRY);
        const callOnce = () => transport.postMessage({
            channel: payload.target,
            text: payload.content,
        });
        let r;
        if (!retryCfg) {
            r = await callOnce();
        }
        else {
            const opts = {
                max_retries: retryCfg.max_retries,
                base_delay_ms: retryCfg.base_delay_ms,
                max_delay_ms: retryCfg.max_delay_ms,
                jitter_ratio: retryCfg.jitter_ratio,
                sleep: retryCfg.sleep,
                random: retryCfg.random,
                is_retryable: (signal) => {
                    if (signal.kind === "throw")
                        return true;
                    const v = signal.value;
                    if (v.ok)
                        return false;
                    if (typeof v.retry_after_ms === "number" && v.retry_after_ms > 0)
                        return true;
                    if (v.error && /rate.?limit|ratelimited|429|too_many/i.test(v.error))
                        return true;
                    return false;
                },
                extract_retry_after_ms: (signal) => signal.kind === "value" ? (signal.value.retry_after_ms ?? null) : null,
                on_retry: ({ attempt, delay_ms }) => {
                    this.log(`[discord] retry attempt=${attempt} delay_ms=${delay_ms} target=${payload.target}`);
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
            this.log(`[discord] sent target=${payload.target} message_id=${r.message_id ?? ""} commit=${meta.upstream_commit_hash.slice(0, 8)}…`);
            return { delivered: true, external_id };
        }
        this.log(`[discord] FAILED target=${payload.target} error=${r.error ?? "unknown"}`);
        return { delivered: false, error: r.error ?? "post_failed" };
    }
    getHistory() {
        return [...this.history];
    }
    isSilent() {
        return this.silent;
    }
    log(line) {
        (this.opts.log ?? console.log)(line);
    }
}
function truncate(s, n) {
    return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
//# sourceMappingURL=discord.js.map
import { randomUUID } from "node:crypto";
import { withRetryBackoff, } from "@blue-tanuki/channel-base";
import { BoltTransport } from "./bolt_transport.js";
const DEFAULT_RETRY = {
    max_retries: 3,
    base_delay_ms: 500,
    max_delay_ms: 30_000,
    jitter_ratio: 0.2,
};
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
export class SlackChannel {
    opts;
    name = "slack";
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
        else if (this.opts.bot_token && this.opts.app_token) {
            this.transport = new BoltTransport({
                bot_token: this.opts.bot_token,
                app_token: this.opts.app_token,
                log: this.opts.log,
            });
        }
        else {
            this.silent = true;
            this.log("[slack] WARN SLACK_BOT_TOKEN/SLACK_APP_TOKEN not both set — running in silent mode");
            return;
        }
        try {
            await this.transport.start(async (m) => {
                const inbound = {
                    id: randomUUID(),
                    channel: "slack",
                    user: m.user_display,
                    content: m.text,
                    timestamp: Date.now(),
                    metadata: {
                        // reply_to is the Slack channel id; this is what the gateway
                        // must hand back as ChannelSendPayload.target on outbound.
                        reply_to: m.channel_id,
                        slack_user_id: m.user_id,
                        slack_channel_id: m.channel_id,
                        slack_ts: m.ts,
                        slack_thread_ts: m.thread_ts,
                        is_dm: m.is_dm,
                        is_mention: m.is_mention,
                    },
                };
                try {
                    await handler(inbound);
                }
                catch (e) {
                    // Inbound handler errors must not break the listener.
                    this.log(`[slack] inbound handler threw: ${e instanceof Error ? e.message : String(e)}`);
                }
            });
            this.log("[slack] active");
        }
        catch (e) {
            this.silent = true;
            this.log(`[slack] WARN transport start failed (${e instanceof Error ? e.message : String(e)}); falling back to silent`);
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
            const external_id = `slack-silent-${meta.command_id}-${this.counter}`;
            this.history.push({
                payload,
                meta,
                at,
                external_id,
                ok: false,
                error: "silent_mode",
            });
            this.log(`[slack:silent] would-send target=${payload.target} commit=${meta.upstream_commit_hash.slice(0, 8)}… content="${truncate(payload.content, 80)}"`);
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
                    if (signal.kind === "throw") {
                        // Network-ish exceptions are retryable; the transport normally
                        // catches and converts to {ok:false}, but defensively treat
                        // throws as retryable too.
                        return true;
                    }
                    const v = signal.value;
                    if (v.ok)
                        return false;
                    // Only retry on rate-limit signals or explicit ratelimit error.
                    if (typeof v.retry_after_ms === "number" && v.retry_after_ms > 0)
                        return true;
                    if (v.error && /rate.?limit|ratelimited|too_many/i.test(v.error))
                        return true;
                    return false;
                },
                extract_retry_after_ms: (signal) => signal.kind === "value" ? (signal.value.retry_after_ms ?? null) : null,
                on_retry: ({ attempt, delay_ms }) => {
                    this.log(`[slack] retry attempt=${attempt} delay_ms=${delay_ms} target=${payload.target}`);
                },
            };
            r = await withRetryBackoff(callOnce, opts);
        }
        const external_id = r.ts ?? `slack-${meta.command_id}-${this.counter}`;
        this.history.push({
            payload,
            meta,
            at,
            external_id,
            ok: r.ok,
            error: r.error,
        });
        if (r.ok) {
            this.log(`[slack] sent target=${payload.target} ts=${r.ts ?? ""} commit=${meta.upstream_commit_hash.slice(0, 8)}…`);
            return { delivered: true, external_id };
        }
        this.log(`[slack] FAILED target=${payload.target} error=${r.error ?? "unknown"}`);
        return { delivered: false, error: r.error ?? "post_failed" };
    }
    /** Inspect what was sent (or attempted). Test/diagnostic only. */
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
//# sourceMappingURL=slack.js.map
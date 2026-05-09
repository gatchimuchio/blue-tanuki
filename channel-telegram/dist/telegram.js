import { randomUUID } from "node:crypto";
/**
 * Telegram Bot API channel.
 *
 * Design boundary:
 * - This adapter is pure I/O. It never calls an LLM and never decides authority.
 * - Inbound messages are normalized to InboundRequest and handed to HDS-BRAIN.
 * - Outbound target is the Telegram chat_id as string.
 * - Missing TELEGRAM_BOT_TOKEN results in silent mode so local WebChat remains usable.
 */
export class TelegramChannel {
    opts;
    name = "telegram";
    started = false;
    silent = false;
    stopped = false;
    offset = 0;
    loop = null;
    history = [];
    counter = 0;
    constructor(opts = {}) {
        this.opts = opts;
    }
    async start(handler) {
        if (this.started)
            return;
        this.started = true;
        this.stopped = false;
        if (!this.opts.bot_token) {
            this.silent = true;
            this.log("[telegram] WARN TELEGRAM_BOT_TOKEN unset — running in silent mode");
            return;
        }
        this.loop = this.pollLoop(handler);
        this.log("[telegram] polling started");
    }
    async stop() {
        if (!this.started)
            return;
        this.stopped = true;
        this.started = false;
        if (this.loop) {
            await Promise.race([this.loop.catch(() => undefined), sleep(250)]);
            this.loop = null;
        }
    }
    async send(payload, meta) {
        this.counter += 1;
        const at = Date.now();
        if (this.silent || !this.opts.bot_token) {
            const external_id = `telegram-silent-${meta.command_id}-${this.counter}`;
            this.history.push({ payload, meta, at, external_id, ok: false, error: "silent_mode" });
            this.log(`[telegram:silent] would-send target=${payload.target} commit=${meta.upstream_commit_hash.slice(0, 8)}… content="${truncate(payload.content, 80)}"`);
            return { delivered: false, error: "silent_mode" };
        }
        const body = {
            chat_id: payload.target,
            text: payload.content,
            disable_web_page_preview: true,
        };
        try {
            const r = await this.call("sendMessage", body);
            if (!r.ok) {
                const err = r.description ?? "telegram_send_failed";
                this.history.push({ payload, meta, at, external_id: `telegram-failed-${meta.command_id}-${this.counter}`, ok: false, error: err });
                return { delivered: false, error: err };
            }
            const messageId = readTelegramMessageId(r.result) ?? `${this.counter}`;
            const external_id = `telegram-${messageId}`;
            this.history.push({ payload, meta, at, external_id, ok: true });
            return { delivered: true, external_id };
        }
        catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            this.history.push({ payload, meta, at, external_id: `telegram-error-${meta.command_id}-${this.counter}`, ok: false, error: err });
            return { delivered: false, error: err };
        }
    }
    getHistory() { return [...this.history]; }
    isSilent() { return this.silent; }
    async pollLoop(handler) {
        while (!this.stopped) {
            try {
                const r = await this.call("getUpdates", {
                    offset: this.offset > 0 ? this.offset : undefined,
                    timeout: this.opts.poll_timeout_sec ?? 25,
                    allowed_updates: ["message", "edited_message"],
                });
                if (r.ok && Array.isArray(r.result)) {
                    for (const update of r.result) {
                        this.offset = Math.max(this.offset, update.update_id + 1);
                        const inbound = this.normalize(update);
                        if (!inbound)
                            continue;
                        await handler(inbound);
                    }
                }
                else if (!r.ok) {
                    this.log(`[telegram] getUpdates failed: ${r.description ?? "unknown"}`);
                    await sleep(this.opts.poll_interval_ms ?? 1500);
                }
            }
            catch (e) {
                this.log(`[telegram] poll error: ${e instanceof Error ? e.message : String(e)}`);
                await sleep(this.opts.poll_interval_ms ?? 1500);
            }
        }
    }
    normalize(update) {
        const msg = update.message ?? update.edited_message;
        if (!msg || !msg.text)
            return null;
        if (msg.from?.is_bot)
            return null;
        const chatId = String(msg.chat.id);
        const fromId = msg.from?.id === undefined ? chatId : String(msg.from.id);
        const username = msg.from?.username ?? [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ").trim();
        return {
            id: randomUUID(),
            channel: "telegram",
            user: username || fromId,
            content: msg.text,
            timestamp: Date.now(),
            metadata: {
                reply_to: chatId,
                telegram_chat_id: chatId,
                telegram_user_id: fromId,
                telegram_message_id: msg.message_id,
                telegram_update_id: update.update_id,
            },
        };
    }
    async call(method, body) {
        const token = this.opts.bot_token;
        if (!token)
            return { ok: false, description: "missing_bot_token" };
        const fetchImpl = this.opts.fetch ?? globalThis.fetch;
        if (!fetchImpl)
            throw new Error("fetch is not available in this runtime");
        const url = `https://api.telegram.org/bot${token}/${method}`;
        const res = await fetchImpl(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(stripUndefined(body)),
        });
        const text = await res.text();
        let parsed;
        try {
            parsed = text ? JSON.parse(text) : {};
        }
        catch {
            parsed = { ok: false, description: text };
        }
        if (isRecord(parsed)) {
            return {
                ok: parsed.ok === true,
                result: parsed.result,
                description: typeof parsed.description === "string" ? parsed.description : res.ok ? undefined : `http_${res.status}`,
            };
        }
        return { ok: false, description: `http_${res.status}` };
    }
    log(line) { (this.opts.log ?? console.log)(line); }
}
function stripUndefined(value) {
    const out = {};
    for (const [k, v] of Object.entries(value))
        if (v !== undefined)
            out[k] = v;
    return out;
}
function readTelegramMessageId(value) {
    if (!isRecord(value))
        return null;
    const id = value.message_id;
    return typeof id === "number" || typeof id === "string" ? String(id) : null;
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function truncate(s, n) { return s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + "…"; }
//# sourceMappingURL=telegram.js.map
import { randomUUID } from "node:crypto";
import { createServer, } from "node:http";
import { URL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { TokenBucket, } from "@blue-tanuki/channel-base";
import { MemoryTicketStore, } from "./ticket_store.js";
import { MemoryResumeApprovalTokenStore, } from "./resume_approval_token_store.js";
import { renderControlCenterHtml } from "./control_center_html.js";
const DEFAULT_RATE_LIMITS = {
    inbound: { capacity: 10, refill_per_sec: 1.0 },
    resume: { capacity: 5, refill_per_sec: 0.5 },
    ws_ticket: { capacity: 3, refill_per_sec: 10 / 60 },
};
const RESUME_GLOBAL_KEY = "*";
/**
 * WebChat channel — Phase 4.
 *
 * Endpoint summary:
 *   POST /ws-ticket  body:{user}  auth:Bearer  rate-limited per-user
 *   POST /inbound    body:{user, content}  auth:Bearer  rate-limited per-user
 *   POST /resume     body:{request_id, verdict, approval_token}  auth:Bearer  rate-limited (global)
 *   GET  /ws         query:?ticket=...
 *   GET  /healthz    no auth, not rate-limited
 *
 * Rate-limit response:
 *   HTTP 429
 *   Retry-After: <seconds>
 *   { "error": "rate_limited", "retry_after_ms": <ms> }
 */
export class WebChatChannel {
    opts;
    name = "webchat";
    server = null;
    wss = null;
    handler = null;
    conns = new Map();
    ticketStore;
    ticketTtlMs;
    resumeApprovalTokenStore;
    resumeApprovalTokenTtlMs;
    buckets;
    starting = false;
    started = false;
    pruneTimer = null;
    constructor(opts) {
        this.opts = opts;
        if (!opts.token || opts.token.length < 8) {
            throw new Error("WebChatChannel: opts.token is required and must be ≥8 chars");
        }
        if (opts.resume_token !== undefined && opts.resume_token.length < 8) {
            throw new Error("WebChatChannel: opts.resume_token must be >=8 chars when set");
        }
        if (opts.resume_token !== undefined && opts.resume_token === opts.token) {
            throw new Error("WebChatChannel: opts.resume_token must differ from opts.token");
        }
        if (opts.onResume && !opts.resume_token) {
            throw new Error("WebChatChannel: opts.resume_token is required when onResume is set");
        }
        if (opts.settings && opts.settings.token.length < 16) {
            throw new Error("WebChatChannel: opts.settings.token must be >=16 chars");
        }
        if (opts.settings &&
            (opts.settings.token === opts.token ||
                opts.settings.token === opts.resume_token)) {
            throw new Error("WebChatChannel: opts.settings.token must differ from WebChat tokens");
        }
        if (!Number.isInteger(opts.port) || opts.port < 1 || opts.port > 65535) {
            throw new Error("WebChatChannel: opts.port must be a valid TCP port");
        }
        this.ticketTtlMs = opts.ws_ticket_ttl_ms ?? 30_000;
        if (this.ticketTtlMs < 1_000) {
            throw new Error("WebChatChannel: ws_ticket_ttl_ms must be ≥ 1000");
        }
        this.resumeApprovalTokenTtlMs =
            opts.resume_approval_token_ttl_ms ?? 10 * 60_000;
        if (this.resumeApprovalTokenTtlMs < 1_000) {
            throw new Error("WebChatChannel: resume_approval_token_ttl_ms must be >= 1000");
        }
        this.ticketStore =
            opts.ticket_store ??
                new MemoryTicketStore({
                    cap: opts.ws_ticket_cap ?? 10_000,
                    now: opts.clock ? () => opts.clock.now() : undefined,
                });
        this.resumeApprovalTokenStore =
            opts.resume_approval_tokens === false
                ? null
                : opts.resume_approval_tokens ??
                    new MemoryResumeApprovalTokenStore({
                        cap: opts.resume_approval_token_cap ?? 10_000,
                        now: opts.clock ? () => opts.clock.now() : undefined,
                    });
        if (opts.rate_limits === false) {
            this.buckets = { inbound: null, resume: null, ws_ticket: null };
        }
        else {
            const cfg = opts.rate_limits ?? {};
            this.buckets = {
                inbound: new TokenBucket({
                    ...DEFAULT_RATE_LIMITS.inbound,
                    ...cfg.inbound,
                    clock: opts.clock,
                }),
                resume: new TokenBucket({
                    ...DEFAULT_RATE_LIMITS.resume,
                    ...cfg.resume,
                    clock: opts.clock,
                }),
                ws_ticket: new TokenBucket({
                    ...DEFAULT_RATE_LIMITS.ws_ticket,
                    ...cfg.ws_ticket,
                    clock: opts.clock,
                }),
            };
        }
    }
    async issueResumeApprovalToken(request_id, ttl_ms = this.resumeApprovalTokenTtlMs) {
        if (!this.resumeApprovalTokenStore)
            return null;
        return this.resumeApprovalTokenStore.issue(request_id, ttl_ms);
    }
    async start(handler) {
        if (this.started || this.starting) {
            throw new Error("WebChatChannel: already started");
        }
        this.starting = true;
        this.handler = handler;
        this.server = createServer((req, res) => {
            this.handleHttp(req, res).catch((e) => {
                // eslint-disable-next-line no-console
                console.error("[webchat] http handler error:", e);
                if (!res.headersSent) {
                    res.writeHead(500, { "content-type": "application/json" });
                    res.end(JSON.stringify({ error: "internal_error" }));
                }
            });
        });
        this.wss = new WebSocketServer({ noServer: true });
        this.server.on("upgrade", (req, socket, head) => {
            void (async () => {
                try {
                    const url = new URL(req.url ?? "/", "http://internal");
                    if (url.pathname !== "/ws") {
                        socket.destroy();
                        return;
                    }
                    const ticket = url.searchParams.get("ticket");
                    if (!ticket) {
                        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                        socket.destroy();
                        return;
                    }
                    const user = await this.ticketStore.consume(ticket);
                    if (!user) {
                        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                        socket.destroy();
                        return;
                    }
                    this.wss.handleUpgrade(req, socket, head, (ws) => {
                        this.attachConnection(user, ws);
                    });
                }
                catch (e) {
                    // eslint-disable-next-line no-console
                    console.error("[webchat] upgrade error:", e);
                    socket.destroy();
                }
            })();
        });
        await new Promise((resolve, reject) => {
            const onError = (e) => {
                this.starting = false;
                reject(e);
            };
            this.server.once("error", onError);
            this.server.listen(this.opts.port, this.opts.host ?? "127.0.0.1", () => {
                this.server.off("error", onError);
                resolve();
            });
        });
        // Periodic TokenBucket prune. Keeps the per-key state map from
        // growing unboundedly on long-running processes that see many
        // distinct (user, endpoint) pairs.
        const prune_interval = this.opts.rate_limit_prune_interval_ms ?? 60_000;
        if (prune_interval > 0) {
            const idle_ms = this.opts.rate_limit_prune_idle_ms ?? prune_interval * 5;
            this.pruneTimer = setInterval(() => {
                this.buckets.inbound?.prune(idle_ms);
                this.buckets.resume?.prune(idle_ms);
                this.buckets.ws_ticket?.prune(idle_ms);
            }, prune_interval);
            // Don't keep the event loop alive solely for prune.
            this.pruneTimer.unref?.();
        }
        this.starting = false;
        this.started = true;
    }
    async stop() {
        if (!this.started)
            return;
        this.started = false;
        if (this.pruneTimer) {
            clearInterval(this.pruneTimer);
            this.pruneTimer = null;
        }
        for (const set of this.conns.values()) {
            for (const ws of set) {
                try {
                    ws.close(1001, "server_shutdown");
                }
                catch {
                    /* ignore */
                }
            }
        }
        this.conns.clear();
        await new Promise((resolve) => {
            this.wss?.close(() => resolve());
        });
        await new Promise((resolve) => {
            this.server?.close(() => resolve());
        });
        this.server = null;
        this.wss = null;
        this.handler = null;
    }
    async send(payload, meta) {
        const set = this.conns.get(payload.target);
        if (!set || set.size === 0) {
            return { delivered: false, error: "no_active_connection" };
        }
        const frame = JSON.stringify({
            kind: "channel_send",
            command_id: meta.command_id,
            upstream_commit_hash: meta.upstream_commit_hash,
            content: payload.content,
        });
        let any = false;
        for (const ws of set) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(frame);
                any = true;
            }
        }
        return any
            ? { delivered: true, external_id: `webchat-${meta.command_id}` }
            : { delivered: false, error: "no_open_socket" };
    }
    connectionCount(user) {
        if (user)
            return this.conns.get(user)?.size ?? 0;
        let n = 0;
        for (const s of this.conns.values())
            n += s.size;
        return n;
    }
    /** Live ticket count (test/diagnostic). Backed by the ticket store. */
    async ticketCount() {
        return this.ticketStore.size();
    }
    attachConnection(user, ws) {
        let set = this.conns.get(user);
        if (!set) {
            set = new Set();
            this.conns.set(user, set);
        }
        set.add(ws);
        ws.on("close", () => {
            const s = this.conns.get(user);
            if (!s)
                return;
            s.delete(ws);
            if (s.size === 0)
                this.conns.delete(user);
        });
        ws.on("error", () => {
            try {
                ws.close();
            }
            catch {
                /* ignore */
            }
        });
        setImmediate(() => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ kind: "hello", user }));
                }
                catch {
                    /* ignore */
                }
            }
        });
    }
    /** Apply rate-limit check; on miss, write 429 + Retry-After and return false. */
    rateLimitOr429(bucket, key, res) {
        if (!bucket)
            return true;
        const r = bucket.consume(key);
        if (r.ok)
            return true;
        const retry_after_sec = Math.max(1, Math.ceil(r.retry_after_ms / 1000));
        res.writeHead(429, {
            "content-type": "application/json",
            "retry-after": String(retry_after_sec),
        });
        res.end(JSON.stringify({
            error: "rate_limited",
            retry_after_ms: r.retry_after_ms,
        }));
        return false;
    }
    async handleHttp(req, res) {
        const url = new URL(req.url ?? "/", "http://internal");
        if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) {
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(renderControlCenterHtml());
            return;
        }
        if (req.method === "GET" && url.pathname === "/healthz") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: true, channel: "webchat" }));
            return;
        }
        if (url.pathname === "/settings") {
            await this.handleSettingsPage(req, res);
            return;
        }
        if (url.pathname === "/settings/config") {
            await this.handleSettingsConfig(req, res);
            return;
        }
        if (url.pathname === "/runtime/snapshot") {
            await this.handleRuntimeSnapshot(req, res);
            return;
        }
        if (req.method !== "POST") {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "not_found" }));
            return;
        }
        const tokenKind = url.pathname === "/resume"
            ? "resume"
            : url.pathname === "/inbound" || url.pathname === "/ws-ticket"
                ? "inbound"
                : null;
        if (!tokenKind) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "not_found" }));
            return;
        }
        if (!this.checkAuth(req, tokenKind)) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "unauthorized" }));
            return;
        }
        const body = await readJson(req);
        if (url.pathname === "/ws-ticket") {
            const user = typeof body?.user === "string" ? body.user.trim() : "";
            if (!user) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: "user is required string" }));
                return;
            }
            if (!this.rateLimitOr429(this.buckets.ws_ticket, user, res))
                return;
            const issued = await this.ticketStore.issue(user, this.ticketTtlMs);
            const expires_in_sec = Math.max(0, Math.floor((issued.expires_at_ms - Date.now()) / 1000));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ ticket: issued.ticket, expires_in_sec }));
            return;
        }
        if (url.pathname === "/inbound") {
            const user = typeof body?.user === "string" ? body.user : null;
            const content = typeof body?.content === "string" ? body.content : null;
            if (!user || !content) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: "user and content are required strings" }));
                return;
            }
            if (!this.rateLimitOr429(this.buckets.inbound, user, res))
                return;
            const inboundReq = {
                id: randomUUID(),
                channel: "webchat",
                user,
                content,
                timestamp: Date.now(),
                // WebChat targets users by literal user name (the WS connection map
                // is keyed on it). reply_to mirrors that for symmetry with Slack/Discord.
                metadata: { reply_to: user },
            };
            this.handler?.(inboundReq).catch((e) => {
                // eslint-disable-next-line no-console
                console.error("[webchat] inbound handler error:", e);
            });
            res.writeHead(202, { "content-type": "application/json" });
            res.end(JSON.stringify({ accepted: true, request_id: inboundReq.id }));
            return;
        }
        if (url.pathname === "/resume") {
            const request_id = typeof body?.request_id === "string" ? body.request_id : null;
            const verdict = body?.verdict;
            if (!request_id ||
                (verdict !== "approve" && verdict !== "reject" && verdict !== "block")) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({
                    error: "request_id and verdict (approve|reject|block) required",
                }));
                return;
            }
            if (!this.opts.onResume) {
                res.writeHead(501, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: "resume_not_configured" }));
                return;
            }
            const actor = typeof body?.actor === "string" && body.actor.trim().length > 0
                ? body.actor.trim()
                : "webchat-human";
            if (!this.rateLimitOr429(this.buckets.resume, RESUME_GLOBAL_KEY, res))
                return;
            if (this.resumeApprovalTokenStore) {
                const approval_token = typeof body?.approval_token === "string"
                    ? body.approval_token.trim()
                    : "";
                if (!approval_token) {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(JSON.stringify({ error: "approval_token required" }));
                    return;
                }
                const ok = await this.resumeApprovalTokenStore.consume(request_id, approval_token);
                if (!ok) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(JSON.stringify({ error: "invalid_approval_token" }));
                    return;
                }
            }
            try {
                const result = await this.opts.onResume(request_id, verdict, {
                    actor,
                    token_kind: "resume",
                    approval: readResumeApprovalOptions(body),
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ ok: true, result }));
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: msg }));
            }
            return;
        }
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
    }
    checkAuth(req, kind) {
        const h = req.headers["authorization"];
        if (typeof h !== "string")
            return false;
        const m = /^Bearer\s+(.+)$/i.exec(h);
        if (!m)
            return false;
        const expected = kind === "resume" ? this.opts.resume_token : this.opts.token;
        return typeof expected === "string" && m[1] === expected;
    }
    checkSettingsAuth(req) {
        const h = req.headers["authorization"];
        if (typeof h !== "string")
            return false;
        const m = /^Bearer\s+(.+)$/i.exec(h);
        return Boolean(m && this.opts.settings && m[1] === this.opts.settings.token);
    }
    async handleRuntimeSnapshot(req, res) {
        if (!this.opts.runtime) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "runtime_not_configured" }));
            return;
        }
        if (req.method !== "GET") {
            res.writeHead(405, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "method_not_allowed" }));
            return;
        }
        if (!this.checkAuth(req, "inbound")) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "unauthorized" }));
            return;
        }
        const snapshot = await this.opts.runtime.getSnapshot();
        res.writeHead(200, {
            "content-type": "application/json",
            "cache-control": "no-store",
        });
        res.end(JSON.stringify(snapshot));
    }
    async handleSettingsPage(req, res) {
        if (!this.opts.settings) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "settings_not_configured" }));
            return;
        }
        if (req.method !== "GET") {
            res.writeHead(405, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "method_not_allowed" }));
            return;
        }
        const html = typeof this.opts.settings.html === "function"
            ? this.opts.settings.html()
            : this.opts.settings.html;
        res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
        });
        res.end(html);
    }
    async handleSettingsConfig(req, res) {
        if (!this.opts.settings) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "settings_not_configured" }));
            return;
        }
        if (!this.checkSettingsAuth(req)) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "unauthorized" }));
            return;
        }
        if (req.method === "GET") {
            const snapshot = await this.opts.settings.getSnapshot();
            res.writeHead(200, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            res.end(JSON.stringify(snapshot));
            return;
        }
        if (req.method === "POST") {
            if (!this.opts.settings.update) {
                res.writeHead(501, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: "settings_update_not_configured" }));
                return;
            }
            const body = await readJson(req);
            if (!body) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: "json_body_required" }));
                return;
            }
            const result = await this.opts.settings.update(body);
            res.writeHead(200, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            res.end(JSON.stringify({ ok: true, result }));
            return;
        }
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "method_not_allowed" }));
    }
}
function readResumeApprovalOptions(body) {
    if (!body)
        return undefined;
    const remember = body.remember === true || body.remember === "true";
    const modeRaw = body.approval_mode ?? body.mode;
    const mode = modeRaw === "full_access" || modeRaw === "remember_this_decision" ? modeRaw : undefined;
    const durationRaw = body.duration_ms ?? body.remember_duration_ms;
    let duration_ms;
    if (durationRaw === null || durationRaw === "always")
        duration_ms = null;
    else if (typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw > 0)
        duration_ms = Math.floor(durationRaw);
    else if (typeof durationRaw === "string" && /^\d+$/.test(durationRaw))
        duration_ms = Math.floor(Number(durationRaw));
    if (!remember && !mode && duration_ms === undefined)
        return undefined;
    return { remember, mode, duration_ms };
}
async function readJson(req) {
    const chunks = [];
    for await (const c of req) {
        chunks.push(c);
        if (chunks.reduce((n, b) => n + b.length, 0) > 1024 * 1024) {
            throw new Error("body_too_large");
        }
    }
    if (chunks.length === 0)
        return null;
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text.trim())
        return null;
    try {
        const v = JSON.parse(text);
        return typeof v === "object" && v !== null
            ? v
            : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=webchat.js.map
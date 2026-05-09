import type {
  SlackInboundHandler,
  SlackPostResult,
  SlackTransport,
} from "./transport.js";

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
export class BoltTransport implements SlackTransport {
  private app: unknown = null;
  private botUserId: string | undefined;
  private started = false;

  constructor(
    private readonly opts: {
      bot_token: string;
      app_token: string;
      log?: (line: string) => void;
    },
  ) {}

  async start(handler: SlackInboundHandler): Promise<void> {
    if (this.started) return;

    // Lazy import: only loaded on real production wire-up.
    // `@slack/bolt` brings ~3MB of deps; we keep it out of cold-path tests.
    const bolt = (await import("@slack/bolt")) as {
      App: new (cfg: Record<string, unknown>) => unknown;
    };

    const app = new bolt.App({
      token: this.opts.bot_token,
      appToken: this.opts.app_token,
      socketMode: true,
      logLevel: "warn",
    }) as {
      message: (fn: (ctx: { message: SlackRawMessage }) => Promise<void>) => void;
      event: (
        name: string,
        fn: (ctx: { event: SlackRawAppMention }) => Promise<void>,
      ) => void;
      client: {
        chat: { postMessage: (args: Record<string, unknown>) => Promise<unknown> };
        auth: { test: () => Promise<{ user_id?: string }> };
      };
      start: () => Promise<void>;
      stop: () => Promise<void>;
    };

    this.app = app;

    // Resolve bot user_id once for self-message filtering.
    try {
      const auth = await app.client.auth.test();
      this.botUserId = auth.user_id;
    } catch (e) {
      this.log(
        `[slack] WARN auth.test failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    app.message(async ({ message }) => {
      // Slack types are loose. Defensive narrowing.
      if (!message || typeof message !== "object") return;
      if ("subtype" in message && message.subtype) return; // edits, joins, etc.
      const m = message as SlackRawMessage;
      if (!m.text || !m.user || !m.channel || !m.ts) return;
      const isDm = m.channel.startsWith("D");
      // Plain `message` events fire for both DM and channel posts.
      // Channel-without-mention is handled by the early return below.
      const mentionTag = this.botUserId ? `<@${this.botUserId}>` : "";
      const isMention = !!mentionTag && m.text.includes(mentionTag);
      if (!isDm && !isMention) return;
      const cleanText = mentionTag ? m.text.replace(mentionTag, "").trim() : m.text;
      await handler({
        channel_id: m.channel,
        user_id: m.user,
        user_display: m.user, // Resolving display name requires users.info; deferred.
        text: cleanText,
        ts: m.ts,
        thread_ts: m.thread_ts,
        is_dm: isDm,
        is_mention: isMention,
      });
    });

    // app_mention also fires on channel mentions; the message handler above
    // already covers this case via `isMention`. Subscribing here as well
    // would double-deliver, so we deliberately skip a second subscription.

    await app.start();
    this.started = true;
    this.log(
      `[slack] connected (bot_user_id=${this.botUserId ?? "unknown"})`,
    );
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    const app = this.app as { stop?: () => Promise<void> } | null;
    try {
      await app?.stop?.();
    } catch {
      /* ignore */
    }
    this.app = null;
  }

  async postMessage(args: {
    channel: string;
    text: string;
    thread_ts?: string;
  }): Promise<SlackPostResult> {
    const app = this.app as {
      client: { chat: { postMessage: (a: Record<string, unknown>) => Promise<unknown> } };
    } | null;
    if (!app) {
      return { ok: false, error: "not_started" };
    }
    try {
      const r = (await app.client.chat.postMessage({
        channel: args.channel,
        text: args.text,
        thread_ts: args.thread_ts,
      })) as { ok?: boolean; ts?: string; error?: string };
      if (r.ok) return { ok: true, ts: r.ts };
      return { ok: false, error: r.error ?? "unknown_error" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  getBotUserId(): string | undefined {
    return this.botUserId;
  }

  private log(line: string): void {
    (this.opts.log ?? console.log)(line);
  }
}

/** Minimal shape of the Slack `message` event we care about. */
interface SlackRawMessage {
  type?: string;
  subtype?: string;
  text?: string;
  user?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
}

/** Minimal shape of the Slack `app_mention` event (kept for future use). */
interface SlackRawAppMention {
  type?: string;
  text?: string;
  user?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
}

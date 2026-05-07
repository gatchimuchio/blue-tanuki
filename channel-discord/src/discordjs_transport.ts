import type {
  DiscordInboundHandler,
  DiscordPostResult,
  DiscordTransport,
} from "./transport.js";

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
export class DiscordJsTransport implements DiscordTransport {
  private client: unknown = null;
  private botUserId: string | undefined;
  private started = false;

  constructor(
    private readonly opts: {
      bot_token: string;
      log?: (line: string) => void;
    },
  ) {}

  async start(handler: DiscordInboundHandler): Promise<void> {
    if (this.started) return;

    const djs = (await import("discord.js")) as {
      Client: new (cfg: { intents: number[] }) => unknown;
      GatewayIntentBits: {
        Guilds: number;
        GuildMessages: number;
        MessageContent: number;
        DirectMessages: number;
      };
      Events: { ClientReady: string; MessageCreate: string };
    };

    const intents = [
      djs.GatewayIntentBits.Guilds,
      djs.GatewayIntentBits.GuildMessages,
      djs.GatewayIntentBits.MessageContent,
      djs.GatewayIntentBits.DirectMessages,
    ];
    const client = new djs.Client({ intents }) as {
      once: (e: string, fn: (...a: unknown[]) => void) => void;
      on: (e: string, fn: (...a: unknown[]) => void) => void;
      login: (t: string) => Promise<string>;
      destroy: () => Promise<void>;
      user: { id: string } | null;
      channels: {
        fetch: (id: string) => Promise<{
          isTextBased: () => boolean;
          send: (text: string) => Promise<{ id: string }>;
        } | null>;
      };
    };
    this.client = client;

    await new Promise<void>((resolve, reject) => {
      const onReady = (): void => {
        this.botUserId = client.user?.id;
        resolve();
      };
      client.once(djs.Events.ClientReady, onReady);
      client.login(this.opts.bot_token).catch(reject);
    });

    client.on(djs.Events.MessageCreate, (...args: unknown[]) => {
      const msg = args[0] as DiscordRawMessage;
      void this.handleMessage(msg, handler).catch((e) => {
        this.log(
          `[discord] inbound dispatch failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
    });

    this.started = true;
    this.log(
      `[discord] connected (bot_user_id=${this.botUserId ?? "unknown"})`,
    );
  }

  private async handleMessage(
    msg: DiscordRawMessage,
    handler: DiscordInboundHandler,
  ): Promise<void> {
    if (!msg || !msg.id || !msg.channelId) return;
    // Ignore bot's own messages and other bots.
    if (msg.author?.bot) return;
    if (this.botUserId && msg.author?.id === this.botUserId) return;

    const isDm = !msg.guildId; // guild absent ⇒ DM
    const mentionTag = this.botUserId ? `<@${this.botUserId}>` : "";
    const altMentionTag = this.botUserId ? `<@!${this.botUserId}>` : "";
    const rawText = msg.content ?? "";
    const isMention =
      !!mentionTag &&
      (rawText.includes(mentionTag) || rawText.includes(altMentionTag));

    if (!isDm && !isMention) return;

    const cleanText = rawText
      .replace(mentionTag, "")
      .replace(altMentionTag, "")
      .trim();

    const display =
      msg.member?.displayName ?? msg.author?.username ?? msg.author?.id ?? "unknown";

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

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    const c = this.client as { destroy?: () => Promise<void> } | null;
    try {
      await c?.destroy?.();
    } catch {
      /* ignore */
    }
    this.client = null;
  }

  async postMessage(args: {
    channel: string;
    text: string;
  }): Promise<DiscordPostResult> {
    const c = this.client as {
      channels: {
        fetch: (id: string) => Promise<{
          isTextBased: () => boolean;
          send: (text: string) => Promise<{ id: string }>;
        } | null>;
      };
    } | null;
    if (!c) return { ok: false, error: "not_started" };
    try {
      const ch = await c.channels.fetch(args.channel);
      if (!ch || !ch.isTextBased()) {
        return { ok: false, error: "channel_not_text_based" };
      }
      const sent = await ch.send(args.text);
      return { ok: true, message_id: sent.id };
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

/** Subset of discord.js Message that we actually read. */
interface DiscordRawMessage {
  id?: string;
  channelId?: string;
  guildId?: string | null;
  content?: string;
  author?: { id?: string; bot?: boolean; username?: string };
  member?: { displayName?: string };
}

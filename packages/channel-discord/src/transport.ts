/**
 * Transport abstraction for the Discord channel.
 *
 * Production wraps `discord.js` Client. Tests inject a fake.
 * Mirror of the Slack pattern; see packages/channel-slack/src/transport.ts.
 */
import type { ChannelDeliveryErrorKind } from "@blue-tanuki/channel-base";

export interface DiscordInboundMessage {
  /** Discord channel snowflake. */
  channel_id: string;
  /** Sender user snowflake. */
  user_id: string;
  /** Best-effort display name (member nickname or username). */
  user_display: string;
  /** Message text. Bot mention prefix already stripped. */
  text: string;
  /** Message snowflake (ordering / dedup key). */
  message_id: string;
  /** True iff received via DM channel. */
  is_dm: boolean;
  /** True iff the bot was mentioned (or message arrived via DM). */
  is_mention: boolean;
  /** Optional guild snowflake; absent for DMs. */
  guild_id?: string;
}

export type DiscordInboundHandler = (m: DiscordInboundMessage) => Promise<void>;

export interface DiscordPostResult {
  ok: boolean;
  /** Native message snowflake on success. */
  message_id?: string;
  error?: string;
  error_kind?: ChannelDeliveryErrorKind;
  error_code?: string;
  /**
   * If the underlying transport recognized a rate-limit signal (HTTP 429
   * with `retry_after`), it MAY surface that here in milliseconds. The
   * DiscordChannel uses this to schedule a backoff retry.
   */
  retry_after_ms?: number;
}

export interface DiscordTransport {
  start(handler: DiscordInboundHandler): Promise<void>;
  stop(): Promise<void>;
  postMessage(args: { channel: string; text: string }): Promise<DiscordPostResult>;
  getBotUserId(): string | undefined;
}

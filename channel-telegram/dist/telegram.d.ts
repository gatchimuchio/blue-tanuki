import type { ChannelSendPayload, InboundRequest } from "@blue-tanuki/protocol";
import type { InboundChannel, InboundHandler, OutboundChannel, SendMeta, SendResult } from "@blue-tanuki/channel-base";
export type TelegramFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
export interface TelegramOptions {
  bot_token?: string;
  poll_interval_ms?: number;
  poll_timeout_sec?: number;
  fetch?: TelegramFetch;
  log?: (line: string) => void;
}
interface SentRecord {
  payload: ChannelSendPayload;
  meta: SendMeta;
  at: number;
  external_id: string;
  ok: boolean;
  error?: string;
}
export declare class TelegramChannel implements InboundChannel, OutboundChannel {
  private readonly opts;
  readonly name = "telegram";
  private started;
  private silent;
  private stopped;
  private offset;
  private loop;
  private readonly history;
  private counter;
  constructor(opts?: TelegramOptions);
  start(handler: InboundHandler): Promise<void>;
  stop(): Promise<void>;
  send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
  getHistory(): readonly SentRecord[];
  isSilent(): boolean;
  private pollLoop;
  private normalize;
  private call;
  private log;
}
export {};

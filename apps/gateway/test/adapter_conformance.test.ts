import { describe, it, expect } from "vitest";
import {
  ChannelSendPayloadSchema,
  InboundRequestSchema,
  type InboundRequest,
} from "@blue-tanuki/protocol";
import type { InboundHandler, SendMeta } from "@blue-tanuki/channel-base";
import {
  SlackChannel,
  type SlackInboundHandler,
  type SlackInboundMessage,
  type SlackPostResult,
  type SlackTransport,
} from "@blue-tanuki/channel-slack";
import {
  DiscordChannel,
  type DiscordInboundHandler,
  type DiscordInboundMessage,
  type DiscordPostResult,
  type DiscordTransport,
} from "@blue-tanuki/channel-discord";
import {
  TelegramChannel,
  type TelegramFetch,
} from "@blue-tanuki/channel-telegram";

const FORBIDDEN_AUTHORITY_METADATA = [
  "blue_tanuki.authority_context",
  "blue_tanuki.actor_kind",
  "blue_tanuki.trust_level",
  "blue_tanuki.process_kind",
];

const SEND_META: SendMeta = {
  command_id: "cmd-conformance",
  upstream_commit_hash: "hash-conformance",
};

function assertCanonicalInbound(req: InboundRequest, channel: string): void {
  expect(() => InboundRequestSchema.parse(req)).not.toThrow();
  expect(req.channel).toBe(channel);
  expect(req.id.length).toBeGreaterThan(0);
  expect(req.user.length).toBeGreaterThan(0);
  expect(req.content.length).toBeGreaterThan(0);
  for (const key of FORBIDDEN_AUTHORITY_METADATA) {
    expect(req.metadata ?? {}).not.toHaveProperty(key);
  }
}

async function waitFor<T>(read: () => T | undefined): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out waiting for conformance event");
}

class FakeSlackTransport implements SlackTransport {
  handler: SlackInboundHandler | null = null;
  posted: Array<{ channel: string; text: string; thread_ts?: string }> = [];

  async start(handler: SlackInboundHandler): Promise<void> {
    this.handler = handler;
  }

  async stop(): Promise<void> {
    this.handler = null;
  }

  async postMessage(args: {
    channel: string;
    text: string;
    thread_ts?: string;
  }): Promise<SlackPostResult> {
    this.posted.push({ ...args });
    return { ok: true, ts: `ts-${this.posted.length}` };
  }

  getBotUserId(): string | undefined {
    return "UBOT";
  }

  async emit(message: SlackInboundMessage): Promise<void> {
    if (!this.handler) throw new Error("slack transport not started");
    await this.handler(message);
  }
}

class FakeDiscordTransport implements DiscordTransport {
  handler: DiscordInboundHandler | null = null;
  posted: Array<{ channel: string; text: string }> = [];

  async start(handler: DiscordInboundHandler): Promise<void> {
    this.handler = handler;
  }

  async stop(): Promise<void> {
    this.handler = null;
  }

  async postMessage(args: {
    channel: string;
    text: string;
  }): Promise<DiscordPostResult> {
    this.posted.push({ ...args });
    return { ok: true, message_id: `msg-${this.posted.length}` };
  }

  getBotUserId(): string | undefined {
    return "bot-user";
  }

  async emit(message: DiscordInboundMessage): Promise<void> {
    if (!this.handler) throw new Error("discord transport not started");
    await this.handler(message);
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("adapter conformance: inbound normalization", () => {
  it("Slack normalizes transport events into canonical InboundRequest without authority metadata", async () => {
    const transport = new FakeSlackTransport();
    const channel = new SlackChannel({ transport, log: () => undefined });
    const received: InboundRequest[] = [];
    await channel.start(async (req) => {
      received.push(req);
    });
    try {
      await transport.emit({
        channel_id: "C123",
        user_id: "U123",
        user_display: "alice",
        text: "hello from slack",
        ts: "123.456",
        is_dm: false,
        is_mention: true,
      });
      const inbound = await waitFor(() => received[0]);
      assertCanonicalInbound(inbound, "slack");
      expect(inbound.metadata?.reply_to).toBe("C123");
    } finally {
      await channel.stop();
    }
  });

  it("Discord normalizes transport events into canonical InboundRequest without authority metadata", async () => {
    const transport = new FakeDiscordTransport();
    const channel = new DiscordChannel({ transport, log: () => undefined });
    const received: InboundRequest[] = [];
    await channel.start(async (req) => {
      received.push(req);
    });
    try {
      await transport.emit({
        channel_id: "D123",
        user_id: "DU123",
        user_display: "bob",
        text: "hello from discord",
        message_id: "M123",
        is_dm: true,
        is_mention: false,
      });
      const inbound = await waitFor(() => received[0]);
      assertCanonicalInbound(inbound, "discord");
      expect(inbound.metadata?.reply_to).toBe("D123");
    } finally {
      await channel.stop();
    }
  });

  it("Telegram normalizes Bot API updates into canonical InboundRequest without authority metadata", async () => {
    let getUpdatesCalls = 0;
    const fetchImpl: TelegramFetch = async (input) => {
      const url = String(input);
      if (url.includes("/getUpdates")) {
        getUpdatesCalls += 1;
        if (getUpdatesCalls === 1) {
          return jsonResponse({
            ok: true,
            result: [
              {
                update_id: 10,
                message: {
                  message_id: 20,
                  text: "hello from telegram",
                  chat: { id: 12345, type: "private" },
                  from: {
                    id: 67890,
                    username: "charlie",
                    is_bot: false,
                  },
                },
              },
            ],
          });
        }
        return new Promise<Response>(() => undefined);
      }
      return jsonResponse({ ok: false, description: "unexpected method" });
    };
    const channel = new TelegramChannel({
      bot_token: "test-token",
      fetch: fetchImpl,
      poll_timeout_sec: 1,
      log: () => undefined,
    });
    const received: InboundRequest[] = [];
    await channel.start(async (req) => {
      received.push(req);
    });
    try {
      const inbound = await waitFor(() => received[0]);
      assertCanonicalInbound(inbound, "telegram");
      expect(inbound.metadata?.reply_to).toBe("12345");
    } finally {
      await channel.stop();
    }
  });
});

describe("adapter conformance: outbound delivery boundary", () => {
  it("Slack sends only through canonical ChannelSendPayload", async () => {
    const transport = new FakeSlackTransport();
    const channel = new SlackChannel({ transport, log: () => undefined });
    const payload = ChannelSendPayloadSchema.parse({
      channel: "slack",
      target: "C123",
      content: "reply",
    });
    await channel.start(async () => undefined);
    try {
      const result = await channel.send(payload, SEND_META);
      expect(result).toMatchObject({ delivered: true, external_id: "ts-1" });
      expect(transport.posted).toEqual([
        { channel: "C123", text: "reply", thread_ts: undefined },
      ]);
    } finally {
      await channel.stop();
    }
  });

  it("Discord sends only through canonical ChannelSendPayload", async () => {
    const transport = new FakeDiscordTransport();
    const channel = new DiscordChannel({ transport, log: () => undefined });
    const payload = ChannelSendPayloadSchema.parse({
      channel: "discord",
      target: "D123",
      content: "reply",
    });
    await channel.start(async () => undefined);
    try {
      const result = await channel.send(payload, SEND_META);
      expect(result).toMatchObject({ delivered: true, external_id: "msg-1" });
      expect(transport.posted).toEqual([{ channel: "D123", text: "reply" }]);
    } finally {
      await channel.stop();
    }
  });

  it("Telegram sends only through canonical ChannelSendPayload", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl: TelegramFetch = async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return jsonResponse({ ok: true, result: { message_id: 42 } });
    };
    const channel = new TelegramChannel({
      bot_token: "test-token",
      fetch: fetchImpl,
      log: () => undefined,
    });
    const payload = ChannelSendPayloadSchema.parse({
      channel: "telegram",
      target: "12345",
      content: "reply",
    });
    const result = await channel.send(payload, SEND_META);
    expect(result).toMatchObject({ delivered: true, external_id: "telegram-42" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/sendMessage");
    expect(calls[0]?.body).toMatchObject({ chat_id: "12345", text: "reply" });
  });
});

describe("adapter conformance: fail closed on unavailable transport", () => {
  const handler: InboundHandler = async () => undefined;

  it("Slack fails closed in silent mode", async () => {
    const channel = new SlackChannel({ log: () => undefined });
    await channel.start(handler);
    try {
      const result = await channel.send(
        { channel: "slack", target: "C123", content: "x" },
        SEND_META,
      );
      expect(result).toMatchObject({
        delivered: false,
        error: "silent_mode",
        error_kind: "non_recoverable",
        error_code: "slack_not_configured",
      });
    } finally {
      await channel.stop();
    }
  });

  it("Discord fails closed in silent mode", async () => {
    const channel = new DiscordChannel({ log: () => undefined });
    await channel.start(handler);
    try {
      const result = await channel.send(
        { channel: "discord", target: "D123", content: "x" },
        SEND_META,
      );
      expect(result).toMatchObject({
        delivered: false,
        error: "silent_mode",
        error_kind: "non_recoverable",
        error_code: "discord_not_configured",
      });
    } finally {
      await channel.stop();
    }
  });

  it("Telegram fails closed in silent mode", async () => {
    const channel = new TelegramChannel({ log: () => undefined });
    await channel.start(handler);
    try {
      const result = await channel.send(
        { channel: "telegram", target: "12345", content: "x" },
        SEND_META,
      );
      expect(result).toEqual({ delivered: false, error: "silent_mode" });
    } finally {
      await channel.stop();
    }
  });
});

import { describe, it, expect } from "vitest";
import type { InboundRequest, ChannelSendPayload } from "@blue-tanuki/protocol";
import {
  InboundRouter,
  OutboundDispatcher,
  type InboundChannel,
  type InboundHandler,
  type OutboundChannel,
  type SendMeta,
  type SendResult,
} from "../src/index.js";

class FakeInbound implements InboundChannel {
  readonly name: string;
  private handler: InboundHandler | null = null;
  started = false;
  stopped = false;
  constructor(name: string) {
    this.name = name;
  }
  async start(handler: InboundHandler): Promise<void> {
    this.handler = handler;
    this.started = true;
  }
  async stop(): Promise<void> {
    this.stopped = true;
    this.handler = null;
  }
  async push(req: InboundRequest): Promise<void> {
    if (!this.handler) throw new Error("not started");
    await this.handler(req);
  }
}

class FakeOutbound implements OutboundChannel {
  readonly name: string;
  readonly sent: Array<{ payload: ChannelSendPayload; meta: SendMeta }> = [];
  shouldThrow = false;
  constructor(name: string) {
    this.name = name;
  }
  async send(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult> {
    if (this.shouldThrow) throw new Error("boom");
    this.sent.push({ payload, meta });
    return { delivered: true, external_id: `${this.name}-${this.sent.length}` };
  }
}

const baseMeta: SendMeta = { command_id: "cmd-1", upstream_commit_hash: "h0" };

function inbound(channel: string, content: string, id = "r1"): InboundRequest {
  return { id, channel, user: "u1", content, timestamp: Date.now() };
}

describe("InboundRouter", () => {
  it("multiplexes channels into a single handler", async () => {
    const router = new InboundRouter();
    const a = new FakeInbound("a");
    const b = new FakeInbound("b");
    router.register(a);
    router.register(b);

    const seen: string[] = [];
    await router.start(async (req) => {
      seen.push(`${req.channel}:${req.content}`);
    });

    await a.push(inbound("a", "x", "r1"));
    await b.push(inbound("b", "y", "r2"));

    expect(seen).toEqual(["a:x", "b:y"]);
    expect(a.started).toBe(true);
    expect(b.started).toBe(true);
  });

  it("rejects duplicate channel registration", () => {
    const router = new InboundRouter();
    router.register(new FakeInbound("a"));
    expect(() => router.register(new FakeInbound("a"))).toThrow(/already/);
  });

  it("rejects register after start", async () => {
    const router = new InboundRouter();
    router.register(new FakeInbound("a"));
    await router.start(async () => {});
    expect(() => router.register(new FakeInbound("b"))).toThrow(/after start/);
    await router.stop();
  });

  it("contains handler exceptions so the channel keeps running", async () => {
    const router = new InboundRouter();
    const a = new FakeInbound("a");
    router.register(a);
    await router.start(async () => {
      throw new Error("handler-failed");
    });
    // Must not throw at the channel level.
    await expect(a.push(inbound("a", "x"))).resolves.toBeUndefined();
    await router.stop();
  });

  it("stops all channels", async () => {
    const router = new InboundRouter();
    const a = new FakeInbound("a");
    const b = new FakeInbound("b");
    router.register(a);
    router.register(b);
    await router.start(async () => {});
    await router.stop();
    expect(a.stopped).toBe(true);
    expect(b.stopped).toBe(true);
  });
});

describe("OutboundDispatcher", () => {
  it("dispatches by payload.channel", async () => {
    const d = new OutboundDispatcher();
    const slack = new FakeOutbound("slack");
    const discord = new FakeOutbound("discord");
    d.register(slack);
    d.register(discord);

    const r = await d.dispatch(
      { channel: "slack", target: "#ops", content: "hi" },
      baseMeta,
    );
    expect(r.delivered).toBe(true);
    expect(slack.sent).toHaveLength(1);
    expect(discord.sent).toHaveLength(0);
  });

  it("returns structured failure for unknown channel (no throw)", async () => {
    const d = new OutboundDispatcher();
    const r = await d.dispatch(
      { channel: "telegram", target: "x", content: "y" },
      baseMeta,
    );
    expect(r.delivered).toBe(false);
    expect(r.error).toMatch(/no_channel_registered/);
  });

  it("captures channel exceptions as failure result", async () => {
    const d = new OutboundDispatcher();
    const slack = new FakeOutbound("slack");
    slack.shouldThrow = true;
    d.register(slack);

    const r = await d.dispatch(
      { channel: "slack", target: "x", content: "y" },
      baseMeta,
    );
    expect(r.delivered).toBe(false);
    expect(r.error).toBe("boom");
  });

  it("rejects duplicate registration", () => {
    const d = new OutboundDispatcher();
    d.register(new FakeOutbound("slack"));
    expect(() => d.register(new FakeOutbound("slack"))).toThrow(/already/);
  });

  it("propagates upstream_commit_hash via SendMeta", async () => {
    const d = new OutboundDispatcher();
    const slack = new FakeOutbound("slack");
    d.register(slack);
    await d.dispatch(
      { channel: "slack", target: "#x", content: "y" },
      { command_id: "c1", upstream_commit_hash: "deadbeef" },
    );
    expect(slack.sent[0]!.meta.upstream_commit_hash).toBe("deadbeef");
  });
});

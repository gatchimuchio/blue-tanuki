import { describe, it, expect } from "vitest";
import type { ExecuteCommand } from "@blue-tanuki/protocol";
import { Executor, type ChannelDispatcher } from "../src/executor.js";
import { StubBackend } from "../src/llm/stub.js";
import { ToolRegistry, echoTool } from "../src/tools/registry.js";

const stubUpstream = {
  frame_goal: "g",
  model_abstraction: "m",
  commit_hash: "hash-123",
  commit_decision: "ASSERT" as const,
};

function channelSendCmd(channel: string, content = "hi"): ExecuteCommand {
  return {
    id: "cmd-cs-1",
    type: "channel_send",
    payload: { channel, target: "u1", content },
    upstream_decision: stubUpstream,
  };
}

function toolCmd(
  constraints?: ExecuteCommand["constraints"],
): ExecuteCommand {
  return {
    id: "cmd-tool-1",
    type: "tool_call",
    payload: { tool_name: "echo", arguments: { text: "hi" } },
    ...(constraints ? { constraints } : {}),
    upstream_decision: stubUpstream,
  };
}

describe("Executor.executeChannelSend — dispatcher path", () => {
  it("routes channel_send through dispatcher when provided", async () => {
    const calls: Array<{ channel: string; meta_hash: string }> = [];
    const dispatcher: ChannelDispatcher = {
      async dispatch(payload, meta) {
        calls.push({ channel: payload.channel, meta_hash: meta.upstream_commit_hash });
        return { delivered: true, external_id: "ext-1" };
      },
    };
    const exec = new Executor({
      llm: new StubBackend(),
      tools: new ToolRegistry(),
      dispatcher,
    });
    const fb = await exec.execute(channelSendCmd("webchat"));
    expect(fb.status).toBe("success");
    expect(calls).toEqual([{ channel: "webchat", meta_hash: "hash-123" }]);
    const result = fb.result as { sent: boolean; external_id: string };
    expect(result.sent).toBe(true);
    expect(result.external_id).toBe("ext-1");
  });

  it("returns failed when dispatcher reports undelivered", async () => {
    const dispatcher: ChannelDispatcher = {
      async dispatch() {
        return { delivered: false, error: "no_channel_registered:slack" };
      },
    };
    const exec = new Executor({
      llm: new StubBackend(),
      tools: new ToolRegistry(),
      dispatcher,
    });
    const fb = await exec.execute(channelSendCmd("slack"));
    expect(fb.status).toBe("failed");
    expect(fb.error).toMatch(/no_channel_registered:slack/);
  });

  it("falls back to console.log when no dispatcher (backward compat)", async () => {
    const original = console.log;
    const lines: string[] = [];
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      const exec = new Executor({
        llm: new StubBackend(),
        tools: new ToolRegistry(),
      });
      const fb = await exec.execute(channelSendCmd("legacy"));
      expect(fb.status).toBe("success");
      expect(lines.some((l) => l.includes("[channel:legacy]"))).toBe(true);
    } finally {
      console.log = original;
    }
  });
});

describe("Executor.executeToolCall - permission envelope", () => {
  it("fails closed when a tool capability is not explicitly allowed", async () => {
    const tools = new ToolRegistry();
    tools.register(echoTool);
    const exec = new Executor({
      llm: new StubBackend(),
      tools,
    });

    const fb = await exec.execute(toolCmd({ allowed_tools: ["echo"] }));

    expect(fb.status).toBe("failed");
    expect(fb.error).toMatch(/capability not allowed/i);
    expect(fb.error).toContain("tool:echo");
  });

  it("runs a tool when name and required capabilities are allowed", async () => {
    const tools = new ToolRegistry();
    tools.register(echoTool);
    const exec = new Executor({
      llm: new StubBackend(),
      tools,
    });

    const fb = await exec.execute(
      toolCmd({
        allowed_tools: ["echo"],
        allowed_capabilities: ["tool:echo"],
      }),
    );

    expect(fb.status).toBe("success");
    expect(fb.metrics.tool_calls).toBe(1);
    expect(fb.result).toEqual({ echoed: { text: "hi" } });
  });

  it("still rejects tools outside allowed_tools before capability checks", async () => {
    const tools = new ToolRegistry();
    tools.register(echoTool);
    const exec = new Executor({
      llm: new StubBackend(),
      tools,
    });

    const fb = await exec.execute(
      toolCmd({
        allowed_tools: ["different"],
        allowed_capabilities: ["tool:echo"],
      }),
    );

    expect(fb.status).toBe("failed");
    expect(fb.error).toMatch(/not in allowed_tools/);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  CronSchedulerChannel,
  DailyBriefCronChannel,
  cronSchedulesFromEnv,
  dailyBriefCronFromEnv,
} from "../src/cron_channel.js";

describe("DailyBriefCronChannel snapshot", () => {
  it("exposes the next daily fire time without exposing content", async () => {
    const now = new Date(2026, 4, 9, 6, 30, 0, 0);
    const expected = new Date(2026, 4, 9, 7, 0, 0, 0).getTime();
    const ch = new DailyBriefCronChannel({
      enabled: true,
      channel: "telegram",
      target: "chat-1",
      content: "private brief content",
      time: "07:00",
      now: () => now,
      log: () => undefined,
    });

    await ch.start(async () => undefined);
    try {
      const snapshot = ch.snapshot();
      expect(snapshot).toMatchObject({
        name: "daily_brief",
        enabled: true,
        running: true,
        channel: "telegram",
        target: "chat-1",
        time: "07:00",
        next_fire_at_ms: expected,
        last_fire_at_ms: null,
      });
      expect(JSON.stringify(snapshot)).not.toContain("private brief content");
    } finally {
      await ch.stop();
    }
  });

  it("exposes interval-mode schedule state", async () => {
    const now = new Date(2026, 4, 9, 1, 0, 0, 0);
    const ch = new DailyBriefCronChannel({
      enabled: true,
      channel: "webchat",
      target: "local-user",
      content: "interval smoke",
      interval_ms: 60_000,
      now: () => now,
      log: () => undefined,
    });

    await ch.start(async () => undefined);
    try {
      expect(ch.snapshot()).toMatchObject({
        enabled: true,
        running: true,
        interval_ms: 60_000,
        next_fire_at_ms: now.getTime() + 60_000,
        last_fire_at_ms: null,
      });
    } finally {
      await ch.stop();
    }
  });
});

describe("dailyBriefCronFromEnv", () => {
  it("returns null when Daily Brief is disabled", () => {
    expect(dailyBriefCronFromEnv({})).toBeNull();
  });
});

describe("CronSchedulerChannel", () => {
  it("exposes multiple scheduled-message snapshots without exposing content", async () => {
    const now = new Date(2026, 4, 9, 6, 30, 0, 0);
    const ch = new CronSchedulerChannel({
      tasks: [
        {
          id: "morning",
          channel: "telegram",
          target: "chat-1",
          content: "private morning content",
          time: "07:00",
        },
        {
          id: "smoke",
          channel: "webchat",
          target: "local-user",
          content: "private smoke content",
          interval_ms: 60_000,
        },
      ],
      now: () => now,
      log: () => undefined,
    });

    await ch.start(async () => undefined);
    try {
      const snapshot = ch.snapshot();
      expect(snapshot).toHaveLength(2);
      expect(snapshot[0]).toMatchObject({
        id: "morning",
        name: "scheduled_message",
        enabled: true,
        running: true,
        channel: "telegram",
        target: "chat-1",
        time: "07:00",
      });
      expect(snapshot[1]).toMatchObject({
        id: "smoke",
        running: true,
        interval_ms: 60_000,
        next_fire_at_ms: now.getTime() + 60_000,
      });
      expect(JSON.stringify(snapshot)).not.toContain("private morning content");
      expect(JSON.stringify(snapshot)).not.toContain("private smoke content");
    } finally {
      await ch.stop();
    }
  });

  it("fires scheduled messages through trusted cron metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 6, 30, 0, 0));
    const received: unknown[] = [];
    const ch = new CronSchedulerChannel({
      tasks: [
        {
          id: "smoke",
          channel: "webchat",
          target: "local-user",
          content: "scheduled hello",
          interval_ms: 1000,
        },
      ],
      log: () => undefined,
    });

    try {
      await ch.start(async (req) => {
        received.push(req);
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        channel: "cron",
        user: "blue-tanuki-cron",
        content: "scheduled hello",
        metadata: {
          "blue_tanuki.authority_context": "gateway_internal_v1",
          "blue_tanuki.actor_kind": "cron",
          "blue_tanuki.process_kind": "cron",
          "blue_tanuki.cron.task_id": "smoke",
          "blue_tanuki.channel_send.channel": "webchat",
          "blue_tanuki.channel_send.target": "local-user",
          "blue_tanuki.channel_send.content": "scheduled hello",
        },
      });
      expect(ch.snapshot()[0]?.last_fire_at_ms).toBe(new Date(2026, 4, 9, 6, 30, 1, 0).getTime());
    } finally {
      await ch.stop();
      vi.useRealTimers();
    }
  });
});

describe("cronSchedulesFromEnv", () => {
  it("parses generic scheduled messages alongside Daily Brief compatibility", () => {
    const tasks = cronSchedulesFromEnv({
      BLUE_TANUKI_DAILY_BRIEF_ENABLED: "1",
      BLUE_TANUKI_DAILY_BRIEF_TARGET: "telegram-chat",
      BLUE_TANUKI_SCHEDULES_JSON: JSON.stringify([
        {
          id: "ops-smoke",
          channel: "webchat",
          target: "local-user",
          content: "ops smoke",
          interval_ms: 60000,
        },
      ]),
    });
    expect(tasks).toMatchObject([
      {
        id: "daily_brief",
        name: "daily_brief",
        channel: "telegram",
        target: "telegram-chat",
      },
      {
        id: "ops-smoke",
        name: "scheduled_message",
        channel: "webchat",
        target: "local-user",
        interval_ms: 60000,
      },
    ]);
  });

  it("fails closed on malformed or duplicate generic schedules", () => {
    expect(() => cronSchedulesFromEnv({
      BLUE_TANUKI_SCHEDULES_JSON: "{nope",
    })).toThrow(/valid JSON/);
    expect(() => cronSchedulesFromEnv({
      BLUE_TANUKI_SCHEDULES_JSON: JSON.stringify([
        { id: "dup", channel: "webchat", target: "a", content: "one" },
        { id: "dup", channel: "webchat", target: "b", content: "two" },
      ]),
    })).toThrow(/duplicate cron task id/);
  });
});

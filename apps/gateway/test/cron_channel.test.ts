import { describe, it, expect } from "vitest";
import {
  DailyBriefCronChannel,
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

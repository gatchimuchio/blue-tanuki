import { describe, expect, it } from "vitest";
import {
  DAILY_OPERATOR_REQUIRED_PERMISSIONS,
  dailyBriefSnapshotFromEnv,
  dailyMetadataForOperation,
  digestDailyInput,
  getDailyOperationSpec,
  getDailySurfaceSnapshot,
} from "../src/index.js";

describe("Daily Operator surface", () => {
  it("declares itself as a Layer A downstream surface", () => {
    const snapshot = getDailySurfaceSnapshot();
    expect(snapshot.surface).toBe("daily");
    expect(snapshot.layer).toBe("A");
    expect(snapshot.authority).toBe("hds_brain_downstream_device");
    expect(snapshot.replaces_authority).toBe(false);
    expect(snapshot.raw_authority_added).toBe(false);
  });

  it("preserves BLUE_TANUKI_DAILY_BRIEF_* env compatibility", () => {
    const snapshot = dailyBriefSnapshotFromEnv({
      BLUE_TANUKI_DAILY_BRIEF_ENABLED: "true",
      BLUE_TANUKI_DAILY_BRIEF_CHANNEL: "webchat",
      BLUE_TANUKI_DAILY_BRIEF_TARGET: "local-user",
      BLUE_TANUKI_DAILY_BRIEF_TIME: "08:30",
      BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS: "120000",
      BLUE_TANUKI_DAILY_BRIEF_GOOGLE_ENABLED: "1",
      BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES: "gmail calendar",
    });
    expect(snapshot).toEqual({
      enabled: true,
      channel: "webchat",
      target_configured: true,
      time: "08:30",
      interval_ms: 120000,
      google_source_enabled: true,
      google_services: ["gmail", "calendar"],
    });
  });

  it("keeps read, schedule mutation, and Google write boundaries explicit", () => {
    expect(getDailyOperationSpec("daily_brief.status").approval_level).toBe("L1_observe");
    expect(getDailyOperationSpec("schedule.list").approval_level).toBe("L1_observe");
    expect(getDailyOperationSpec("reminder.draft").approval_level).toBe("L2_operate");
    expect(getDailyOperationSpec("schedule.create").approval_level).toBe("L3_final_review");
    expect(getDailyOperationSpec("gmail.write").final_review_required).toBe(true);
  });

  it("uses existing downstream capability names and no authority capability", () => {
    expect(DAILY_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:schedule.create");
    expect(DAILY_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:gmail.read");
    expect(DAILY_OPERATOR_REQUIRED_PERMISSIONS).toContain("tool:google.calendar.write");
    expect(DAILY_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("authority:write");
    expect(DAILY_OPERATOR_REQUIRED_PERMISSIONS).not.toContain("hds:bypass");
  });

  it("emits digest and gateway-owned metadata helpers", () => {
    expect(digestDailyInput("brief")).toMatch(/^[a-f0-9]{64}$/);
    expect(dailyMetadataForOperation("schedule.delete")).toEqual({
      "blue_tanuki.operator_surface": "daily",
      "blue_tanuki.daily.operation": "schedule.delete",
      "blue_tanuki.approval_level": "L3_final_review",
      "blue_tanuki.approval_risk": "high",
      "blue_tanuki.final_review_required": "true",
    });
  });
});

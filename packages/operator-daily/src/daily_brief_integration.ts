import type { DailyBriefEnvSnapshot } from "./types.js";

type Env = Record<string, string | undefined>;

export function dailyBriefSnapshotFromEnv(env: Env = process.env): DailyBriefEnvSnapshot {
  return {
    enabled: truthy(env.BLUE_TANUKI_DAILY_BRIEF_ENABLED),
    channel: env.BLUE_TANUKI_DAILY_BRIEF_CHANNEL ?? "telegram",
    target_configured: Boolean(env.BLUE_TANUKI_DAILY_BRIEF_TARGET?.trim()),
    time: env.BLUE_TANUKI_DAILY_BRIEF_TIME ?? "07:00",
    interval_ms: positiveInt(env.BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS),
    google_source_enabled: truthy(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_ENABLED),
    google_services: googleServices(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES),
  };
}

export function dailyBriefMetadata(): Record<string, string> {
  return {
    "blue_tanuki.operator_surface": "daily",
    "blue_tanuki.daily_brief.env_compat": "BLUE_TANUKI_DAILY_BRIEF_*",
    "blue_tanuki.daily_brief.authority": "cron_downstream_only",
  };
}

function googleServices(raw: string | undefined): string[] {
  if (!raw || raw.trim().length === 0) return ["gmail", "calendar", "drive"];
  return raw
    .split(/[,\s]+/)
    .map((service) => service.trim().toLowerCase())
    .filter((service) => service.length > 0);
}

function truthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function positiveInt(value: string | undefined): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

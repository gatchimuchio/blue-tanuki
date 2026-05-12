import {
  buildGoogleDailyBriefContent,
  type GoogleReadService,
} from "@blue-tanuki/core";
import type { CronContentProvider } from "./cron_channel.js";

type Env = Record<string, string | undefined>;

const DEFAULT_SERVICES: GoogleReadService[] = ["gmail", "calendar", "drive"];
const VALID_SERVICES = new Set<GoogleReadService>(DEFAULT_SERVICES);

export function googleDailyBriefProviderFromEnv(
  env: Env = process.env,
): CronContentProvider | undefined {
  if (!truthy(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_ENABLED)) return undefined;
  const services = parseGoogleServices(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES);
  const maxResults = parsePositiveInt(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_MAX_RESULTS, 5, 20);
  const calendarDays = parsePositiveInt(env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_CALENDAR_DAYS, 1, 31);
  return async (task) => {
    if (task.name !== "daily_brief" && task.id !== "daily_brief") return null;
    const content = await buildGoogleDailyBriefContent({
      env,
      services,
      maxResults,
      calendarDays,
      gmailQuery: env.BLUE_TANUKI_DAILY_BRIEF_GMAIL_QUERY,
      calendarId: env.BLUE_TANUKI_DAILY_BRIEF_GOOGLE_CALENDAR_ID,
      driveQuery: env.BLUE_TANUKI_DAILY_BRIEF_DRIVE_QUERY,
    });
    return {
      content,
      metadata: {
        "blue_tanuki.cron.content_source": "google_read",
        "blue_tanuki.google.services": services.join(","),
        "blue_tanuki.google.read_only": "true",
      },
    };
  };
}

export function parseGoogleServices(raw: string | undefined): GoogleReadService[] {
  if (!raw || raw.trim().length === 0) return [...DEFAULT_SERVICES];
  const services = raw
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  if (services.length === 0) return [...DEFAULT_SERVICES];
  for (const service of services) {
    if (!VALID_SERVICES.has(service as GoogleReadService)) {
      throw new Error(
        `BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES contains unsupported service: ${service}`,
      );
    }
  }
  return services as GoogleReadService[];
}

function truthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parsePositiveInt(value: string | undefined, fallback: number, max: number): number {
  if (!value || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Google Daily Brief numeric env values must be positive integers");
  }
  return Math.min(parsed, max);
}

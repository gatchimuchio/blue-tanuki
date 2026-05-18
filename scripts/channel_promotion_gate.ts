import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

export type ChannelStatus =
  | "first-party"
  | "first-party-preview"
  | "reserved-third-party";

export interface ChannelCompatibility {
  status: ChannelStatus | string;
  target_release: string | null;
  core_supported?: boolean;
  warranty?: string;
  notes?: string;
}

export interface CompatibilityMatrix {
  channels: Record<string, ChannelCompatibility>;
}

export interface PromotionEvidence {
  schema_version: 1;
  channels?: Record<string, ChannelPromotionEvidence>;
}

export interface ChannelPromotionEvidence {
  approved_for_first_party?: boolean;
  live_smoke?: {
    command?: string;
    result?: "pass" | "fail" | "skip";
    non_skip?: boolean;
    completed_at?: string;
    report_digest?: string;
    secret_values_exposed?: boolean;
  };
  recovery_review?: {
    token_revocation?: boolean;
    permission_failure?: boolean;
    target_error?: boolean;
    rate_limit_or_backoff?: boolean;
    next_action_documented?: boolean;
  };
  docs_review?: {
    setup?: boolean;
    credentials?: boolean;
    channel_matrix?: boolean;
    compatibility_matrix?: boolean;
    permanent_use?: boolean;
  };
  conformance?: {
    inbound_outbound?: boolean;
    metadata_non_authority?: boolean;
    typed_errors?: boolean;
    retry_backoff?: boolean;
  };
  gateway_owned_inbound_listener?: "not-required" | "release-complete" | "preview-only" | "missing";
}

export interface ChannelPromotionGateResult {
  ok: boolean;
  failures: string[];
  first_party_channels: string[];
  promoted_channels: string[];
  preview_channels: string[];
}

export const BASELINE_FIRST_PARTY_CHANNELS = ["webchat", "telegram"] as const;
export const PROMOTION_ELIGIBLE_CHANNELS = ["slack", "discord", "teams", "line"] as const;

const PROMOTION_ELIGIBLE = new Set<string>(PROMOTION_ELIGIBLE_CHANNELS);
const BASELINE_FIRST_PARTY = new Set<string>(BASELINE_FIRST_PARTY_CHANNELS);
const LISTENER_REQUIRED = new Set<string>(["teams", "line"]);

export function validateChannelPromotion(
  matrix: CompatibilityMatrix,
  evidence?: PromotionEvidence,
): ChannelPromotionGateResult {
  const failures: string[] = [];
  const channels = matrix.channels ?? {};
  const firstPartyChannels: string[] = [];
  const previewChannels: string[] = [];
  const promotedChannels: string[] = [];

  for (const channel of BASELINE_FIRST_PARTY_CHANNELS) {
    const entry = channels[channel];
    if (!entry) {
      failures.push(`${channel}: missing compatibility matrix entry`);
      continue;
    }
    if (entry.status !== "first-party") {
      failures.push(`${channel}: baseline first-party channel must remain first-party`);
    }
    if (entry.target_release !== "v1.0") {
      failures.push(`${channel}: baseline first-party target_release must be v1.0`);
    }
  }

  for (const [channel, entry] of Object.entries(channels)) {
    if (entry.status === "first-party") {
      firstPartyChannels.push(channel);
      if (PROMOTION_ELIGIBLE.has(channel)) {
        promotedChannels.push(channel);
        validateEvidence(channel, evidence?.channels?.[channel], failures);
      } else if (!BASELINE_FIRST_PARTY.has(channel)) {
        failures.push(`${channel}: unrecognized first-party channel requires a dedicated phase`);
      }
      if (entry.target_release !== "v1.0") {
        failures.push(`${channel}: first-party target_release must be v1.0`);
      }
    }

    if (entry.status === "first-party-preview") {
      previewChannels.push(channel);
      if (PROMOTION_ELIGIBLE.has(channel) && entry.target_release !== "v1.0-preview") {
        failures.push(`${channel}: preview target_release must remain v1.0-preview`);
      }
    }
  }

  const whatsapp = channels.whatsapp;
  if (!whatsapp) {
    failures.push("whatsapp: missing compatibility matrix entry");
  } else {
    if (whatsapp.status !== "reserved-third-party") {
      failures.push("whatsapp: must remain reserved-third-party");
    }
    if (whatsapp.target_release !== null) {
      failures.push("whatsapp: target_release must remain null");
    }
    if (whatsapp.core_supported !== false) {
      failures.push("whatsapp: core_supported must remain false");
    }
    if (whatsapp.warranty !== "none") {
      failures.push("whatsapp: warranty must remain none");
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    first_party_channels: firstPartyChannels.sort(),
    promoted_channels: promotedChannels.sort(),
    preview_channels: previewChannels.sort(),
  };
}

function validateEvidence(
  channel: string,
  evidence: ChannelPromotionEvidence | undefined,
  failures: string[],
): void {
  if (!evidence) {
    failures.push(`${channel}: first-party promotion requires owner evidence`);
    return;
  }

  if (evidence.approved_for_first_party !== true) {
    failures.push(`${channel}: approved_for_first_party must be true`);
  }

  const smoke = evidence.live_smoke;
  if (!smoke) {
    failures.push(`${channel}: missing live_smoke evidence`);
  } else {
    if (smoke.result !== "pass") {
      failures.push(`${channel}: live_smoke.result must be pass`);
    }
    if (smoke.non_skip !== true) {
      failures.push(`${channel}: live_smoke.non_skip must be true`);
    }
    if (!smoke.command?.includes("pnpm smoke:live")) {
      failures.push(`${channel}: live_smoke.command must record pnpm smoke:live`);
    }
    if (!smoke.completed_at || Number.isNaN(Date.parse(smoke.completed_at))) {
      failures.push(`${channel}: live_smoke.completed_at must be an ISO timestamp`);
    }
    if (!isDigest(smoke.report_digest)) {
      failures.push(`${channel}: live_smoke.report_digest must be a SHA-256 digest`);
    }
    if (smoke.secret_values_exposed === true) {
      failures.push(`${channel}: live smoke evidence must not expose secret values`);
    }
  }

  requireAllTrue(channel, "recovery_review", evidence.recovery_review, [
    "token_revocation",
    "permission_failure",
    "target_error",
    "rate_limit_or_backoff",
    "next_action_documented",
  ], failures);

  requireAllTrue(channel, "docs_review", evidence.docs_review, [
    "setup",
    "credentials",
    "channel_matrix",
    "compatibility_matrix",
    "permanent_use",
  ], failures);

  requireAllTrue(channel, "conformance", evidence.conformance, [
    "inbound_outbound",
    "metadata_non_authority",
    "typed_errors",
    "retry_backoff",
  ], failures);

  if (LISTENER_REQUIRED.has(channel)) {
    if (evidence.gateway_owned_inbound_listener !== "release-complete") {
      failures.push(`${channel}: gateway-owned inbound listener must be release-complete`);
    }
  } else if (
    evidence.gateway_owned_inbound_listener !== undefined &&
    evidence.gateway_owned_inbound_listener !== "not-required" &&
    evidence.gateway_owned_inbound_listener !== "release-complete"
  ) {
    failures.push(`${channel}: inbound listener evidence is not sufficient for first-party promotion`);
  }
}

function requireAllTrue(
  channel: string,
  section: string,
  value: Record<string, boolean | undefined> | undefined,
  keys: readonly string[],
  failures: string[],
): void {
  if (!value) {
    failures.push(`${channel}: missing ${section} evidence`);
    return;
  }
  for (const key of keys) {
    if (value[key] !== true) {
      failures.push(`${channel}: ${section}.${key} must be true`);
    }
  }
}

function isDigest(value: string | undefined): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function argValue(name: string): string | undefined {
  const prefix = `${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === name) return process.argv[i + 1];
    if (arg?.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function main(): void {
  const root = process.cwd();
  const matrixFile = path.resolve(argValue("--matrix") ?? path.join(root, "docs", "compatibility-matrix.json"));
  const evidenceFile = path.resolve(argValue("--evidence") ?? path.join(root, "docs", "channel-promotion-evidence.json"));
  const matrix = readJson<CompatibilityMatrix>(matrixFile);
  const evidence = existsSync(evidenceFile)
    ? readJson<PromotionEvidence>(evidenceFile)
    : undefined;
  const result = validateChannelPromotion(matrix, evidence);
  if (hasArg("--require-promotion") && result.promoted_channels.length === 0) {
    result.failures.push("no channels are currently promoted beyond WebChat and Telegram");
    result.ok = false;
  }

  if (!result.ok) {
    console.error("[channels] FAIL");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `[channels] PASS first_party=${result.first_party_channels.join(",")} ` +
      `preview=${result.preview_channels.join(",")} ` +
      `promoted=${result.promoted_channels.join(",") || "none"}`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}

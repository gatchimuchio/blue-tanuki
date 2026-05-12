export type ChannelDeliveryErrorKind = "recoverable" | "non_recoverable";

export interface ChannelDeliveryErrorDetails {
  error_kind: ChannelDeliveryErrorKind;
  error_code: string;
  retry_after_ms?: number;
}

const NON_RECOVERABLE_PATTERNS = [
  /silent_mode/i,
  /not_started/i,
  /missing/i,
  /invalid/i,
  /unauthorized/i,
  /forbidden/i,
  /permission/i,
  /missing_access/i,
  /channel_not_found/i,
  /channel_not_text_based/i,
  /not_in_channel/i,
  /token_revoked/i,
  /invalid_auth/i,
  /account_inactive/i,
  /no_channel_registered/i,
];

const RECOVERABLE_PATTERNS = [
  /rate.?limit/i,
  /ratelimited/i,
  /too_many/i,
  /\b429\b/,
  /timeout/i,
  /timed out/i,
  /econnreset/i,
  /econnrefused/i,
  /etimedout/i,
  /eai_again/i,
  /temporar/i,
  /unavailable/i,
  /server.?error/i,
  /\b50[0-9]\b/,
];

export function classifyChannelDeliveryError(input: {
  error?: string;
  retry_after_ms?: number;
}): ChannelDeliveryErrorDetails {
  const error = input.error ?? "channel_delivery_failed";
  const retry_after_ms = positiveMs(input.retry_after_ms);
  if (retry_after_ms !== undefined) {
    return {
      error_kind: "recoverable",
      error_code: "rate_limited",
      retry_after_ms,
    };
  }
  for (const pattern of NON_RECOVERABLE_PATTERNS) {
    if (pattern.test(error)) {
      return {
        error_kind: "non_recoverable",
        error_code: normalizeErrorCode(error),
      };
    }
  }
  for (const pattern of RECOVERABLE_PATTERNS) {
    if (pattern.test(error)) {
      return {
        error_kind: "recoverable",
        error_code: normalizeErrorCode(error),
      };
    }
  }
  return {
    error_kind: "non_recoverable",
    error_code: normalizeErrorCode(error),
  };
}

export function isRecoverableChannelDeliveryError(input: {
  error?: string;
  retry_after_ms?: number;
}): boolean {
  return classifyChannelDeliveryError(input).error_kind === "recoverable";
}

function positiveMs(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : undefined;
}

function normalizeErrorCode(error: string): string {
  const trimmed = error.trim().toLowerCase();
  if (!trimmed) return "channel_delivery_failed";
  const code = trimmed
    .replace(/https?:\/\/\S+/g, "url")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return code || "channel_delivery_failed";
}

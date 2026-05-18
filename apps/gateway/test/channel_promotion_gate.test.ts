import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateChannelPromotion,
  type CompatibilityMatrix,
  type PromotionEvidence,
} from "../../../scripts/channel_promotion_gate.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readCurrentMatrix(): CompatibilityMatrix {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "docs", "compatibility-matrix.json"), "utf8"),
  ) as CompatibilityMatrix;
}

function cloneMatrix(matrix: CompatibilityMatrix): CompatibilityMatrix {
  return JSON.parse(JSON.stringify(matrix)) as CompatibilityMatrix;
}

function completeSlackEvidence(): PromotionEvidence {
  return {
    schema_version: 1,
    channels: {
      slack: {
        approved_for_first_party: true,
        live_smoke: {
          command: "pnpm smoke:live",
          result: "pass",
          non_skip: true,
          completed_at: "2026-05-18T00:00:00.000Z",
          report_digest: "a".repeat(64),
          secret_values_exposed: false,
        },
        recovery_review: {
          token_revocation: true,
          permission_failure: true,
          target_error: true,
          rate_limit_or_backoff: true,
          next_action_documented: true,
        },
        docs_review: {
          setup: true,
          credentials: true,
          channel_matrix: true,
          compatibility_matrix: true,
          permanent_use: true,
        },
        conformance: {
          inbound_outbound: true,
          metadata_non_authority: true,
          typed_errors: true,
          retry_backoff: true,
        },
        gateway_owned_inbound_listener: "not-required",
      },
    },
  };
}

describe("channel first-party promotion gate", () => {
  it("accepts the current matrix with preview channels still quarantined", () => {
    const result = validateChannelPromotion(readCurrentMatrix());
    expect(result.ok).toBe(true);
    expect(result.first_party_channels).toEqual(["telegram", "webchat"]);
    expect(result.promoted_channels).toEqual([]);
    expect(result.preview_channels.sort()).toEqual(["discord", "line", "slack", "teams"]);
  });

  it("rejects Slack first-party promotion without owner evidence", () => {
    const matrix = cloneMatrix(readCurrentMatrix());
    matrix.channels.slack = {
      ...matrix.channels.slack,
      status: "first-party",
      target_release: "v1.0",
    };

    const result = validateChannelPromotion(matrix);
    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("slack: first-party promotion requires owner evidence");
  });

  it("accepts Slack first-party promotion only when all promotion evidence is present", () => {
    const matrix = cloneMatrix(readCurrentMatrix());
    matrix.channels.slack = {
      ...matrix.channels.slack,
      status: "first-party",
      target_release: "v1.0",
    };

    const result = validateChannelPromotion(matrix, completeSlackEvidence());
    expect(result.ok).toBe(true);
    expect(result.promoted_channels).toEqual(["slack"]);
  });

  it("rejects Teams promotion while the gateway-owned inbound listener is not release-complete", () => {
    const matrix = cloneMatrix(readCurrentMatrix());
    matrix.channels.teams = {
      ...matrix.channels.teams,
      status: "first-party",
      target_release: "v1.0",
    };
    const evidence = completeSlackEvidence();
    evidence.channels = {
      teams: {
        ...evidence.channels!.slack!,
        gateway_owned_inbound_listener: "preview-only",
      },
    };

    const result = validateChannelPromotion(matrix, evidence);
    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain(
      "teams: gateway-owned inbound listener must be release-complete",
    );
  });

  it("rejects WhatsApp first-party promotion regardless of evidence", () => {
    const matrix = cloneMatrix(readCurrentMatrix());
    matrix.channels.whatsapp = {
      ...matrix.channels.whatsapp,
      status: "first-party",
      target_release: "v1.0",
      core_supported: true,
      warranty: "core",
    };

    const result = validateChannelPromotion(matrix);
    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toContain("whatsapp: must remain reserved-third-party");
  });
});

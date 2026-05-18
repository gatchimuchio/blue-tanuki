import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest, manifestPathFor } from "@blue-tanuki/protocol";
import { validateChannelPromotion } from "../../../scripts/channel_promotion_gate.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

interface ChannelCompatibility {
  status: string;
  target_release: string | null;
  core_supported?: boolean;
  warranty?: string;
  notes?: string;
}

interface CompatibilityMatrix {
  channels: Record<string, ChannelCompatibility>;
}

async function readMatrix(): Promise<CompatibilityMatrix> {
  const raw = await fs.readFile(
    path.join(repoRoot, "docs", "compatibility-matrix.json"),
    "utf8",
  );
  return JSON.parse(raw) as CompatibilityMatrix;
}

function channelPackageDir(channel: string): string {
  return path.join(repoRoot, "packages", `channel-${channel}`);
}

describe("compatibility matrix conformance", () => {
  it("keeps WhatsApp reserved for third-party adapters only", async () => {
    const matrix = await readMatrix();
    expect(matrix.channels.whatsapp).toMatchObject({
      status: "reserved-third-party",
      target_release: null,
      core_supported: false,
      warranty: "none",
    });

    const packageEntries = await fs.readdir(path.join(repoRoot, "packages"));
    expect(packageEntries.some((name) => /whatsapp/i.test(name))).toBe(false);
  });

  it("maps v1.0 first-party channels to channel manifests", async () => {
    const matrix = await readMatrix();
    const v10FirstParty = Object.entries(matrix.channels)
      .filter(([, entry]) => entry.status === "first-party")
      .filter(([, entry]) => entry.target_release === "v1.0")
      .map(([name]) => name);

    expect(v10FirstParty.sort()).toEqual(["telegram", "webchat"]);

    for (const channel of v10FirstParty) {
      const manifest = await readManifest(manifestPathFor(channelPackageDir(channel)));
      expect(manifest.kind).toBe("channel");
      expect(manifest.exports.channel).toBeDefined();
      expect(manifest.permissions.length).toBeGreaterThan(0);
    }
  });

  it("keeps preview channels explicitly quarantined", async () => {
    const matrix = await readMatrix();
    const previewTargets: Record<string, string> = {
      discord: "v1.0-preview",
      slack: "v1.0-preview",
      teams: "v1.0-preview",
      line: "v1.0-preview",
    };
    for (const [channel, targetRelease] of Object.entries(previewTargets)) {
      expect(matrix.channels[channel]).toMatchObject({
        status: "first-party-preview",
        target_release: targetRelease,
      });
    }
  });

  it("passes the first-party channel promotion gate", async () => {
    const matrix = await readMatrix();
    const result = validateChannelPromotion(matrix);
    expect(result.ok).toBe(true);
    expect(result.promoted_channels).toEqual([]);
  });

  it("rejects wildcard capabilities in bundled first-party channel manifests", async () => {
    for (const channel of ["webchat", "telegram", "discord", "slack", "teams", "line"]) {
      const manifest = await readManifest(manifestPathFor(channelPackageDir(channel)));
      expect(manifest.permissions).not.toContain("*");
      for (const permission of manifest.permissions) {
        expect(permission).not.toMatch(/:\*/);
        expect(permission).toMatch(/^(network|secrets):/);
      }
    }
  });
});

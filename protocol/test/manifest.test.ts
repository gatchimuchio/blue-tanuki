import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PluginManifestSchema,
  validateManifest,
  readManifest,
  manifestPathFor,
  MANIFEST_FILENAME,
} from "../src/manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_MIN = {
  name: "@blue-tanuki/example",
  version: "0.0.1",
  kind: "channel" as const,
  entry: "./dist/index.js",
};

describe("PluginManifest schema", () => {
  it("accepts a minimal valid manifest and applies defaults", () => {
    const m = validateManifest(VALID_MIN);
    expect(m.name).toBe("@blue-tanuki/example");
    expect(m.exports).toEqual({});
    expect(m.permissions).toEqual([]);
    expect(m.config_schema).toBeUndefined();
  });

  it("accepts all five recognised kinds", () => {
    for (const kind of ["core", "channel", "llm", "tool", "detector"] as const) {
      expect(() => validateManifest({ ...VALID_MIN, kind })).not.toThrow();
    }
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      validateManifest({ ...VALID_MIN, kind: "unrecognised" as unknown as never }),
    ).toThrow();
  });

  it("rejects empty name / version / entry", () => {
    expect(() => validateManifest({ ...VALID_MIN, name: "" })).toThrow();
    expect(() => validateManifest({ ...VALID_MIN, version: "" })).toThrow();
    expect(() => validateManifest({ ...VALID_MIN, entry: "" })).toThrow();
  });

  it("accepts arbitrary permission strings (free-form)", () => {
    const m = validateManifest({
      ...VALID_MIN,
      permissions: ["network:slack.com", "secrets:FOO", "fs:append:logs"],
    });
    expect(m.permissions).toHaveLength(3);
  });

  it("rejects empty permission strings", () => {
    expect(() =>
      validateManifest({ ...VALID_MIN, permissions: [""] }),
    ).toThrow();
  });

  it("preserves description and config_schema when set", () => {
    const m = validateManifest({
      ...VALID_MIN,
      description: "test plugin",
      config_schema: "./config.schema.json",
    });
    expect(m.description).toBe("test plugin");
    expect(m.config_schema).toBe("./config.schema.json");
  });

  it("PluginManifestSchema.safeParse reports issues with paths", () => {
    const r = PluginManifestSchema.safeParse({ ...VALID_MIN, name: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("name"))).toBe(true);
    }
  });
});

describe("readManifest()", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-mf-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("reads and validates a JSON manifest from disk", async () => {
    const file = manifestPathFor(dir);
    await fs.writeFile(file, JSON.stringify(VALID_MIN), "utf8");
    const m = await readManifest(file);
    expect(m.name).toBe(VALID_MIN.name);
  });

  it("throws a descriptive error when file is missing", async () => {
    await expect(readManifest(path.join(dir, "absent.json"))).rejects.toThrow(
      /cannot read/,
    );
  });

  it("throws on invalid JSON", async () => {
    const file = manifestPathFor(dir);
    await fs.writeFile(file, "{not json", "utf8");
    await expect(readManifest(file)).rejects.toThrow(/invalid JSON/);
  });

  it("throws on schema mismatch with field path", async () => {
    const file = manifestPathFor(dir);
    await fs.writeFile(file, JSON.stringify({ ...VALID_MIN, kind: "wrong" }), "utf8");
    await expect(readManifest(file)).rejects.toThrow(/schema mismatch.*kind/);
  });
});

describe("manifestPathFor() / MANIFEST_FILENAME", () => {
  it("forms the conventional path", () => {
    expect(manifestPathFor("/p")).toBe(`/p/${MANIFEST_FILENAME}`);
  });
  it("filename is blue-tanuki.plugin.json", () => {
    expect(MANIFEST_FILENAME).toBe("blue-tanuki.plugin.json");
  });
});

describe("Bundled manifests in this repo are valid", () => {
  // packages/protocol/test/ → repo root is two levels up.
  const repo_root = path.resolve(__dirname, "..", "..", "..");
  const expected_packages = [
    "packages/protocol",
    "packages/channel-base",
    "packages/channel-webchat",
    "packages/channel-slack",
    "packages/channel-discord",
    "packages/hds-brain",
    "packages/blue-tanuki",
  ];

  for (const rel of expected_packages) {
    it(`${rel} manifest matches the schema and package.json name/version`, async () => {
      const pkg_dir = path.join(repo_root, rel);
      const m = await readManifest(manifestPathFor(pkg_dir));
      const pkg_json = JSON.parse(
        await fs.readFile(path.join(pkg_dir, "package.json"), "utf8"),
      ) as { name: string; version: string };
      expect(m.name).toBe(pkg_json.name);
      expect(m.version).toBe(pkg_json.version);
      expect(m.entry).toBe("./dist/index.js");
    });
  }
});

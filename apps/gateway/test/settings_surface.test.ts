import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PluginRuntime } from "../src/plugin_loader.js";
import {
  buildSettingsSnapshot,
  createWebChatSettingsSurface,
  settingsSurfaceAllowed,
  updateSettingsEnvFile,
} from "../src/settings_surface.js";
import {
  createDefaultSetupConfig,
  renderSetupEnvFile,
} from "../src/setup_config.js";

function runtime(): PluginRuntime {
  return new PluginRuntime("/tmp/blue-tanuki", [
    {
      package_dir: "/tmp/blue-tanuki/packages/channel-webchat",
      package_json: {
        name: "@blue-tanuki/channel-webchat",
        version: "0.0.2",
        main: "./dist/index.js",
      },
      manifest: {
        name: "@blue-tanuki/channel-webchat",
        version: "0.0.2",
        kind: "channel",
        entry: "./dist/index.js",
        exports: { channel: "WebChatChannel" },
        permissions: [
          "network:listen",
          "secrets:WEBCHAT_TOKEN",
          "secrets:WEBCHAT_RESUME_TOKEN",
          "secrets:BLUE_TANUKI_SETTINGS_TOKEN",
        ],
      },
    },
  ]);
}

describe("settings surface", () => {
  it("returns a redacted settings snapshot", () => {
    const snapshot = buildSettingsSnapshot(
      {
        LLM_BACKEND: "openai-compatible",
        OPENAI_COMPAT_ENDPOINT: "http://localhost:11434/v1",
        OPENAI_COMPAT_MODEL: "local-model",
        OPENAI_COMPAT_API_KEY: "local-super-secret-xyz",
        WEBCHAT_TOKEN: "webchat-token-123456",
        WEBCHAT_RESUME_TOKEN: "resume-token-123456",
        BLUE_TANUKI_SETTINGS_TOKEN: "settings-token-123456",
        BLUE_TANUKI_FILE_ROOT: "sandbox",
        BLUE_TANUKI_SESSION_DIR: "sessions",
        BLUE_TANUKI_AUDIT_DIR: "audit",
      },
      runtime(),
    );
    expect(snapshot.llm.provider).toBe("openai-compatible");
    expect(snapshot.llm.api_key_set).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("local-super-secret-xyz");
    expect(snapshot.plugins[0]?.permissions).toContain(
      "secrets:BLUE_TANUKI_SETTINGS_TOKEN",
    );
  });

  it("writes settings updates back to BLUE_TANUKI_ENV_FILE", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-settings-"));
    try {
      const envFile = path.join(dir, "blue-tanuki.env");
      const config = createDefaultSetupConfig({ base_dir: path.join(dir, "data") });
      await fs.writeFile(envFile, renderSetupEnvFile(config), "utf8");

      const result = await updateSettingsEnvFile(
        {
          llm: {
            provider: "openai-compatible",
            endpoint: "http://localhost:11434/v1",
            model: "llama-local",
            api_key: "local-secret",
            max_tokens: "512",
          },
          webchat: { host: "127.0.0.1", port: "8877" },
          paths: { file_root: path.join(dir, "files") },
        },
        { BLUE_TANUKI_ENV_FILE: envFile },
      );

      expect(result.restart_required).toBe(true);
      expect(result.backup_path).toBeTruthy();
      const raw = await fs.readFile(envFile, "utf8");
      expect(raw).toContain("LLM_BACKEND=openai-compatible");
      expect(raw).toContain("OPENAI_COMPAT_MODEL=llama-local");
      expect(raw).toContain("OPENAI_COMPAT_API_KEY=local-secret");
      expect(raw).toContain("WEBCHAT_PORT=8877");
      const backupRaw = await fs.readFile(result.backup_path!, "utf8");
      expect(backupRaw).toContain("LLM_BACKEND=stub");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("exposes settings surface only when a settings token is configured", () => {
    expect(createWebChatSettingsSurface({ env: {}, plugins: runtime() })).toBeUndefined();
    expect(
      createWebChatSettingsSurface({
        env: { BLUE_TANUKI_SETTINGS_TOKEN: "settings-token-123456" },
        plugins: runtime(),
      })?.token,
    ).toBe("settings-token-123456");
  });

  it("keeps settings loopback-only unless explicitly enabled", () => {
    expect(
      settingsSurfaceAllowed({
        BLUE_TANUKI_SETTINGS_TOKEN: "settings-token-123456",
        WEBCHAT_HOST: "127.0.0.1",
      }),
    ).toBe(true);
    expect(
      settingsSurfaceAllowed({
        BLUE_TANUKI_SETTINGS_TOKEN: "settings-token-123456",
        WEBCHAT_HOST: "0.0.0.0",
      }),
    ).toBe(false);
    expect(
      settingsSurfaceAllowed({
        BLUE_TANUKI_SETTINGS_TOKEN: "settings-token-123456",
        WEBCHAT_HOST: "0.0.0.0",
        BLUE_TANUKI_ENABLE_SETTINGS: "1",
      }),
    ).toBe(true);
  });
});

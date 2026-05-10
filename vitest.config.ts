import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "@blue-tanuki/protocol", replacement: resolve(root, "packages/protocol/src/index.ts") },
      { find: "@blue-tanuki/hds-brain", replacement: resolve(root, "packages/hds-brain/src/index.ts") },
      { find: "@blue-tanuki/core", replacement: resolve(root, "packages/blue-tanuki/src/index.ts") },
      { find: "@blue-tanuki/channel-base", replacement: resolve(root, "packages/channel-base/src/index.ts") },
      { find: "@blue-tanuki/channel-webchat", replacement: resolve(root, "packages/channel-webchat/src/index.ts") },
      { find: "@blue-tanuki/channel-slack", replacement: resolve(root, "packages/channel-slack/src/index.ts") },
      { find: "@blue-tanuki/channel-discord", replacement: resolve(root, "packages/channel-discord/src/index.ts") },
      { find: "@blue-tanuki/channel-telegram", replacement: resolve(root, "packages/channel-telegram/src/index.ts") },
    ],
  },
});

import { describe, expect, it } from "vitest";
import { EXTRACTED_RELEASE_COMMANDS } from "../../../scripts/verify_release_bundle.ts";

describe("release bundle verification", () => {
  it("commissions an extracted bundle with install, build, doctor, and repo-health", () => {
    const commands = EXTRACTED_RELEASE_COMMANDS.map((step) =>
      [step.command, ...step.args].join(" "),
    );

    expect(commands).toEqual([
      "corepack pnpm install --frozen-lockfile",
      "corepack pnpm build",
      "corepack pnpm run doctor",
      "corepack pnpm validate:repo-health",
    ]);
    expect(EXTRACTED_RELEASE_COMMANDS[2]?.env).toMatchObject({
      WEBCHAT_TOKEN: expect.any(String),
      WEBCHAT_RESUME_TOKEN: expect.any(String),
      LLM_BACKEND: "stub",
    });
  });
});

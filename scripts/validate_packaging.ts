import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  const path = join(root, rel);
  if (!existsSync(path)) {
    throw new Error(`missing required packaging file: ${rel}`);
  }
  return readFileSync(path, "utf8");
}

function requireIncludes(file: string, text: string, needle: string): void {
  if (!text.includes(needle)) {
    throw new Error(`${file}: missing required text: ${needle}`);
  }
}

function requireNotIncludes(file: string, text: string, needle: string): void {
  if (text.includes(needle)) {
    throw new Error(`${file}: forbidden text present: ${needle}`);
  }
}

function requireNotMatches(file: string, text: string, pattern: RegExp, label: string): void {
  if (pattern.test(text)) {
    throw new Error(`${file}: forbidden pattern present: ${label}`);
  }
}

function main(): void {
  const installReadme = read("install/README.md");
  requireIncludes("install/README.md", installReadme, "Windows");
  requireIncludes("install/README.md", installReadme, "macOS");
  requireIncludes("install/README.md", installReadme, "Linux");
  requireIncludes("install/README.md", installReadme, "pnpm installer:run");
  requireIncludes("install/README.md", installReadme, "guided first-run");
  requireIncludes("install/README.md", installReadme, "Verify LLM");
  requireIncludes("install/README.md", installReadme, "BLUE_TANUKI_SETTINGS_TOKEN");
  requireIncludes("install/README.md", installReadme, "doctor");
  requireIncludes("install/README.md", installReadme, "settings");
  requireIncludes("install/README.md", installReadme, "uninstall");
  requireIncludes("install/README.md", installReadme, "PURGE=1");
  requireIncludes("install/README.md", installReadme, "RESET_CONFIG=1");
  requireIncludes("install/README.md", installReadme, "preserves");
  requireIncludes("install/README.md", installReadme, ".bak");
  requireIncludes("install/README.md", installReadme, "Distribution readiness");
  requireIncludes(
    "install/README.md",
    installReadme,
    "does not build signed native packages yet",
  );

  const guidedInstallerReadme = read("install/installer/README.md");
  requireIncludes("install/installer/README.md", guidedInstallerReadme, "guided first-run");
  requireIncludes("install/installer/README.md", guidedInstallerReadme, "pnpm installer:run");
  requireIncludes("install/installer/README.md", guidedInstallerReadme, "Verify LLM");
  requireIncludes("install/installer/README.md", guidedInstallerReadme, "not a signed native installer");
  requireIncludes("install/installer/README.md", guidedInstallerReadme, "not an automatic updater");

  const guidedInstallerIndex = read("install/installer/src/index.ts");
  requireIncludes("install/installer/src/index.ts", guidedInstallerIndex, "runInstallerCli");
  requireIncludes("install/installer/src/index.ts", guidedInstallerIndex, "--provider");
  requireIncludes("install/installer/src/index.ts", guidedInstallerIndex, "--no-serve");

  const guidedInstallerFlow = read("install/installer/src/setup_flow.ts");
  requireIncludes("install/installer/src/setup_flow.ts", guidedInstallerFlow, "runInstallerFlow");
  requireIncludes("install/installer/src/setup_flow.ts", guidedInstallerFlow, "runSetupCommand");
  requireIncludes("install/installer/src/setup_flow.ts", guidedInstallerFlow, "runDoctor");

  const guidedInstallerProvisioning = read("install/installer/src/api_provisioning.ts");
  requireIncludes("install/installer/src/api_provisioning.ts", guidedInstallerProvisioning, "llmSetupArgs");
  requireIncludes("install/installer/src/api_provisioning.ts", guidedInstallerProvisioning, "--api-key-env");

  const guidedInstallerVerify = read("install/installer/src/verify.ts");
  requireIncludes("install/installer/src/verify.ts", guidedInstallerVerify, "runInstallerPreflight");
  requireIncludes("install/installer/src/verify.ts", guidedInstallerVerify, "pnpm installer:run");

  const winInstall = read("install/windows/install.ps1");
  requireIncludes("install/windows/install.ps1", winInstall, "Node.js 22.14.0");
  requireIncludes("install/windows/install.ps1", winInstall, "pnpm@9.12.0");
  requireIncludes("install/windows/install.ps1", winInstall, "\"--setup\"");
  requireIncludes("install/windows/install.ps1", winInstall, "\"--yes\"");
  requireIncludes("install/windows/install.ps1", winInstall, "blue-tanuki.ps1");
  requireIncludes("install/windows/install.ps1", winInstall, "SkipDoctor");
  requireIncludes("install/windows/install.ps1", winInstall, "ResetConfig");
  requireIncludes("install/windows/install.ps1", winInstall, "Invoke-SetupIfNeeded");
  requireIncludes("install/windows/install.ps1", winInstall, "Existing env file retained");
  requireIncludes("install/windows/install.ps1", winInstall, "Add -ResetConfig only");
  requireIncludes("install/windows/install.ps1", winInstall, "Invoke-PostInstallDoctor");
  requireIncludes("install/windows/install.ps1", winInstall, "post-install doctor");
  requireIncludes("install/windows/install.ps1", winInstall, "\"doctor\"");
  requireIncludes("install/windows/install.ps1", winInstall, "/settings");

  const winUninstall = read("install/windows/uninstall.ps1");
  requireIncludes("install/windows/uninstall.ps1", winUninstall, "Purge");
  requireIncludes("install/windows/uninstall.ps1", winUninstall, "DryRun");
  requireIncludes("install/windows/uninstall.ps1", winUninstall, "Assert-SafeTarget");
  requireIncludes("install/windows/uninstall.ps1", winUninstall, "Data retained");

  const macInstall = read("install/macos/install.sh");
  requireIncludes("install/macos/install.sh", macInstall, "Node.js 22.14.0");
  requireIncludes("install/macos/install.sh", macInstall, "pnpm@");
  requireIncludes("install/macos/install.sh", macInstall, "--setup --yes");
  requireIncludes("install/macos/install.sh", macInstall, "RUN_DOCTOR");
  requireIncludes("install/macos/install.sh", macInstall, "RESET_CONFIG");
  requireIncludes("install/macos/install.sh", macInstall, "Existing env file retained");
  requireIncludes("install/macos/install.sh", macInstall, "Add RESET_CONFIG=1 only");
  requireIncludes("install/macos/install.sh", macInstall, "post-install doctor");
  requireIncludes("install/macos/install.sh", macInstall, "doctor)");
  requireIncludes("install/macos/install.sh", macInstall, "/settings");

  const macUninstall = read("install/macos/uninstall.sh");
  requireIncludes("install/macos/uninstall.sh", macUninstall, "PURGE");
  requireIncludes("install/macos/uninstall.sh", macUninstall, "DRY_RUN");
  requireIncludes("install/macos/uninstall.sh", macUninstall, "safe_target");
  requireIncludes("install/macos/uninstall.sh", macUninstall, "Data retained");

  const linuxInstall = read("install/linux/install.sh");
  requireIncludes("install/linux/install.sh", linuxInstall, "Node.js 22.14.0");
  requireIncludes("install/linux/install.sh", linuxInstall, "pnpm@");
  requireIncludes("install/linux/install.sh", linuxInstall, "--setup --yes");
  requireIncludes("install/linux/install.sh", linuxInstall, "RUN_DOCTOR");
  requireIncludes("install/linux/install.sh", linuxInstall, "RESET_CONFIG");
  requireIncludes("install/linux/install.sh", linuxInstall, "Existing env file retained");
  requireIncludes("install/linux/install.sh", linuxInstall, "Add RESET_CONFIG=1 only");
  requireIncludes("install/linux/install.sh", linuxInstall, "post-install doctor");
  requireIncludes("install/linux/install.sh", linuxInstall, "doctor)");
  requireIncludes("install/linux/install.sh", linuxInstall, "/settings");

  const linuxUninstall = read("install/linux/uninstall.sh");
  requireIncludes("install/linux/uninstall.sh", linuxUninstall, "PURGE");
  requireIncludes("install/linux/uninstall.sh", linuxUninstall, "DRY_RUN");
  requireIncludes("install/linux/uninstall.sh", linuxUninstall, "safe_target");
  requireIncludes("install/linux/uninstall.sh", linuxUninstall, "Config retained");

  const releaseBundle = read("scripts/create_release_bundle.ts");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/installer/README.md");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/installer/src/index.ts");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/windows/install.ps1");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/windows/uninstall.ps1");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/macos/install.sh");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/macos/uninstall.sh");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/linux/install.sh");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "install/linux/uninstall.sh");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, ".sha256");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, ".manifest.json");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "isSecretLikeFileName");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, "blue-tanuki.env.");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, ".env.bak");
  requireIncludes("scripts/create_release_bundle.ts", releaseBundle, ".pem");

  const releaseVerify = read("scripts/verify_release_bundle.ts");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "sha256");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "manifest");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "tar");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "install/installer/README.md");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "install/installer/src/index.ts");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "install/windows/uninstall.ps1");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "install/macos/uninstall.sh");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "install/linux/uninstall.sh");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "isForbiddenFileName");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, "blue-tanuki.env.");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, ".env.bak");
  requireIncludes("scripts/verify_release_bundle.ts", releaseVerify, ".pem");

  const doctor = read("apps/gateway/src/doctor.ts");
  requireIncludes("apps/gateway/src/doctor.ts", doctor, "distribution_readiness");
  requireIncludes("apps/gateway/src/doctor.ts", doctor, "Distribution readiness");
  requireIncludes("apps/gateway/src/doctor.ts", doctor, "guided first-run installer docs");
  requireIncludes("apps/gateway/src/doctor.ts", doctor, "does not build signed native packages yet");
  requireIncludes(
    "apps/gateway/src/doctor.ts",
    doctor,
    "does not currently implement an automatic updater",
  );

  const runbook = read("docs/UPDATE_ROLLBACK_RUNBOOK.md");
  requireIncludes(
    "docs/UPDATE_ROLLBACK_RUNBOOK.md",
    runbook,
    "does not currently implement an automatic updater",
  );
  requireIncludes(
    "docs/UPDATE_ROLLBACK_RUNBOOK.md",
    runbook,
    "Distribution readiness gate",
  );

  const phase10s3 = read("docs/phase10-s3-distribution-ux-hardening.md");
  requireIncludes(
    "docs/phase10-s3-distribution-ux-hardening.md",
    phase10s3,
    "No signed native installer",
  );
  requireIncludes(
    "docs/phase10-s3-distribution-ux-hardening.md",
    phase10s3,
    "No automatic updater",
  );

  const packageJson = read("package.json");
  requireIncludes("package.json", packageJson, "\"installer:run\"");
  requireIncludes("package.json", packageJson, "\"installer:verify\"");
  requireIncludes("package.json", packageJson, "\"release:verify\"");
  requireIncludes("package.json", packageJson, "\"version\": \"1.0.0-rc.1\"");

  const docsIndex = read("docs/INDEX.md");
  requireIncludes("docs/INDEX.md", docsIndex, "INSTALLER_GUIDE.md");
  requireIncludes("docs/INDEX.md", docsIndex, "phase11-s9-installer-setup-ux.md");
  requireIncludes("docs/INDEX.md", docsIndex, "v1.0-release-candidate.md");
  requireIncludes("docs/INDEX.md", docsIndex, "v1.0-post-rc-closure-review.md");
  requireIncludes("docs/INDEX.md", docsIndex, "v1.0-security-and-permanent-use-review.md");

  const releaseCandidate = read("docs/v1.0-release-candidate.md");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "1.0.0-rc.1");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "generated `.sha256`");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "No hard-coded archive SHA");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "first-party-preview");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "reserved-third-party");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "No signed native installer");
  requireIncludes("docs/v1.0-release-candidate.md", releaseCandidate, "No automatic updater");
  requireNotMatches(
    "docs/v1.0-release-candidate.md",
    releaseCandidate,
    /SHA-256: `?[a-f0-9]{64}`?/i,
    "hard-coded release bundle SHA",
  );

  const postRcReview = read("docs/v1.0-post-rc-closure-review.md");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "Credentialed Live Smoke");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "Status: PASS");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "cannot be completed in this workspace");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "remain `first-party-preview`");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "No signed native installer");
  requireIncludes("docs/v1.0-post-rc-closure-review.md", postRcReview, "No automatic updater");

  const compatibilityMatrix = read("docs/compatibility-matrix.json");
  requireIncludes("docs/compatibility-matrix.json", compatibilityMatrix, "\"target_release\": \"v1.0\"");
  requireIncludes("docs/compatibility-matrix.json", compatibilityMatrix, "\"target_release\": \"v1.0-preview\"");

  const gitignore = read(".gitignore");
  requireIncludes(".gitignore", gitignore, "*.env.*.bak");
  requireIncludes(".gitignore", gitignore, "blue-tanuki.env.*.bak");
  requireIncludes(".gitignore", gitignore, "*.pem");

  const envFile = read("apps/gateway/src/env_file.ts");
  requireIncludes("apps/gateway/src/env_file.ts", envFile, "writeEnvFileAtomic");
  requireIncludes("apps/gateway/src/env_file.ts", envFile, "backupEnvFileIfExists");
  requireIncludes("apps/gateway/src/env_file.ts", envFile, ".bak");

  const settingsSurface = read("apps/gateway/src/settings_surface.ts");
  requireIncludes("apps/gateway/src/settings_surface.ts", settingsSurface, "writeEnvFileAtomic");
  requireIncludes("apps/gateway/src/settings_surface.ts", settingsSurface, "backup_label: \"settings\"");
  requireIncludes("apps/gateway/src/settings_surface.ts", settingsSurface, "verifyLlmProvisioning");
  requireIncludes("apps/gateway/src/settings_surface.ts", settingsSurface, "Verify LLM");

  const settingsApi = read("apps/gateway/src/control_center/setup/api_settings.ts");
  requireIncludes("apps/gateway/src/control_center/setup/api_settings.ts", settingsApi, "verifyLlmProvisioning");
  requireIncludes("apps/gateway/src/control_center/setup/api_settings.ts", settingsApi, "secret_exposed: false");

  const settingsSetupPage = read("apps/gateway/src/control_center/setup/setup_page.ts");
  requireIncludes("apps/gateway/src/control_center/setup/setup_page.ts", settingsSetupPage, "/settings/llm/verify");

  const webchat = read("packages/channel-webchat/src/webchat.ts");
  requireIncludes("packages/channel-webchat/src/webchat.ts", webchat, "/settings/llm/verify");
  requireIncludes("packages/channel-webchat/src/webchat.ts", webchat, "verifyLlm");

  const setup = read("apps/gateway/src/setup.ts");
  requireIncludes("apps/gateway/src/setup.ts", setup, "writeEnvFileAtomic");
  requireIncludes("apps/gateway/src/setup.ts", setup, "backup_label: \"setup\"");

  const dockerfile = read("Dockerfile");
  requireIncludes("Dockerfile", dockerfile, "USER blue-tanuki");
  requireIncludes("Dockerfile", dockerfile, "HEALTHCHECK");
  requireIncludes("Dockerfile", dockerfile, "apps/gateway/dist/main.js");
  requireIncludes("Dockerfile", dockerfile, "--serve");

  const compose = read("docker-compose.yml");
  requireIncludes("docker-compose.yml", compose, "WEBCHAT_TOKEN is required");
  requireIncludes(
    "docker-compose.yml",
    compose,
    "WEBCHAT_RESUME_TOKEN is required",
  );
  requireIncludes("docker-compose.yml", compose, "BLUE_TANUKI_AUDIT_DIR");
  requireIncludes("docker-compose.yml", compose, "BLUE_TANUKI_SESSION_DIR");
  requireIncludes("docker-compose.yml", compose, "BLUE_TANUKI_SETTINGS_TOKEN");

  const workflow = read(".github/workflows/ci.yml");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm typecheck");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm build");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm test");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm smoke:serve");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm smoke:resume");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm run doctor");
  requireIncludes(".github/workflows/ci.yml", workflow, "docker build");
  requireIncludes(".github/workflows/ci.yml", workflow, "WEBCHAT_RESUME_TOKEN");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm release:bundle -- --dry-run");
  requireIncludes(".github/workflows/ci.yml", workflow, "pnpm release:verify");

  const unit = read("deploy/systemd/blue-tanuki.service");
  requireIncludes("deploy/systemd/blue-tanuki.service", unit, "User=blue-tanuki");
  requireIncludes(
    "deploy/systemd/blue-tanuki.service",
    unit,
    "EnvironmentFile=/etc/blue-tanuki/blue-tanuki.env",
  );
  requireIncludes("deploy/systemd/blue-tanuki.service", unit, "ExecStartPre=");
  requireIncludes("deploy/systemd/blue-tanuki.service", unit, "--doctor");
  requireIncludes("deploy/systemd/blue-tanuki.service", unit, "--serve");
  requireIncludes("deploy/systemd/blue-tanuki.service", unit, "NoNewPrivileges=true");
  requireNotIncludes(
    "deploy/systemd/blue-tanuki.service",
    unit,
    "WEBCHAT_TOKEN=replace",
  );

  const env = read("deploy/systemd/blue-tanuki.env.example");
  requireIncludes("deploy/systemd/blue-tanuki.env.example", env, "WEBCHAT_TOKEN=");
  requireIncludes(
    "deploy/systemd/blue-tanuki.env.example",
    env,
    "WEBCHAT_RESUME_TOKEN=",
  );
  requireIncludes(
    "deploy/systemd/blue-tanuki.env.example",
    env,
    "BLUE_TANUKI_SETTINGS_TOKEN=",
  );
  requireIncludes(
    "deploy/systemd/blue-tanuki.env.example",
    env,
    "BLUE_TANUKI_AUDIT_DIR=/var/lib/blue-tanuki/audit",
  );
  requireIncludes(
    "deploy/systemd/blue-tanuki.env.example",
    env,
    "BLUE_TANUKI_DAILY_BRIEF_CONTENT=Daily Brief: scheduled smoke from BLUE-TANUKI v1.0 RC",
  );
  requireNotIncludes("deploy/systemd/blue-tanuki.env.example", env, "v0.1");
  requireNotIncludes("deploy/systemd/blue-tanuki.env.example", env, "v0.2+");

  const cronChannel = read("apps/gateway/src/cron_channel.ts");
  requireIncludes("apps/gateway/src/cron_channel.ts", cronChannel, "Runtime cron source.");
  requireIncludes(
    "apps/gateway/src/cron_channel.ts",
    cronChannel,
    "\"Daily Brief: scheduled smoke from BLUE-TANUKI v1.0 RC.\"",
  );
  requireNotIncludes("apps/gateway/src/cron_channel.ts", cronChannel, "v0.1");

  console.log("[packaging] PASS");
}

main();

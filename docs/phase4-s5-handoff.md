# Phase 4-S5 Handoff

Status entering next session: Phase 4-S5 provider-neutral LLM boundary is in
place, but credentialed live-fire execution is still pending.

## Delivered in S4

- Gateway operational logs migrated to `createLogger` in:
  - `apps/gateway/src/main.ts`
  - `apps/gateway/src/serve.ts`
- `--doctor` and `--audit-dump [--json]` still write raw reports to stdout.
- `pnpm smoke:live` added via `apps/gateway/src/smoke_live.ts`.
- Live smoke supports:
  - Anthropic API with `ANTHROPIC_API_KEY`.
  - Slack Socket Mode + outbound send with `SLACK_BOT_TOKEN`,
    `SLACK_APP_TOKEN`, `SLACK_LIVE_TARGET`.
  - Discord Gateway + outbound send with `DISCORD_BOT_TOKEN`,
    `DISCORD_LIVE_TARGET`.
- `manifestPathFor()` fixed for Windows/POSIX path stability.
- Offline smoke scripts now support Windows `PNPM_BIN` wrappers.
- Runbook updated with live-fire smoke notes.
- S4 report added at `docs/phase4-s4.md`.

## Verification

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 227 tests
- `smoke:live` skip path: PASS with all live credentials explicitly blank.

Credentialed live smoke was not run because live tokens were not provided
and the script can call third-party APIs / post messages.

## Next Decision

Two sensible next steps:

1. Finish S4 credentialed verification:
   - Run `pnpm smoke:live` with real Anthropic/Slack/Discord credentials.
   - Use `BLUE_TANUKI_LIVE_REQUIRED=1` if at least one live check must run.
   - Record results in `docs/phase4-s4.md`.

2. If live tokens are intentionally deferred, move to Phase 4-10:
   - Release prep, changelog, README cleanup, package verification.
   - Keep live smoke as an operator-gated deploy check.

Recommendation: run credentialed S4 verification before Phase 5 channel work.
The live harness now exists; the remaining blocker is operational access, not
code structure.

## Delivered in S5

- LLM calls are now routed through `LLMRegistry`.
- `backend_hint`, `model`, and `temperature` are protocol-level LLM payload
  fields and are passed through by the executor.
- `OpenAICompatibleBackend` supports chat-completions-compatible providers.
- Gateway LLM config is centralized in `apps/gateway/src/llm_config.ts`.
- `LLM_PROVIDERS_JSON` can register multiple named OpenAI-compatible providers
  and aliases for arbitrary LLM API endpoints.
- `ControllerOptions.llm_route` carries HDS-BRAIN-owned command route hints
  into ASSERTed `llm_call` payloads.
- Gateway `BLUE_TANUKI_LLM_*` env builds that route, and doctor validates it.
- `smoke:live` now tests the configured non-stub LLM provider instead of only
  Anthropic.
- S5 report added at `docs/phase4-s5.md`.

## Verification After S5

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 237 tests

Credentialed live smoke remains pending for any non-stub provider, Slack, and
Discord because it requires real credentials and can create external effects.

## Continued After S5 Verification

- Added custom provider catalog parsing in `apps/gateway/src/llm_config.ts`.
- Added doctor support for custom provider names and aliases.
- Added tests for custom provider routing and malformed catalog failures.
- Updated runbook and core plugin manifest for provider-neutral permissions.

Verification for this continuation is pending because command execution
approval was exhausted after the previous build/typecheck/test pass.

## Delivered in S6

- Added `constraints.allowed_capabilities` to the protocol.
- Added tool-level `required_capabilities`.
- Executor now fails closed when a tool's required capabilities are missing.
- Added built-in `file.search` and `http.fetch` tools behind capability gates.
- Gateway now registers built-in tools through `registerBuiltinTools()`.
- S6 report added at `docs/phase4-s6.md`.

## Verification After S6

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 254 tests

## Delivered in S7

- Added HDS action router in `packages/hds-brain/src/action_router.ts`.
- HDS-BRAIN now routes explicit safe tool requests to `tool_call`.
- Supported explicit tools: `echo`, `file.search`, `http.fetch`.
- Unknown explicit tool requests become `noop` instead of LLM text.
- S7 report added at `docs/phase4-s7.md`.

## Verification After S7

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 257 tests

## Delivered in S8

- Added shared gateway result renderer at `apps/gateway/src/result_render.ts`.
- Serve mode now returns `tool_call` / `noop` / failure output to the
  originating channel.
- CLI mode logs rendered non-LLM command output.
- S8 report added at `docs/phase4-s8.md`.

## Verification After S8

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 261 tests

## Delivered in S3 Long-Term Memory Addendum

- Added internal append-only HDS-BRAIN long-term memory under
  `packages/hds-brain/src/long-term-memory/`.
- Captures only TCP-closed ASSERT decisions.
- Added optional controller memory capture and frame `memory_reader` plumbing,
  with no frame behavior change in this step.
- Kept containment: no root export, no downstream imports, no LLM/embedding/ML
  dependency, no `AuditLog` mutation.
- Report added at `docs/phase4-s3-long-term-memory.md`.

## Verification After S3 Long-Term Memory Addendum

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 281 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS

## Delivered in S9

- Added `CHANGELOG.md`.
- Added S9 release readiness report at `docs/phase4-s9.md`.
- Updated README, runbook, and doctor reference to the current Phase 4-S9
  state.

## Verification After S9

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 281 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `pnpm run doctor`: PASS, exit 0 with dummy local env

## Delivered in Phase 5-S1

- Gateway doctor now schema-validates bundled plugin manifests through
  `@blue-tanuki/protocol`.
- Doctor now detects manifest/package name, version, and entry drift.
- Added Phase 5-S1 report at `docs/phase5-s1.md`.

## Verification After Phase 5-S1

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 284 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `pnpm run doctor`: PASS, exit 0 with dummy local env

## Delivered in Phase 5-S2

- Added workspace plugin loader at `apps/gateway/src/plugin_loader.ts`.
- Gateway now registers built-in tools and channel classes via manifest
  entry/export bindings.
- Added boot-time permission enforcement for tool capabilities, channel
  network/secrets, LLM provider access, session fs, and audit append.
- Added Phase 5-S2 report at `docs/phase5-s2.md`.

## Verification After Phase 5-S2

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 290 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:echo text=loader-smoke"`: PASS

## Delivered in Phase 5-S3

- Hardened `http.fetch` against SSRF in `packages/blue-tanuki/src/tools/builtin.ts`.
- Added DNS/IP validation before connection.
- Added redirect validation with a 3-hop limit.
- Added optional `BLUE_TANUKI_HTTP_ALLOWLIST` domain mode.
- Added Phase 5-S3 report at `docs/phase5-s3-http-fetch-ssrf.md`.

## Verification After Phase 5-S3

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 299 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:echo text=ssrf-guard-smoke"`: PASS

## Delivered in Phase 5-S4

- Added `BLUE_TANUKI_FILE_ROOT` sandbox enforcement for `file.search`.
- Added `resolve` + `realpath` containment checks.
- Added symlink escape denial.
- Added secret-like path denial/skipping for `.env`, `.git`, private key, and
  key/certificate-style paths.
- Added Phase 5-S4 report at `docs/phase5-s4-file-search-sandbox.md`.

## Verification After Phase 5-S4

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 303 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:file.search root=. query=BLUE-TANUKI max_results=1"`: PASS

## Delivered in Phase 5-S5

- Added detector-input Unicode normalization in
  `packages/hds-brain/src/normalization.ts`.
- Added NFKC normalization plus zero-width / bidi control removal before
  detector scoring.
- Added raw and normalized request content to `DecisionLog.input`.
- Added control-character code point, kind, name, and raw index metadata to
  audit entries.
- Added Phase 5-S5 report at `docs/phase5-s5-unicode-normalization.md`.

## Verification After Phase 5-S5

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 305 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "please run r<U+200B>m -rf foo"`: PASS, SUSPEND

## Delivered in Phase 5-S6

- Split WebChat inbound auth and human resume auth.
- `WEBCHAT_TOKEN` now gates `/inbound` and `/ws-ticket` only.
- `WEBCHAT_RESUME_TOKEN` now gates `/resume` only and must differ from
  `WEBCHAT_TOKEN`.
- Added resume audit context with `actor` and `token_kind=resume`.
- Added doctor checks for resume-token presence and separation.
- Added Phase 5-S6 report at `docs/phase5-s6-resume-token-split.md`.

## Verification After Phase 5-S6

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 311 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "hello phase5-s6"`: PASS

## Delivered in Phase 5-S7

- Added Docker packaging without adding npm dependencies.
- Added `Dockerfile`, `.dockerignore`, and `docker-compose.yml`.
- Compose now requires separated `WEBCHAT_TOKEN` and `WEBCHAT_RESUME_TOKEN`.
- Docker runtime defaults to `WEBCHAT_HOST=0.0.0.0` and persistent `/data`.
- Added Phase 5-S7 report at `docs/phase5-s7-docker-packaging.md`.

## Verification After Phase 5-S7

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 311 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `docker build`: not run; Docker CLI unavailable in this Codex environment

## Delivered in Phase 5-S8

- Added GitHub Actions CI.
- Verify job runs install, typecheck, build, tests, offline smoke, live-smoke
  skip path, and doctor with separated dummy WebChat tokens.
- Docker job builds `blue-tanuki:ci` after verify succeeds.
- Workflow permissions are read-only and same-ref runs are cancelled.
- Added Phase 5-S8 report at `docs/phase5-s8-ci.md`.

## Verification After Phase 5-S8

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 311 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with CI-equivalent dummy env
- GitHub Actions workflow execution: not run locally

## Delivered in Phase 5-S9

- Added systemd packaging.
- Added `deploy/systemd/blue-tanuki.service`.
- Added `deploy/systemd/blue-tanuki.env.example`.
- Added `deploy/systemd/README.md`.
- Added runbook notes for `/opt/blue-tanuki`, `/etc/blue-tanuki`, and
  `/var/lib/blue-tanuki` layout.
- Added Phase 5-S9 report at `docs/phase5-s9-systemd.md`.

## Verification After Phase 5-S9

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 311 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with systemd-equivalent dummy env
- systemd execution: not run locally

## Delivered in Phase 5-S10

- Added request_id-bound one-time approval tokens for WebChat `/resume`.
- Added `ResumeApprovalTokenStore` and `MemoryResumeApprovalTokenStore`.
- SUSPEND notifications include `approval_token=<token>`.
- `/resume` requires the separated resume bearer token and the one-time
  approval token.
- Added `pnpm validate:packaging`.
- Added packaging validation to GitHub Actions CI.
- Added Phase 5-S10 report at `docs/phase5-s10-remaining-hardening.md`.

## Verification After Phase 5-S10

- Build: PASS
- Typecheck: PASS
- Tests: PASS, 314 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm validate:packaging`: PASS
- `pnpm run doctor`: PASS, exit 0 with hardening dummy env

## Delivered in Phase 6-S1

- Added setup wizard/config schema for local installs.
- Added `pnpm setup` and `pnpm setup:dist`.
- Added env-file loading through `--env-file` and `BLUE_TANUKI_ENV_FILE`.
- Setup generates separated WebChat tokens, local sandbox/persistence paths,
  and LLM provider env.
- Added Phase 6-S1 report at `docs/phase6-s1-setup.md`.

## Verification After Phase 6-S1

- Gateway typecheck: PASS
- Full typecheck by package: PASS
- Tests: PASS, 326 tests
- Gateway build: PASS
- Compiled setup command: PASS
- Compiled main `--setup` command: PASS
- Generated env-file doctor path: PASS, `ok=true` with optional-token warnings

## Delivered in Phase 6-S2

- Added local settings window at `/settings`.
- Added settings config API at `/settings/config`.
- Added dedicated `BLUE_TANUKI_SETTINGS_TOKEN` auth for settings API.
- Added redacted settings snapshots for LLM, WebChat, paths, and plugins.
- Added env-file write-back for settings updates.
- Added Phase 6-S2 report at `docs/phase6-s2-settings-window.md`.

## Verification After Phase 6-S2

- WebChat settings endpoint tests: PASS
- Gateway settings/setup tests: PASS
- Full typecheck by package: PASS
- Tests: PASS, 335 tests
- Full build by package: PASS
- Settings-window serve smoke: PASS
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm validate:packaging`: PASS
- `pnpm run doctor`: PASS, exit 0 with dummy settings-token env

## Delivered in Phase 6-S3

- Added portable installer scripts for Windows, macOS, and Linux.
- Added `install/README.md`.
- Added `pnpm release:bundle`.
- Added `scripts/create_release_bundle.ts`.
- Added release bundle dry run to CI.
- Extended packaging validation for portable installers.
- Added Phase 6-S3 report at `docs/phase6-s3-portable-installers.md`.

## Verification After Phase 6-S3

- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote `release/blue-tanuki-0.0.3-portable.zip`
- Portable zip contains Windows/macOS/Linux installer scripts

## Delivered in Phase 6-S4

- Added SHA256 sidecar generation for portable release archives.
- Added release manifest generation.
- Added `pnpm release:verify`.
- Added archive verification for checksum, manifest consistency, required
  entries, and secret-like path exclusions.
- Added CI release verification.
- Extended packaging validation for release integrity.
- Added Phase 6-S4 report at `docs/phase6-s4-release-integrity.md`.

## Verification After Phase 6-S4

- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS

## Delivered in Phase 6-S5

- Added post-install doctor gates to Windows, macOS, and Linux installers.
- Added Windows `-SkipDoctor` and macOS/Linux `RUN_DOCTOR=0` skip paths.
- Installed launchers now support `start`, `doctor`, `setup`, `settings`,
  `env`, and `help`.
- Windows `.cmd` launcher now delegates to the PowerShell launcher.
- Updated installer docs and packaging validation.
- Added Phase 6-S5 report at `docs/phase6-s5-installer-launchers.md`.

## Verification After Phase 6-S5

- Packaging/release scripts TypeScript check: PASS
- Windows installer PowerShell syntax check: PASS
- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

## Delivered in Phase 6-S6

- Added portable uninstall scripts for Windows, macOS, and Linux.
- Default uninstall removes app/launcher and preserves env, audit, sessions,
  and local data.
- Added purge modes for full local data removal.
- Added dry-run modes for removal preview.
- Added filesystem safety guards against broad deletion.
- Release bundle and release verification now require uninstall scripts.
- Updated installer docs and packaging validation.
- Added Phase 6-S6 report at `docs/phase6-s6-portable-uninstallers.md`.

## Verification After Phase 6-S6

- Packaging/release scripts TypeScript check: PASS
- Windows installer/uninstaller PowerShell syntax check: PASS
- Windows uninstaller dry-run smoke: PASS
- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

## Delivered in Phase 6-S7

- Portable installers now preserve an existing env file during app reinstall
  or portable upgrade.
- Windows `-Force` and macOS/Linux `FORCE=1` now replace the app directory
  only.
- Added explicit config reset options: Windows `-ResetConfig`, macOS/Linux
  `RESET_CONFIG=1`.
- Post-install `doctor` still runs against retained config.
- Updated installer docs and packaging validation.
- Added Phase 6-S7 report at `docs/phase6-s7-upgrade-safe-installers.md`.

## Verification After Phase 6-S7

- Packaging/release scripts TypeScript check: PASS
- Windows installer/uninstaller PowerShell syntax check: PASS
- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

## Delivered in Phase 6-S8

- Added shared atomic env write helper.
- Added timestamped `.bak` backups before setup/settings overwrite an env file.
- `setup --force` reports the backup path.
- `/settings/config` returns the backup path.
- Added env backup tests and packaging validation.
- Added Phase 6-S8 report at `docs/phase6-s8-env-backups.md`.

## Verification After Phase 6-S8

- Gateway typecheck: PASS
- Gateway build: PASS
- Full test suite: PASS, 337 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `doctor`: PASS, exit 0 with CI-equivalent dummy env
- `pnpm validate:packaging`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS

## Delivered in Phase 6-S9

- Release bundle creation excludes env backups and secret-like local files.
- Release bundle verification rejects env backups and key/cert-like files if
  they appear in an archive.
- `.gitignore` ignores env backups and common local key material.
- Packaging validation checks release secret-exclusion wiring.
- Added Phase 6-S9 report at
  `docs/phase6-s9-release-secret-exclusion.md`.

## Verification After Phase 6-S9

- Release/packaging scripts TypeScript check: PASS
- `pnpm validate:packaging`: PASS
- Secret-exclusion smoke with dummy `*.env.bak` and `*.pem`: PASS
- `pnpm release:bundle -- --dry-run`: PASS
- `pnpm release:bundle`: PASS, wrote archive plus `.sha256` and
  `.manifest.json`
- `pnpm release:verify`: PASS

## Guardrails

- Do not add a plugin loader without permission enforcement.
- Do not make HDS-BRAIN call an LLM.
- Do not let executor/core override HDS-BRAIN decisions.
- Keep any HDS/神域原理 sealed implementation flows out of public docs/code.

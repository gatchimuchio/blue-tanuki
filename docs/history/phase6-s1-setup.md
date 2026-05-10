# Phase 6-S1: setup wizard and LLM provider config

Phase 6 starts the distribution/user-setup layer. The goal is to make a
fresh install usable without hand-authoring every environment variable while
keeping the containment boundary intact.

## Delivered

- Added a typed setup schema in `apps/gateway/src/setup_config.ts`.
- Added `blue-tanuki setup` CLI support through `apps/gateway/src/setup.ts`.
- Added root scripts:
  - `pnpm setup`
  - `pnpm setup:dist`
- The setup flow generates:
  - `WEBCHAT_TOKEN`
  - `WEBCHAT_RESUME_TOKEN`
  - `BLUE_TANUKI_FILE_ROOT`
  - `BLUE_TANUKI_SESSION_DIR`
  - `BLUE_TANUKI_AUDIT_DIR`
  - `BLUE_TANUKI_SETTINGS_TOKEN`
  - LLM provider env for `stub`, `anthropic`, `openai`, or
    `openai-compatible`
- Added `--env-file` and `BLUE_TANUKI_ENV_FILE` loading for gateway boot.
- Added dotenv-style parsing without shell expansion.
- Setup writes runtime directories and runs `doctor` by default.

## Usage

Offline-safe local setup:

```bash
pnpm setup -- --yes
pnpm gateway:serve:dev -- --env-file .blue-tanuki/blue-tanuki.env
```

OpenAI-compatible local/self-hosted setup:

```bash
pnpm setup -- --yes \
  --provider openai-compatible \
  --endpoint http://localhost:11434/v1 \
  --model llama-local \
  --force
```

OpenAI setup:

```bash
pnpm setup -- --yes \
  --provider openai \
  --model <model> \
  --api-key <api-key>
```

Anthropic setup:

```bash
pnpm setup -- --yes \
  --provider anthropic \
  --model <model> \
  --api-key <api-key>
```

The generated env file is private local configuration. Do not commit it.

## Boundaries

- The setup CLI writes configuration only. It does not grant runtime
  capabilities.
- `doctor`, plugin manifest enforcement, and boot-time permission checks still
  decide whether the process may start.
- LLM providers remain downstream references. HDS-BRAIN still decides whether
  an LLM command may run.
- Secrets are never printed by `doctor`; token/API-key values are written only
  to the generated env file.

## Not Added

- No desktop settings window yet. This phase creates the schema and CLI path
  that a later Tauri/Electron settings window can reuse.
- No OS keychain integration yet.
- No signed Windows/macOS/Linux installers yet.
- No new npm dependencies.

## Verification

- Gateway typecheck: PASS
- Gateway tests: PASS, 69 tests

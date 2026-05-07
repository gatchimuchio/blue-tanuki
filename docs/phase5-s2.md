# Phase 5-S2: Plugin Loader + Permission Enforcement

Status: implemented.

## Intent

Phase 5-S2 turns package manifests from validated declarations into a boot-time
containment boundary. The gateway now discovers workspace packages via
`pnpm-workspace.yaml`, imports only workspace manifest entries, and refuses to
boot when a requested tool/channel/LLM/session/audit capability is not declared.

Loader and enforcement ship together in this step.

## Implemented

- Added `apps/gateway/src/plugin_loader.ts`.
- Discovers workspace packages from `pnpm-workspace.yaml`.
- Reads `blue-tanuki.plugin.json` only from workspace package roots.
- Imports manifest `entry` via file URL only; external npm package dynamic
  import is not supported.
- Validates manifest export bindings before use.
- Registers built-in tools through the `@blue-tanuki/core` manifest export.
- Creates WebChat / Slack / Discord channels through their manifest `channel`
  exports.
- Runs live smoke LLM / Slack / Discord checks through the same plugin
  runtime before reading provider/channel secrets.
- Enforces declared permissions for:
  - built-in tool capabilities
  - channel network/secrets permissions
  - non-stub LLM provider network/secrets access
  - session directory filesystem access
  - audit directory append access
- Violations fail boot before registration/use.

## Not Added

- No external npm plugin discovery.
- No hot reload.
- No runtime permission mutation.
- No detector loader yet.
- No dynamic HDS-BRAIN policy mutation.

## Verification

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 290 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:echo text=loader-smoke"`: PASS

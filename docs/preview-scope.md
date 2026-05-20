# Preview Scope

この文書は v0.1 core release path から外す実体を明示する。削除ではなく隔離を優先し、workspace typecheck/test は維持する。

## Core Release Include

- `apps/gateway`
- `packages/hds-brain`
- `packages/protocol`
- `packages/blue-tanuki`
- `packages/channel-base`
- `packages/channel-webchat`
- `packages/channel-telegram`
- `install/linux`
- core validation scripts and active docs

## Preview / Archive Exclude

- `packages/channel-slack`
- `packages/channel-discord`
- `packages/channel-teams`
- `packages/channel-line`
- `packages/operator-daily`
- `packages/operator-developer`
- `packages/operator-writing`
- `install/installer`
- `install/resident`
- `install/windows`
- `install/macos`
- `apps/gateway/src/smoke_live.ts`
- historical `docs/phase*.md` and `docs/history/*`

Preview items remain downstream-only. Missing preview credentials are WARN in core doctor and do not fail v0.1 core health. `doctor --preview` validates preview channel readiness; `doctor --strict` validates all optional surfaces strictly.

## Regression Gate

`pnpm validate:repo-health` blocks custom pnpm wrapper revival, forbidden production static imports, undocumented preview scope, and preview paths in the core release allowlist.

# Repository Health Inventory

この inventory は v0.1 release path のスリムダウン用 baseline である。機能追加ではなく、CORE / PREVIEW / ARCHIVE / DEAD の責務境界を明示する。

## Classification

| Area | Classification | Reason |
|---|---:|---|
| `packages/hds-brain` | CORE | HDS-BRAIN authority kernel, Approval Gate, audit, Runtime Invariants, self-health |
| `packages/protocol` | CORE | HDS / gateway / downstream command schema and manifest schema |
| `packages/blue-tanuki` | CORE | downstream executor, session store, built-in tools |
| `apps/gateway` | CORE | local owner runtime entry, WebChat/Telegram bridge, doctor/setup/audit CLI adapter |
| `packages/channel-webchat` | CORE | first-party local Control Center / WebChat surface |
| `packages/channel-telegram` | CORE | first-party starter external channel |
| `packages/channel-base` | CORE | shared downstream channel adapter substrate |
| `packages/channel-slack` | PREVIEW | first-party-preview channel; not v0.1 core release blocker |
| `packages/channel-discord` | PREVIEW | first-party-preview channel; not v0.1 core release blocker |
| `packages/channel-teams` | PREVIEW | first-party-preview channel; not v0.1 core release blocker |
| `packages/channel-line` | PREVIEW | first-party-preview channel; not v0.1 core release blocker |
| `packages/operator-daily` | PREVIEW | operator expansion surface after safety/release path closure |
| `packages/operator-developer` | PREVIEW | operator expansion surface after safety/release path closure |
| `packages/operator-writing` | PREVIEW | operator expansion surface after safety/release path closure |
| `install/linux` | CORE | supported native Linux / WSL guided install surface |
| `install/macos` | PREVIEW | supported later as platform surface; not used as WSL baseline |
| `install/windows` | PREVIEW | no new Windows-native bypasses in this health phase |
| `install/installer` | PREVIEW | guided installer acceleration; not an authority path |
| `install/resident` | PREVIEW | resident launch helper; not v0.1 authority core |
| `docs/IMPLEMENTATION_INSTRUCTIONS.md` | CORE | active implementation source of truth |
| `docs/known-environment-failures.md` | CORE | validation failure classification |
| `docs/history/*` | ARCHIVE | historical phase evidence, not active release instruction |
| `docs/phase*.md` | ARCHIVE | historical phase reports unless referenced by release gates |
| `docs/ROADMAP.md` | ARCHIVE | high-level context only; active file is implementation instructions |
| root `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `vitest.config.ts` | CORE | workspace, validation, build/test graph |

## Scripts

| Script | Classification | Action |
|---|---:|---|
| `scripts/typecheck.mjs` | CORE | kept; wraps TypeScript project references |
| `scripts/check_docs.mjs` | CORE | kept; release docs consistency gate |
| `scripts/validate_packaging.ts` | CORE | kept; package/release path validation |
| `scripts/create_release_bundle.ts` | CORE | kept; release bundle production |
| `scripts/verify_release_bundle.ts` | CORE | kept; release verification |
| `scripts/smoke_serve.ts` | CORE | kept; root workspace smoke entrypoint |
| `scripts/smoke_resume.ts` | CORE | kept; root workspace resume smoke entrypoint |
| `scripts/ga_promotion_gate.ts` | CORE | kept; GA claim boundary |
| `scripts/channel_promotion_gate.ts` | PREVIEW | kept for preview channel promotion evidence |
| `scripts/plugin_review_gate.ts` | PREVIEW | kept for Layer B review gate |
| `scripts/clean.mjs` | CORE | kept; native pnpm has no workspace dist/tsbuildinfo cleanup equivalent |
| `scripts/pnpm_exec.mjs` | DEAD | removed; native pnpm workspace/filter scripts replace it |

## Entrypoints

| Entrypoint | Classification | Responsibility |
|---|---:|---|
| `apps/gateway/src/main.ts` | CORE | thin process entry only |
| `apps/gateway/src/runtime.ts` | CORE | production CLI one-shot runtime wiring |
| `apps/gateway/src/serve.ts` | CORE | long-running WebChat/channel runtime |
| `apps/gateway/src/cli_router.ts` | CORE | diagnostic/setup/audit command router |
| `apps/gateway/src/doctor.ts` | CORE | configuration and local runtime diagnostics |
| `apps/gateway/src/setup.ts` | CORE | guided setup adapter |
| `apps/gateway/src/audit_dump.ts` / `audit_verify.ts` | CORE | audit inspection tools, not production runtime imports |
| `apps/gateway/src/smoke_live.ts` | PREVIEW | credential-dependent live smoke path |

## Workspace Graph

- tsconfig references include CORE and PREVIEW packages so typecheck covers the full repository.
- v0.1 release path is CORE-first; PREVIEW package type/test coverage may remain in validation without becoming release scope.
- workspace dependencies from `apps/gateway` currently include preview adapters because the gateway can host them, but promotion remains gated by compatibility matrix and channel promotion evidence.

## Health Phase Decisions

- native Linux / WSL baseline uses Corepack pnpm 9.12.0.
- Windows-native fallback wrappers are not added.
- production runtime entry no longer imports doctor/audit/setup modules directly; those are routed through `cli_router.ts`.
- raw inbound objects must pass strict boundary validation and canonicalization before HDS-BRAIN receives an authority frame.
- self-health now separates config validation from runtime health evidence. Runtime evidence uses PASS / WARN / FAIL / UNKNOWN and remains `used_for_authority=false`.

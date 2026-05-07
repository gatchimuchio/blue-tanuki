# Phase 4-S9: Release Readiness

Status: implemented.

## Intent

Phase 4-S9 is a packaging and handoff pass. It does not add a new runtime
surface. It aligns the public docs, release notes, and operator checklist with
the current implementation after S5 through S8 and the S3 long-term-memory
addendum.

## Implemented

- Added root `CHANGELOG.md`.
- Updated README current-state language:
  - HDS-BRAIN internal append-only memory
  - provider-neutral LLM routing
  - tool capability envelope and action output rendering
  - current Phase 4-S9 roadmap status
- Updated doctor reference with current checks.
- Updated runbook assumptions and deploy checklist.
- Fixed root `doctor` scripts and docs to use `run doctor` so they do not
  collide with pnpm's built-in `doctor` command.
- Preserved sealed-boundary language:
  - HDS-BRAIN never calls an LLM
  - long-term memory is internal and not exported
  - credentialed live smoke remains operator-gated

## Verification

- `pnpm build`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 281 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm run doctor`: PASS, exit 0 with dummy local env

## Remaining Operator-Gated Work

- `pnpm smoke:live` with real LLM, Slack, or Discord credentials.
- Tagging/publishing to a remote repository, if desired.

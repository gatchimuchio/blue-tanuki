# Phase 5-S10: Remaining Local Hardening

Phase 5-S10 closes the local, dependency-free hardening work that remained
after live credential checks and HDS long-term-memory F-reference design were
explicitly left open.

## Delivered

- Added request_id-bound one-time approval tokens for WebChat `/resume`.
- SUSPEND notifications now include `approval_token=<token>` for the suspended
  `request_id`.
- `/resume` now requires:
  - `WEBCHAT_RESUME_TOKEN` bearer auth
  - `request_id`
  - `verdict`
  - matching one-time `approval_token`
- Approval tokens are single-use and are burned even when presented for the
  wrong request_id.
- Added `ResumeApprovalTokenStore` and default
  `MemoryResumeApprovalTokenStore`.
- Updated `smoke:resume` to require the SUSPEND notification approval token.
- Added `pnpm validate:packaging` for static checks across Docker, compose,
  GitHub Actions, and systemd packaging.
- Added the packaging validator to CI.

## Not Added

- No Redis/Postgres backend: adding production Redis/Postgres drivers still
  requires explicit dependency approval.
- No live credential smoke: still operator-gated.
- No HDS long-term-memory F-reference implementation: still design-gated.
- No external npm plugin import, hot reload, or dynamic permission mutation.

## Verification

- Targeted WebChat typecheck/test: PASS, 43 tests
- Gateway typecheck: PASS
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 314 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm validate:packaging`: PASS
- `pnpm run doctor`: PASS, exit 0 with hardening dummy env

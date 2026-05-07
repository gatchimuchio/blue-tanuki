# Phase 5-S9: systemd Packaging

Phase 5-S9 adds a single-host systemd packaging template for running
BLUE-TANUKI outside Docker.

## Delivered

- Added `deploy/systemd/blue-tanuki.service`.
- Added `deploy/systemd/blue-tanuki.env.example`.
- Added `deploy/systemd/README.md`.
- The unit runs `node apps/gateway/dist/main.js --serve` from
  `/opt/blue-tanuki`.
- Secrets stay in `/etc/blue-tanuki/blue-tanuki.env`; the unit does not embed
  token values.
- `ExecStartPre` runs `--doctor` and blocks boot only for error exit code 2.
- Default persistent paths:
  - `/var/lib/blue-tanuki/audit`
  - `/var/lib/blue-tanuki/sessions`
- The service uses a non-root `blue-tanuki` user plus basic systemd hardening.

## Not Added

- No automatic installer script.
- No deployment automation.
- No package publishing.
- No new runtime dependency.

## Verification

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 311 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with systemd-equivalent dummy env
- Local systemd execution was not run because this Codex environment is
  Windows-based and does not expose systemd.

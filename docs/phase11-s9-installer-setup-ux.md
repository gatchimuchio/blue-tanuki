# Phase 11-S9: Installer and Setup UX

## Summary

Phase 11-S9 adds a guided first-run installer and SIM-like LLM API settings
verification. The implementation keeps the existing setup, settings, doctor,
Approval Gate, audit, and HDS-BRAIN authority paths intact.

## Files Added

- `install/installer/`
- `apps/gateway/src/control_center/setup/`
- `docs/INSTALLER_GUIDE.md`

## Behavior

- `pnpm installer:verify` runs repository preflight checks and returns an owner
  next action.
- `pnpm installer:run` prepares pnpm, installs dependencies, builds, runs setup,
  runs doctor, and points the owner to Control Center Settings.
- `pnpm installer:run -- --no-serve` performs setup and validation without
  starting the gateway.
- Settings now exposes `Verify LLM`, a non-mutating provider check for the
  candidate LLM configuration.

## Safety Boundaries

- HDS-BRAIN remains the only authority owner.
- The installer does not create an authority path.
- The installer does not bypass Approval Gate final-review behavior.
- The settings verification route is token-gated and non-mutating.
- API key values are not printed by installer output, doctor, runtime snapshot,
  or audit output.
- Layer A / Layer B separation is unchanged.

## Distribution Boundary

The guided installer is portable setup UX. It is not a signed native installer,
not an automatic updater, and not a verified 5-minute beginner setup guarantee.

Signed installer, auto updater, and OS resident integration remain outside this
phase. Resident application integration is Phase 11-S10.

## Validation Targets

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm docs:check`
- `pnpm build`
- `pnpm run doctor`
- `pnpm validate:packaging`
- `pnpm installer:verify`
- `pnpm installer:run -- --skip-install --skip-build --no-doctor --no-serve`

## Cross-References

- [INSTALLER_GUIDE.md](INSTALLER_GUIDE.md)
- [FIRST_RUN_CHECKLIST.md](FIRST_RUN_CHECKLIST.md)
- [PERMANENT_USE_CHECKLIST.md](PERMANENT_USE_CHECKLIST.md)
- [UPDATE_ROLLBACK_RUNBOOK.md](UPDATE_ROLLBACK_RUNBOOK.md)
- [CONFORMANCE.md](CONFORMANCE.md)
- [v1.0-release-candidate.md](v1.0-release-candidate.md)

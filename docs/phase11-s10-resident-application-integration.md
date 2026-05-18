# Phase 11-S10: Resident Application Integration

## Summary

Phase 11-S10 adds a portable resident app integration layer over the existing
installer launchers. The implementation provides background lifecycle,
Control Center open/log/status commands, explicit autostart management, and
uninstall cleanup without introducing a native signed app or automatic updater.

## Files Added

- `install/resident/`
- `docs/RESIDENT_APP_GUIDE.md`

## Behavior

- Installed launchers expose `resident-start`, `resident-status`,
  `resident-stop`, `resident-open`, `resident-logs`,
  `resident-autostart-enable`, `resident-autostart-disable`, and
  `resident-autostart-status`.
- Resident start runs the normal Gateway serve process with the generated env
  file and writes local pid/log files under the existing data root.
- Autostart is opt-in only and is implemented through current-user OS facilities
  where supported.
- Uninstallers stop the recorded resident process and disable autostart before
  removing app/launcher files.

## Safety Boundaries

- HDS-BRAIN remains the only authority owner.
- Resident helpers do not approve, resume, classify, or execute outside the
  normal Gateway path.
- No final-review operation can be bypassed by resident start or autostart.
- Tokens are read from the existing env file path and are never printed.
- The implementation does not provide a signed native installer and does not provide an automatic updater.

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

- [RESIDENT_APP_GUIDE.md](RESIDENT_APP_GUIDE.md)
- [INSTALLER_GUIDE.md](INSTALLER_GUIDE.md)
- [PERMANENT_USE_CHECKLIST.md](PERMANENT_USE_CHECKLIST.md)
- [UPDATE_ROLLBACK_RUNBOOK.md](UPDATE_ROLLBACK_RUNBOOK.md)
- [CONFORMANCE.md](CONFORMANCE.md)

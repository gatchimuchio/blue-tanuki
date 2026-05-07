# Phase 6-S8: env backups

Phase 6-S8 makes local configuration writes recoverable. The env file contains
operator tokens, provider settings, and local data paths, so overwriting it
must leave a rollback point.

## Delivered

- Added `writeEnvFileAtomic()` in `apps/gateway/src/env_file.ts`.
- Added `backupEnvFileIfExists()` in `apps/gateway/src/env_file.ts`.
- Env writes now use a temporary file and rename into place.
- Existing env files are copied to timestamped `.bak` files before overwrite.
- `setup --force` backs up the previous env file.
- `/settings/config` backs up the previous env file before saving.
- Setup JSON/text output includes the backup path when one is created.
- Settings update responses include `backup_path` when one is created.
- Tests cover atomic env backup, setup force backup, and settings backup.
- `pnpm validate:packaging` checks that setup/settings use the shared helper.

## Backup Names

Backups are written next to the env file:

```text
blue-tanuki.env.2026-05-05T03-15-22-123Z.12345.settings.bak
blue-tanuki.env.2026-05-05T03-15-22-123Z.12345.setup.bak
```

## Recovery

Stop the gateway, inspect the backup, then replace the env file with the
chosen backup. Run `doctor` before restarting.

## Boundaries

- Backups are plaintext because the env file is plaintext.
- No OS keychain integration.
- No encrypted backup format.
- No automatic retention pruning yet.
- No new npm dependencies.

## Verification

- Gateway typecheck: PASS
- Gateway build: PASS
- Full test suite: PASS, 337 tests
- `smoke:serve`: PASS
- `smoke:resume`: PASS
- `smoke:live`: PASS, skip path with no live credentials/targets
- `doctor`: PASS, exit 0 with CI-equivalent dummy env
- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS

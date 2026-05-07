# Phase 6-S6: portable uninstallers

Phase 6-S6 adds a reversible lifecycle path for the portable installers. The
goal is simple: an operator can remove the installed app without accidentally
destroying the audit chain or local configuration.

## Delivered

- Added Windows uninstaller:
  - `install/windows/uninstall.ps1`
- Added macOS uninstaller:
  - `install/macos/uninstall.sh`
- Added Linux uninstaller:
  - `install/linux/uninstall.sh`
- Default uninstall removes:
  - installed app directory
  - installed launcher
- Default uninstall preserves:
  - env file
  - audit chain
  - session store
  - local file sandbox/data
- Purge mode removes retained data:
  - Windows: `-Purge`
  - macOS/Linux: `PURGE=1`
- Dry-run mode previews removal:
  - Windows: `-DryRun`
  - macOS/Linux: `DRY_RUN=1`
- Added safety guards against deleting filesystem roots or broad user
  directories.
- Release bundle manifest and verification now require uninstall scripts.
- `pnpm validate:packaging` checks uninstall coverage.

## Commands

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1 -Purge
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1 -DryRun
```

macOS:

```bash
sh ./install/macos/uninstall.sh
PURGE=1 sh ./install/macos/uninstall.sh
DRY_RUN=1 sh ./install/macos/uninstall.sh
```

Linux:

```bash
sh ./install/linux/uninstall.sh
PURGE=1 sh ./install/linux/uninstall.sh
DRY_RUN=1 sh ./install/linux/uninstall.sh
```

## Boundaries

- No signed native uninstallers yet.
- No OS service removal automation.
- No registry/package-manager integration.
- No new npm dependencies.

## Verification

- Packaging/release scripts TypeScript check: PASS
- Windows installer/uninstaller PowerShell syntax check: PASS
- Windows uninstaller dry-run smoke: PASS
- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

# Phase 6-S7: upgrade-safe installers

Phase 6-S7 separates app replacement from configuration reset. A portable
upgrade should not rotate WebChat tokens, resume tokens, settings tokens, LLM
provider settings, audit paths, or session paths unless the operator asks for
that explicitly.

## Delivered

- Windows installer preserves an existing env file by default.
- macOS/Linux installers preserve an existing env file by default.
- Windows app replacement remains `-Force`.
- macOS/Linux app replacement remains `FORCE=1`.
- Intentional config regeneration is now explicit:
  - Windows: `-ResetConfig`
  - macOS/Linux: `RESET_CONFIG=1`
- Post-install `doctor` still runs against the retained env file.
- Installer docs distinguish reinstall/upgrade from config reset.
- `pnpm validate:packaging` checks config-preserving installer behavior.

## Commands

Windows app upgrade, preserving config:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Force
```

Windows app upgrade plus env regeneration:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Force -ResetConfig
```

macOS/Linux app upgrade, preserving config:

```bash
FORCE=1 sh ./install/macos/install.sh
FORCE=1 sh ./install/linux/install.sh
```

macOS/Linux app upgrade plus env regeneration:

```bash
FORCE=1 RESET_CONFIG=1 sh ./install/macos/install.sh
FORCE=1 RESET_CONFIG=1 sh ./install/linux/install.sh
```

## Boundary

`ResetConfig` / `RESET_CONFIG=1` intentionally regenerates local secrets. It
should be treated as a local configuration reset, not as a normal app update.

## Not Added

- No automatic remote update mechanism.
- No signed native updater.
- No package-manager integration.
- No new npm dependencies.

## Verification

- Packaging/release scripts TypeScript check: PASS
- Windows installer/uninstaller PowerShell syntax check: PASS
- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

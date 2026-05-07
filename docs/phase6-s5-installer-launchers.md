# Phase 6-S5: installer launchers

Phase 6-S5 makes the portable install path easier to operate after first
setup. The installer remains dependency-free and does not become a signed
native package.

## Delivered

- Windows, macOS, and Linux installers run a post-install `doctor` gate after
  setup.
- Windows installer supports `-SkipDoctor`.
- macOS/Linux installers support `RUN_DOCTOR=0`.
- Installed launchers now support:
  - `start` / `serve`
  - `doctor`
  - `setup`
  - `settings`
  - `env`
  - `help`
- Windows `.cmd` launcher delegates to the PowerShell launcher so command
  behavior stays consistent.
- `install/README.md` documents launcher commands.
- `pnpm validate:packaging` checks for post-install doctor and launcher
  command coverage.

## Operator Commands

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" start
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" doctor
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" settings
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" env
```

macOS/Linux:

```bash
~/.local/bin/blue-tanuki start
~/.local/bin/blue-tanuki doctor
~/.local/bin/blue-tanuki settings
~/.local/bin/blue-tanuki env
```

`settings` prints the settings URL and starts the gateway. Browser opening is
left to the operator so the portable scripts remain predictable in terminals,
SSH sessions, and service contexts.

## Doctor Gate

The post-install doctor treats exit code `2` as blocking. Exit code `1` is
allowed with a warning because optional Slack/Discord/live LLM credentials may
be intentionally absent during local setup.

## Boundaries

- No signed `.exe`, `.dmg`, `.pkg`, AppImage, `.deb`, or `.rpm` yet.
- No automatic browser opening.
- No OS service registration from the portable installer.
- No OS keychain integration.
- No new npm dependencies.

## Verification

- Packaging/release scripts TypeScript check: PASS
- Windows installer PowerShell syntax check: PASS
- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS
- macOS/Linux `bash -n`: not run locally; `bash` unavailable in this Windows
  environment

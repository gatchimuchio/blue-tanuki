# BLUE-TANUKI portable installers

These scripts are the Phase 6-S3 installer layer. They do not build signed
native packages yet; they install a portable BLUE-TANUKI app directory, run the
existing setup flow, and create a launcher.

## Requirements

- Node.js `>=22.14.0`
- Corepack or pnpm
- Network access for the first dependency install

## Windows

Run from an extracted release bundle:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1
```

Optional:

```powershell
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Force
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -Force -ResetConfig
powershell -ExecutionPolicy Bypass -File .\install\windows\install.ps1 -SkipDoctor
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1 -Purge
powershell -ExecutionPolicy Bypass -File .\install\windows\uninstall.ps1 -DryRun
```

The installer creates launchers under `%APPDATA%\BlueTanuki\bin`.

```powershell
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" start
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" doctor
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" settings
powershell -ExecutionPolicy Bypass -File "$env:APPDATA\BlueTanuki\bin\blue-tanuki.ps1" env
```

## macOS

```bash
sh ./install/macos/install.sh
```

Optional:

```bash
FORCE=1 sh ./install/macos/install.sh
FORCE=1 RESET_CONFIG=1 sh ./install/macos/install.sh
RUN_DOCTOR=0 sh ./install/macos/install.sh
sh ./install/macos/uninstall.sh
PURGE=1 sh ./install/macos/uninstall.sh
DRY_RUN=1 sh ./install/macos/uninstall.sh
```

The installer creates `~/.local/bin/blue-tanuki`.

```bash
~/.local/bin/blue-tanuki start
~/.local/bin/blue-tanuki doctor
~/.local/bin/blue-tanuki settings
~/.local/bin/blue-tanuki env
```

## Linux

```bash
sh ./install/linux/install.sh
```

Optional:

```bash
FORCE=1 sh ./install/linux/install.sh
FORCE=1 RESET_CONFIG=1 sh ./install/linux/install.sh
RUN_DOCTOR=0 sh ./install/linux/install.sh
sh ./install/linux/uninstall.sh
PURGE=1 sh ./install/linux/uninstall.sh
DRY_RUN=1 sh ./install/linux/uninstall.sh
```

The installer creates `~/.local/bin/blue-tanuki`.

```bash
~/.local/bin/blue-tanuki start
~/.local/bin/blue-tanuki doctor
~/.local/bin/blue-tanuki settings
~/.local/bin/blue-tanuki env
```

## Settings

After launching, open:

```text
http://127.0.0.1:8787/settings
```

Use `BLUE_TANUKI_SETTINGS_TOKEN` from the generated env file. The settings API
edits that env file and requires restart.

## Post-install doctor

Installers run `doctor` after setup by default. Exit code `2` blocks the
install, while exit code `1` is treated as warnings so optional Slack/Discord
or live LLM credentials can remain unset during local setup.

## Reinstall and upgrade

`-Force` on Windows and `FORCE=1` on macOS/Linux replace the app directory but
leave an existing env file intact. The installer preserves WebChat tokens,
resume tokens,
settings tokens, LLM provider settings, audit paths, and session paths stable
across reinstall or portable upgrade.

Use `-ResetConfig` on Windows or `RESET_CONFIG=1` on macOS/Linux only when the
env file should be regenerated intentionally.

When setup or settings overwrites an env file, the previous file is kept as a
timestamped `.bak` file next to the env file.

## Uninstall

Uninstallers remove the installed app and launcher by default while preserving
the env file, audit chain, sessions, and local data. Use `-Purge` on Windows or
`PURGE=1` on macOS/Linux to remove the retained data as well. Use `-DryRun` or
`DRY_RUN=1` to preview the removal.

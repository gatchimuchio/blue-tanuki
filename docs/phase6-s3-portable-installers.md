# Phase 6-S3: portable installers

Phase 6-S3 adds a dependency-free portable install layer for Windows, macOS,
and Linux. This is the step before signed native installers.

Boundary: the release archive is a source bundle, not a standalone binary. It
excludes `node_modules`; operators must install dependencies before running the
gateway.

## Delivered

- Added installer scripts:
  - `install/windows/install.ps1`
  - `install/macos/install.sh`
  - `install/linux/install.sh`
- Added uninstaller scripts:
  - `install/windows/uninstall.ps1`
  - `install/macos/uninstall.sh`
  - `install/linux/uninstall.sh`
- Added `install/README.md`.
- Added `pnpm release:bundle`.
- Added `scripts/create_release_bundle.ts`.
- Added packaging validation for installer scripts and release bundle inputs.
- Added a CI dry run for release bundle creation.
- Phase 6-S4 extends this path with `.sha256`, `.manifest.json`, and
  `pnpm release:verify`.
- Phase 6-S6 extends this path with portable uninstallers.
- Phase 6-S7 makes `-Force` / `FORCE=1` preserve existing env configuration
  unless `-ResetConfig` / `RESET_CONFIG=1` is set.

## Installer Behavior

Each installer:

- checks Node.js `>=22.14.0`
- enables/prepares pnpm through Corepack when available
- copies the app into an OS-appropriate install directory
- runs `pnpm install --frozen-lockfile`
- runs `pnpm build`
- runs `blue-tanuki setup --yes` only when the env file does not exist, or
  when config reset is explicitly requested
- runs a post-install `doctor` gate unless explicitly skipped
- writes a private env file
- creates a multi-command launcher
- points the operator to `http://127.0.0.1:8787/settings`

## Default Paths

Windows:

- app: `%LOCALAPPDATA%\BlueTanuki\app`
- env/data: `%APPDATA%\BlueTanuki`
- launcher: `%APPDATA%\BlueTanuki\bin\blue-tanuki.ps1`

macOS:

- app: `~/Library/Application Support/BlueTanuki/app`
- env/data: `~/Library/Application Support/BlueTanuki`
- launcher: `~/.local/bin/blue-tanuki`

Linux:

- app: `~/.local/share/blue-tanuki/app`
- env: `~/.config/blue-tanuki/blue-tanuki.env`
- data: `~/.local/share/blue-tanuki`
- launcher: `~/.local/bin/blue-tanuki`

## Release Bundle

Dry run:

```bash
pnpm release:bundle -- --dry-run
```

Create a bundle:

```bash
pnpm release:bundle
```

Verify the generated bundle:

```bash
pnpm release:verify
```

On Windows this writes:

```text
release/blue-tanuki-<version>-source-bundle.zip
release/blue-tanuki-<version>-source-bundle.sha256
release/blue-tanuki-<version>-source-bundle.manifest.json
```

On macOS/Linux this writes:

```text
release/blue-tanuki-<version>-source-bundle.tar.gz
release/blue-tanuki-<version>-source-bundle.sha256
release/blue-tanuki-<version>-source-bundle.manifest.json
```

## Boundaries

- No signed `.exe`, `.dmg`, `.pkg`, AppImage, `.deb`, or `.rpm` yet.
- No Tauri/Electron desktop shell yet.
- No OS keychain integration yet.
- No bundled Node runtime yet.
- No new npm dependencies.

## Verification

- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote `release/blue-tanuki-0.0.3-source-bundle.zip`
- Portable zip contains `install/windows/install.ps1`,
  `install/macos/install.sh`, and `install/linux/install.sh`

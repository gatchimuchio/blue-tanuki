# Phase 6-S4: release integrity

Phase 6-S4 adds dependency-free integrity metadata for source-bundle release
archives. This is the last lightweight step before signed native installers.

## Delivered

- `pnpm release:bundle` now writes the archive plus:
  - `release/blue-tanuki-<version>-source-bundle.sha256`
  - `release/blue-tanuki-<version>-source-bundle.manifest.json`
- Added `pnpm release:verify`.
- Added archive verification for:
  - checksum sidecar match
  - manifest checksum/size/path consistency
  - required installer and runtime entries
  - forbidden local build/runtime directories
  - secret-like filenames such as `.env`, `blue-tanuki.env`, and private keys
- Added CI release bundle verification.
- Extended `pnpm validate:packaging` to catch release integrity drift.

## Manifest Shape

The manifest records:

- schema version
- package version
- archive filename, size, and SHA256
- checksum sidecar filename
- included and required bundle paths
- installer script paths
- release boundaries: unsigned source bundle, no secrets included, no
  external dynamic imports included

The manifest is an audit aid. It is not a signature and does not replace code
signing.

The archive is not a standalone runtime. It excludes `node_modules`, local env
files, and runtime state; operators must run dependency installation before
starting the gateway.

## Commands

Dry run:

```bash
pnpm release:bundle -- --dry-run
```

Create bundle and integrity sidecars:

```bash
pnpm release:bundle
```

Verify the generated bundle:

```bash
pnpm release:verify
```

Verify a specific archive:

```bash
pnpm release:verify -- --file release/blue-tanuki-0.0.3-source-bundle.zip
```

## Boundaries

- No signed `.exe`, `.dmg`, `.pkg`, AppImage, `.deb`, or `.rpm` yet.
- No trust root or certificate chain yet.
- No OS keychain integration yet.
- No new npm dependencies.

## Verification

- `validate:packaging`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS

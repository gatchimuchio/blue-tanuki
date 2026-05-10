# Phase 6-S9: release secret exclusion

Phase 6-S9 prevents local env backups and key material from being bundled into
portable release archives.

## Delivered

- `scripts/create_release_bundle.ts` excludes secret-like local files during
  bundle staging:
  - `.env`
  - `.env.local`
  - `blue-tanuki.env`
  - `*.env.bak`
  - `*.env.*.bak`
  - `blue-tanuki.env.*.bak`
  - `.npmrc`
  - private-key/cert-like files such as `*.key`, `*.pem`, `*.p12`, and `*.pfx`
- `scripts/verify_release_bundle.ts` rejects archives containing those files.
- `.gitignore` now ignores env backups and common local key material.
- `pnpm validate:packaging` checks the release exclusion wiring.

## Rationale

Phase 6-S8 added timestamped env backups. Those backups are intentionally
plaintext because the live env file is plaintext. They are useful for local
rollback, but they must not be distributed.

## Boundaries

- Backups remain plaintext on disk.
- No encrypted secret store.
- No OS keychain integration.
- No new npm dependencies.

## Verification

- Release/packaging scripts TypeScript check: PASS
- `validate:packaging`: PASS
- Secret-exclusion smoke with dummy `*.env.bak` and `*.pem`: PASS
- `release:bundle -- --dry-run`: PASS
- `release:bundle`: PASS, wrote archive plus `.sha256` and `.manifest.json`
- `release:verify`: PASS

# Phase 5-S1: Manifest Validation Hardening

Status: implemented.

## Intent

Phase 5 starts carefully: no dynamic plugin loading yet, and no runtime
extension surface is added. This step promotes manifest validation from
package tests into the gateway doctor diagnostic so bad manifests are caught
before a future loader can consume them.

## Implemented

- Gateway doctor now validates bundled `blue-tanuki.plugin.json` files with
  the protocol package's manifest schema.
- The same check also verifies:
  - manifest `name` matches package.json `name`
  - manifest `version` matches package.json `version`
  - manifest `entry` remains `./dist/index.js`
  - manifest `entry` matches package.json `main` when present
- Added doctor tests for:
  - valid explicit manifest root
  - schema-invalid manifest
  - name/version/entry drift

## Not Added

- No dynamic `import()` plugin loader.
- No manifest-driven permission enforcement.
- No public extension surface change.

## Verification

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 284 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm run doctor`: PASS, exit 0 with dummy local env

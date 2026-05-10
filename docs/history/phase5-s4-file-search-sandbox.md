# Phase 5-S4: file.search Sandbox Root

Status: implemented.

## Intent

`file.search` no longer accepts arbitrary filesystem roots. The tool is now
confined to an operator-declared sandbox root and refuses roots that escape that
boundary.

## Implemented

- Requires `BLUE_TANUKI_FILE_ROOT` for `file.search`.
- Resolves relative `root` arguments from `BLUE_TANUKI_FILE_ROOT`.
- Allows absolute `root` arguments only when they stay inside the sandbox.
- Uses `path.relative` containment checks after `path.resolve`.
- Uses `fs.realpath` to re-check the sandbox root and requested root.
- Denies symlink escapes from the sandbox.
- Skips secret-like paths during traversal and denies secret-like requested
  roots.
- Adds tests for:
  - missing `BLUE_TANUKI_FILE_ROOT`
  - sandbox-outside root
  - symlink escape
  - secret-like root denial
  - secret-like file skipping

## Secret-Like Paths

The deny list includes common secret-bearing names such as `.env`, `.env.*`,
`.git`, `.ssh`, `.aws`, `.gcloud`, `.npmrc`, `.netrc`, private key filenames,
and key/certificate-like suffixes such as `.pem`, `.key`, `.p12`, and `.pfx`.

## Not Added

- No new dependency.
- No write access.
- No per-request sandbox mutation.
- No fallback to process cwd when `BLUE_TANUKI_FILE_ROOT` is unset.

## Verification

- `pnpm --filter @blue-tanuki/core typecheck`: PASS
- `pnpm --filter @blue-tanuki/core test`: PASS, 71 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 303 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm run doctor`: PASS, exit 0 with dummy local env
- `pnpm gateway:dev "tool:file.search root=. query=BLUE-TANUKI max_results=1"`: PASS

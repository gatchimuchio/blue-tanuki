# Phase 5-S8: GitHub Actions CI

Phase 5-S8 adds repository CI for the current monorepo without changing runtime
behavior.

## Delivered

- Added `.github/workflows/ci.yml`.
- CI runs on:
  - pushes to `main`
  - pushes to `codex/**`
  - pull requests
  - manual `workflow_dispatch`
- The verify job runs:
  - `pnpm install --frozen-lockfile`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`
  - `pnpm smoke:serve`
  - `pnpm smoke:resume`
  - `pnpm smoke:live`
  - `pnpm validate:packaging`
  - `pnpm run doctor` with separated dummy WebChat tokens
- The Docker job runs after verify and builds `blue-tanuki:ci` without pushing.
- Workflow permissions are read-only except for the default runner execution
  environment.
- Concurrency cancels superseded CI runs on the same ref.

## Not Added

- No package publishing.
- No Docker registry push.
- No deployment automation.
- No external runtime dependencies.

## Verification

- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 311 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS
- `pnpm smoke:live`: PASS, skip path with no live credentials/targets
- `pnpm validate:packaging`: PASS
- `pnpm run doctor`: PASS, exit 0 with CI-equivalent dummy env
- Local workflow execution was not run because this environment does not have a
  GitHub Actions runner.

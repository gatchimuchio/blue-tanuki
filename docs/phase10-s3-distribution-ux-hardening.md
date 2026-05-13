# Phase 10-S3 - Distribution UX Hardening

## Objective

Make install, update, rollback, release verification, and uninstall guidance
harder to drift without claiming that BLUE-TANUKI is a signed native product or
has an automatic updater.

## Implemented Surface

- `doctor` now emits a `distribution_readiness` check.
- The check verifies installer docs, update/rollback docs, permanent-use
  checklist boundaries, release bundle creator/verifier coverage, packaging
  validation, and platform uninstall/purge scripts.
- `install/README.md` documents the distribution readiness gate and keeps the
  portable-installer boundary explicit.
- `docs/UPDATE_ROLLBACK_RUNBOOK.md` treats `distribution_readiness` errors as
  release blockers.
- `docs/PERMANENT_USE_CHECKLIST.md` includes release-time distribution checks.

## Safety Boundary

This phase does not add a new authority path, runtime action, updater, service
installer, or signed package. It only turns existing distribution expectations
into visible operator checks.

## Operator Workflow

Before publishing or replacing a release bundle:

```bash
pnpm run doctor
pnpm validate:packaging
pnpm release:bundle -- --dry-run
```

For release-candidate work, also run the real bundle and verification flow:

```bash
pnpm release:bundle
pnpm release:verify
```

## Failure Handling

If `doctor` reports `distribution_readiness` as `error`, do not publish the
bundle. Fix the listed docs or release scripts, then rerun `pnpm run doctor`
and `pnpm validate:packaging`.

## Non-Claims

- No signed native installer is shipped by this phase.
- No automatic updater is shipped by this phase.
- Portable installers preserve config by default and regenerate it only when
  the operator chooses the reset path.

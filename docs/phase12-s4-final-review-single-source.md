# Phase 12-S4: Final-review Operation Single Source of Truth

## Objective

Make the final-review operation boundary a single HDS-BRAIN-owned source of truth.

## Implemented

- Added `FINAL_REVIEW_OPERATION_LIST` in `packages/hds-brain/src/approval_policy.ts`.
- Kept `FINAL_REVIEW_OPERATIONS` as a derived read-only set.
- Added `finalReviewOperationList()` for callers that need a copy.
- Updated process approval profiles to derive `final_review_operations` from the same source.
- Updated Runtime Invariants evidence to report the same source instead of a duplicated list.
- Exported the list and helper from `packages/hds-brain/src/index.ts`.
- Added standalone tests that compare Approval Gate, process profile, authority trace, and Runtime Invariants evidence.

## Locked Boundaries

- Final-review operations live in `packages/hds-brain`.
- Gateway, UI, Control Center, executor, channels, plugins, and operator surfaces may display or route the result, but they do not own the list.
- `tool.call`, `unknown`, `google.write`, `github.write`, `browser.automation`, schedule mutations, credential access, shell exec, file delete, external send, settings write, and `payment.charge` all remain L3.
- Full access and reusable grants still cannot bypass L3 final-review.
- Downstream metadata cannot add, remove, or reinterpret final-review operations.

## Non-Goals

- Approval UI redesign
- history / replay UI wiring
- detector lifecycle changes
- fail-safe policy redesign
- new privileged operation classes
- gateway-owned policy source

## Validation

Primary S4 coverage:

```bash
pnpm --filter @blue-tanuki/hds-brain test
pnpm --filter @blue-tanuki/hds-brain build
```

Full phase validation is recorded in the final report for the phase commit.

## Next

Next phase is Phase 12-S5: Approval / Notification / History / Replay UI Completion.

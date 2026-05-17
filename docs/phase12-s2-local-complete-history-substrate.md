# Phase 12-S2: Local Complete History Substrate

## Objective

Add a local complete-history substrate that can preserve user history, LLM history, HDS decision history, approval history, execution history, audit history, and final output history as original records.

## Implemented

- Added `packages/hds-brain/src/complete-history/`.
- Exported `CompleteHistoryStore` from `@blue-tanuki/hds-brain`.
- Added standalone append, verify, replay, export, JSON export, JSONL encode, and JSONL decode.
- Added hash-chain verification with payload digests and previous-entry hashes.
- Added JSONL persistence with load-time chain verification.
- Added tests for all required history kinds, non-authority flags, replay filters, export, persistence reload, tamper detection, malformed records, and max-entry behavior.
- Added complete-history boundary docs and conformance/security references.

## Locked Boundaries

- `CompleteHistoryStore` lives in `packages/hds-brain`.
- It has no gateway, executor, UI, channel, plugin, LLM backend, GitHub, or Google dependency.
- Complete history is original-record/replay substrate, not an authority source.
- Every entry has `used_for_authority=false`.
- Replay/export APIs return copies to avoid public mutation of the live chain.
- Gateway remains a future adapter that may connect this store to product runtime history.

## Non-Goals

- Gateway adapter wiring
- Control Center history/replay UI
- SQLite / SQLCipher backend
- encryption or key management
- retention policy UI
- authority use of complete history
- Approval Gate behavior changes
- Runtime Invariants evidence upgrade

## Validation

Primary S2 coverage:

```bash
pnpm --filter @blue-tanuki/hds-brain test
```

Full phase validation is recorded in the final report for the phase commit.

## Next

Next phase is Phase 12-S3: Runtime Invariants Evidence Upgrade.

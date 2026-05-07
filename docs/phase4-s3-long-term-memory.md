# Phase 4-S3 Addendum: HDS-BRAIN Long-Term Memory

Status: implemented.

## Intent

This adds an internal, append-only long-term memory layer to HDS-BRAIN.
It captures only TCP-closed ASSERT decisions and keeps the data available
as deterministic read-only context for later HDS framing work.

The layer is a record store, not an inference engine.

## Implemented

- Added `packages/hds-brain/src/long-term-memory/`.
- Added `MemoryEntry` / `MemoryStoreOptions` internal types.
- Added JSONL encode/decode with stable canonical hash input.
- Added `shouldPersist()` guard:
  - `commit.decision === "ASSERT"`
  - `world_closure.x.length > 0`
  - `world_closure.r.length > 0`
  - `world_closure.m.length > 0`
- Added `LongTermMemoryStore`:
  - in-memory or optional JSONL file-backed mode
  - append-only hash chain
  - `capture()`, `recent()`, `all()`, `size()`, `verify()`
  - soft `max_entries` cap that skips new writes instead of deleting old ones
- Wired optional memory into `HDSUpperController`.
- Added `memory_reader` to `frame()` configuration, but intentionally left
  F behavior unchanged in this step.

## Containment

- `LongTermMemoryStore` is not exported from `packages/hds-brain/src/index.ts`.
- No downstream package imports or accesses the long-term memory store.
- No LLM, embedding, vector search, model weight, sampling, or natural-language
  generation path was added.
- `AuditLog` was not changed.
- Memory never changes `commit.decision`; it only records eligible logs.

## Tests

- Added `packages/hds-brain/test/long_term_memory.test.ts` with 17 tests.
- Added controller integration coverage for optional memory capture and resume.

## Verification

- `pnpm --filter @blue-tanuki/hds-brain typecheck`: PASS
- `pnpm --filter @blue-tanuki/hds-brain test`: PASS, 70 tests
- `pnpm typecheck`: PASS
- `pnpm build`: PASS
- `pnpm test`: PASS, 281 tests
- `pnpm smoke:serve`: PASS
- `pnpm smoke:resume`: PASS

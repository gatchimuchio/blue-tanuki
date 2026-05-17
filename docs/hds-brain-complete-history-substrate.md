# HDS-BRAIN Complete History Substrate

Phase 12-S2 adds a standalone local complete-history substrate inside `packages/hds-brain`.

## Boundary

`CompleteHistoryStore` is owned by HDS-BRAIN and must remain standalone.

It must not depend on:

- gateway
- executor
- LLM backend
- tool implementation
- UI / Control Center
- channel adapter
- plugin loader
- external API client

Gateway, Control Center, audit viewers, and replay UI are later adapters. They may append to, replay from, or display this store, but they do not become authority.

## Recorded History Kinds

`CompleteHistoryKind`:

- `user_input`
- `llm_history`
- `hds_decision`
- `approval_history`
- `execution_history`
- `audit_history`
- `final_output`

Each entry records a stable payload digest, previous-entry hash, entry hash, request id, command id, optional actor/source metadata, and `used_for_authority=false`.

## Baseline Operations

The standalone baseline provides:

- append
- verify
- replay
- export snapshot
- export JSON
- JSONL encode/decode

Replay and export return copies so callers cannot mutate the in-memory record chain through public read APIs.

## Persistence

When a filepath is supplied, entries are appended as JSONL. Loading an existing file verifies the full chain before accepting it. Broken chains fail closed by throwing during construction.

The hash codec uses JSON-compatible canonicalization so persisted records and in-memory verification use the same digest surface.

## Non-authority Rule

Complete history is original-record substrate and replay evidence only.

It must not:

- decide authority
- classify risk
- substitute approval
- bypass final review
- infer owner consent
- rewrite policy or detector state
- override actor or process classification

Any future gateway/history/replay UI must treat complete-history material as reference/evidence with `complete_history_used_for_authority=false`.

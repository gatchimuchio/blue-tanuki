# Phase 9-S1 - F-reference Audit Integration

## Objective

Integrate `F:<id>` references for HDS long-term memory reads and writes without making memory authority.

## Implemented

- Added `F:<id>` helpers for deterministic reference formatting and parsing.
- Added `f_reference` to memory entries written by `LongTermMemoryStore`.
- Added `f_reference` to memory trace hits.
- Added exact lookup support for `F:<id>` in metadata and request content.
- Added `memory_reference` audit events for successful memory writes.
- Added safe memory-reference projection in Control Center `/authority/trace`.
- Added audit dump text rendering for memory read/write references.

## Authority Boundary

F-reference is an audit label only.

It cannot:

- grant permission;
- create owner consent;
- match or widen an Approval Gate grant;
- bypass L3 final-review;
- turn memory into an authority source.

All memory traces and memory-reference audit entries carry:

```json
{
  "used_for_authority": false
}
```

## Read Trace

Memory reads appear in:

```txt
DecisionLog.frame.memory_trace.hits[].f_reference
```

Example:

```json
{
  "memory_id": "request-123",
  "f_reference": "F:request-123",
  "source": "hds_ltm",
  "reason": "exact"
}
```

## Write Trace

Successful memory captures append a separate audit event:

```json
{
  "kind": "memory_reference",
  "event": "memory.write",
  "f_reference": "F:request-123",
  "used_for_authority": false
}
```

## Control Center Display

`/authority/trace` may display `memory_reference` items with safe fields only:

- request id
- `F:<id>`
- memory entry hash
- source
- reason / matched-on
- bounded summary
- `used_for_authority=false`

No memory reference exposes credentials, hidden consent, or privileged action state.

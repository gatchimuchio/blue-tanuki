# Phase 8-S1: Control Center live approval API

Status: implemented

## Scope

Roadmap v6 Phase 2 requires the resident Control Center to expose the live approval queue and authority state without weakening the HDS boundary.

This step adds a WebChat-hosted approval surface:

- `GET /approval`
- `POST /approval/:id`
- Control Center runtime snapshot loading
- Control Center scheduled task snapshot display
- Control Center pending approval loading and approve / reject / block actions
- `GET /audit/dump`
- Control Center Authority Audit loading
- Control Center hash-chain validator display
- `GET /authority/trace`
- Control Center Authority Trace loading

## Safety boundary

The approval API is not a new authority path.

- It accepts only `WEBCHAT_RESUME_TOKEN`.
- It reuses the existing request-bound one-time approval token.
- It routes approval actions through the existing `onResume` callback.
- Gateway execution still flows through HDS-BRAIN, Approval Gate lifecycle events, executor feedback, and hash-chain audit.
- Channel metadata does not escalate authority.
- Scheduled task snapshots are read-only and omit scheduled message content.
- `/audit/dump` is read-only, accepts no filesystem path, and reports the live HDS audit chain.
- `/authority/trace` is read-only and only projects Approval Gate, authority event, and command lifecycle audit entries.

## Notes

`/runtime/snapshot` continues to use `WEBCHAT_TOKEN` and remains read-only.
`/approval` uses `WEBCHAT_RESUME_TOKEN` because it can drive human approval decisions.
`/audit/dump` uses `WEBCHAT_TOKEN` and returns the same report shape as the CLI audit dump.
Control Center verifies the live hash-chain by reading `/audit/dump` JSON and displaying `chain_valid` plus `entry_count`.
`/authority/trace` uses `WEBCHAT_TOKEN` and exposes a compact, read-only authority timeline for Control Center.

# Phase 8-S1: Control Center live approval API

Status: implemented

## Scope

Roadmap v6 Phase 2 requires the resident Control Center to expose the live approval queue and authority state without weakening the HDS boundary.

This step adds a WebChat-hosted approval surface:

- `GET /approval`
- `POST /approval/:id`
- Control Center runtime snapshot loading
- Control Center pending approval loading and approve / reject / block actions

## Safety boundary

The approval API is not a new authority path.

- It accepts only `WEBCHAT_RESUME_TOKEN`.
- It reuses the existing request-bound one-time approval token.
- It routes approval actions through the existing `onResume` callback.
- Gateway execution still flows through HDS-BRAIN, Approval Gate lifecycle events, executor feedback, and hash-chain audit.
- Channel metadata does not escalate authority.

## Notes

`/runtime/snapshot` continues to use `WEBCHAT_TOKEN` and remains read-only.
`/approval` uses `WEBCHAT_RESUME_TOKEN` because it can drive human approval decisions.

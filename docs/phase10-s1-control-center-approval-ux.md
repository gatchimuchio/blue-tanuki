# Phase 10-S1 - Control Center Approval UX Polish

## Objective

Make the existing WebChat Control Center usable as a resident console for approval, schedule, audit, and authority-state review without changing the HDS authority path.

## Implemented Surface

- Permanent-use status card for gateway, HDS invariant, audit chain, WebChat, approval, schedule, Telegram, and runtime state.
- First-run next-action card sourced from `/runtime/snapshot`.
- Approval Queue summary with pending count, final-review count, ApprovalLevel coverage, one-time token expiry, reason, and request/command identifiers.
- Approval action buttons remain limited to approve, reject, and block through the existing resume-token and one-time approval-token path.
- Runtime Schedule list with active/pending counts, status, channel, target, timing, pending operation, pending command, approval expiry, and payload hash.
- Authority Trace summary cards with event, request, command, operation, risk, ApprovalLevel, schedule id, and payload hash.
- Audit summary cards with chain validity, entry count, recent event/hash metadata, and a compact verification summary.

## Safety Boundary

The Control Center remains a display and explicit-verdict surface. It does not:

- create a second authority path,
- bypass final-review,
- add remembered grants,
- execute schedules,
- modify audit records,
- grant tool or channel capabilities.

## Redaction Boundary

The resident JSON panes run a conservative key-based redaction before display. Keys containing token, secret, authorization, cookie, content, credential, or password are rendered as `[redacted]`.

Runtime schedule rows deliberately render payload hashes and lifecycle metadata, not schedule content.

## Validation

- WebChat Control Center shell test covers the resident status, first-run next action, ApprovalLevel, final-review, runtime schedule list, authority trace list, and redaction helper presence.
- Existing runtime snapshot, approval, audit dump, and authority trace API tests remain the authority for endpoint behavior.

## Next Phase

Phase 10-S2 adds resident notification behavior. Notifications must stay display-only and must not approve, reject, execute, or alter HDS authority.

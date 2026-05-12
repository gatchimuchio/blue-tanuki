# Phase 10-S2 - Resident Notification Center

## Objective

Add resident notification visibility without creating a second authority path.

## Implemented Surface

- `GET /notifications` on WebChat, authenticated with `WEBCHAT_TOKEN`.
- Control Center Notification Center panel.
- Display-only notifications for:
  - approval required,
  - schedule fired,
  - schedule failed or rejected,
  - connector delivery failure,
  - audit chain warning.
- Authority Trace now projects executor feedback summaries so downstream failures can be visible in the resident console.

## Safety Boundary

Notifications are status projection only.

They cannot:

- approve, reject, or block a command,
- execute a command,
- activate, update, or delete a schedule,
- write audit records,
- grant reusable authority,
- change ApprovalRisk or ApprovalLevel,
- treat downstream metadata as authority.

Each notification carries:

```json
{
  "read_only": true,
  "authority": "display_only"
}
```

## Data Boundary

The notification API does not emit one-time approval tokens, schedule content, credentials, or raw connector payloads.

Schedule notifications expose lifecycle metadata and payload hashes only. Connector failure notifications expose typed error text and next action, not secrets.

## Notification Sources

- Approval notifications come from the live pending approval queue.
- Schedule notifications come from schedule lifecycle audit entries and cron executor feedback.
- Connector failure notifications come from failed executor feedback that matches channel/delivery error patterns.
- Audit warnings come from live audit hash-chain verification.

## Validation

- WebChat tests cover `/notifications` auth, method safety, display-only metadata, and token non-exposure.
- Gateway notification builder tests cover approval, schedule, connector, and audit warning projections.
- Existing Control Center shell test covers the Notification Center panel.

## Next Phase

Phase 10-S3 hardens distribution UX. It must improve install/update/uninstall paths without claiming signed native packaging unless that is actually implemented.

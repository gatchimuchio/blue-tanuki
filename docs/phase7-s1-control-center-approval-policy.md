# Phase 7-S1: Resident Control Center and Approval Policy

## Objective

Move BLUE-TANUKI from a plain chat endpoint toward a resident local application model:

- Control Center
- Console / audit view
- Notifications / review queue
- Chat surface
- Explicit approval policy management

This is not a cosmetic UI change. It is the product surface for HDS authority separation.

## Core Rule

Approval is not a boolean. Approval is a bounded policy:

```json
{
  "mode": "remember_this_decision",
  "operation": "tool.file.write",
  "target_scope": "repo",
  "target": "gatchimuchio/blue-tanuki-core",
  "path_pattern": "docs/**/*.md",
  "risk": "medium",
  "actor": "local-user",
  "decision": "allow",
  "expires_at": 1777636800000,
  "revocable": true
}
```

A valid remembered approval must bind at least:

1. operation
2. target scope
3. risk ceiling
4. actor / execution subject
5. duration
6. revocability

## Approval Modes

### Level 1 — Full Access

Default for ordinary local operator work. BLUE-TANUKI is a resident local control application, so the normal stance is not chat-bot permission nagging; it is operator-owned execution with audit closure.

Final review is still retained for irreversible or external-impact operations.

### Level 2 — Remember This Decision

Do not ask again only when the same bounded policy matches:

- same operation
- same target scope
- same or lower risk
- same actor, unless the grant explicitly uses actor `*`
- inside expiry window
- matching capability envelope

This is the usable middle mode.

### Level 3 — Ask Every Time

Strict mode for unfamiliar environments, demos, audits, or shared machines.

Even outside strict mode, full access still does **not** remove final review for:

- delete
- shell exec
- external send
- credential access
- settings write
- payment / billing
- schedule creation

This preserves the HDS principle that convenience cannot erase responsibility boundaries.

## UI Shape

The local app should be a resident console rather than a pure chat page:

```text
┌────────────────────────────────────────────┐
│ BLUE-TANUKI Control Center                 │
├───────────────┬────────────────┬───────────┤
│ System        │ Chat / Console  │ Approval  │
│ - status      │ - messages      │ - policy  │
│ - health      │ - command log   │ - scope   │
│ - stop button │ - audit hash    │ - risk    │
└───────────────┴────────────────┴───────────┘
```

Initial implementation serves this shell at:

- `/`
- `/app`

The page is intentionally static and dependency-free. Electron/Tauri/Windows tray wrapping can come later without changing the authority model.

## HDS Boundary

HDS-BRAIN remains upstream.

- HDS decides whether a request is allowed in principle.
- Approval policy decides whether a permitted command still needs human authorization.
- Executor never grants itself permission.
- Feedback from executor is audit evidence, not authority.

The correct chain is:

```text
Inbound request
  → HDS F→M→C decision
  → command construction
  → approval policy gate
  → executor
  → feedback audit
```

## Status

Implemented in Phase 7-S1:

- Approval policy types and matcher in `@blue-tanuki/hds-brain`.
- Final-review exception list.
- Static resident Control Center shell in `@blue-tanuki/channel-webchat`.
- `/` and `/app` route for the shell.
- Unit tests for default full-access behavior, explicit strict mode, approval matching, and final-review behavior.

Not yet implemented:

- Persistent approval store.
- Live review queue in the UI.
- `/approval/*` API endpoints.
- Windows tray / Electron / Tauri packaging.

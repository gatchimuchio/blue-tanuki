# Phase 7-S2: Approval Gate Execution Bridge

## Purpose

Phase 7-S2 connects the approval-policy model to the live execution path.

The design invariant is:

```text
Inbound request
  -> HDS-BRAIN decision
  -> ASSERT command
  -> approval gate
  -> executor
  -> executor feedback
  -> HDS audit chain
```

An `ASSERT` decision is no longer sufficient to execute a downstream command by itself. The command must also pass the approval gate. In the default resident-app stance, the approval gate grants ordinary local commands under full access and interrupts only final-review operations.

## Responsibility boundary

- HDS-BRAIN remains the upstream decision owner.
- The approval gate is the human-authority boundary between HDS-BRAIN and the executor.
- The executor only runs commands that have reached `approval_approved`.
- Executor feedback is recorded back into the HDS audit chain.

This keeps LLM/tool execution downstream and prevents command execution from becoming an unlogged side effect. The safety model is HDS-native: broad local operator authority is allowed, but HDS framing, approval evaluation, final-review boundaries, and feedback audit remain structurally mandatory. Legal/release disclaimers are kept as a boundary statement, not as a substitute for control design.

## Approval modes

### full_access

Default mode. Ordinary local commands execute after HDS `ASSERT` and approval-gate evaluation. Final-review operations still suspend before executor execution.

### remember_this_decision

A reusable grant can be created from an approved command. The grant is scoped by:

- operation
- target scope
- target/path/channel where available
- risk
- actor
- capabilities
- expiry

### ask_every_time

Explicit strict mode. Commands without a matching grant are suspended before executor execution. Use this for unfamiliar environments, demos, audits, or shared machines.

Final-review operations:

- file delete
- shell exec
- external send
- credential access
- settings write
- schedule create
- payment/billing

## Runtime environment

```bash
BLUE_TANUKI_APPROVAL_MODE=full_access
BLUE_TANUKI_APPROVALS_FILE=.blue-tanuki/approval-grants.json
```

`BLUE_TANUKI_APPROVAL_MODE` accepts:

- `full_access` (default)
- `remember_this_decision`
- `ask_every_time`

When `BLUE_TANUKI_APPROVALS_FILE` is omitted, grants are in-memory only.

## WebChat resume flow

When approval is required, WebChat receives an `approval-required` message containing:

- `command_id`
- operation
- scope
- risk
- reason
- one-time `approval_token`

Approval is submitted via `POST /resume` using:

```json
{
  "request_id": "<command_id>",
  "verdict": "approve",
  "approval_token": "<one-time-token>",
  "remember": true,
  "duration_ms": 2592000000,
  "approval_mode": "remember_this_decision"
}
```

For full access:

```json
{
  "request_id": "<command_id>",
  "verdict": "approve",
  "approval_token": "<one-time-token>",
  "approval_mode": "full_access"
}
```

`reject` and `block` do not execute the pending command.

## Audit additions

Phase 7-S2 adds two audit record families:

- `approval_gate`
- `command_lifecycle`

Lifecycle phases:

- `approval_pending`
- `approval_approved`
- `approval_rejected`
- `approval_cancelled`

These records are appended to the same hash-chain audit log as HDS decisions and executor feedback.

## Non-goals

This phase does not implement:

- Electron/Tauri tray packaging
- visual policy editor
- team/multi-tenant approval administration
- cryptographic signing of approval grants
- remote attestation

Those belong to later productization phases.

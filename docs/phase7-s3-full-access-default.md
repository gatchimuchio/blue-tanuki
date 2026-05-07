# Phase 7-S3: Full-Access Default Resident Mode

## Purpose

BLUE-TANUKI is a resident local control application, not a remote chat toy. Its normal operating assumption is therefore:

```text
trusted local operator
  -> HDS upstream decision
  -> approval gate with full-access default
  -> executor
  -> feedback audit
```

The product should feel like a local console with authority, not like a bot that asks for permission on every ordinary local operation.

## Default

`BLUE_TANUKI_APPROVAL_MODE` now defaults to `full_access` when unset.

This means ordinary non-final-review commands may execute after HDS `ASSERT` and approval-gate evaluation without repeated human prompts.

## HDS safety stance

Full access is not a blind trust switch. In BLUE-TANUKI, safety is designed as an HDS-side self-norm:

- upstream HDS evaluates before execution
- ordinary local authority belongs to the trusted operator
- irreversible or externally-impacting actions remain final-review operations
- all approval decisions and executor feedback are written back to the audit chain
- disclaimers define release and responsibility boundaries; they are not the primary safety mechanism

This is the intended distinction from a permission-first chatbot: the product assumes an owner-operated resident console, while HDS supplies the normative control layer and audit closure.

## Non-negotiable final-review boundary

Full access does not erase responsibility boundaries. The following operations still require explicit final review:

- file delete
- shell execution
- external send / post / message
- credential or secret access
- settings mutation
- payment / billing
- schedule creation

This preserves the HDS rule: operator authority can be broad, but irreversible or externally-impacting actions must remain auditable and intentionally authorized.

## Strict mode

Set:

```bash
BLUE_TANUKI_APPROVAL_MODE=ask_every_time
```

when running in an unfamiliar environment, a public demo, a shared machine, or an audit exercise where every operation should become visible.

## Product stance

The UI should present full access as the normal local-resident stance and strict approval as a deliberate containment mode.

This is the intended Codex-like authority model for BLUE-TANUKI:

1. Full access by default for the owner/operator.
2. Remember bounded grants when useful.
3. Ask every time only when explicitly operating in strict mode or when a final-review operation is reached.

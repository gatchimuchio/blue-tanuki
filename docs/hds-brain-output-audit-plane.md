# HDS-BRAIN Output / Result Audit Plane

Phase 12-S1 adds a deterministic audit plane for downstream results before they are released to a user-visible or external handoff surface.

## Boundary

OutputAudit is owned by `packages/hds-brain`.

It is standalone and must not depend on:

- gateway
- executor
- LLM backend
- tool implementation
- UI
- channel adapter
- plugin loader
- external API client

Gateway and other product surfaces are adapters. They render or dispatch output only after creating an HDS-BRAIN `output_audit` record.

## Audited Result Kinds

`OutputAuditKind`:

- `llm_raw_output`
- `tool_result`
- `external_action_result`
- `scheduler_result`
- `plugin_result`
- `noop_result`

The audit record stores digests and bounded metadata, not raw output content.

## Release Rule

Before final user-visible output or external result handoff:

```text
downstream result
  -> gateway adapter renders candidate output
  -> HDS-BRAIN output_audit record
  -> user-visible output / dispatch / operator log
```

OutputAudit does not turn output into authority. It records:

- command id and upstream commit hash
- command type and output kind
- feedback status
- result digest
- rendered output digest
- target surface
- whether output is user-visible
- whether the result belongs to an external side effect
- `used_for_authority=false`

## Non-authority Rule

LLM output, tool result, scheduler result, plugin result, external result, and rendered output are audit evidence only. They do not classify risk, approve themselves, bypass final review, or create a second authority path.

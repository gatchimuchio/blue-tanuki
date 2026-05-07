# BLUE-TANUKI v0.1 Audit

## Audit files

Set:

```bash
export BLUE_TANUKI_AUDIT_DIR=.blue-tanuki/audit
export BLUE_TANUKI_MEMORY_DIR=.blue-tanuki/memory
export BLUE_TANUKI_APPROVALS_FILE=.blue-tanuki/approvals/grants.json
```

## Runtime snapshot

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

Expected invariant fields:

```json
{
  "hds_calls_llm": false,
  "process_policy_enforced": true,
  "external_metadata_can_escalate_authority": false,
  "memory_used_for_authority": false,
  "final_review_boundary_enforced_by_approval_gate": true
}
```

## Audit dump

```bash
pnpm --filter @blue-tanuki/gateway run doctor
node apps/gateway/dist/main.js --audit-dump --json
```

## What is recorded

- HDS decision logs
- approval evaluations
- authority events
- command lifecycle
- executor feedback
- unknown/stale feedback

## What is not treated as authority

- LLM output
- session history
- semantic memory summary
- downstream executor feedback

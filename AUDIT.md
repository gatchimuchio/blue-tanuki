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

## Chain Integrity Verification

`--audit-verify` is a read-only integrity check for the persisted JSONL
hash-chain. It does not feed results back into HDS-BRAIN or the authority path.

```bash
export BLUE_TANUKI_AUDIT_DIR=.blue-tanuki/audit
node apps/gateway/dist/main.js --audit-verify
node apps/gateway/dist/main.js --audit-verify --json
```

Valid chains exit with code `0`:

```text
blue-tanuki audit-verify - OK (2026-05-11T00:00:00.000Z)
  filepath:    .blue-tanuki/audit/audit.jsonl
  entries:     3
  chain_valid: true
  detail:      verified 3 entries; chain integrity OK

Exit code: 0
```

Tampering, order changes, or broken hashes exit with code `1` and report the
first failing entry index:

```text
blue-tanuki audit-verify - BROKEN (2026-05-11T00:00:00.000Z)
  filepath:    .blue-tanuki/audit/audit.jsonl
  entries:     1
  chain_valid: false
  detail:      chain verification failed at entry index 1: entry_hash does not match SHA-256(index|prev_hash|JSON.stringify(log))
  failure:     index=1 reason=entry_hash_mismatch

Exit code: 1
```

## What is recorded

- HDS decision logs
- approval evaluations
- authority events
- schedule lifecycle events
- command lifecycle
- executor feedback
- unknown/stale feedback

## Schedule lifecycle audit

Runtime schedule create/update/delete requests are audited as lifecycle events in the hash-chain:

```text
schedule.lifecycle.requested
schedule.lifecycle.approved
schedule.lifecycle.rejected
schedule.lifecycle.activated
schedule.lifecycle.updated
schedule.lifecycle.deleted
schedule.lifecycle.fired
```

Schedule audit records include safe metadata such as `schedule_id`, `origin`, `operation`, `actor`, `approval_level`, `risk`, `payload_hash`, `previous_payload_hash`, `command_id`, and `request_id`. Schedule `content` is not exposed in runtime snapshots or schedule list output.

## GitHub write audit

`github.write` is audited through the normal Approval Gate and executor feedback chain:

- HDS decision log records the inbound request and ASSERT.
- `approval_gate` / `authority_event` records `operation=github.write`, `approval_level=L3_final_review`, risk, actor, and authority trace.
- `command_lifecycle` records pending/approved/rejected transitions.
- `executor_feedback` records status, error if any, metrics, and a digest of the bounded result object.

The tool result includes `result_digest`, GitHub request metadata, and safe issue/PR/comment ids or URLs. `GITHUB_TOKEN` is never written to audit output or tool result output.

## Channel delivery audit compatibility

Slack / Discord delivery failures are returned to executor feedback as typed downstream results:

- `error_kind`: `recoverable` or `non_recoverable`
- `error_code`: bounded machine-readable error code
- `retry_after_ms`: present when a rate-limit/backoff hint is known
- `next_action`: owner-facing remediation text

These fields are audit evidence only. They never feed back into HDS-BRAIN as authority and never let channel metadata escalate permissions.

## F-reference memory audit

HDS long-term memory references are rendered as `F:<id>`.

- Memory writes record a `memory_reference` audit event with `event=memory.write`.
- Memory reads appear in `DecisionLog.frame.memory_trace.hits[]` with `f_reference`.
- Control Center `/authority/trace` may display safe `memory_reference` items.
- `used_for_authority` is always `false`.
- F-references are trace labels only. They do not grant permission, owner consent, or privileged-action approval.

## What is not treated as authority

- LLM output
- session history
- semantic memory summary
- F-reference / HDS long-term memory hit
- downstream executor feedback

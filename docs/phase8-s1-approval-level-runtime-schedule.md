# Phase 8-S1 - ApprovalLevel first-class + runtime schedule CRUD

## Objective

`ApprovalRisk` を severity 軸、`ApprovalLevel` を workflow 軸として分離し、runtime schedule CRUD を Approval Gate 配下に置く。

## Implemented

- `ApprovalRisk` を `low | medium | high` の3段階に戻した。
- `ApprovalLevel` を追加した。
  - `L1_observe`
  - `L2_operate`
  - `L3_final_review`
- `ApprovalEvaluation.approval_level` と `AuthorityTransparencyTrace.resolved_factors.approval_level` を追加した。
- final-review set に `schedule.create` / `schedule.update` / `schedule.delete` を追加した。
- `payment.charge` は defensive placeholder として L3 に残した。
- `tool:schedule.list` / `tool:schedule.create` / `tool:schedule.update` / `tool:schedule.delete` を HDS tool routing に追加した。
- runtime schedule store を `BLUE_TANUKI_SCHEDULES_DIR` 配下に追加した。
- boot-time schedules と approved runtime schedules が同じ `CronSchedulerChannel` lane を共有するようにした。
- runtime snapshot に safe schedule metadata と counts を追加した。
- schedule lifecycle audit を追加した。

## Approval behavior

| Operation | Risk | Level | Behavior |
|---|---|---|---|
| `schedule.list` | low | L1 | Full-access default では allow。content は出さない。 |
| `schedule.create` | high | L3 | 常に Approval Gate で owner approval 待ち。 |
| `schedule.update` | high | L3 | approval まで旧 schedule を維持。 |
| `schedule.delete` | high | L3 | approval まで旧 schedule を維持。 |

Full access and reusable grants cannot bypass L3.

## Runtime schedule lifecycle

Lifecycle events recorded in the hash-chain audit:

- `schedule.lifecycle.requested`
- `schedule.lifecycle.approved`
- `schedule.lifecycle.rejected`
- `schedule.lifecycle.activated`
- `schedule.lifecycle.updated`
- `schedule.lifecycle.deleted`
- `schedule.lifecycle.fired`

Lifecycle records include safe metadata:

- `schedule_id`
- `origin`
- `operation`
- `actor`
- `approval_level`
- `risk`
- `payload_hash`
- `previous_payload_hash`
- `command_id`
- `request_id`

Schedule `content` is not exposed through runtime snapshots or schedule list output.

## Commands

```text
tool:schedule.list
tool:schedule.create channel=webchat target=local-user content="runtime smoke" interval_ms=120000
tool:schedule.create {"channel":"webchat","target":"local-user","content":"runtime smoke","interval_ms":120000}
tool:schedule.update id=<id> content="updated smoke"
tool:schedule.delete id=<id>
```

## Environment

```bash
BLUE_TANUKI_SCHEDULES_DIR=.blue-tanuki/schedules
BLUE_TANUKI_SCHEDULE_APPROVAL_TIMEOUT_MS=86400000
```

## Safety notes

- Pending schedules do not run.
- Rejected schedules do not run.
- Timed-out schedules do not run.
- Runtime automation actors are not humans.
- Schedule lifecycle audit is evidence only, not an authority source.
- Schedule payload hashes may be shown for auditability; schedule content must not be shown in snapshots.

## Tests

Covered by:

- `packages/hds-brain/test/approval_policy.test.ts`
- `packages/hds-brain/test/controller.test.ts`
- `apps/gateway/test/runtime_schedule.test.ts`
- `apps/gateway/test/cron_channel.test.ts`
- `packages/hds-brain/test/runtime_invariants.test.ts`


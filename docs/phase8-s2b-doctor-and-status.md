# Phase 8-S2b: Doctor Actionable Output + Control Center First-Run Status

## Objective

`doctor` の warning/error を owner-actionable にし、`/runtime/snapshot` から初回運用と常駐運用に必要な safe status を読めるようにした。

## Scope

- doctor check JSON に remediation fields を追加
- doctor text output に warning/error の remediation fields を表示
- runtime snapshot に first-run status fields を追加
- runtime status helper と tests を追加
- docs を更新

## Added Doctor Fields

各 check は以下を持つ:

- `status`
- `cause`
- `impact`
- `next_action`
- `doc_ref`
- `safe_to_ignore`

`level` は既存互換のため維持する。

## Added Runtime Snapshot Fields

- `gateway_status`
- `hds_invariants_ok`
- `webchat_ready`
- `telegram_configured`
- `pending_approvals_count`
- `runtime_schedules_count`
- `pending_schedule_approvals_count`
- `audit_chain_valid`
- `next_recommended_action`

## Safety Boundary

- HDS-BRAIN / authority path / Approval Gate は変更なし
- snapshot は credential 値を出さない
- snapshot は schedule content を出さない
- `next_recommended_action` は表示用 hint であり authority signal ではない

## Tests

- doctor remediation field coverage
- doctor text/json formatter coverage
- doctor secret-leak regression
- runtime status helper coverage
- WebChat `/runtime/snapshot` auth and field regression

## Next

Phase 8-S3: OpenClaw Rejection Audit document.

# Phase 12-S-1: HDS-BRAIN Standalone Completeness Lock

## Objective

HDS-BRAIN が BLUE-TANUKI 本体から切り出しても単体で動作することを、コード、テスト、docs、smoke 導線で固定した。

## Scope Implemented

- `packages/hds-brain` に standalone harness を追加
- downstream port 型を追加
- standalone health baseline を追加
- public exports を更新
- HDS-BRAIN standalone 境界テストを追加
- root `pnpm hds:standalone` smoke を追加
- standalone boundary doc を追加
- Phase 12-S-1 の roadmap / conformance / security / audit / config / changelog 整合を更新

## Non-Goals Preserved

- 新しい高度な output audit は未実装
- `CompleteHistoryStore` は未実装
- UI 改修なし
- SQLite / SQLCipher なし
- external API integration なし
- LLM backend 実装なし
- plugin 実行なし

## Standalone Completeness

- `packages/hds-brain` は gateway / core / channel / operator に依存しない
- `HDSUpperController` は gateway なしで instantiate 可能
- sample `InboundRequest` を standalone decide 可能
- LLM 通常入力は LLM を呼ばずに `llm_call` command envelope を返す
- explicit tool 入力は tool を実行せずに `tool_call` command envelope を返す
- `AuditLog` は standalone append/verify 可能
- `evaluateApproval` は standalone 実行可能
- `getRuntimeSnapshot()` と `evaluateHDSBrainHealth()` は standalone 実行可能

## Downstream Limbs Impact

Downstream devices are limbs, not authority を docs と tests に反映した。LLM / tool / plugin / channel / executor / scheduler / UI / memory / history / session は、観測・生成・実行・保存・表示・報告を行う downstream device であり、authority decision / approval substitution / privilege escalation / final-review bypass を行わない。

## Validation Coverage

追加テスト:

- `packages/hds-brain/test/standalone_boundary.test.ts`

追加 smoke:

- `pnpm hds:standalone`

対象 acceptance:

- dependency boundary
- public exports import
- standalone controller decide
- standalone approval evaluate
- standalone audit verify
- standalone runtime snapshot
- standalone health baseline
- LLM/tool command envelope emission without execution

## Next

次フェーズは Phase 12-S0 Boundary Definition Lock。L1/L2/L3、history / memory / session / tool result の authority 変換禁止、unknown escalation、fail-safe 方針、Trinity M policy model を文書・テストで固定する。

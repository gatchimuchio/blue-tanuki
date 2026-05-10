# CONFORMANCE

## Active Test Coverage

現行リポジトリで main release gate として扱う conformance 系テスト:

- `apps/gateway/test/adapter_conformance.test.ts`
  - Slack / Discord / Telegram の inbound normalization
  - canonical `InboundRequest` / `ChannelSendPayload` の利用
  - channel metadata が authority metadata を持ち込まないこと
  - credential / transport 不在時に silent/fail-closed になること
- `apps/gateway/test/compatibility_matrix.test.ts`
  - `docs/compatibility-matrix.json` と first-party / preview channel manifest の整合
  - WhatsApp が `reserved-third-party` のまま維持されること
  - first-party channel manifest が wildcard permission を持たないこと
- `apps/gateway/test/doctor.test.ts`
  - doctor が manifest / compatibility matrix の release gate を表示すること

本書は adapter / plugin / skill を main release に入れる前の conformance 条件を定義する。

## 1. Required Test Groups

- Adapter conformance tests
- Permission enforcement tests
- Audit trace compatibility tests
- Runtime invariant preservation tests
- Preview quarantine rule
- Main release gate rule

## 2. Adapter Conformance Tests

adapter は以下を test で示す。

- inbound event が canonical inbound message type に正規化される
- outbound operation が canonical outbound request type を経由する
- recoverable / non-recoverable error が typed result に写像される
- channel metadata が authority escalation に使われない

## 3. Permission Enforcement Tests

- manifest に宣言した capability だけを使う
- 未宣言 network / fs / process / credential / memory / notification access は拒否される
- capability 不足時は fail closed する

## 4. Audit Trace Compatibility Tests

- request_id と operation trace が残る
- Approval Gate の decision と downstream action が追跡可能
- F-reference がある場合は `F:<id>` として trace に残る
- hash-chain validator が pass する

## 5. Runtime Invariant Preservation Tests

- HDS-BRAIN does not call LLM
- memory is not authority
- channel metadata cannot escalate authority
- privileged operation cannot bypass Approval Gate
- Runtime Invariants remain externally inspectable

## 6. Preview Quarantine Rule

未完成、experimental、third-party-like、または support level が曖昧な実装は preview quarantine に置く。preview は README / docs / compatibility matrix に status を明記する。

## 7. Main Release Gate Rule

main release へ昇格するには、conformance tests、permission enforcement tests、audit trace compatibility tests、runtime invariant preservation tests が pass し、support level と運用責任が docs に残っていること。

# CONFORMANCE

この文書は adapter / plugin / skill / runtime automation を main release に入れる前の conformance 条件を定義する。

## Active Test Coverage

現在の main release gate として扱うテスト群:

- `apps/gateway/test/adapter_conformance.test.ts`
  - Slack / Discord / Telegram の inbound normalization
  - canonical `InboundRequest` / `ChannelSendPayload` の利用
  - channel metadata が authority metadata を持ち込まないこと
  - credential / transport 不在時に silent failure しないこと
- `packages/channel-slack/test/slack.test.ts` / `packages/channel-discord/test/discord.test.ts`
  - adapter-level retry/backoff
  - typed recoverable / non-recoverable delivery errors
  - credential missing, rate limit, and permission failure handling
- `apps/gateway/test/compatibility_matrix.test.ts`
  - `docs/compatibility-matrix.json` と first-party / preview channel manifest の整合
  - WhatsApp が `reserved-third-party` のまま維持されること
  - first-party channel manifest が wildcard permission を持たないこと
- `apps/gateway/test/runtime_schedule.test.ts`
  - runtime schedule create/update/delete が pending approval を経由すること
  - pending / rejected / timed-out schedule が発火しないこと
  - schedule snapshot が content を露出しないこと
  - approved runtime schedule が既存 cron lane を通ること
- `packages/hds-brain/test/approval_policy.test.ts`
  - `ApprovalRisk` は `low | medium | high` の3段階であること
  - `ApprovalLevel` が L1/L2/L3 として authority trace に残ること
  - full access / reusable grant が L3 final-review を bypass しないこと
- `apps/gateway/test/doctor.test.ts`
  - doctor が manifest / compatibility matrix / schedule config の release gate を表示すること

## Required Test Groups

- Adapter conformance tests
- Permission enforcement tests
- Audit trace compatibility tests
- Runtime invariant preservation tests
- Runtime automation containment tests
- Preview quarantine rule
- Main release gate rule

## Adapter Conformance Tests

adapter は以下を test で示す。

- inbound event が canonical inbound message type に正規化される
- outbound operation が canonical outbound request type を経由する
- recoverable / non-recoverable error が typed result に分類される
- channel metadata が authority escalation に使われない

## Permission Enforcement Tests

- manifest に宣言した capability だけを使う
- undeclared network / fs / process / credential / memory / notification access は拒否される
- capability 不足時は fail closed する

## Runtime Automation Tests

runtime automation は未来の action を作るため、通常の tool より強い conformance を要求する。

- create/update/delete は L3 final-review
- list は L1 observe
- pending automation は実行されない
- rejected / timed-out automation は実行されない
- old active schedule は update/delete approval まで維持される
- snapshot は content を露出せず、safe metadata と payload hash のみを出す
- lifecycle は hash-chain audit に残る

## Audit Trace Compatibility Tests

- request_id と operation trace が残る
- Approval Gate の decision と downstream action が追跡可能
- `approval_level` が authority trace に残る
- schedule lifecycle が audit に残る
- F-reference がある場合は `F:<id>` として trace に残る
- hash-chain validator が pass する

## Runtime Invariant Preservation Tests

- HDS-BRAIN does not call LLM
- memory is not authority
- channel metadata cannot escalate authority
- privileged operation cannot bypass Approval Gate
- Runtime Invariants remain externally inspectable

## Preview Quarantine Rule

未完成、experimental、third-party-like、または support level が曖昧な実装は preview quarantine に置く。preview は README / docs / compatibility matrix に status を明記する。

## Main Release Gate Rule

main release へ昇格するには、conformance tests、permission enforcement tests、audit trace compatibility tests、runtime invariant preservation tests が pass し、support level と運用責任が docs に残っていること。

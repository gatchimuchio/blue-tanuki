# CONFORMANCE

この文書は adapter / plugin / skill / runtime automation を main release に入れる前の conformance 条件を定義する。

## Active Test Coverage

現在の main release gate として扱うテスト群:

- `apps/gateway/test/adapter_conformance.test.ts`
  - Teams / LINE inbound normalization and canonical outbound dispatch
  - Slack / Discord / Telegram の inbound normalization
  - canonical `InboundRequest` / `ChannelSendPayload` の利用
  - channel metadata が authority metadata を持ち込まないこと
  - credential / transport 不在時に silent failure しないこと
- `packages/channel-slack/test/slack.test.ts` / `packages/channel-discord/test/discord.test.ts`
  - adapter-level retry/backoff
  - typed recoverable / non-recoverable delivery errors
  - credential missing, rate limit, and permission failure handling
- `packages/channel-teams/test/teams.test.ts` / `packages/channel-line/test/line.test.ts`
  - preview adapter silent fail-closed mode
  - Graph / Messaging API request shape
  - adapter-level retry/backoff and typed delivery errors
  - credential value non-leakage in history
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
- `packages/hds-brain/test/standalone_boundary.test.ts`
  - HDS-BRAIN package が gateway / core / channel / operator / plugin loader / downstream client に依存しないこと
  - public exports を単体 import できること
  - `HDSUpperController` が gateway なしで instantiate / decide できること
  - LLM / tool command envelope を downstream 実行なしで返すこと
  - standalone approval evaluation / audit verification / runtime health が動くこと
- `packages/operator-writing/test/writing.test.ts`
  - Writing Operator surface registration
  - L1 / L2 / L3 operation boundary declaration
  - digest-only invocation trace helpers
  - no raw authority capability declaration
- `packages/operator-daily/test/daily.test.ts`
  - Daily Operator surface registration
  - backward-compatible `BLUE_TANUKI_DAILY_BRIEF_*` env snapshot
  - L1 read, L2 reminder draft, and L3 schedule / Google write boundary declaration
  - no raw authority capability declaration
- `packages/operator-developer/test/developer.test.ts`
  - Developer Operator surface registration
  - L1 read, L2 file write/edit, and L3 shell / GitHub / browser automation boundary declaration
  - browser automation preview remains disabled-by-default
  - digest-only invocation trace helpers
  - no raw authority capability declaration
- `packages/hds-brain/test/operator_surface.test.ts`
  - Writing Operator frame recognition
  - Daily Operator frame recognition
  - Developer Operator frame recognition
  - untrusted metadata does not select a surface
  - surface recognition leaves the process as HDS-owned downstream chat
- `apps/gateway/test/plugin_loader.test.ts`
  - first-party surface exports are loaded only after manifest permission checks
- `packages/channel-webchat/test/webchat.test.ts`
  - Writing Operator Control Center endpoints require inbound auth
  - Writing Operator invoke enters the existing inbound handler with gateway-owned surface metadata
  - Daily Operator Control Center endpoints require inbound auth
  - Daily Operator invoke enters the existing inbound handler with gateway-owned surface metadata
  - Developer Operator Control Center endpoints require inbound auth
  - Developer Operator invoke enters the existing inbound handler with gateway-owned surface metadata
  - Settings `Verify LLM` route requires the settings token and performs non-mutating verification
- `apps/gateway/test/settings_surface.test.ts`
  - SIM-like LLM API settings verification passes for the stub provider without external network access
  - non-stub provider verification returns safe failure without saving secrets or mutating the env file
- `install/installer/test/installer.test.ts`
  - guided first-run installer CLI parses provider and no-serve options
  - installer preflight reports owner next action when run outside a repo root
- `apps/gateway/test/doctor.test.ts`
  - doctor が manifest / compatibility matrix / schedule config の release gate を表示すること

## Required Test Groups

- Adapter conformance tests
- Plugin review gate tests
- Skill loader contract tests
- Permission enforcement tests
- Audit trace compatibility tests
- Runtime invariant preservation tests
- HDS-BRAIN standalone boundary tests
- Runtime automation containment tests
- First-party operator surface tests
- Installer setup UX tests
- SIM-like LLM API settings verification tests
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

## Plugin / Skill Conformance Tests

Layer B plugin / skill submissions must include tests for:

- manifest schema validation
- declared capability use
- undeclared capability hard reject
- HDS authority non-bypass
- Approval Gate non-bypass
- audit trace compatibility
- credential redaction
- disable / revoke fail-closed behavior
- no hot reload for skills
- no external npm dynamic import at runtime

Review docs:

- [Plugin Review Gate](PLUGIN_REVIEW_GATE.md)
- [Plugin HIG](PLUGIN_HIG.md)
- [Skill Loader Contract](SKILL_LOADER_CONTRACT.md)

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

## HDS-BRAIN Standalone Boundary Tests

- `packages/hds-brain` has no gateway/core/channel/operator dependency.
- `HDSUpperController` can decide on an `InboundRequest` without gateway.
- LLM and tool requests become command envelopes, not direct execution.
- `AuditLog`, approval evaluation, runtime snapshot, and HDSBrainHealth run standalone.
- Downstream result/reference material remains evidence, not authority.

## HDS-BRAIN Boundary Definition Tests

- `tool.call` and `unknown` map to high-risk `L3_final_review`.
- unknown / ambiguous / unclassified / missing capability / mismatch / conflict states never auto-allow.
- memory, complete history, session, tool result, LLM output, metadata, audit viewer, and Control Center projections are reference/evidence only.
- HDS fail-safe suspends downstream execution when policy, audit chain, runtime invariants, Approval Gate, or HDS availability is invalid.
- policy, detector, approval, and history updates require L3 final review.
- Trinity `M` closure suspends when X, R, or M is missing.

## Preview Quarantine Rule

未完成、experimental、third-party-like、または support level が曖昧な実装は preview quarantine に置く。preview は README / docs / compatibility matrix に status を明記する。

## Main Release Gate Rule

main release へ昇格するには、conformance tests、permission enforcement tests、audit trace compatibility tests、runtime invariant preservation tests が pass し、support level と運用責任が docs に残っていること。

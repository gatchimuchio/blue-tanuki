# SECURITY_REVIEW_CHECKLIST

変更レビュー時は以下を確認する。

- Does this change touch authority path?
- Does this change let channel metadata escalate authority?
- Does this change let memory become authority?
- Does this change call LLM from HDS-BRAIN or authority path?
- Does this change bypass approval gate?
- Does this change break audit hash-chain compatibility?
- Does this change add undeclared capabilities?
- Does this change move preview code into main release?
- Does this change make `packages/hds-brain` depend on gateway/core/channel/operator code?
- Does this change let downstream limbs decide authority, substitute approval, or escalate privileges?
- Does this change let `unknown`, `tool.call`, ambiguous, or unclassified operations auto-allow?
- Does this change provide Trinity `M` from LLM output, memory, session, channel metadata, or plugin metadata?
- Does this change send user-visible output or external result handoff without an `output_audit` record?
- Does this change let complete history become authority, approval, risk classification, or policy input?
- Does this change expose complete-history raw payload, command content, rendered output, approval tokens, bearer tokens, or credentials through Control Center/history APIs?
- Does this change turn Runtime Invariants evidence into authority, approval, policy mutation, or fallback execution?
- Does this change duplicate or bypass `FINAL_REVIEW_OPERATION_LIST` instead of deriving from the HDS-BRAIN source of truth?
- Does this change weaken any compound attack guarantee covered by `packages/hds-brain/test/compound_attack_scenarios.test.ts`?
- Does this change let detector lifecycle failure, invalid detector output, or unknown detector pattern auto-allow?
- Does this change let HDS self-health fail-safe emit commands or approve through resume?
- Does this change promote a preview channel without `pnpm validate:channels` evidence?

追加確認:

- capability envelope は deny by default か
- missing capability は fail closed するか
- policy / detector / approval / history update は L3 final-review を通るか
- HDS-BRAIN fail-safe が downstream authority fallback になっていないか
- LLM/tool/scheduler/plugin/external result は raw content ではなく digest/metadata として audit されるか
- external send / shell / delete / credential / schedule は final-review boundary を通るか
- Runtime Invariants は外部から inspect 可能なままか
- F-reference は audit trace に残るか
- WhatsApp first-party core 実装や専用 escape hatch を追加していないか
- HDS-BRAIN standalone smoke / boundary tests は維持されているか
- UI / Control Center / memory / history / session / tool result が authority に変換されていないか
- CompleteHistoryStore が standalone append / verify / replay / export baseline を維持しているか
- Control Center history/replay が digest/metadata only で raw payload を返していないか
- Runtime Invariants evidence が HDS-BRAIN standalone で取得・監査できるか
- final-review operation が `packages/hds-brain/src/approval_policy.ts` の単一ソースから派生しているか
- full-access / wildcard grant / metadata spoof / downstream feedback spoof の複合条件でも L3 final-review が維持されているか
- detector missing / exception / invalid score / invalid pattern / duplicate axis が `SUSPEND` に落ちるか
- policy / audit / Runtime Invariants / Approval Gate / HDS availability failure が command emission 前に `SUSPEND` するか
- Slack / Discord / Teams / LINE の first-party promotion が owner-run live smoke / recovery review / metadata non-authority evidence なしに行われていないか

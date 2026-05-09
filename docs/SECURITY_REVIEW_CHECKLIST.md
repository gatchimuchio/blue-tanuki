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

追加確認:

- capability envelope は deny by default か
- missing capability は fail closed するか
- external send / shell / delete / credential / schedule は final-review boundary を通るか
- Runtime Invariants は外部から inspect 可能なままか
- F-reference は audit trace に残るか
- WhatsApp first-party core 実装や専用 escape hatch を追加していないか

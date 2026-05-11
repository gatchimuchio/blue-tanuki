# Phase 8-S2a: Operator Usability Docs

## Objective

初回成功と永続運用を分け、owner が BLUE-TANUKI v0.1 を安全に起動、確認、更新、rollback できる docs surface を整備した。

## Scope

- first-run checklist
- permanent-use checklist
- channel readiness matrix
- credential readiness matrix
- update / rollback / recovery runbook
- README / QUICKSTART / CONFIG / TROUBLESHOOTING alignment
- docs static checker

## Non-Goals

- doctor output の schema 改修は Phase 8-S2b
- Control Center runtime status field 追加は Phase 8-S2b
- 新規 channel / tool / authority behavior の追加なし

## Key Decisions

- `v0.1 provides a guided first-run path, not a verified 5-minute beginner guarantee.` を明記した。
- Slack / Discord は preview として明示し、WebChat / Telegram と分けた。
- WhatsApp は `reserved-third-party` として docs 上も first-party から外した。
- runtime schedule は Phase 8-S1 後の現状に合わせ、create/update/delete が L3 で有効であると説明した。

## Validation Notes

Phase 8-S2a は docs-first の phase であり、runtime behavior を変更しない。`scripts/check_docs.mjs` は以下を静的に確認する:

- required docs が存在する
- README / QUICKSTART から required docs へリンクがある
- stale runtime schedule v0.1 text が残っていない
- compatibility matrix の WebChat / Telegram / Slack / Discord / WhatsApp status が docs 方針と一致する

## Next

Phase 8-S2b で doctor の actionable output と runtime snapshot / Control Center first-run status を実装する。

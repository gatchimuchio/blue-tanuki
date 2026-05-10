# Phase 4-S4 Handoff

Status entering S4: **Phase 4-S3 complete**. 227 tests PASS, both smoke
scripts PASS, audit persistence + dump CLI + structured logger + runbook
delivered.

## What was delivered in S3

- `BLUE_TANUKI_AUDIT_DIR` enables on-disk audit persistence with
  hash-chain continuity across restarts. Wiring lives in
  `apps/gateway/src/audit_config.ts` (`buildAuditLog()` +
  `AUDIT_FILENAME`).
- `--audit-dump [--json]` CLI: read-only, exit 0/1/2 (ok / broken / setup
  error). Implementation in `apps/gateway/src/audit_dump.ts`.
- Structured logger in `@blue-tanuki/core` (`createLogger`). Text +
  JSON formats, level filter, child scopes. Adoption is opt-in; not yet
  rolled out across `main.ts`/`serve.ts`.
- `doctor` now probes `BLUE_TANUKI_AUDIT_DIR` writability.
- `smoke:serve` now pins audit persistence end-to-end, including the
  `--audit-dump` CLI.
- `smoke:resume` forces in-memory audit so it stays scope-isolated.
- Operator runbook at `docs/runbook.md`.
- Phase 4-S3 completion report at `docs/phase4-s3.md`.

## Test totals

201 (S2) → 227 (S3). Breakdown:

- `@blue-tanuki/core`: 36 → 46 (+10 logger tests)
- `apps/gateway`: 16 → 31 (+15: audit-dump 8, build_audit_log 3, doctor audit_dir 4)
- All other packages unchanged.

Both E2E smoke scripts green.

## Carry-over entering S4

- **B. Real-API live smoke (4-8)** — Slack/Discord/Anthropic live
  round-trips. Deferred from S2/S3. Needs decision on Slack
  Socket Mode vs Events API and Discord Gateway vs REST polling
  (these decisions were the original Phase 3 entry points and remain
  open).
- **C. JsonFileSessionStore multi-process safety** — still deferred to
  Phase 6+. Operationally tolerable as long as deployment is single-process.
- **D. Plugin loader** — still not started.
- **Logger adoption migration** — mechanical, ~50 lines. Could fit in S4
  alongside live-fire smoke as a low-risk filler.

## Decision points for the start of S4

1. **S4 primary scope.** Two natural choices:
   - **B (live-fire smoke)** — exercises real Slack/Discord/Anthropic
     connectivity with credentials. Needs the Slack and Discord
     transport decisions resolved (Socket Mode vs Events API; Gateway
     vs REST). Estimated +5-10 LOC in test scripts, +0-200 LOC in
     channel packages depending on transport choice. Tests: +10-20.
   - **D (plugin loader, phase 1)** — start the dynamic loader
     against the existing manifest schema. Estimated +500-700 LOC,
     +30-50 tests, but defers B further.

   Cross-recommendation from クロちゃん: **B first**. The plugin
   manifest is declarative-only and is not blocking anything; the
   live-fire smoke is what unlocks confidence in the Phase 3 channel
   work that has been stub-tested for two phases now. Confidence: 80%.

2. **Logger migration timing.** Bundle into S4 as a small filler? Or
   defer indefinitely until a logging-specific need surfaces?

   Cross-recommendation: **bundle into S4** if and only if S4 scope is
   B (live-fire). The two are unrelated but compatible, and live-fire
   smoke benefits from JSON-mode logs for CI ingestion. Confidence: 65%.

3. **Slack/Discord transport choices** (long open):
   - Slack: Socket Mode vs Events API.
   - Discord: Gateway vs REST polling.

   These need to be decided before B can fully land. Without a
   decision, S4 can do live-fire only against `Anthropic` and leave
   the channel transports as another carry-over.

4. **`--audit-dump` as a hard deploy gate.** Currently a soft check in
   the runbook. If you want it as a hard gate, the deploy checklist
   needs an explicit step. Mechanical change, no code.

## Recommended opening prompt for the next session

> ご主人様、Phase 4-S3 完了レポートと次セッション用ハンドオフを格納
> しました。S4 着手にあたり、(1) スコープを **B (ライブファイア
> スモーク)** で進める案、(2) D (プラグインローダ) を先にする案、の
> いずれを採るか、またそれに伴い Slack/Discord トランスポート選定を
> 同時に決着させるかを判断ください。クロちゃん側のデフォルト推奨は
> 「B + Slack=Socket Mode + Discord=Gateway + ロガー migration を
> 同梱」で、確信度はそれぞれ 80% / 70% / 70% / 65% です。

## What is in the next ZIP

`blue-tanuki-phase4-s3.zip` includes:

- All source changes for S3.
- New tests (`logger.test.ts`, `audit_dump.test.ts`,
  `build_audit_log.test.ts`, doctor audit_dir tests).
- Updated smoke scripts.
- `docs/runbook.md` (new).
- `docs/phase4-s3.md` (new completion report).
- `docs/phase4-s3-handoff.md` (this file → renamed to `s4-handoff.md`
  in the archive to mirror the S2→S3 naming convention used previously).

Ready for next-session continuation.

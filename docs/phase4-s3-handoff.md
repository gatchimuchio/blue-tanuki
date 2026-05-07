# Phase 4-S3 — Session Handoff

Source: Phase 4-S2 closing
Target: next session, Phase 4-S3 (and onward to S4 per the roadmap)
Author: クロちゃん

---

## TL;DR for the incoming session

1. Phase 4-S2 closed clean: **201 tests PASS**, both smoke E2E PASS, build/typecheck green, no S2-introduced regressions.
2. Three carry-overs remain explicitly open: audit-log on-disk persistence, JsonFileSessionStore cross-process semantics, and live-fire smoke. None block Phase 4-S3 by themselves.
3. The next session starts with **decision branches that affect scope**, listed below in §3. The recommended opening prompt is in §6.

---

## 1. State summary

### Test baseline

```
@blue-tanuki/protocol         21 PASS
@blue-tanuki/channel-base     22 PASS
@blue-tanuki/channel-webchat  36 PASS
@blue-tanuki/channel-slack    17 PASS
@blue-tanuki/channel-discord   9 PASS
@blue-tanuki/hds-brain        45 PASS
@blue-tanuki/core             35 PASS
@blue-tanuki/gateway          16 PASS
                            ─────────
Total                        201 PASS
```

E2E:
- `pnpm smoke:serve` — PASS
- `pnpm smoke:resume` — PASS

### What's now in place

- Per-`(channel, user)` chat history persistence (memory + JSON-file backends).
- HDS-BRAIN sets `session_id` on every emitted `llm_call`. Executor honors history and appends post-success only.
- Every package carries a validated `blue-tanuki.plugin.json`. Schema lives in `@blue-tanuki/protocol`.
- `node ./dist/main.js --doctor [--json]` for hermetic environment checks. Exit codes 0/1/2 are CI-ready.
- `WebChatChannel` runs a periodic TokenBucket prune (default 60 s, idle 5 min). Timer is `unref()`'d so it won't keep the loop alive.
- Persistence-boundary contract is documented in `docs/persistence-boundary.md`.

### What's intentionally NOT yet in place

- HDS audit log on-disk persistence. AuditLog is still in-memory only.
- Multi-process safety for `JsonFileSessionStore`. Single-process is fine; horizontal scale will swap in a different `SessionStore` impl.
- Plugin loader (`import()` from manifest entries at boot).
- Permission **enforcement**. Manifests declare; nothing blocks ambient access yet.
- Live-fire smoke for Slack / Discord / Anthropic.

---

## 2. Roadmap remaining (per `blue-tanuki-roadmap-v1.md`)

Phase 4 sub-items still open after S2:
- **4-7** Channel-level integration tests (real Slack / Discord token, per env). Deliberately scoped out of `--doctor`.
- **4-8** Live-fire E2E smoke against real APIs (gated by env, opt-in).
- **4-9** Operator runbook + minimum-viable observability (structured logs, audit chain dump utility).
- **4-10** Release prep: tagged version, changelog, packaging.

Phase 5+ items still open:
- Plugin loader (`import()` of manifest `entry`).
- Permission enforcement for `network:*`, `secrets:*`, `fs:*`.
- Audit-log on-disk persistence with `BLUE_TANUKI_AUDIT_DIR` and filename pattern.
- Horizontal-scale `SessionStore` (Redis / Postgres backend).

---

## 3. Decision branches for next session

These shape the S3 scope. Each has a クロちゃん recommended default in **bold**.

### A. Audit log on-disk persistence — ship in S3 or defer?

- **Recommended: ship in S3.** It's the most-needed piece for operability and is a genuine prerequisite for the Phase 4-9 runbook. The boundary doc has already reserved `BLUE_TANUKI_AUDIT_DIR`.
- Defer if: you want S3 to focus on real-API smoke instead. (Note that S3 can usually fit both because audit persistence is a small additive change.)

### B. Live-fire smoke (4-8) — same session as audit, or separate?

- **Recommended: separate session (S4).** Live-fire requires real tokens or a meaningful mock harness; both are non-trivial and deserve their own session. Combining them with audit-on-disk risks scope blow-up.
- Combine if: real tokens are already available and a 2-hour additional budget is on the table.

### C. JsonFileSessionStore cross-process safety — when?

- **Recommended: defer to whenever horizontal scale is on the agenda (likely Phase 6+).** Single-process is fine for current deployment plans.
- Address sooner if: you intend to deploy more than one gateway pod against a shared `BLUE_TANUKI_SESSION_DIR`. (In that case, switch to a different `SessionStore` impl rather than hardening the file-backed one.)

### D. Plugin loader — start in S3?

- **Recommended: NOT in S3.** Loader and permission enforcement land together; both are non-trivial. S3 should consolidate operability instead.
- Start in S3 if: you want to lock the runtime extension model before the channel-integration push (4-7). Then S3 becomes a long, design-heavy session.

---

## 4. クロちゃん仮置き for S3 (assuming defaults A=ship, B=separate, C=defer, D=defer)

If ご主人様 picks the defaults, S3 looks like:

| Item                               | Effort | Notes                                                                |
| ---------------------------------- | ------ | -------------------------------------------------------------------- |
| 4-9a Audit log persistence         | medium | New `JsonFileAuditLog` impl + `BLUE_TANUKI_AUDIT_DIR` + doctor check.|
| 4-9b Audit chain dump CLI          | small  | `--audit-dump [--json]` reading from disk.                            |
| 4-9c Structured log format         | small  | Replace `console.log` lines with a single tiny logger module.        |
| 4-9d Operator runbook              | small  | Markdown doc covering env, smoke, doctor, recovery.                  |
| Carry-over: smoke harness for      | small  | Update `scripts/smoke_*.ts` to exercise audit persistence path.      |
| audit                              |        |                                                                      |

Estimated: **+800-1100 LOC, +25-35 tests.** One session if focused.

If ご主人様 picks D (start plugin loader in S3), the above is deferred and the session is mostly loader design + initial implementation + permission policy spec.

---

## 5. Anything that could surprise the next session

1. **`pnpm doctor` (without `run`) collides with pnpm's built-in `doctor` command.** Use `pnpm run doctor`, `pnpm --filter @blue-tanuki/gateway run doctor`, or `node ./dist/main.js --doctor` directly.
2. **Manifest test asserts `entry === "./dist/index.js"` for every package.** If a new package is added, its manifest entry must match this convention or the test will fail. Easy fix; just be aware.
3. **Session JSONL filenames are URL-safe base64 of the session_id.** Operators looking at the directory will see opaque names. The format choice prevents `:` / `/` in filenames; the test "encodes non-ASCII session_id safely on disk" pins this.
4. **TokenBucket prune timer is `unref()`'d.** It won't keep a Node process alive on its own. If you later add critical periodic work, do not pattern-match on this — that one is genuinely fine to drop.
5. **`session_id` is built by HDS-BRAIN as `${channel}:${user}`.** If you later add a channel that doesn't fit (e.g. group-chat where `user` is the room id), the convention still works; the convention is opaque to the executor.

---

## 6. Recommended opening prompt for next session

```
ご主人様、Phase 4-S2 完了状態を引き継ぎました。S2 は 4-4 / 4-5 / 4-6 + 副次対応
（TokenBucket prune、persistence-boundary 文書）まで含めて完了、201 tests PASS、
smoke E2E 両方 PASS、後方互換維持済みです。

次セッションは Phase 4-S3 ですが、scope に影響する判断分岐が 4 件あります。

- A: 監査ログのディスク永続化を S3 で出すか後回しにするか（推奨：S3 で出す）
- B: 実 API ライブスモーク (4-8) を同セッションでやるか分けるか（推奨：分ける）
- C: JsonFileSessionStore のマルチプロセス安全性をいつやるか（推奨：horizontal scale が議題に乗ったとき）
- D: プラグインローダを S3 で着手するか（推奨：着手しない）

A=出す、B=分ける、C=後回し、D=後回し で進める場合は次の構成になります:
  4-9a audit log 永続化 (中)
  4-9b audit chain dump CLI (小)
  4-9c structured log (小)
  4-9d operator runbook (小)

どう進めますか？ A/B/C/D それぞれの判断を聞かせていただければ、
クロちゃん側で着手プラン仮置きまで一気に出します。
```

---

## 7. Deliverables shipped in S2

- `blue-tanuki-phase4-s2.zip` — clean tree, all changes, all tests passing.
- `docs/phase4-s2.md` — completion report.
- `docs/plugin-manifest.md` — plugin manifest spec.
- `docs/doctor-output.md` — `--doctor` reference.
- `docs/persistence-boundary.md` — HDS audit / executor session boundary contract.
- This handoff document.

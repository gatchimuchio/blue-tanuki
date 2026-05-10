# Phase 4-S2 — Completion Report

Status: **complete**
Scope: 4-4 session persistence, 4-5 plugin manifest spec, 4-6 doctor, plus carry-over (TokenBucket prune, persistence boundary doc).
Test count: **201 passed** (Phase 4-S1 baseline 130 → 201, +71 new).

## Headline outcomes

| Item                                | Status                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| 4-4 Session persistence             | `SessionStore` interface + `MemorySessionStore` + `JsonFileSessionStore`         |
| 4-5 Plugin manifest spec            | `PluginManifestSchema` + 7 packages carry `blue-tanuki.plugin.json`              |
| 4-6 doctor                          | `--doctor [--json]`, exit codes 0/1/2, hermetic (no live API calls)              |
| TokenBucket prune (S1 carry-over)   | Periodic `setInterval` prune in `WebChatChannel.start()`; `unref()`'d            |
| HDS audit / session boundary doc    | `docs/persistence-boundary.md`                                                  |
| E2E (smoke:serve / smoke:resume)    | Both PASS                                                                        |

## Architectural decisions locked in

### Session persistence (4-4)

- **Backend:** JSON + `SessionStore` interface (no SQLite). The interface is the contract; swapping for Redis/Postgres in a future phase is a one-package change.
- **Cap:** 100 messages per session, configurable via `BLUE_TANUKI_SESSION_CAP`. FIFO eviction on overflow.
- **Write contract:** user messages + assistant reply are appended **only on `success`**. Failed `llm_call` does NOT pollute history. Test-locked.
- **session_id convention:** `${channel}:${user}` (e.g. `slack:U123`, `webchat:bob`). Set by HDS-BRAIN's `buildCommand`. The executor treats the id opaquely.
- **History merge:** when a session_id is present, retained history is prepended to the LLM messages array; the inbound user message is appended after the prepended history. `history_limit` caps the per-call merge.
- **Boundary with HDS-BRAIN audit:** strict separation. See `docs/persistence-boundary.md`.

### Plugin manifest (4-5) — declare-only

- Schema lives in `@blue-tanuki/protocol/manifest.ts` as a zod object.
- All 7 packages ship `blue-tanuki.plugin.json` at their root with name/version aligned to package.json.
- `permissions` array is **declarative only** in this phase. Enforcement and dynamic loader land together in Phase 5+ to avoid shipping a half-checked security boundary.
- Manifest filename and field paths are locked by tests, including a "bundled manifests must match this repo" test.

### doctor (4-6)

- 10 hermetic checks: Node.js version, env presence (1 required, 4 optional), `LLM_BACKEND` consistency, `BLUE_TANUKI_SESSION_DIR` writability, bundled-manifests presence, and a `WEBCHAT_PORT` listen-probe.
- Exit codes: `0` ok, `1` warnings only, `2` errors.
- Two output formats: human text (default) and JSON (`--json`). JSON contract is locked by tests (`{ ok, exit_code, timestamp, checks: { id, level, label, detail }[] }`).
- **Privacy:** secrets are reported by length only. No env value is ever logged. Locked by a `WEBCHAT_TOKEN: SECRET-VALUE-XYZ` regression test.

## Files changed / added

```
packages/protocol/
  src/manifest.ts                  (new) — PluginManifestSchema + readManifest
  src/index.ts                     (mod) — export manifest module
  src/types.ts                     (mod) — LLMCallPayload.session_id?
  test/manifest.test.ts            (new) — 21 tests
  blue-tanuki.plugin.json          (new)

packages/channel-base/
  blue-tanuki.plugin.json          (new)

packages/channel-webchat/
  src/webchat.ts                   (mod) — prune timer in start()/stop()
  test/webchat.test.ts             (mod) — +2 prune tests
  blue-tanuki.plugin.json          (new)

packages/channel-slack/
  blue-tanuki.plugin.json          (new)

packages/channel-discord/
  blue-tanuki.plugin.json          (new)

packages/hds-brain/
  src/controller.ts                (mod) — buildCommand sets session_id
  blue-tanuki.plugin.json          (new)

packages/blue-tanuki/
  src/sessions/types.ts            (new) — SessionStore + ChatMessage
  src/sessions/memory.ts           (new) — MemorySessionStore
  src/sessions/json_file.ts        (new) — JsonFileSessionStore
  src/sessions/index.ts            (new)
  src/index.ts                     (mod) — re-export sessions
  src/executor.ts                  (mod) — session_store deps + history merge
  test/session_store.test.ts       (new) — 25 tests
  test/executor_session.test.ts    (new) — 7 tests
  blue-tanuki.plugin.json          (new)

apps/gateway/
  src/main.ts                      (mod) — buildSessionStore + --doctor branch
  src/serve.ts                     (mod) — session_store wired into Executor
  src/doctor.ts                    (new) — diagnostic engine
  test/doctor.test.ts              (new) — 16 tests
  package.json                     (mod) — add doctor / doctor:dev / test scripts

docs/
  plugin-manifest.md               (new)
  doctor-output.md                 (new)
  persistence-boundary.md          (new)
  phase4-s2.md                     (this file)

package.json (root)                (mod) — add doctor / doctor:dev forwards
```

## Test count delta

| Package                          | S1   | S2   | Δ     |
| -------------------------------- | ---- | ---- | ----- |
| `@blue-tanuki/protocol`          |   0  |  21  | +21  |
| `@blue-tanuki/channel-base`      |  22  |  22  |   0  |
| `@blue-tanuki/channel-webchat`   |  34  |  36  |  +2  |
| `@blue-tanuki/channel-slack`     |  17  |  17  |   0  |
| `@blue-tanuki/channel-discord`   |   9  |   9  |   0  |
| `@blue-tanuki/hds-brain`         |  45  |  45  |   0  |
| `@blue-tanuki/core`              |   3  |  35  | +32  |
| `@blue-tanuki/gateway`           |   0  |  16  | +16  |
| **Total**                        | **130** | **201** | **+71** |

Smoke: `smoke:serve` PASS, `smoke:resume` PASS (no behaviour regressions).

## Known carry-overs to Phase 4-S3+

1. **Audit log on-disk persistence.** Today AuditLog is in-memory; `verify()` is exercised end-of-session. When persistence ships, it gets its own env (`BLUE_TANUKI_AUDIT_DIR`) and filename pattern. The boundary doc reserves the namespace.
2. **JsonFileSessionStore cross-process semantics.** Single-process is fine (per-session lock chain). For multi-process gateways or horizontal scale, a Redis/Postgres-backed `SessionStore` swaps in via the same interface.
3. **Plugin loader + permission enforcement.** Phase 5+. Manifests declare; nothing enforces yet.
4. **Live-fire smoke (Slack/Discord/Anthropic real API).** Deliberately out of `--doctor`'s hermetic scope. Will land as `--live-check` in Phase 4-S3.

## Containment property — re-checked

- HDS-BRAIN does not read session history when judging. F→M→C runs on the latest inbound only. (verified by `controller.ts` code; no new path opened.)
- Executor cannot transition state in HDS-BRAIN. `onFeedback()` only deletes from `inflight`; SUSPEND lift remains human-only.
- Session writes happen post-LLM-success; failure does not append. Locked by `executor_session.test.ts` "LLM failure does not pollute history".
- Plugin manifests do not yet grant runtime privileges; declarations carry no enforcement. No ambient authority created in this phase.

The downstream-cannot-override-upstream property is preserved.

## 神域原理 alignment

This phase did not touch Ψ-domain dynamic generation, emotional structure simulation, or any of the prohibited surfaces from `神域原理.txt` §6.1. All work was in the protocol / persistence / diagnostic layer. No deltas to flag.

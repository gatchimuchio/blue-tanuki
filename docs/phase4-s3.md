# Phase 4-S3 — Completion Report

Status: **complete**
Scope: 4-9a audit on-disk persistence wiring, 4-9b `--audit-dump` CLI, 4-9c
structured logger, 4-9d operator runbook, doctor extension for
`BLUE_TANUKI_AUDIT_DIR`, smoke extension to pin audit persistence.
Test count: **227 passed** (Phase 4-S2 baseline 201 → 227, +26 new).

Carry-over from S2 entering S3:

- A. audit log on-disk persistence in S3 — **delivered**
- B. real-API live smoke (4-8) — deferred to S4 (unchanged)
- C. JsonFileSessionStore multi-process safety — deferred to Phase 6+ (unchanged)
- D. plugin loader S3 — not started (unchanged)

## Headline outcomes

| Item                                          | Status                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| 4-9a Audit on-disk persistence (wiring)       | `buildAuditLog()` + `BLUE_TANUKI_AUDIT_DIR` + Controller injection in CLI and serve     |
| 4-9b `--audit-dump [--json]` CLI              | Read-only, exit 0/1/2 (ok / broken / setup-error), text + JSON formats                  |
| 4-9c Structured logger                        | `createLogger` in `@blue-tanuki/core`; text + JSON, level filter, child scopes          |
| 4-9d Operator runbook                         | `docs/runbook.md`                                                                       |
| doctor extension                              | `BLUE_TANUKI_AUDIT_DIR` write-probe added                                               |
| smoke extension                               | `smoke:serve` boots with `BLUE_TANUKI_AUDIT_DIR`, then verifies file + dump CLI         |
| smoke isolation                               | `smoke:resume` forces in-memory audit (`BLUE_TANUKI_AUDIT_DIR=""`) for scope clarity     |

## Scope-level discovery

The single biggest finding entering S3: **the on-disk persistence
implementation already existed** in `packages/hds-brain/src/audit.ts` from
Phase 1, complete with `loadFromFile()`, hash-chain re-verification, and
JSONL append. The visible gap was that `HDSUpperController` instantiated
`new AuditLog()` with no options and the gateway exposed no env hook for
the file path. S3 was therefore re-scoped from "implement
JsonFileAuditLog" to **wire the existing persistence behind an env hook**.

Re-scope reduced the LOC budget from ~800–1100 to ~600 and the test budget
from +25–35 to +26. The original doctor/runbook/`--audit-dump`/logger
deliverables were unaffected.

## Architectural decisions locked in

### Audit persistence wiring (4-9a)

- **Env hook:** `BLUE_TANUKI_AUDIT_DIR`. Unset → in-memory only (existing
  Phase 1-3 default; full backwards compatibility). Set → the controller
  uses `AuditLog({ filepath: <dir>/audit.jsonl })`.
- **Filename:** locked to `audit.jsonl` (constant `AUDIT_FILENAME`). The
  same constant is consumed by the dump CLI so the runtime and the tool
  cannot drift.
- **No flag-based path override.** The dump CLI reads `BLUE_TANUKI_AUDIT_DIR`
  only. Allowing an arbitrary `--file=…` would invite divergent audit
  corpora that drift from the live chain.
- **Boot-time chain verification is loud.** A tampered or truncated
  `audit.jsonl` causes boot to throw with the existing `AuditLog`
  message. Operators must quarantine or repair before the gateway will
  accept requests again. Documented in `docs/runbook.md` §6.1.
- **No in-process rotation.** Operators rotate by stopping the gateway and
  `mv`'ing the file. Each rotated file remains a self-verifiable chain
  starting at `GENESIS`.
- **Multi-process writers remain unsupported** — same boundary as the
  existing audit.ts header comment. Re-confirmed in the runbook.

### `--audit-dump` CLI (4-9b)

- Read-only and idempotent. Surfaces in `audit_dump.ts` and dispatches
  through `main.ts` alongside `--doctor`.
- **Exit code mapping:**
  - `0` → `ok` (chain valid) or `empty` (env set, file not yet written)
  - `1` → `broken` (chain failed verification on load)
  - `2` → `setup_error` (env unset)
- **Two formats:** text view summarises one entry per line; JSON view
  emits the full structured chain (one `AuditEntry` per element). JSON
  is suitable for CI pipes.
- **Never throws on broken input.** Malformed JSONL or hash mismatches
  are caught and rendered as a structured `broken` report.

### Structured logger (4-9c)

- Lives in `@blue-tanuki/core` as `logger.ts`. No new package, no new
  external dependency.
- **Text format is byte-compatible** with the existing
  `[scope] msg` style for `info`-level lines, so smoke-script greps and
  existing runbooks see no difference. `warn`/`error` add a `WARN ` /
  `ERROR ` prefix and route to stderr.
- **JSON format** emits one object per line with reserved top-level keys
  `ts`, `level`, `scope`, `msg`. User fields cannot overwrite reserved
  keys.
- **Env-driven defaults:** `BLUE_TANUKI_LOG_LEVEL`,
  `BLUE_TANUKI_LOG_FORMAT`. Malformed values fall back silently to
  `info` / `text`. Logging itself never crashes the process.
- **Adoption is opt-in.** Existing `console.log("[scope] ...")` call
  sites in `main.ts`/`serve.ts` are left untouched in S3 to keep the
  diff focused; migration can happen incrementally without regression.

### doctor extension

- New check `audit_dir`, parallel to `session_dir`. Probes
  creatability + writability, reports the resolved path. Writability
  only — chain verification is the dump CLI's job.
- Tests: 4 new (ok/unset, ok/writable, mkdir-deep, file-collision-error).
  doctor totals: 16 → 20 tests.

### Smoke extensions

- `smoke:serve` now sets `BLUE_TANUKI_AUDIT_DIR` to a tmp dir, runs the
  Phase 3 path through, then:
  1. Verifies `audit.jsonl` exists and parses as JSONL with the expected
     shape (`index`, `entry_hash`, `prev_hash`).
  2. Spawns `--audit-dump --json` against the same dir, parses the
     report, asserts `status=ok`, `chain_valid=true`, `entry_count >= 1`.
  This pins the wiring AND the dump CLI in a single run.
- `smoke:resume` is **explicitly scoped to the resume control flow** —
  it forces `BLUE_TANUKI_AUDIT_DIR=""` (treated as unset by
  `buildAuditLog()`) so it does not depend on filesystem state and so
  smoke isolation is preserved when run sequentially or against a host
  that has `BLUE_TANUKI_AUDIT_DIR` exported.

## Files changed / added

```
apps/gateway/
  src/audit_config.ts          (new) — AUDIT_FILENAME + buildAuditLog()
  src/audit_dump.ts            (new) — runAuditDump + format functions
  src/main.ts                  (mod) — inject audit, dispatch --audit-dump,
                                       re-export AUDIT_FILENAME/buildAuditLog
                                       from audit_config for back-compat
  src/serve.ts                 (mod) — inject audit into HDSUpperController
  src/doctor.ts                (mod) — checkAuditDir + register in runDoctor
  test/audit_dump.test.ts      (new) — 8 tests
  test/build_audit_log.test.ts (new) — 3 tests
  test/doctor.test.ts          (mod) — +4 audit_dir tests (16 → 20 total)

packages/blue-tanuki/
  src/logger.ts                (new) — createLogger + text/JSON renderers
  src/index.ts                 (mod) — export createLogger / Logger / types
  test/logger.test.ts          (new) — 10 tests

scripts/
  smoke_serve.ts               (mod) — BLUE_TANUKI_AUDIT_DIR + post-run
                                       JSONL sanity + audit-dump CLI check
  smoke_resume.ts              (mod) — BLUE_TANUKI_AUDIT_DIR="" pin

docs/
  runbook.md                   (new) — operator runbook
  phase4-s3.md                 (new) — this file
```

## Test count breakdown

| Package           | Before S3 | After S3 | Delta |
| ----------------- | --------- | -------- | ----- |
| protocol          | 21        | 21       | 0     |
| channel-base      | 22        | 22       | 0     |
| blue-tanuki/core  | 36        | 46       | +10   |
| hds-brain         | 45        | 45       | 0     |
| channel-discord   | 9         | 9        | 0     |
| channel-slack     | 17        | 17       | 0     |
| channel-webchat   | 36        | 36       | 0     |
| apps/gateway      | 16        | 31       | +15   |
| **total**         | **201**   | **227**  | **+26** |

Two E2E smoke scripts both green:

- `pnpm smoke:serve` → "PASS — hello + channel_send + audit persistence + audit-dump CLI all green"
- `pnpm smoke:resume` → "PASS"

## Carry-over leaving S3

- **B. Real-API live smoke (4-8)** — still deferred to S4. Slack/Discord
  silent-stub mode is well-covered offline; live-fire requires real
  credentials and a network round-trip budget that does not belong in
  the hermetic suite.
- **C. JsonFileSessionStore multi-process safety** — still deferred to
  Phase 6+. Same rationale as the existing audit.ts header comment:
  single-writer is the documented contract; making it multi-writer would
  require either OS-level file locking or a single-writer daemon, both
  of which are larger than a Phase 4 sub-step.
- **D. Plugin loader** — not started in S3 by design. Phase 5+ work.
- **Logger adoption migration** — `createLogger` exists and is tested,
  but `main.ts`/`serve.ts` still use `console.log`. Migrating call sites
  in a follow-up keeps the S3 diff small and risk-free.

## Decisions still open for the next session

- Whether to migrate gateway logging call sites to `createLogger` as a
  near-term follow-up (mechanical refactor, ~50 lines).
- Whether to add `--audit-dump` to the deploy checklist as a hard gate
  (currently soft).
- Whether to revisit C (multi-process safety) — operationally tolerable
  so far, but this needs a decision before two-replica deployment.

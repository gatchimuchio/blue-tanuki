# Phase 4-S4 — Live-Fire Smoke Harness + Logger Migration

Status: implementation pass complete; credentialed live execution pending.

## Delivered

- Migrated `apps/gateway/src/main.ts` and `apps/gateway/src/serve.ts` from
  ad-hoc `console.log`/`console.error` operational logging to
  `createLogger`.
- Preserved raw stdout for `--doctor` and `--audit-dump [--json]` so their
  machine-readable outputs are not polluted by operational logs.
- Added `apps/gateway/src/smoke_live.ts`, an opt-in live-fire harness:
  - Anthropic: short deterministic API call.
  - Slack: Socket Mode start + `chat.postMessage` to `SLACK_LIVE_TARGET`.
  - Discord: Gateway start + message send to `DISCORD_LIVE_TARGET`.
- Added root `pnpm smoke:live`.
- Hardened existing offline smoke scripts for Windows by allowing
  `PNPM_BIN` and avoiding direct `.cmd` execution through Node's `spawn`.
- Fixed `manifestPathFor()` to produce a stable forward-slash manifest path
  across platforms.
- Updated `docs/runbook.md` with live smoke variables and operating notes.

## Live Smoke Environment

`pnpm smoke:live` exits successfully with SKIP lines when no credentials are
configured. For a hard live gate, set `BLUE_TANUKI_LIVE_REQUIRED=1`.

Anthropic:

```bash
ANTHROPIC_API_KEY=... pnpm smoke:live
```

Slack:

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_LIVE_TARGET=C...
pnpm smoke:live
```

Discord:

```bash
DISCORD_BOT_TOKEN=...
DISCORD_LIVE_TARGET=...
pnpm smoke:live
```

## Verification Performed

- `pnpm -r --filter "./packages/*" build` — PASS
- `pnpm -r typecheck` — PASS
- `pnpm -r test` — PASS, 227 tests
- `smoke:live` SKIP path with all live credentials explicitly empty — PASS

`smoke:serve` and `smoke:resume` are expected to remain offline-safe; they
must be re-run after any subsequent channel or gateway change.

## Not Yet Performed

Credentialed Slack/Discord/Anthropic live checks were not executed in this
session because no live tokens were provided and automated execution of a
script that may call third-party APIs or post messages requires explicit
operator approval.

## Notes

This S4 pass intentionally does not implement plugin loading or permission
enforcement. Those remain coupled future work because loading without
enforcement would weaken the security boundary.

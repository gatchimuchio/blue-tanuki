# Phase 7-S7: v0.1 release-candidate completion

Date: 2026-05-06

## Purpose

Close the v0.1 scope around the actual differentiator:

```text
HDS authority OS + visible resident Control Center + Telegram + scheduled message smoke.
```

This intentionally avoids feature sprawl into WhatsApp, Voice, Mobile, Gmail/GCal/Drive, or public skill registry.

## Added

- `@blue-tanuki/channel-telegram`
  - Bot API long-polling inbound
  - `sendMessage` outbound
  - silent fallback when `TELEGRAM_BOT_TOKEN` is unset
  - no LLM calls, no authority decisions
- `DailyBriefCronChannel`
  - internal cron inbound source
  - emits trusted gateway-internal metadata
  - HDS converts it to `channel_send` only after `cron.process` policy passes
- HDS scheduled-send route
  - only accepts `blue_tanuki.authority_context=gateway_internal_v1`
  - external metadata cannot create a scheduled `channel_send`
- v0.1 public docs
  - `QUICKSTART.md`
  - `CLAIM.md`
  - `SECURITY.md`
  - `AUDIT.md`
  - `CONFIG.md`
  - `TROUBLESHOOTING.md`

## Safety invariants preserved

- HDS-BRAIN never calls an LLM.
- HDS-BRAIN does not read session history for authority.
- MemoryTrace remains `used_for_authority=false`.
- External metadata cannot escalate actor/process authority.
- Daily Brief cron is treated as `cron` actor, not a human owner.
- final-review boundary remains under Approval Gate.

## v0.1 boundary

Completed quality:

- WebChat Control Center
- Runtime snapshot
- HDS Process / Memory / Authority closure
- Approval Gate
- hash-chain audit
- Telegram
- Daily Brief scheduled-message smoke

Deferred:

- WhatsApp
- Gmail/GCal/Drive-backed Daily Brief
- Voice / Mobile
- rich Canvas
- third-party Skill registry

## Verification performed in this container

```bash
node --check apps/gateway/dist/serve.js
node --check apps/gateway/dist/cron_channel.js
node --check packages/hds-brain/dist/controller.js
node --check packages/channel-telegram/dist/index.js
node --check packages/channel-telegram/dist/telegram.js
```

All passed.

## Verification still required in normal dev environment

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm doctor
```

This container lacks workspace dependencies, so dependency-based typecheck/test cannot be completed here.

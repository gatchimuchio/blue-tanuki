# BLUE-TANUKI v0.1

BLUE-TANUKI is a local resident AI control plane.

## TL;DR

1. **HDS-BRAIN owns authority.** LLMs, tools, cron, and channels are downstream devices.
2. **No black box in the HDS authority path.** Actor/process/memory/approval/execution/audit are structured and inspectable.
3. **Safety first, UX second.** Full access is allowed for owner-operated local work, but final-review operations remain gated.

## v0.1 completed surface

- WebChat Control Center at `/` and `/app`
- Runtime snapshot at `/runtime/snapshot`
- HDS Process / Memory / Authority closure
- deterministic `MemoryTrace` with `used_for_authority=false`
- Approval Gate with final-review boundary
- hash-chain audit logs
- Telegram Bot API channel
- Slack / Discord adapters with silent fallback when credentials are absent
- Daily Brief scheduled-message smoke via internal cron

## v0.1 explicit boundaries

- WhatsApp is not completion-quality in v0.1; use later experimental integration.
- Gmail / Google Calendar / Drive are not read by v0.1 Daily Brief.
- Voice / Mobile / rich Canvas are deferred to v0.2+.
- Public third-party Skill registry is intentionally excluded.

## Architecture

```text
Inbound channels / cron / webhook-like sources
  -> HDS-BRAIN
      -> ActorRef
      -> HDSProcessDefinition
      -> Frame
      -> deterministic MemoryTrace
      -> Model / Policy
      -> Commit
      -> process authority enforcement
      -> process execution-policy enforcement
      -> Approval Gate
  -> Executor
      -> LLM / tools / channel_send
  -> ExecutorFeedback
  -> hash-chain audit
```

HDS-BRAIN never calls an LLM and never consumes downstream session history for authority decisions.

## Quickstart

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build

export WEBCHAT_TOKEN="replace-with-32chars-inbound-token"
export WEBCHAT_RESUME_TOKEN="replace-with-32chars-resume-token"
export LLM_BACKEND="stub"
pnpm gateway:serve
```

Open:

```text
http://127.0.0.1:8787/
```

See [QUICKSTART.md](./QUICKSTART.md).

## Telegram

```bash
export TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
pnpm gateway:serve
```

## Daily Brief smoke

```bash
export BLUE_TANUKI_DAILY_BRIEF_ENABLED=1
export BLUE_TANUKI_DAILY_BRIEF_CHANNEL=telegram
export BLUE_TANUKI_DAILY_BRIEF_TARGET="<telegram-chat-id>"
export BLUE_TANUKI_DAILY_BRIEF_TIME="07:00"
export BLUE_TANUKI_DAILY_BRIEF_CONTENT="Daily Brief: scheduled smoke from BLUE-TANUKI v0.1"
pnpm gateway:serve
```

v0.1 Daily Brief is a scheduled `channel_send` smoke. Real Gmail/GCal/Drive-backed brief is v0.2+.

## Runtime snapshot

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

Expected invariants:

```json
{
  "hds_calls_llm": false,
  "process_policy_enforced": true,
  "external_metadata_can_escalate_authority": false,
  "memory_used_for_authority": false,
  "final_review_boundary_enforced_by_approval_gate": true
}
```

## Documents

- [CLAIM.md](./CLAIM.md) — product claim and non-claim boundary
- [SECURITY.md](./SECURITY.md) — authority and memory security model
- [AUDIT.md](./AUDIT.md) — hash-chain audit and runtime snapshot
- [CONFIG.md](./CONFIG.md) — environment variables
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — operational fixes

## Package map

| Package | Role |
|---|---|
| `@blue-tanuki/protocol` | HDS-BRAIN ↔ Executor protocol |
| `@blue-tanuki/hds-brain` | upstream authority core |
| `@blue-tanuki/core` | executor, LLM backend, tools, sessions |
| `@blue-tanuki/channel-base` | channel interfaces/router/dispatcher |
| `@blue-tanuki/channel-webchat` | local Control Center + HTTP/WS channel |
| `@blue-tanuki/channel-telegram` | Telegram Bot API channel |
| `@blue-tanuki/channel-slack` | Slack channel adapter |
| `@blue-tanuki/channel-discord` | Discord channel adapter |
| `@blue-tanuki/gateway` | runtime wiring |

## Release boundary

Release archives are source bundles, not standalone binaries. They intentionally exclude `node_modules`, local `.env` files, audit/session data, and secret-like backups.

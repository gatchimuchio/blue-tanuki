# BLUE-TANUKI v0.1

BLUE-TANUKI is a local resident AI control plane.

## TL;DR

1. **HDS-BRAIN owns authority.** LLMs, tools, cron, and channels are downstream devices.
2. **No black box in the HDS authority path.** Actor/process/memory/approval/execution/audit are structured and inspectable.
3. **Safety first, robustness second, comfort/UX third.** Feature coverage and channel coverage never outrank the HDS authority boundary.

## v0.1 completed surface

- WebChat Control Center at `/` and `/app`
- Runtime snapshot at `/runtime/snapshot`
- Authority trace at `/authority/trace`
- Scheduled task snapshot in Control Center
- HDS Process / Memory / Authority closure
- deterministic `MemoryTrace` with `used_for_authority=false`
- Approval Gate with final-review boundary
- hash-chain audit logs
- Telegram Bot API channel
- Slack / Discord adapters with silent fallback when credentials are absent
- Daily Brief scheduled-message smoke via internal cron

## v0.1 explicit boundaries

- WhatsApp is not a first-party core target. It is `reserved-third-party` and may only be approached through the generic adapter interface.
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
When enabled, the Control Center runtime snapshot shows the configured Daily Brief schedule and next fire time without exposing the brief content.

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

## Approval queue

```bash
curl -H "Authorization: Bearer $WEBCHAT_RESUME_TOKEN" \
  http://127.0.0.1:8787/approval

curl -X POST -H "Authorization: Bearer $WEBCHAT_RESUME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verdict":"approve","approval_token":"<one-time-token>"}' \
  http://127.0.0.1:8787/approval/<command_id>
```

`/approval` is a Control Center surface over the existing human resume gate. It does not create a second authority path: approval still uses the separated resume token, request-bound one-time approval token, Approval Gate audit, and HDS-BRAIN lifecycle trace.

## Audit dump HTTP

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/audit/dump

curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  "http://127.0.0.1:8787/audit/dump?format=text"
```

The HTTP dump is read-only and does not accept a filesystem path. It reports the live HDS audit chain with the same report shape as `--audit-dump`.
Control Center uses the JSON form to display `chain_valid` and `entry_count` as the resident hash-chain validator.

## Authority trace HTTP

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/authority/trace
```

`/authority/trace` is read-only. It projects Approval Gate, authority event, and command lifecycle entries from the live hash-chain audit so Control Center can inspect authority decisions without creating a second authority path.

## Documents

- [docs/ROADMAP.md](./docs/ROADMAP.md) — internal roadmap v6 and Sacred Constraints
- [docs/ADAPTER_CONTRACT.md](./docs/ADAPTER_CONTRACT.md) — downstream adapter boundary
- [docs/CAPABILITY_ENVELOPE.md](./docs/CAPABILITY_ENVELOPE.md) — manifest-driven capability rules
- [docs/CONFORMANCE.md](./docs/CONFORMANCE.md) — preview quarantine and release gates
- [docs/LLM_DEVELOPMENT_GUIDE.md](./docs/LLM_DEVELOPMENT_GUIDE.md) — Codex/LLM implementation rules
- [CLAIM.md](./CLAIM.md) — product claim and non-claim boundary
- [SECURITY.md](./SECURITY.md) — authority and memory security model
- [AUDIT.md](./AUDIT.md) — hash-chain audit and runtime snapshot
- [CONFIG.md](./CONFIG.md) — environment variables
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — operational fixes

## License

MIT. See [LICENSE](./LICENSE).

## Package map

Source packages live under `packages/`; runtime apps live under `apps/`.
Root files are limited to workspace config, docs, install/deploy scripts, and release tooling.

| Path | Package | Role |
|---|---|---|
| `packages/protocol` | `@blue-tanuki/protocol` | HDS-BRAIN ↔ Executor protocol |
| `packages/hds-brain` | `@blue-tanuki/hds-brain` | upstream authority core |
| `packages/blue-tanuki` | `@blue-tanuki/core` | executor, LLM backend, tools, sessions |
| `packages/channel-base` | `@blue-tanuki/channel-base` | channel interfaces/router/dispatcher |
| `packages/channel-webchat` | `@blue-tanuki/channel-webchat` | local Control Center + HTTP/WS channel |
| `packages/channel-telegram` | `@blue-tanuki/channel-telegram` | Telegram Bot API channel |
| `packages/channel-slack` | `@blue-tanuki/channel-slack` | Slack channel adapter |
| `packages/channel-discord` | `@blue-tanuki/channel-discord` | Discord channel adapter |
| `apps/gateway` | `@blue-tanuki/gateway` | runtime wiring |

## Release boundary

Release archives are source bundles, not standalone binaries. They intentionally exclude `node_modules`, local `.env` files, audit/session data, and secret-like backups.

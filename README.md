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
- Daily Brief and generic scheduled-message smoke via internal cron
- Optional token-gated HTTP webhook ingress at `/webhook`
- Built-in `file.search`, `file.write`, `file.edit`, `http.fetch`, `web.search`, `github.read`, `browser.read`, and `shell.exec` with sandbox / network / approval guards

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

v0.1 provides a guided first-run path, not a verified 5-minute beginner guarantee. Use [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md) for the full first-run path and [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md) before leaving BLUE-TANUKI running permanently.

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

## Generic scheduled messages

`BLUE_TANUKI_SCHEDULES_JSON` adds boot-time internal cron tasks. Each task still enters HDS-BRAIN as `cron` actor / `cron.process` and can only become a `channel_send` through the gateway-internal metadata marker.

```bash
export BLUE_TANUKI_SCHEDULES_JSON='[
  {
    "id": "ops-smoke",
    "channel": "webchat",
    "target": "local-user",
    "content": "scheduled smoke from BLUE-TANUKI",
    "time": "07:00"
  }
]'
```

For interval smoke tests, use `interval_ms` instead of relying on wall clock:

```bash
export BLUE_TANUKI_SCHEDULES_JSON='[
  {
    "id": "minute-smoke",
    "channel": "webchat",
    "target": "local-user",
    "content": "minute smoke",
    "interval_ms": 60000
  }
]'
```

## Runtime schedules

Runtime schedules are managed through `tool:schedule.*` commands. Listing is L1; create/update/delete are L3 final-review operations. Pending, rejected, or timed-out schedule requests do not run.

```text
tool:schedule.list
tool:schedule.create channel=webchat target=local-user content="runtime smoke" interval_ms=120000
tool:schedule.update id=<id> content="updated smoke"
tool:schedule.delete id=<id>
```

Runtime schedules use `BLUE_TANUKI_SCHEDULES_DIR` (default `.blue-tanuki/schedules`) and share the same cron lane as boot-time schedules. Control Center snapshots show counts, ids, timing metadata, and payload hashes, but never schedule content.

## Webhook ingress

```bash
export WEBHOOK_TOKEN="replace-with-32chars-webhook-token"
curl -X POST http://127.0.0.1:8787/webhook \
  -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"ci","user":"ci-bot","content":"build finished"}'
```

`/webhook` is disabled unless `WEBHOOK_TOKEN` is set. Webhook metadata is normalized to `reply_to` and `webhook_source` only; it cannot escalate authority.

## File tools

```bash
export BLUE_TANUKI_FILE_ROOT="$PWD"
```

`file.search`, `file.write`, and `file.edit` are confined to `BLUE_TANUKI_FILE_ROOT`. Secret-like paths and symlink escapes are denied; writes require explicit `fs:write` capability.

Example tool requests:

```text
tool:file.search root=. query=needle max_results=5
tool:file.write path=notes/today.md content="hello" mode=create
tool:file.edit path=notes/today.md search=hello replace=hi expected_replacements=1
```

## Web search

```bash
export BLUE_TANUKI_WEB_SEARCH_ENDPOINT="https://search.example.com/search?q={query}&count={max_results}"
```

`web.search` is provider-neutral and disabled until an endpoint is configured. Requests go through the same public-address and allowlist checks as `http.fetch`.

## GitHub read tool

`github.read` is read-only and unauthenticated in v0.1. It talks only to `api.github.com`; private repository access and write operations are deferred.

```text
tool:github.read resource=repo owner=gatchimuchio repo=blue-tanuki
tool:github.read resource=issues owner=gatchimuchio repo=blue-tanuki state=open max_results=5
tool:github.read resource=pr owner=gatchimuchio repo=blue-tanuki number=1
```

## Browser read tool

`browser.read` is a lightweight, no-JavaScript page reader. It fetches a public URL through the same SSRF guard as `http.fetch`, then extracts bounded title, text, and links.

```text
tool:browser.read url=https://example.com max_chars=4000
```

## Shell exec tool

`shell.exec` runs a non-shell command (`cmd` + `args[]`) under `BLUE_TANUKI_SHELL_ROOT`. It is a final-review operation; full access and remembered grants do not bypass owner confirmation.

```bash
export BLUE_TANUKI_SHELL_ROOT="$PWD"
```

```text
tool:shell.exec {"cmd":"git","args":["status","-sb"],"cwd":"."}
```

## Runtime snapshot

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

First-run status fields include `gateway_status`, `hds_invariants_ok`, `webchat_ready`, `telegram_configured`, approval/schedule counts, `audit_chain_valid`, and `next_recommended_action`. The snapshot never exposes credential values or schedule content.

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

The HTTP dump is read-only and does not accept a filesystem path. It reports the live HDS audit chain with the same report shape as `--audit-dump`. Control Center uses the JSON form to display `chain_valid` and `entry_count` as the resident hash-chain validator.

## Authority trace HTTP

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/authority/trace
```

`/authority/trace` is read-only. It projects Approval Gate, authority event, and command lifecycle entries from the live hash-chain audit so Control Center can inspect authority decisions without creating a second authority path.

## Documents

- [docs/ROADMAP.md](./docs/ROADMAP.md) - internal roadmap v9 and Sacred Constraints
- [docs/OPENCLAW_REJECTION_AUDIT.md](./docs/OPENCLAW_REJECTION_AUDIT.md) - internal OpenClaw rejection criteria
- [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md) - guided first-run path
- [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md) - permanent-use readiness checks
- [docs/CHANNEL_READINESS_MATRIX.md](./docs/CHANNEL_READINESS_MATRIX.md) - first-party / preview / reserved channel status
- [docs/CREDENTIAL_READINESS_MATRIX.md](./docs/CREDENTIAL_READINESS_MATRIX.md) - credential and env readiness
- [docs/UPDATE_ROLLBACK_RUNBOOK.md](./docs/UPDATE_ROLLBACK_RUNBOOK.md) - update, rollback, and recovery steps
- [docs/ADAPTER_CONTRACT.md](./docs/ADAPTER_CONTRACT.md) - downstream adapter boundary
- [docs/CAPABILITY_ENVELOPE.md](./docs/CAPABILITY_ENVELOPE.md) - manifest-driven capability rules
- [docs/CONFORMANCE.md](./docs/CONFORMANCE.md) - preview quarantine and release gates
- [docs/LLM_DEVELOPMENT_GUIDE.md](./docs/LLM_DEVELOPMENT_GUIDE.md) - Codex/LLM implementation rules
- [docs/doctor-output.md](./docs/doctor-output.md) - actionable doctor JSON/text fields
- [CLAIM.md](./CLAIM.md) - product claim and non-claim boundary
- [SECURITY.md](./SECURITY.md) - authority and memory security model
- [AUDIT.md](./AUDIT.md) - hash-chain audit and runtime snapshot
- [CONFIG.md](./CONFIG.md) - environment variables
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - operational fixes

## License

MIT. See [LICENSE](./LICENSE).

## Package map

Source packages live under `packages/`; runtime apps live under `apps/`. Root files are limited to workspace config, docs, install/deploy scripts, and release tooling.

| Path | Package | Role |
|---|---|---|
| `packages/protocol` | `@blue-tanuki/protocol` | HDS-BRAIN -> Executor protocol |
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

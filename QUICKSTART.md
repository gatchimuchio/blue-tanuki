# BLUE-TANUKI v0.1 Quickstart

v0.1 の最短経路は **WebChat Control Center + HDS Approval/Audit** である。Telegram は first-party channel として追加できる。Slack / Discord は preview adapter であり、credentials がない場合は安全に skip / silent fallback する。

v0.1 provides a guided first-run path, not a verified 5-minute beginner guarantee. 詳細な手順は [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md)、常駐運用の確認は [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md) を使う。

## 1. Install

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 2. Local setup

推奨:

```bash
pnpm run setup -- --yes
pnpm gateway:serve -- --env-file .blue-tanuki/blue-tanuki.env
```

手動 env の場合:

```bash
export WEBCHAT_TOKEN="replace-with-32chars-inbound-token"
export WEBCHAT_RESUME_TOKEN="replace-with-32chars-resume-token"
export LLM_BACKEND="stub"
pnpm gateway:serve
```

Open:

```text
http://127.0.0.1:8787/
```

## 3. First WebChat message

Control Center から短いメッセージを送る。HTTP で直接確認する場合:

```bash
curl -X POST http://127.0.0.1:8787/inbound \
  -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user":"local-user","content":"hello blue-tanuki"}'
```

## 4. Telegram

```bash
export TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
pnpm gateway:serve
```

Telegram inbound uses Bot API long polling. Outbound target is `chat_id`.

## 5. Daily Brief smoke

Daily Brief is a scheduled `channel_send` smoke by default. Gmail/GCal/Drive can be enabled as an optional read-only source after the basic smoke works.

```bash
export BLUE_TANUKI_DAILY_BRIEF_ENABLED=1
export BLUE_TANUKI_DAILY_BRIEF_CHANNEL=telegram
export BLUE_TANUKI_DAILY_BRIEF_TARGET="<telegram-chat-id>"
export BLUE_TANUKI_DAILY_BRIEF_TIME="07:00"
export BLUE_TANUKI_DAILY_BRIEF_CONTENT="Daily Brief: scheduled smoke from BLUE-TANUKI v0.1"
pnpm gateway:serve
```

Test interval:

```bash
export BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS=60000
```

Optional read-only Google source:

```bash
export BLUE_TANUKI_DAILY_BRIEF_GOOGLE_ENABLED=1
export BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES="gmail,calendar,drive"
export GOOGLE_ACCESS_TOKEN="<read-only-google-oauth-token>"
```

## 6. Boot-time scheduled-message smoke

```bash
export BLUE_TANUKI_SCHEDULES_JSON='[
  {
    "id": "minute-smoke",
    "channel": "webchat",
    "target": "local-user",
    "content": "scheduled smoke from BLUE-TANUKI",
    "interval_ms": 60000
  }
]'
pnpm gateway:serve
```

Boot-time schedules enter HDS-BRAIN as `cron.process` and share the same cron lane as approved runtime schedules.

## 7. Runtime schedules

Runtime schedule creation is enabled in v0.1 through `tool:schedule.*`. Listing is L1. Create/update/delete are L3 final-review operations and do not run until approved.

```text
tool:schedule.list
tool:schedule.create channel=webchat target=local-user content="runtime smoke" interval_ms=120000
tool:schedule.update id=<id> content="updated smoke"
tool:schedule.delete id=<id>
```

Pending, rejected, or timed-out schedule requests do not fire. Runtime snapshots expose ids, counts, timing metadata, and payload hashes, never schedule content.

## 8. Runtime snapshot

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

The snapshot exposes HDS state, audit chain validity, memory count, pending approvals, safe scheduled-task metadata, and authority-path invariants.

## 9. Next documents

- [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md)
- [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md)
- [docs/CHANNEL_READINESS_MATRIX.md](./docs/CHANNEL_READINESS_MATRIX.md)
- [docs/CREDENTIAL_READINESS_MATRIX.md](./docs/CREDENTIAL_READINESS_MATRIX.md)
- [docs/UPDATE_ROLLBACK_RUNBOOK.md](./docs/UPDATE_ROLLBACK_RUNBOOK.md)

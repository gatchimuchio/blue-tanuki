# BLUE-TANUKI v0.1 Quickstart

v0.1 の最短経路は **WebChat Control Center + Telegram + HDS Approval/Audit** です。
Slack / Discord は既存 adapter を silent fallback 付きで同時登録しますが、live 接続は credentials がある場合のみ有効です。

## 1. Install

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 2. Minimal local serve

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

## 3. Telegram

```bash
export TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
pnpm gateway:serve
```

Telegram inbound uses Bot API long polling. Outbound target is `chat_id`.

## 4. Daily Brief smoke

v0.1 の Daily Brief は Gmail/GCal/Drive を読まない **scheduled channel_send smoke** です。

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

## 5. Generic scheduled-message smoke

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

Generic schedules are boot-time config. They still pass through HDS-BRAIN as
`cron.process`; runtime schedule creation is not enabled in v0.1.

## 6. Runtime snapshot

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

The snapshot exposes HDS state, audit chain validity, memory count, pending approvals, and authority-path invariants.

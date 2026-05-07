# BLUE-TANUKI v0.1 Troubleshooting

## `WEBCHAT_TOKEN is required`

Set both WebChat tokens:

```bash
export WEBCHAT_TOKEN="..."
export WEBCHAT_RESUME_TOKEN="..."
```

## Telegram does not respond

Check:

- `TELEGRAM_BOT_TOKEN` is set
- bot has received `/start`
- BotFather privacy mode / group permissions
- outbound target is correct `chat_id`
- logs do not show Telegram API errors

## Daily Brief does not send

Check:

- `BLUE_TANUKI_DAILY_BRIEF_ENABLED=1`
- `BLUE_TANUKI_DAILY_BRIEF_TARGET` is set
- target channel is registered
- runtime snapshot shows audit chain valid
- for test, set `BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS=60000`

## Approval is asked even in full access

Expected for final-review operations:

- delete
- shell exec
- external send
- credential access
- settings write
- payment
- schedule create

## Runtime snapshot is unauthorized

Use inbound token, not resume token:

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" http://127.0.0.1:8787/runtime/snapshot
```

# BLUE-TANUKI v0.1 Troubleshooting

まず [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md) で初回経路を確認し、常駐運用では [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md) と [docs/UPDATE_ROLLBACK_RUNBOOK.md](./docs/UPDATE_ROLLBACK_RUNBOOK.md) を併用する。

## `pnpm` が見つからない

What failed: dependency / script runner が起動できない。

Next action:

- Node.js `>=22.14.0` を確認する
- Corepack を有効化する
- それでも無い場合は、この環境では `node scripts/...` で代替できるが、通常運用では pnpm を PATH に通す

## `WEBCHAT_TOKEN is required`

What failed: WebChat inbound token が未設定。

Fix:

```bash
export WEBCHAT_TOKEN="replace-with-32chars-inbound-token"
export WEBCHAT_RESUME_TOKEN="replace-with-32chars-resume-token"
```

`WEBCHAT_TOKEN` と `WEBCHAT_RESUME_TOKEN` は別値にする。

## Runtime snapshot is unauthorized

Use inbound token, not resume token:

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/runtime/snapshot
```

`/approval` と `/resume` は resume token 側の surface である。

## Approval is asked even in full access

Expected for L3 final-review operations:

- file delete
- shell exec
- external send
- credential access
- settings write
- payment charge
- schedule create
- schedule update
- schedule delete

Full access may auto-allow L1/L2, but never L3.

## Runtime schedule does not fire

Check:

- create/update/delete request is approved
- request did not time out
- schedule is `active`, not `pending`, `rejected`, `disabled`, or `deleted`
- `channel` and `target` are valid
- runtime snapshot shows schedule metadata but not schedule content

Pending, rejected, or timed-out runtime schedules are intentionally non-executable.

## Daily Brief does not send

Check:

- `BLUE_TANUKI_DAILY_BRIEF_ENABLED=1`
- `BLUE_TANUKI_DAILY_BRIEF_TARGET` is set
- target channel is registered
- runtime snapshot shows audit chain valid
- for test, set `BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS=60000`

v0.1 Daily Brief is scheduled-message smoke, not Gmail/GCal/Drive integration.

## Telegram does not respond

Check:

- `TELEGRAM_BOT_TOKEN` is set
- bot has received `/start`
- outbound target is correct `chat_id`
- BotFather privacy mode / group permissions
- logs do not show Telegram API errors

If WebChat works, Telegram failure is channel readiness, not HDS authority failure.

## Slack / Discord does not deliver

Slack and Discord are preview-level in v0.1.

Check:

- Slack: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_LIVE_TARGET`
- Discord: `DISCORD_BOT_TOKEN`, `DISCORD_LIVE_TARGET`
- live smoke skip path is acceptable when credentials are intentionally absent

See [docs/CHANNEL_READINESS_MATRIX.md](./docs/CHANNEL_READINESS_MATRIX.md).

## Audit chain broken

Do not continue normal operation until this is understood.

```bash
node apps/gateway/dist/main.js --audit-verify --json
node apps/gateway/dist/main.js --audit-dump --json
```

Then follow [docs/UPDATE_ROLLBACK_RUNBOOK.md](./docs/UPDATE_ROLLBACK_RUNBOOK.md). Quarantine is safer than editing the live chain casually.

## Update failed

Stop and inspect when:

- `doctor` exits with code `2`
- `--audit-verify` fails
- `release:verify` reports secret-like files
- Runtime Invariants change
- final-review no longer stops L3 operations

Use [docs/UPDATE_ROLLBACK_RUNBOOK.md](./docs/UPDATE_ROLLBACK_RUNBOOK.md) for source and release-bundle rollback.

# BLUE-TANUKI Channel Readiness Matrix

Channel count は品質指標ではない。first-party 扱いは、setup、credential、smoke、error recovery、audit compatibility、authority non-escalation が揃った場合に限る。

| Channel | Status | Setup difficulty | Credential | Live smoke | Skip path | Inbound | Outbound | Rate limit / backoff | Known failure modes | Next phase |
|---|---|---:|---|---|---|---|---|---|---|---|
| WebChat | first-party | low | `WEBCHAT_TOKEN`, `WEBCHAT_RESUME_TOKEN` | local smoke | n/a | yes | yes | local only | token missing, token reuse, port conflict | Control Center first-run status |
| Telegram | first-party | medium | `TELEGRAM_BOT_TOKEN` | credentialed path | silent fallback when unset | yes | yes | Bot API polling interval configurable | bot not started, wrong chat_id, privacy mode, token revoked | stronger live smoke docs |
| Slack | first-party-preview | medium | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` | supported when credentials/target exist | yes | preview | preview | partial / adapter-level | missing app token, Socket Mode failure, channel permission | Phase 8-S5 release polish |
| Discord | first-party-preview | medium | `DISCORD_BOT_TOKEN` | supported when credentials/target exist | yes | preview | preview | partial / adapter-level | gateway intent, channel permission, token revoked | Phase 8-S5 release polish |
| Microsoft Teams | first-party target | high | TBD OAuth/app registration | not yet | n/a | no | no | not implemented | enterprise app registration complexity | Phase 9-S4 |
| LINE | first-party target | high | TBD channel access token/secret | not yet | n/a | no | no | not implemented | regional/provider setup complexity | Phase 9-S4 |
| WhatsApp | reserved-third-party | high | third-party adapter-specific | not first-party | n/a | no core support | no core support | not warranted | ToS/stability/operation responsibility cannot be guaranteed by core | generic adapter IF only |

## Release Meaning

- `first-party`: BLUE-TANUKI core owns docs, smoke, conformance, failure mode, and compatibility matrix.
- `first-party-preview`: adapter exists, but release-quality permanent-use closure is not complete.
- `first-party target`: accepted future first-party direction, not current implementation.
- `reserved-third-party`: BLUE-TANUKI core intentionally does not implement or warrant the channel.

## Authority Rule

No channel metadata can escalate authority. Channel user IDs, roles, group metadata, thread metadata, webhook metadata, and adapter-specific metadata are downstream context only.

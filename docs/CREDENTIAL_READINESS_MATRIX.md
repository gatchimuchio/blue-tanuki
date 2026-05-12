# BLUE-TANUKI Credential Readiness Matrix

Secret values must never be printed in docs, logs, doctor output, runtime snapshots, or audit summaries. Length/status/digest-only reporting is acceptable where already implemented.

| Credential / env | Required for | Secret class | Setup source | Current doctor check | Safe missing behavior | Failure message / symptom | Rotation notes |
|---|---|---|---|---|---|---|---|
| `WEBCHAT_TOKEN` | WebChat inbound, `/ws-ticket`, read-only Control Center APIs | bearer secret | `pnpm setup` or manual env | required, length-only | no | `WEBCHAT_TOKEN is required for serve mode` | rotate with restart; must differ from resume token |
| `WEBCHAT_RESUME_TOKEN` | `/resume`, `/approval` | bearer secret | `pnpm setup` or manual env | required, separation check | no | `WEBCHAT_RESUME_TOKEN must differ from WEBCHAT_TOKEN` | rotate with restart; do not reuse inbound token |
| `BLUE_TANUKI_SETTINGS_TOKEN` | `/settings` JSON API | bearer secret | setup/settings env | optional | settings API disabled or inaccessible | 401/403 on settings API | rotate with restart; settings writes create env backup |
| `LLM_BACKEND` | executor provider selection | config | setup/manual | provider consistency check | yes, `stub` default | provider unavailable or unresolved backend hint | route only; does not grant authority |
| `ANTHROPIC_API_KEY` | Anthropic backend | API key | provider dashboard/manual env | required only when backend/hint needs it | yes if backend unused | provider not registered / live smoke skip | rotate at provider, restart gateway |
| `OPENAI_API_KEY` | OpenAI backend | API key | provider dashboard/manual env | required only when backend/hint needs it | yes if backend unused | provider not registered / live smoke skip | rotate at provider, restart gateway |
| `OPENAI_COMPAT_API_KEY` / `LLM_API_KEY` | OpenAI-compatible backend | API key | provider/manual env | required depending provider config | yes if backend unused | provider not registered | rotate at provider, restart gateway |
| `TELEGRAM_BOT_TOKEN` | Telegram channel | bot token | BotFather/manual env | optional token presence | yes, Telegram disabled/fallback | Telegram does not register/respond | revoke/regenerate in BotFather; restart |
| `SLACK_BOT_TOKEN` | Slack release-polished preview adapter | bot token | Slack app config | optional token presence | yes, Slack silent fallback | typed `slack_not_configured`, `invalid_auth`, `token_revoked`, or delivery error / live smoke skip | rotate Slack bot token, restart |
| `SLACK_APP_TOKEN` | Slack Socket Mode | app token | Slack app config | optional token presence | yes, Slack silent fallback | typed `slack_not_configured` or Socket Mode start failure | rotate Slack app token, restart |
| `DISCORD_BOT_TOKEN` | Discord release-polished preview adapter | bot token | Discord developer portal | optional token presence | yes, Discord silent fallback | typed `discord_not_configured`, token/permission error, or live smoke skip | rotate in developer portal, restart |
| `GITHUB_TOKEN` | `github.write` external write tool | API token | GitHub token settings/manual env | optional token presence | yes, `github.write` fails closed | `GITHUB_TOKEN is required for github.write; mutation_sent=false` | rotate in GitHub, restart gateway |
| `BLUE_TANUKI_GITHUB_REPOS` | `github.write` repository allowlist | repo list, not secret | manual env | optional presence | yes, `github.write` fails closed | allowlist missing/denied before mutation | list `owner/repo`; changing allowlist changes write reach |
| `GOOGLE_ACCESS_TOKEN` | Google read tools and optional Daily Brief Google source | OAuth access token | Google OAuth/manual env | Google Daily Brief source check when enabled | yes, Google read fails closed | `GOOGLE_ACCESS_TOKEN is required ... request_sent=false; mutation_sent=false` | rotate in Google account/OAuth client, restart gateway |
| `GMAIL_ACCESS_TOKEN` | `gmail.read` and Gmail Daily Brief source | OAuth access token | Google OAuth/manual env | Google Daily Brief source check when Gmail source enabled | yes, Gmail read fails closed | `GMAIL_ACCESS_TOKEN or GOOGLE_ACCESS_TOKEN is required for gmail.read; request_sent=false; mutation_sent=false` | prefer read-only Gmail scopes; rotate/restart |
| `GOOGLE_CALENDAR_ACCESS_TOKEN` | `google.calendar.read` and Calendar Daily Brief source | OAuth access token | Google OAuth/manual env | Google Daily Brief source check when Calendar source enabled | yes, Calendar read fails closed | `GOOGLE_CALENDAR_ACCESS_TOKEN or GOOGLE_ACCESS_TOKEN is required for google.calendar.read; request_sent=false; mutation_sent=false` | prefer read-only Calendar scopes; rotate/restart |
| `GOOGLE_DRIVE_ACCESS_TOKEN` | `google.drive.read` and Drive Daily Brief source | OAuth access token | Google OAuth/manual env | Google Daily Brief source check when Drive source enabled | yes, Drive read fails closed | `GOOGLE_DRIVE_ACCESS_TOKEN or GOOGLE_ACCESS_TOKEN is required for google.drive.read; request_sent=false; mutation_sent=false` | prefer metadata/read-only Drive scopes; rotate/restart |
| `WEBHOOK_TOKEN` | optional `/webhook` ingress | bearer secret | manual env | optional/separation check where configured | yes, webhook disabled | `/webhook` unauthorized/disabled | rotate with restart; must differ from WebChat/settings tokens |
| `BLUE_TANUKI_FILE_ROOT` | file search/write/edit tools | local path, not secret | setup/manual env | root/path check | file tools fail closed | file tool root required/denied | changing root changes tool reach; restart |
| `BLUE_TANUKI_SHELL_ROOT` | `shell.exec` | local path, not secret | manual env | root/path check | shell tool fails closed | shell root required/denied | final-review still required |
| `BLUE_TANUKI_AUDIT_DIR` | persisted audit | local path | setup/manual env | writability check | in-memory audit if unset in some modes | audit persistence missing/unwritable | backup before moving |
| `BLUE_TANUKI_SESSION_DIR` | persisted sessions | local path | setup/manual env | writability check | in-memory sessions if unset | session persistence missing/unwritable | backup before moving |
| `BLUE_TANUKI_MEMORY_DIR` | HDS long-term memory component | local path | setup/manual env | directory check if configured | memory persistence disabled/fails closed | memory unavailable | memory is not authority |
| `BLUE_TANUKI_APPROVALS_FILE` | reusable approval grants | local path | setup/manual env | path parent check if configured | in-memory grants | grants not persisted | grants never bypass L3 |
| `BLUE_TANUKI_SCHEDULES_DIR` | runtime schedule store | local path | default/manual env | schedule config release gate | default `.blue-tanuki/schedules` | schedule store unwritable | backup with local runtime data |
| `SLACK_LIVE_TARGET` | live smoke | target id | manual env | not doctor-owned | live smoke skip | Slack live check skipped | use test channel |
| `DISCORD_LIVE_TARGET` | live smoke | target id | manual env | not doctor-owned | live smoke skip | Discord live check skipped | use test channel |

## Rotation Rule

Credential rotation is a configuration change, not an authority change. Rotating a token must not alter HDS-BRAIN, Approval Gate, Runtime Invariants, or hash-chain compatibility.

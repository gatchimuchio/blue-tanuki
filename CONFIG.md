# BLUE-TANUKI v0.1 Configuration

## Required for serve

```bash
WEBCHAT_TOKEN=...
WEBCHAT_RESUME_TOKEN=...
```

Tokens must differ.

## Optional LLM

```bash
LLM_BACKEND=stub
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

## Telegram

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_POLL_INTERVAL_MS=1500
TELEGRAM_POLL_TIMEOUT_SEC=25
```

## Daily Brief smoke

```bash
BLUE_TANUKI_DAILY_BRIEF_ENABLED=1
BLUE_TANUKI_DAILY_BRIEF_CHANNEL=telegram
BLUE_TANUKI_DAILY_BRIEF_TARGET=<chat-id-or-channel-target>
BLUE_TANUKI_DAILY_BRIEF_TIME=07:00
BLUE_TANUKI_DAILY_BRIEF_CONTENT="Daily Brief: scheduled smoke"
```

For smoke testing:

```bash
BLUE_TANUKI_DAILY_BRIEF_INTERVAL_MS=60000
```

## Generic scheduled messages

```bash
BLUE_TANUKI_SCHEDULES_JSON='[
  {
    "id": "ops-smoke",
    "channel": "webchat",
    "target": "local-user",
    "content": "scheduled smoke",
    "time": "07:00"
  }
]'
```

Fields:

- `id`: stable task id. Must match `[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}`.
- `channel`: outbound channel name, such as `webchat` or `telegram`.
- `target`: outbound target for that channel.
- `content`: message body. It is never included in runtime snapshots.
- `time`: optional local `HH:MM`; defaults to `07:00`.
- `interval_ms`: optional positive integer for smoke tests.
- `enabled`: optional boolean; `false` keeps the task visible but not running.

Generic schedules are boot-time config only. Runtime schedule creation remains
outside v0.1 and must go through the final-review boundary when added.

## Webhook ingress

```bash
WEBHOOK_TOKEN=...
```

When set, `POST /webhook` accepts JSON with `content`, `text`, or `event`.
The webhook token must differ from the WebChat inbound, resume, and settings tokens.
Webhook metadata is normalized and cannot carry authority.

## File tools

```bash
BLUE_TANUKI_FILE_ROOT=/path/to/workspace
```

`file.search`, `file.write`, and `file.edit` only operate under this root.
Secret-like paths and symlink escapes are denied.

Request examples:

```text
tool:file.search root=. query=needle max_results=5
tool:file.write path=notes/today.md content="hello" mode=create
tool:file.edit path=notes/today.md search=hello replace=hi expected_replacements=1
```

## Web search

```bash
BLUE_TANUKI_WEB_SEARCH_ENDPOINT=https://search.example.com/search?q={query}&count={max_results}
BLUE_TANUKI_HTTP_ALLOWLIST=search.example.com
```

`web.search` is disabled unless the endpoint is configured. The endpoint can use
`{query}` and `{max_results}` placeholders, or BLUE-TANUKI will append `q` and
`count` query parameters. Requests inherit `http.fetch` SSRF protections.

## GitHub read tool

`github.read` is read-only, unauthenticated, and fixed to `api.github.com` in
v0.1. It supports public repo metadata, issue metadata, issue lists, pull
request metadata, and pull request lists.

```text
tool:github.read resource=repo owner=gatchimuchio repo=blue-tanuki
tool:github.read resource=issues owner=gatchimuchio repo=blue-tanuki state=open max_results=5
tool:github.read resource=pr owner=gatchimuchio repo=blue-tanuki number=1
```

## Browser read tool

`browser.read` is a lightweight page reader, not a full headless Chromium
automation backend. It fetches public pages through the same SSRF guard as
`http.fetch`, then returns bounded title, text, and links.

```text
tool:browser.read url=https://example.com max_chars=4000
```

## Shell exec tool

```bash
BLUE_TANUKI_SHELL_ROOT=/path/to/workspace
```

`shell.exec` runs a non-shell command (`cmd` + `args[]`) with its working
directory fixed under this root. It is always a final-review operation.

```text
tool:shell.exec {"cmd":"git","args":["status","-sb"],"cwd":"."}
```

## Persistence

```bash
BLUE_TANUKI_AUDIT_DIR=.blue-tanuki/audit
BLUE_TANUKI_MEMORY_DIR=.blue-tanuki/memory
BLUE_TANUKI_SESSION_DIR=.blue-tanuki/sessions
BLUE_TANUKI_APPROVALS_FILE=.blue-tanuki/approvals/grants.json
```

## Approval

```bash
BLUE_TANUKI_APPROVAL_MODE=full_access
# Alternatives: ask_every_time, remember_this_decision
```

`full_access` remains final-review guarded.

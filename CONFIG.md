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

## File tools

```bash
BLUE_TANUKI_FILE_ROOT=/path/to/workspace
```

`file.search`, `file.write`, and `file.edit` only operate under this root.
Secret-like paths and symlink escapes are denied.

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

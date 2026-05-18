# BLUE-TANUKI v1.0 Release Candidate

BLUE-TANUKI is a local resident AI control plane.

## TL;DR

1. **HDS-BRAIN owns authority.** LLMs, tools, cron, and channels are downstream devices.
2. **No black box in the HDS authority path.** Actor/process/memory/approval/execution/audit are structured and inspectable.
3. **Safety first, robustness second, comfort/UX third.** Feature coverage and channel coverage never outrank the HDS authority boundary.

## v1.0 RC completed surface

- WebChat Control Center at `/` and `/app`
- Runtime snapshot at `/runtime/snapshot`
- Authority trace at `/authority/trace`
- Resident notifications at `/notifications`
- Scheduled task snapshot in Control Center
- Resident Control Center status cards for first-run next action, permanent-use status, approvals, runtime schedules, audit chain, and authority trace
- Guided first-run installer via `pnpm installer:run`
- SIM-like LLM API settings with token-gated `Verify LLM` before saving provider changes
- Portable resident app launcher commands for background start/status/stop, logs, Control Center open, and explicit autostart management
- Plugin Review Gate via `pnpm plugin:review` for Layer B submissions and bundled package review before workspace plugin loading
- HDS Process / Memory / Authority closure
- deterministic `MemoryTrace` with `used_for_authority=false`
- standalone `CompleteHistoryStore` with append / verify / replay / export and `used_for_authority=false`
- standalone Runtime Invariants evidence reports with audit-chain projection
- Approval Gate with final-review boundary
- hash-chain audit logs
- Telegram Bot API channel
- Slack / Discord adapters with silent fallback, retry/backoff, typed delivery errors, and credentialed live smoke path
- Teams / LINE preview adapters with silent fallback, retry/backoff, typed delivery errors, and credentialed live smoke skip path
- Daily Brief and generic scheduled-message smoke via internal cron, with optional read-only Google source
- Optional token-gated HTTP webhook ingress at `/webhook`
- Built-in `file.search`, `file.write`, `file.edit`, `http.fetch`, `web.search`, `github.read`, `github.write`, `gmail.read`, `gmail.write`, `google.calendar.read`, `google.calendar.write`, `google.drive.read`, `google.drive.write`, `browser.read`, `browser.snapshot`, `browser.automation`, and `shell.exec` with sandbox / network / approval guards

## v1.0 RC explicit boundaries

- WhatsApp is not a first-party core target. It is `reserved-third-party` and may only be approached through the generic adapter interface.
- Google integrations are credential-scoped downstream tools. Reads are summary/metadata only; writes are bounded and always final-review.
- Teams / LINE are preview channel adapters until owner-run credentialed live smoke and permanent-use recovery are verified.
- Voice / Mobile / rich Canvas are deferred to v0.2+.
- Public third-party Skill registry is intentionally excluded.
- Plugin / skill / third-party adapter review evidence is downstream-only and cannot approve, execute, classify risk, or promote support status.

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

v1.0 RC provides a guided first-run path, not a verified 5-minute beginner guarantee. Use [docs/FIRST_RUN_CHECKLIST.md](./docs/FIRST_RUN_CHECKLIST.md) for the full first-run path and [docs/PERMANENT_USE_CHECKLIST.md](./docs/PERMANENT_USE_CHECKLIST.md) before leaving BLUE-TANUKI running permanently.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm installer:run -- --no-serve

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

The guided installer is a portable first-run accelerator. It is not a signed
native installer, not an automatic updater, and not a verified 5-minute setup
guarantee. Use `Verify LLM` in Settings before saving non-stub provider
changes.

Portable installer launchers also expose a resident lifecycle path:

```bash
blue-tanuki resident-start
blue-tanuki resident-status
blue-tanuki resident-open
blue-tanuki resident-logs
blue-tanuki resident-stop
blue-tanuki resident-autostart-enable
blue-tanuki resident-autostart-disable
```

Autostart is opt-in only. See [docs/RESIDENT_APP_GUIDE.md](./docs/RESIDENT_APP_GUIDE.md).

## Telegram

```bash
export TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
pnpm gateway:serve
```

## Preview channels

Slack, Discord, Teams, and LINE are downstream preview channels. Missing credentials are safe: adapters stay in silent fail-closed mode and `pnpm smoke:live` reports SKIP unless credentials and live targets are set.
Phase 11-S11 adds `pnpm validate:channels` as the promotion gate: these channels do not become `first-party` until owner-run credentialed live smoke and recovery evidence are recorded. Teams and LINE also require gateway-owned inbound listener closure before promotion.

```bash
export MICROSOFT_GRAPH_ACCESS_TOKEN="<graph-oauth-token>"
export TEAMS_LIVE_TARGET="channel/<urlencoded-team-id>/<urlencoded-channel-id>"

export LINE_CHANNEL_ACCESS_TOKEN="<line-channel-token>"
export LINE_LIVE_TARGET="<line-user-or-group-or-room-id>"
```

Teams target forms are `channel/...`, `reply/...`, or `chat/...`. LINE targets are reachable userId, groupId, or roomId values. Channel metadata and delivery results never grant authority.

## Daily Brief smoke

```bash
export BLUE_TANUKI_DAILY_BRIEF_ENABLED=1
export BLUE_TANUKI_DAILY_BRIEF_CHANNEL=telegram
export BLUE_TANUKI_DAILY_BRIEF_TARGET="<telegram-chat-id>"
export BLUE_TANUKI_DAILY_BRIEF_TIME="07:00"
export BLUE_TANUKI_DAILY_BRIEF_CONTENT="Daily Brief: scheduled smoke from BLUE-TANUKI v1.0 RC"
pnpm gateway:serve
```

By default, v1.0 RC Daily Brief is a scheduled `channel_send` smoke.
To opt into read-only Gmail / Google Calendar / Drive summaries, configure read-only OAuth tokens and enable the Google source:

```bash
export BLUE_TANUKI_DAILY_BRIEF_GOOGLE_ENABLED=1
export BLUE_TANUKI_DAILY_BRIEF_GOOGLE_SERVICES="gmail,calendar,drive"
export GOOGLE_ACCESS_TOKEN="<read-only-google-oauth-token>"
```

Service-specific tokens can be used instead: `GMAIL_ACCESS_TOKEN`, `GOOGLE_CALENDAR_ACCESS_TOKEN`, and `GOOGLE_DRIVE_ACCESS_TOKEN`.
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

## GitHub tools

`github.read` is read-only and unauthenticated. `github.write` is authenticated, restricted to `api.github.com`, restricted to allowlisted repositories, and always L3 final-review. Full access and remembered grants do not bypass owner confirmation.

```text
tool:github.read resource=repo owner=gatchimuchio repo=blue-tanuki
tool:github.read resource=issues owner=gatchimuchio repo=blue-tanuki state=open max_results=5
tool:github.read resource=pr owner=gatchimuchio repo=blue-tanuki number=1
```

```bash
export GITHUB_TOKEN="github-token-with-issue-pr-scope"
export BLUE_TANUKI_GITHUB_REPOS="gatchimuchio/blue-tanuki"
```

```text
tool:github.write operation=issue.create owner=gatchimuchio repo=blue-tanuki title="Bug report" body="details"
tool:github.write operation=issue.comment.create owner=gatchimuchio repo=blue-tanuki number=1 body="follow-up"
tool:github.write operation=issue.update owner=gatchimuchio repo=blue-tanuki number=1 title="Updated title"
tool:github.write operation=pr.create owner=gatchimuchio repo=blue-tanuki title="Change" head=feature base=main draft=true
tool:github.write operation=pr.comment.create owner=gatchimuchio repo=blue-tanuki number=1 body="review note"
```

`github.write` output returns safe GitHub ids/URLs and a `result_digest`; it never prints the token.

## Google tools

Google tools are fixed to Google API hosts. They require operator-provided OAuth tokens. Read tools return bounded summaries; write tools are downstream mutations and always L3 final-review.

```bash
export GOOGLE_ACCESS_TOKEN="<google-oauth-token>"
```

```text
tool:gmail.read query="newer_than:1d" max_results=5
tool:google.calendar.read calendar_id=primary days=1 max_results=5
tool:google.drive.read query="trashed=false" max_results=5
```

Write examples:

```text
tool:gmail.write operation=draft.create to=owner@example.com subject="Draft" body_text="hello"
tool:gmail.write operation=message.send to=owner@example.com subject="Notice" body_text="hello"
tool:google.calendar.write operation=event.create calendar_id=primary summary="Standup" start=2026-05-12T09:00:00Z end=2026-05-12T09:15:00Z
tool:google.calendar.write operation=event.update calendar_id=primary event_id=<event-id> summary="Updated"
tool:google.calendar.write operation=event.delete calendar_id=primary event_id=<event-id>
tool:google.drive.write operation=file.create name=notes.txt content="hello"
tool:google.drive.write operation=file.update file_id=<file-id> content="updated"
```

Calendar attendee invites, Drive delete/share, autonomous cross-service actions, and unbounded file writes are not implemented. Tool output is bounded summary/metadata plus `result_digest`; tokens are never returned.

## Browser read tool

`browser.read` is a lightweight, no-JavaScript page reader. It fetches a public URL through the same SSRF guard as `http.fetch`, then extracts bounded title, text, and links.

```text
tool:browser.read url=https://example.com max_chars=4000
```

## Browser automation preview

`browser.snapshot` and `browser.automation` are disabled-by-default preview tools. They require explicit operator opt-in:

```bash
export BLUE_TANUKI_BROWSER_AUTOMATION_PREVIEW=1
```

`browser.snapshot` captures a bounded headless page snapshot without credentials, persistent profile, downloads, custom headers, or storage state. It uses the same public-address / allowlist network policy as `http.fetch`.

```text
tool:browser.snapshot url=https://example.com max_chars=4000
```

`browser.automation` is reserved for guarded browser actions and maps to L3 final-review. The preview currently provides a smoke skip path and a guarded `navigate` path; side-effect actions such as click, form submit, upload, and download stay quarantined until they have release-quality containment.

```text
tool:browser.automation action=smoke
tool:browser.automation action=navigate url=https://example.com
```

See [docs/phase8-s6-browser-automation-preview.md](./docs/phase8-s6-browser-automation-preview.md).

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
  "complete_history_used_for_authority": false,
  "final_review_boundary_enforced_by_approval_gate": true
}
```

The legacy `hds.invariants` object is paired with `hds.runtime_invariants`, an HDS-BRAIN evidence report containing expected/actual values, per-invariant evidence, `all_ok`, and a report digest.

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

The resident Approval Queue displays pending count, `ApprovalLevel`, final-review status, one-time token expiry, reason, and redacted authority trace context.

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

`/authority/trace` is read-only. It projects Approval Gate, authority event, command lifecycle, and safe `F:<id>` memory-reference entries from the live hash-chain audit so Control Center can inspect authority decisions without creating a second authority path.

## Resident notifications HTTP

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  http://127.0.0.1:8787/notifications
```

`/notifications` is read-only and display-only. It projects approval-required, schedule fired/failed, connector failure, and audit warning notifications from existing runtime and audit state. Notifications cannot approve, reject, execute, mutate audit, or grant authority.

## Complete history / replay HTTP

```bash
curl -H "Authorization: Bearer $WEBCHAT_TOKEN" \
  "http://127.0.0.1:8787/history/replay?limit=50"
```

`/history` and `/history/replay` are read-only Control Center surfaces over `CompleteHistoryStore`. They expose replay metadata, payload digests, entry hashes, request ids, command ids, and `complete_history_used_for_authority=false`; they do not expose raw payloads, command content, rendered output, approval tokens, or credentials.

## Documents

- [docs/ROADMAP.md](./docs/ROADMAP.md) - internal roadmap v9 and Sacred Constraints
- [docs/OPENCLAW_REJECTION_AUDIT.md](./docs/OPENCLAW_REJECTION_AUDIT.md) - internal OpenClaw rejection criteria
- [docs/phase8-s4-github-write.md](./docs/phase8-s4-github-write.md) - GitHub write safety boundary
- [docs/phase8-s5-slack-discord-polish.md](./docs/phase8-s5-slack-discord-polish.md) - Slack / Discord release-polished preview boundary
- [docs/phase8-s6-browser-automation-preview.md](./docs/phase8-s6-browser-automation-preview.md) - browser automation preview boundary
- [docs/phase9-s1-f-reference-audit.md](./docs/phase9-s1-f-reference-audit.md) - F-reference memory audit boundary
- [docs/phase9-s2-google-read-integration.md](./docs/phase9-s2-google-read-integration.md) - Google read integration boundary
- [docs/phase9-s3-google-write-integration.md](./docs/phase9-s3-google-write-integration.md) - Google write integration boundary
- [docs/phase9-s4-teams-line-adapters.md](./docs/phase9-s4-teams-line-adapters.md) - Teams / LINE preview adapter boundary
- [docs/phase10-s1-control-center-approval-ux.md](./docs/phase10-s1-control-center-approval-ux.md) - Control Center resident approval UX boundary
- [docs/phase10-s2-resident-notifications.md](./docs/phase10-s2-resident-notifications.md) - resident notification center boundary
- [docs/phase10-s3-distribution-ux-hardening.md](./docs/phase10-s3-distribution-ux-hardening.md) - install/update/uninstall distribution readiness boundary
- [docs/PLUGIN_REVIEW_GATE.md](./docs/PLUGIN_REVIEW_GATE.md) - Layer B plugin / skill / adapter acceptance boundary
- [docs/phase11-s12-plugin-review-gate-implementation.md](./docs/phase11-s12-plugin-review-gate-implementation.md) - Plugin Review Gate implementation boundary
- [docs/hds-brain-standalone-boundary.md](./docs/hds-brain-standalone-boundary.md) - HDS-BRAIN standalone kernel and downstream limbs boundary
- [docs/phase12-s-1-hds-brain-standalone-completeness.md](./docs/phase12-s-1-hds-brain-standalone-completeness.md) - Phase 12-S-1 standalone completeness lock
- [docs/hds-brain-risk-approval-boundary.md](./docs/hds-brain-risk-approval-boundary.md) - L1/L2/L3 and unknown operation boundary
- [docs/hds-brain-reference-boundary.md](./docs/hds-brain-reference-boundary.md) - memory/history/session/tool-result reference boundary
- [docs/hds-brain-fail-safe-policy.md](./docs/hds-brain-fail-safe-policy.md) - HDS-BRAIN fail-safe suspend policy
- [docs/hds-brain-unknown-escalation-policy.md](./docs/hds-brain-unknown-escalation-policy.md) - unknown/ambiguous/unclassified escalation policy
- [docs/hds-brain-detector-lifecycle.md](./docs/hds-brain-detector-lifecycle.md) - detector lifecycle and unknown pattern escalation boundary
- [docs/hds-brain-trinity-m-policy-model.md](./docs/hds-brain-trinity-m-policy-model.md) - Trinity M policy model
- [docs/phase12-s0-boundary-definition-lock.md](./docs/phase12-s0-boundary-definition-lock.md) - Phase 12-S0 boundary definition lock
- [docs/hds-brain-output-audit-plane.md](./docs/hds-brain-output-audit-plane.md) - output/result audit plane boundary
- [docs/phase12-s1-output-result-audit-plane.md](./docs/phase12-s1-output-result-audit-plane.md) - Phase 12-S1 output/result audit plane
- [docs/hds-brain-complete-history-substrate.md](./docs/hds-brain-complete-history-substrate.md) - complete history substrate boundary
- [docs/phase12-s2-local-complete-history-substrate.md](./docs/phase12-s2-local-complete-history-substrate.md) - Phase 12-S2 complete history substrate
- [docs/hds-brain-runtime-invariants-evidence.md](./docs/hds-brain-runtime-invariants-evidence.md) - Runtime Invariants evidence boundary
- [docs/phase12-s3-runtime-invariants-evidence.md](./docs/phase12-s3-runtime-invariants-evidence.md) - Phase 12-S3 Runtime Invariants evidence
- [docs/phase12-s4-final-review-single-source.md](./docs/phase12-s4-final-review-single-source.md) - Phase 12-S4 final-review operation source-of-truth lock
- [docs/phase12-s5-approval-notification-history-replay-ui.md](./docs/phase12-s5-approval-notification-history-replay-ui.md) - Phase 12-S5 resident history/replay UI completion
- [docs/phase12-s6-root-full-access-compound-attack-scenarios.md](./docs/phase12-s6-root-full-access-compound-attack-scenarios.md) - Phase 12-S6 root full-access compound attack test lock
- [docs/phase12-s7-detector-lifecycle-unknown-pattern-escalation.md](./docs/phase12-s7-detector-lifecycle-unknown-pattern-escalation.md) - Phase 12-S7 detector lifecycle and unknown pattern escalation
- [docs/phase12-s8-hds-brain-fail-safe-self-health-policy.md](./docs/phase12-s8-hds-brain-fail-safe-self-health-policy.md) - Phase 12-S8 executable fail-safe self-health boundary
- [docs/v1.0-security-and-permanent-use-review.md](./docs/v1.0-security-and-permanent-use-review.md) - v1.0 security and permanent-use closure
- [docs/v1.0-release-candidate.md](./docs/v1.0-release-candidate.md) - v1.0 RC validation, support boundary, and upgrade notes
- [docs/v1.0-post-rc-closure-review.md](./docs/v1.0-post-rc-closure-review.md) - post-RC bundle, smoke, live-smoke, preview-promotion, installer, and updater decisions
- [docs/INSTALLER_GUIDE.md](./docs/INSTALLER_GUIDE.md) - guided first-run installer and SIM-like LLM API settings
- [docs/phase11-s9-installer-setup-ux.md](./docs/phase11-s9-installer-setup-ux.md) - Phase 11-S9 implementation report
- [docs/RESIDENT_APP_GUIDE.md](./docs/RESIDENT_APP_GUIDE.md) - resident launcher lifecycle and explicit autostart
- [docs/phase11-s10-resident-application-integration.md](./docs/phase11-s10-resident-application-integration.md) - Phase 11-S10 implementation report
- [docs/CHANNEL_PROMOTION_GATE.md](./docs/CHANNEL_PROMOTION_GATE.md) - channel first-party promotion evidence gate
- [docs/phase11-s11-channel-first-party-promotion.md](./docs/phase11-s11-channel-first-party-promotion.md) - Phase 11-S11 implementation report
- [docs/INDEX.md](./docs/INDEX.md) - documentation index
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
| `packages/hds-brain` | `@blue-tanuki/hds-brain` | standalone upstream authority control kernel |
| `packages/blue-tanuki` | `@blue-tanuki/core` | executor, LLM backend, tools, sessions |
| `packages/channel-base` | `@blue-tanuki/channel-base` | channel interfaces/router/dispatcher |
| `packages/channel-webchat` | `@blue-tanuki/channel-webchat` | local Control Center + HTTP/WS channel |
| `packages/channel-telegram` | `@blue-tanuki/channel-telegram` | Telegram Bot API channel |
| `packages/channel-slack` | `@blue-tanuki/channel-slack` | Slack channel adapter |
| `packages/channel-discord` | `@blue-tanuki/channel-discord` | Discord channel adapter |
| `packages/channel-teams` | `@blue-tanuki/channel-teams` | Microsoft Teams preview channel adapter |
| `packages/channel-line` | `@blue-tanuki/channel-line` | LINE preview channel adapter |
| `apps/gateway` | `@blue-tanuki/gateway` | runtime wiring |

## Release boundary

Release archives are source bundles, not standalone binaries. They intentionally exclude `node_modules`, local `.env` files, audit/session data, and secret-like backups.

`doctor` includes a `distribution_readiness` gate for installer docs, update and rollback guidance, uninstall/purge paths, and release-bundle checks. BLUE-TANUKI does not currently ship a signed native installer or automatic updater.

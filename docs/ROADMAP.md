# BLUE-TANUKI Roadmap v9

この文書は `docs/IMPLEMENTATION_INSTRUCTIONS.md` と同じ実行順序を示す圧縮ロードマップである。
実装時の source of truth は常に `docs/IMPLEMENTATION_INSTRUCTIONS.md` と `AGENTS.md`。この文書は人間が全体像を素早く確認するための案内であり、詳細な phase 要件、検証コマンド、acceptance criteria は active instruction file を参照する。

## 0. 不変原則

BLUE-TANUKI は local owner-operated resident AI control plane である。

```md
HDS-BRAIN owns authority.
LLMs, tools, channels, plugins, skills, memory, cron, browser automation, UI, onboarding, update flows, companion apps, and external services are downstream devices.
```

優先順位は固定:

1. Safety
2. Robustness
3. Comfort / UX
4. Feature coverage / channel coverage / extensibility

OpenClaw は設計の出発点ではなく、拒否済み design pattern として扱う。BLUE-TANUKI は feature breadth や channel count ではなく、安全な永続運用を完成条件にする。

## 1. Completion Bands

### Band A - Safety Kernel

Goal:

- authority path closed
- Approval Gate closed
- audit closed
- Runtime Invariants visible

Status: mostly implemented.

### Band B - v0.1 Completion

Goal:

- local owner setup works
- WebChat / Telegram smoke works
- runtime schedule is safe
- approval levels are first-class
- operator usability closure exists
- release bundle and validation pass

Remaining primary work:

- v0.1 live smoke cleanup
- docs consistency

### Band C - v0.1.x Stabilization

Goal:

- GitHub write downstream tool
- browser automation preview
- stronger live smoke
- conformance test expansion

### Band D - v0.2 Capability Expansion

Goal:

- Google integrations
- Teams / LINE
- F-reference audit integration
- memory continuity without memory authority
- adapter maturity

### Band E - v0.3 Resident UX

Goal:

- Control Center polish
- notification center
- approval UX
- settings UX
- installer experience
- local app feel

### Band F - v1.0 Release Hardening

Goal:

- repeatable install
- documented recovery
- stable extension boundary
- security review checklist complete
- permanent-use UX proven
- v1.0 support / no-support boundary clear
- no critical preview paths in main release

## 2. Execution Queue

Codex must proceed sequentially unless explicitly instructed otherwise.

| Phase | Band | Task | Priority | Dependency |
|---|---|---|---:|---|
| 8-S1 | B | ApprovalLevel first-class + runtime schedule CRUD | P0 | completed |
| 8-S2a | B | Operator Usability Docs (First-Run + Permanent-Use + Matrices + Runbook) | P0 | completed |
| 8-S2b | B | Doctor Actionable Output + Control Center First-Run Status | P0 | completed |
| 8-S3 | B | OpenClaw Rejection Audit document | P0 | completed |
| 8-S4 | C | GitHub write tool | P1 | completed |
| 8-S5 | C | Slack / Discord release polish + live smoke | P1 | completed |
| 8-S6 | C | Browser automation preview | P2 | completed |
| 9-S1 | D | F-reference audit integration | P1 | completed |
| 9-S2 | D | Gmail / Google Calendar / Drive read integration | P1 | completed |
| 9-S3 | D | Google write integration | P2 | completed |
| 9-S4 | D | Teams / LINE adapters | P2 | completed |
| 10-S1 | E | Control Center approval UX polish | P1 | completed |
| 10-S2 | E | Resident notification center | P2 | completed |
| 10-S3 | E | Distribution UX hardening | P1 | completed |
| 11-S1 | F | v1.0 security review closure | P0 | completed |
| 11-S2 | F | v1.0 permanent-use release candidate | P0 | completed |

## 3. Current Active Phase

```txt
v1.0 RC complete - owner release decision
```

Phase 11-S2 is complete. Next work is owner release decision, release publication, or post-RC fixes.

## 4. Completed Phase Summaries

### Phase 8-S1

- First-class `ApprovalLevel`
- Three-tier `ApprovalRisk`
- L3 runtime schedule create/update/delete
- L1 runtime schedule list
- Schedule lifecycle audit
- Safe runtime schedule snapshot metadata

### Phase 8-S2a

- First-run checklist
- Permanent-use checklist
- Channel readiness matrix
- Credential readiness matrix
- Update / rollback / recovery runbook
- Quickstart and troubleshooting alignment
- Static docs checker

### Phase 8-S2b

- Actionable doctor remediation fields
- Safe first-run runtime snapshot status fields
- Runtime status helper and tests
- WebChat runtime snapshot auth / no-secret regression

### Phase 8-S3

- Internal OpenClaw rejection audit document
- Engineering rejection criteria for feature breadth, channel count, unsafe plugin surfaces, and first-run-only claims
- WhatsApp first-party exclusion recorded as deliberate safety and liability boundary
- Active execution lane advanced to Phase 8-S4 GitHub write

### Phase 8-S4

- Authenticated `github.write` downstream tool
- GitHub issue create/comment/update and PR create/comment operations
- `GITHUB_TOKEN` plus `BLUE_TANUKI_GITHUB_REPOS` fail-closed boundary
- L3 final-review mapping for GitHub write operations
- Audit-safe result digest and bounded output
- Active execution lane advanced to Phase 8-S5 Slack / Discord release polish

### Phase 8-S5

- Slack / Discord adapter-level retry/backoff confirmed and documented
- Typed recoverable / non-recoverable delivery errors added to downstream send results
- Live smoke failure output now includes typed delivery detail and owner next action
- Compatibility matrix keeps Slack / Discord as release-polished preview until owner credentialed live smoke
- Active execution lane advanced to Phase 8-S6 browser automation preview

### Phase 8-S6

- Disabled-by-default browser automation preview
- Guarded `browser.snapshot` and `browser.automation` tool paths
- L2/L3 ApprovalLevel mapping and credential denial
- Smoke skip path for preview-disabled operation

### Phase 9-S1

- `F:<id>` memory read/write references in audit and Control Center traces
- HDS long-term memory remains non-authority with `memory_used_for_authority=false`

### Phase 9-S2

- Read-only Gmail, Google Calendar, and Google Drive tools
- Optional Google Daily Brief source with credential-scoped fail-closed behavior

### Phase 9-S3

- Bounded Gmail, Google Calendar, and Google Drive write tools
- Google writes map to L3 final-review and return audit-safe mutation summaries

### Phase 9-S4

- Microsoft Teams and LINE first-party-preview channel adapters
- Teams Graph send and LINE Messaging API push live smoke skip paths
- Conformance, doctor, compatibility matrix, and permanent-use docs updated
- Active execution lane advanced to Phase 10-S1 Control Center approval UX polish

### Phase 10-S1

- Control Center resident status polished around approval queue, runtime schedules, audit chain, and authority trace visibility
- Approval Queue now surfaces ApprovalLevel, final-review labeling, one-time token expiry, and redacted authority trace context
- Runtime schedules now show active/pending state, approval lifecycle metadata, and payload hashes without schedule content
- Runtime snapshot display now includes first-run next action and permanent-use status cards
- Active execution lane advanced to Phase 10-S2 resident notification center

### Phase 10-S2

- Display-only resident notifications added to WebChat at `/notifications`
- Control Center Notification Center surfaces approval-required, schedule fired/failed, connector failure, and audit-warning states
- Authority Trace now includes executor feedback summaries so downstream delivery failures can be surfaced without becoming authority
- Notification metadata is explicitly `display_only` and cannot approve, execute, mutate audit, or grant authority
- Active execution lane advanced to Phase 10-S3 distribution UX hardening

### Phase 10-S3

- Distribution readiness is now a `doctor` gate covering installer docs, update/rollback guidance, permanent-use checklist boundaries, release bundle checks, packaging validation, and uninstall/purge scripts
- Installer and rollback docs now make the no-signed-native-installer and no-automatic-updater boundaries explicit
- Packaging validation checks the distribution readiness surfaces
- Active execution lane advanced to Phase 11-S1 v1.0 security review closure

### Phase 11-S1

- v1.0 security and permanent-use review created at `docs/v1.0-security-and-permanent-use-review.md`
- Reviewed authority path, approval model, final-review operations, runtime automation, external write tools, channel adapters, memory/F-reference, browser preview, Google integrations, install/update/uninstall, audit, capability envelope, secret handling, sandboxes, docs, compatibility matrix, first-run UX, permanent-use UX, and recovery/rollback
- No release-blocking final-review bypass, hidden authority source, undocumented privileged operation, stale preview promotion, or false 5-minute claim was identified
- Active execution lane advanced to Phase 11-S2 v1.0 permanent-use release candidate

### Phase 11-S2

- Workspace package and plugin manifest versions advanced to `1.0.0-rc.1`
- v1.0 release-candidate document created at `docs/v1.0-release-candidate.md`
- Docs index created at `docs/INDEX.md`
- Compatibility matrix advanced first-party channels to `v1.0` and preview channels to `v1.0-preview` without promoting previews to first-party
- Release-candidate support/no-support boundary, upgrade notes, first-run proof, permanent-use proof, and validation matrix recorded
- Post-RC closure review records bundle sidecar integrity, Windows `smoke:resume` proof, credentialed live-smoke blocker, preview-channel promotion decision, signed-installer decision, and updater decision

## 5. Non-Goals

Do not add:

- agent-driven authority core
- emotion functionality
- WhatsApp first-party core implementation
- ClawHub compatibility
- unsafe third-party skill execution
- CLI-only final UX
- unsupported preview features in main release
- commercial SaaS roadmap
- hidden privilege escalation
- black-box authority path
- channel-count competition

## 6. Reference Docs

- [Active Implementation Instructions](IMPLEMENTATION_INSTRUCTIONS.md)
- [OpenClaw Rejection Audit](OPENCLAW_REJECTION_AUDIT.md)
- [Phase 8-S4 GitHub Write](phase8-s4-github-write.md)
- [Phase 8-S5 Slack / Discord Polish](phase8-s5-slack-discord-polish.md)
- [Phase 10-S3 Distribution UX Hardening](phase10-s3-distribution-ux-hardening.md)
- [v1.0 Security and Permanent-Use Review](v1.0-security-and-permanent-use-review.md)
- [v1.0 Release Candidate](v1.0-release-candidate.md)
- [v1.0 Post-RC Closure Review](v1.0-post-rc-closure-review.md)
- [Docs Index](INDEX.md)
- [First-Run Checklist](FIRST_RUN_CHECKLIST.md)
- [Permanent-Use Checklist](PERMANENT_USE_CHECKLIST.md)
- [Channel Readiness Matrix](CHANNEL_READINESS_MATRIX.md)
- [Credential Readiness Matrix](CREDENTIAL_READINESS_MATRIX.md)
- [Update / Rollback Runbook](UPDATE_ROLLBACK_RUNBOOK.md)
- [Adapter Contract](ADAPTER_CONTRACT.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)
- [Conformance](CONFORMANCE.md)
- [LLM Development Guide](LLM_DEVELOPMENT_GUIDE.md)
- [Security Review Checklist](SECURITY_REVIEW_CHECKLIST.md)
- [Non-Goals](NON_GOALS.md)
- [Compatibility Matrix](compatibility-matrix.json)

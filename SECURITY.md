# BLUE-TANUKI v1.0 RC Security Model

## Priority

1. Safety
2. Robustness
3. Comfort / UX
4. Feature and channel coverage

## Design stance

BLUE-TANUKI is designed for a local owner-operated environment where full-root / full-access operation may be the practical default.

That default does not weaken the safety path:

- Full-root operation may give the local operator broad system reach, but the BLUE-TANUKI authority path must still route privileged actions through the Approval Gate.
- The final-review boundary is non-bypassable. Full access, reusable grants, automation, cron, webhook ingress, channel metadata, memory, LLM output, and executor feedback must not bypass it.
- "Use at your own risk" is a statement about operational responsibility, not permission to relax robustness requirements.
- Robustness requirements remain in force regardless of disclaimers, support boundaries, or no-support OSS positioning.

This stance is implemented by the Hard invariants below and by the Final-review operations section: broad local capability is permitted only while the final-review boundary remains non-bypassable.

## Authority Path

The authority path is:

```text
InboundRequest
  -> ActorRef
  -> HDSProcessDefinition
  -> Frame
  -> deterministic MemoryTrace
  -> Model/Policy
  -> Commit
  -> process authority enforcement
  -> process execution-policy enforcement
  -> Approval Gate
  -> Executor
  -> Feedback
  -> hash-chain audit
```

HDS-BRAIN owns authority. LLMs, tools, channels, plugins, skills, memory, cron, browser automation, UI, onboarding, update flows, companion apps, and external services are downstream devices.

## HDS-BRAIN standalone boundary

HDS-BRAIN is a standalone authority control kernel before it is embedded in BLUE-TANUKI.

`packages/hds-brain` must be importable, instantiable, and testable without `apps/gateway`, the executor, channel packages, first-party operator packages, plugin loading, Control Center UI, LLM backends, browser implementations, GitHub clients, or Google clients.

Allowed dependencies are Node built-ins, `@blue-tanuki/protocol`, and local pure HDS-BRAIN modules. External systems connect through command envelopes and ports.

Standalone smoke:

```bash
pnpm hds:standalone
pnpm --filter @blue-tanuki/hds-brain test
```

## Downstream Limbs Doctrine

Downstream devices are limbs, not authority.

LLMs, tools, plugins, skills, channels, executors, schedulers, browser automation, external APIs, UI / Control Center, memory, history, session stores, audit viewers, and notification surfaces may sense, generate, execute, store, display, or report. They must not decide authority, substitute approval, escalate privileges, override risk classification, rewrite policy, bypass final review, or convert memory/history/session/tool results into authority.

UI / Control Center is also downstream. It can display HDS-BRAIN decisions and submit owner input back to the existing Approval Gate, but it cannot become a second authority path.

## Hard invariants

The Runtime Invariants endpoint exposes the current values for the core containment checks. Each invariant is also labeled by the kind of guarantee BLUE-TANUKI currently provides:

- **Structural guarantee**: the dependency graph, type shape, or module boundary makes the forbidden path physically absent from the authority path.
- **Runtime guarantee**: the path exists as data or policy evaluation, and is denied by deterministic checks and tests. Runtime checks remain in place even when a structural guarantee exists.

| Invariant | Runtime snapshot key | Current guarantee | Evidence |
|---|---|---|---|
| HDS-BRAIN never calls an LLM. | `hds_calls_llm=false` | Structural guarantee | `@blue-tanuki/hds-brain` emits `llm_call` commands but has no LLM client dependency. |
| HDS-BRAIN never trusts session history. | covered by `hds_calls_llm=false` and authority-path tests | Structural guarantee | Session history belongs to the downstream executor/session store. HDS-BRAIN receives only the current `InboundRequest`. |
| External metadata cannot upgrade actor/process authority. | `external_metadata_can_escalate_authority=false` | Runtime guarantee | Channel metadata is ignored for actor/process upgrades unless gateway normalization marks it as internal; spoofed external metadata is covered by tests. |
| MemoryTrace is `used_for_authority=false`. | `memory_used_for_authority=false` | Structural guarantee | `MemoryTrace.used_for_authority` is typed as the literal `false`; memory traces are context/audit inputs only. |
| Complete history is not authority. | `complete_history_used_for_authority=false` | Structural guarantee | Complete history is reserved as replay/evidence material. It cannot substitute approval or become a current authority decision source. |
| Process execution policy is enforced before command emission. | `process_policy_enforced=true` | Runtime guarantee | HDS-BRAIN evaluates actor/process policy and command execution policy before returning an executable command. |
| final-review operations cannot be bypassed by full access. | `final_review_boundary_enforced_by_approval_gate=true` | Runtime guarantee | Approval Gate evaluation remains between HDS ASSERT and executor execution; full access and reusable grants cannot skip final-review operations. |
| cron/webhook actors are not treated as humans. | covered by actor/process policy tests | Runtime guarantee | `cron` and `webhook` resolve to dedicated actor/process kinds with constrained execution policies. |
| executor feedback is audit evidence, not an authority signal. | covered by audit/feedback tests | Structural guarantee | Feedback is appended as an audit entry and has no code path that resumes a suspended request or creates authority. |

## ApprovalRisk and ApprovalLevel

`ApprovalRisk` and `ApprovalLevel` are separate axes.

- `ApprovalRisk`: severity, limited to `low | medium | high` in the current release.
- `ApprovalLevel`: workflow, expressed as `L1_observe | L2_operate | L3_final_review`.

`critical` is intentionally absent from the current release. If a future operation needs a severity above `high`, it must be added as a standalone security phase.

| Level | Name | Target | Approval behavior | Current implementation |
|---|---|---|---|---|
| L1 | observe gate | read-only/no-op/ordinary `llm.call` operations | auto-allow when policy permits; audit still records evaluation | `approvalLevelFromContext()` maps low-risk non-final-review operations to `L1_observe`. |
| L2 | operate gate | ordinary state-changing operations outside final-review | reusable grants may apply | medium-risk non-final-review operations map to `L2_operate`; `ApprovalGrantStore` can match operation/scope/risk/actor/capability. |
| L3 | final-review gate | file delete / shell exec / external send / credential access / settings write / payment charge / schedule create/update/delete / GitHub write / browser automation action | reusable grants and full access cannot bypass; owner confirmation required | `FINAL_REVIEW_OPERATIONS`, `risk === "high"`, and `finalReviewRequired()` force `ask`. |

Operationally, HDS-BRAIN may ASSERT a command, but the executor must not run it until Approval Gate evaluation has completed. The Approval Gate result, `approval_level`, authority trace, and downstream lifecycle events are recorded into the same hash-chain audit log before executor feedback closes the loop.

## Final-review operations

These always require review regardless of full-access default:

- file delete
- shell exec
- external send
- credential access
- settings write
- payment charge
- schedule create
- schedule update
- schedule delete
- GitHub issue/PR/comment write
- browser automation action
- Gmail / Google Calendar / Drive writes
- Teams / LINE outbound sends

`payment.charge` is a defensive placeholder. The current release has no payment feature, but any future payment-class operation is L3 from the moment it is introduced.

## Browser automation preview boundary

`browser.snapshot` and `browser.automation` are downstream preview tools. They do not create authority and cannot bypass Approval Gate.

Rules:

- The preview is disabled unless `BLUE_TANUKI_BROWSER_AUTOMATION_PREVIEW=1` is set.
- `browser.snapshot` is read-only headless page access and maps to `L2_operate`.
- `browser.automation` maps to `L3_final_review`; full access and reusable grants do not bypass owner confirmation.
- Credential use, cookies, storage state, custom headers, uploads, and downloads are rejected in the preview.
- Browser network requests must pass the same public-address and allowlist checks as `http.fetch`.
- The browser context is ephemeral: no persistent profile, no credential reuse, and downloads disabled.
- Preview output is bounded page metadata/text and contains no cookies, tokens, storage state, or screenshots.

## GitHub write boundary

`github.write` is a downstream external write tool. It is never authority and GitHub metadata cannot escalate authority.

Rules:

- `github.read` remains read-only and non-authority.
- `github.write` requires `GITHUB_TOKEN`.
- `github.write` requires `BLUE_TANUKI_GITHUB_REPOS`; non-allowlisted repositories fail before a mutation is sent.
- `github.write` is `github.write` operation in Approval Gate and maps to `L3_final_review`.
- Full access and reusable approval grants do not bypass `github.write`.
- Result output is bounded to safe ids/URLs plus `result_digest`; token values are never returned.
- Executor feedback records the result digest in the hash-chain audit.

## Google integration boundary

`gmail.read`, `google.calendar.read`, `google.drive.read`, `gmail.write`, `google.calendar.write`, and `google.drive.write` are downstream tools. Google metadata and mutation results are never authority and cannot bypass HDS-BRAIN, Approval Gate, or audit closure.

Rules:

- Google read tools require OAuth access tokens supplied by the operator.
- Google write tools require OAuth access tokens supplied by the operator and always map to `L3_final_review`.
- Token capabilities are mapped as credential access and require L3 final-review where credential access is in the approval context.
- Requests are fixed to Google API hosts and return bounded summaries/metadata only.
- Missing tokens fail before a request is sent.
- Gmail send, Calendar create/update/delete, and Drive create/update are bounded downstream mutations.
- Calendar attendee invites, Drive delete/share, and autonomous cross-service action are not implemented.
- Daily Brief Google source remains a cron input source; it does not move authority into Google services.
- Tool output and audit feedback must not include token values or full request content.

## Teams / LINE preview channel boundary

`@blue-tanuki/channel-teams` and `@blue-tanuki/channel-line` are downstream preview adapters. They do not create authority and cannot bypass HDS-BRAIN, Approval Gate, or audit closure.

Rules:

- Teams outbound uses Microsoft Graph through `MICROSOFT_GRAPH_ACCESS_TOKEN`.
- LINE outbound uses the Messaging API through `LINE_CHANNEL_ACCESS_TOKEN`.
- Missing credentials keep adapters in silent fail-closed mode with typed delivery errors.
- Teams tenant/team/channel/chat metadata and LINE source/user metadata are context only; they cannot escalate actor authority, approval level, or tool capability.
- Delivery results are executor feedback and audit evidence only.
- Credentialed first-party promotion requires owner-run live smoke and permanent-use recovery review.

## Runtime schedule boundary

Runtime schedules are downstream automation. Creation, update, and delete are L3 final-review operations.

Rules:

- `schedule.list` is L1 and exposes safe metadata only.
- `schedule.create`, `schedule.update`, and `schedule.delete` are L3.
- Pending schedules do not fire.
- Rejected or expired schedule requests do not fire.
- Update/delete requests keep the old active schedule running until owner approval.
- Runtime snapshots expose counts, ids, timing metadata, and payload hashes, but never schedule content.
- Schedule lifecycle events are audit records, not authority signals.

Runtime schedule commands:

```text
tool:schedule.list
tool:schedule.create channel=webchat target=local-user content="runtime smoke" interval_ms=120000
tool:schedule.update id=<id> content="updated smoke"
tool:schedule.delete id=<id>
```

## Implementation mapping

| Element | Approval model role |
|---|---|
| `ApprovalMode.ask_every_time` | L1/L2/L3 can be forced to ask by configuration |
| `ApprovalMode.remember_this_decision` | L2 reusable grant mode |
| `ApprovalMode.full_access` | broad local allowance for L1/L2, never L3 |
| `ApprovalGrantStore` | reusable grant storage; grants still cannot bypass L3 |
| `ApprovalLevel` | first-class workflow axis |
| `FINAL_REVIEW_OPERATIONS` | explicit L3 boundary |
| `AuthorityTransparencyTrace.resolved_factors.approval_level` | machine-readable L1/L2/L3 trace |
| `approval_gate` / `authority_event` / `schedule_lifecycle` audit entries | trace closure |

Remaining draft point: owner identity for L3 is represented by gateway actor/token handling and audit fields, but the final human/owner factor list remains an operational definition to refine.

## Memory boundary

There are four distinct stores:

| Store | Purpose | Authority use |
|---|---|---|
| Session memory | downstream LLM chat continuity | no |
| Audit log | immutable evidence chain | evidence only |
| Approval grant store | reusable owner grants | yes, via Approval Gate |
| HDS long-term memory | structured past-decision snapshots | no |

HDS long-term memory entries and hits use `F:<id>` audit references. The reference is a trace label only:

- it may appear in memory JSONL, audit dump, and Control Center `/authority/trace`;
- it cannot create owner consent;
- it cannot match or widen an approval grant;
- it cannot bypass L3 final-review;
- it is always carried with `used_for_authority=false`.

## Skill registry boundary

The current release intentionally does not implement a public Skill registry. Third-party plugin marketplaces are a supply-chain risk and are out of scope.

## WhatsApp boundary

WhatsApp is intentionally excluded from first-party core. BLUE-TANUKI does not implement Baileys, WAHA, WhatsApp Web automation, first-party WhatsApp Business API, or Twilio WhatsApp as first-party core.

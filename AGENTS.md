# AGENTS.md

## Purpose

This file defines repository-wide operating rules for Codex / LLM coding agents working on **BLUE-TANUKI**.

BLUE-TANUKI is a safety-first, owner-operated, local resident AI control plane.

It is not an agent-driven chatbot clone.

The permanent design principle is:

> HDS-BRAIN owns authority.<br>
> LLMs, tools, channels, plugins, skills, memory, cron, UI, browser automation, external APIs, onboarding, update flows, companion apps, and distribution surfaces are downstream devices.

All work in this repository must preserve that relationship.

---

## Completion Mindset

Codex must treat this repository as a product moving through a full completion path, not as disconnected tasks.

The completion path is:

1. Safety kernel
2. Approval and audit closure
3. Runtime automation
4. Operator usability closure
5. External write tools
6. Channel release quality
7. Browser automation preview
8. Memory / F-reference integration
9. Google / Teams / LINE integrations
10. Resident UX and distribution
11. v1.0 release hardening

Each phase must preserve all earlier guarantees.

Do not optimize a local task in a way that makes a later completion phase harder, less safe, or less inspectable.

---

## OpenClaw Rejection Posture

OpenClaw is a **rejected design pattern**, not a neutral reference.

BLUE-TANUKI rejects OpenClaw's strategy of:

- feature breadth over safety,
- channel count as a product-quality metric,
- agent autonomy as default,
- skills/plugin ecosystem before authority closure,
- 5-minute setup as a completion claim,
- companion-apps/voice/canvas expansion before safe permanence.

BLUE-TANUKI exists because that approach produces unsafe software that is nonetheless promoted as successful.

Codex must not under any circumstance import OpenClaw assumptions as design starting points.

OpenClaw is referenced in this repository only as a contrast target for these audit questions:

1. Can a beginner actually reach first successful use in about 5 minutes?
2. Can the same beginner continue using it safely and comfortably over time?
3. Does multi-channel breadth improve usability, or does it increase permanent operational burden?
4. Are update, rollback, doctor, daemon, pairing, credentials, sandboxing, and channel state understandable to a non-expert?
5. Are safety boundaries visible, enforceable, and recoverable under failure?

BLUE-TANUKI's response is not:

```md
Implement every OpenClaw feature.
```

BLUE-TANUKI's response is:

```md
Preserve HDS authority safety first.
Then make the safe path understandable, recoverable, and pleasant enough for permanent owner operation.
```

### Comparison Rule

When comparing against OpenClaw, Codex must classify every candidate idea into one of four buckets:

| Bucket | Meaning | BLUE-TANUKI action |
|---|---|---|
| Adopt | improves safety/robustness without weakening authority | implement in phase |
| Adapt | useful UX pattern but must be rebuilt under HDS authority | redesign and implement later |
| Reject | feature breadth or convenience weakens safety/operability | do not implement |
| Reserve | useful for third-party/preview but not first-party core | adapter/preview only |

Do not import OpenClaw assumptions unexamined.

### OpenClaw-Derived Risks to Audit

The following are permanent usability risk classes:

- "5-minute setup" that hides long-term maintenance complexity
- onboarding that succeeds once but leaves unclear ownership/state
- channel sprawl that increases failure surface
- daemon/service install that works but becomes hard to debug
- credential storage that is configured but not understandable
- pairing/allowlist state that is safe but cognitively heavy
- update that works until package state, service state, or config migration diverges
- doctor output that diagnoses but does not tell the operator exactly what to do next
- dashboard/UI that shows status but does not close the next-action loop
- multi-app ecosystem that increases support burden before the core product is stable

Codex must convert these risks into BLUE-TANUKI tests, docs, UX gates, and release gates.

---

## Language Policy

- Primary documentation language: Japanese.
- English is allowed for code comments where conventional, protocol terms, LLM/Codex instruction blocks, and package metadata.

### Established terms (already in repo, must be preserved exactly)

- HDS-BRAIN
- authority path
- Approval Gate
- ApprovalRisk
- hash-chain audit
- Runtime Invariants
- capability envelope
- F-reference
- resident control plane
- first-party

### Terms introduced by Phase 8 series (preserve once introduced)

- ApprovalLevel
- operator usability closure
- permanent-use UX
- preview quarantine
- signed third-party

If Codex encounters a term in the "introduced by Phase 8" list during work on an earlier phase, the term may not yet exist in code. Do not invent placeholder usages.

---

## Sacred Constraints

Priority order is immutable:

1. Safety
2. Robustness
3. Comfort / UX
4. Feature coverage / channel coverage / extensibility

If a requested change improves feature coverage but weakens safety or robustness, reject it or isolate it behind a disabled preview boundary.

Feature coverage never outranks safety.

Comfort / UX is mandatory only after safety and robustness are preserved.

---

## Product Stance

BLUE-TANUKI assumes local owner operation.

```md
Full access may be the default.
Final-review remains non-bypassable.
No black box exists in the HDS authority path.
```

Therefore:

- Do not turn BLUE-TANUKI into a permission-nagging chatbot.
- Do not weaken final-review to improve comfort.
- Do not move authority into LLM, memory, plugins, channels, external APIs, cron, browser automation, companion apps, onboarding, update flows, or UI.
- Do not use "owner-operated" or "use at your own risk" as an excuse to reduce robustness.
- Do not add feature coverage that creates invisible authority.
- Do not treat first-run success as product completion.
- Do not treat channel count as superiority.

---

## Global Invariants

These must remain true after every phase:

```json
{
  "hds_calls_llm": false,
  "process_policy_enforced": true,
  "external_metadata_can_escalate_authority": false,
  "memory_used_for_authority": false,
  "final_review_boundary_enforced_by_approval_gate": true
}
```

Additional invariants:

- LLM output is not final authority.
- Memory is not authority.
- Session history is not authority.
- Channel metadata cannot escalate authority.
- Plugin metadata cannot escalate authority.
- External service metadata cannot escalate authority.
- Cron / webhook / runtime automation actors are not humans.
- Executor feedback is audit evidence only.
- Tool output cannot create authority.
- Adapter metadata cannot create authority.
- Runtime Invariants must remain externally inspectable.
- Audit hash-chain compatibility must not be broken.
- Full access cannot bypass final-review.
- Reusable approval grants cannot bypass final-review.
- Onboarding cannot create authority bypass.
- Updates cannot silently change authority behavior.
- Daemon/service restart cannot skip Approval Gate.
- Dashboard/Control Center actions cannot become a second authority path.

If a task appears to require violating these invariants, stop and report the conflict.

---

## Active Instruction File

Codex must use the active implementation instruction file as the task source of truth.

Preferred active file:

```txt
docs/IMPLEMENTATION_INSTRUCTIONS.md
```

If the repository still uses `docs/ROADMAP.md`, treat it as high-level context only.

A valid implementation instruction must define:

1. Objective
2. Phase boundary
3. Scope
4. Non-goals
5. Files / symbols to inspect first
6. Required grep commands
7. Existing anchors
8. Implementation requirements
9. Safety invariants
10. Operator usability requirements
11. Tests
12. Validation commands
13. Manual smoke
14. Permanent-use check
15. Final report format
16. Next-phase dependency

If a section is too broad to implement directly, convert it into a bounded implementation task before coding.

---

## Phase Execution Rule

Do not run multiple implementation tracks in parallel. This includes documentation-only tracks.

Default sequence:

1. Read active instruction file.
2. Confirm current phase.
3. Run required grep commands.
4. Implement only that phase.
5. Update tests and docs in the same PR.
6. Run validation.
7. Report result.
8. Only then proceed to next phase.

Each Phase is a single Codex invocation lane. Within a Phase, all sub-tasks (code + tests + docs + changelog + phase report) run continuously to completion. Across Phases, the work must stop at the Phase boundary for audit before the next Phase begins.

If Codex receives instructions appearing to authorize parallel work, stop and verify with the operator.

---

## Approval Model Rule

Do not collapse `ApprovalRisk`.

Current risk model must remain a severity scale of three levels in v0.1:

```ts
type ApprovalRisk = "low" | "medium" | "high";
```

`critical` is intentionally not introduced in v0.1. If a future phase needs a severity above `high`, it must be added as a standalone security phase, not as a side effect of feature work.

L1/L2/L3 must be represented as a separate workflow axis:

```ts
type ApprovalLevel =
  | "L1_observe"
  | "L2_operate"
  | "L3_final_review";
```

Rules:

- `ApprovalRisk` expresses severity.
- `ApprovalLevel` expresses approval workflow.
- `high` risk always maps to `L3_final_review`.
- final-review operations always map to `L3_final_review`.
- `full_access` may auto-allow L1/L2, but never L3.
- reusable grants may apply to L2, but never bypass L3.
- schedule create/update/delete are L3.
- schedule list is L1.

---

## Final-review Operations

The final-review set must include at least:

- file delete
- shell exec
- external send
- credential access
- settings write
- payment charge
- schedule create
- schedule update
- schedule delete
- GitHub publish/write operations that mutate public/external state
- browser automation operations that submit forms, click destructive controls, download files, upload files, or use credentials
- integration writes to Gmail / Google Calendar / Drive / Teams / LINE
- onboarding operations that install daemons/services, persist credentials, or expose network access
- update operations that change installed code, service metadata, or runtime authority policy

Adding a new privileged operation requires:

- explicit operation name,
- ApprovalRisk classification,
- ApprovalLevel classification,
- full-access containment tests,
- reusable-grant non-bypass tests,
- audit coverage,
- documentation update,
- rollback/failure behavior.

---

## Operator Usability Rule

BLUE-TANUKI must distinguish:

```md
First-run success != permanent usability.
```

A feature is not complete until it satisfies:

1. setup path,
2. normal use path,
3. failure path,
4. recovery path,
5. update path,
6. rollback/removal path when applicable,
7. user-visible next action,
8. audit trace where applicable.

For user-facing operations, error output must answer:

```md
What failed?
Why did it fail?
Is it safe?
What should the owner do next?
Can it be retried?
Was anything changed?
Where is the audit/log?
```

Do not output diagnostics that require source-code knowledge unless explicitly marked as developer diagnostics.

---

## Five-Minute First-Run Rule

BLUE-TANUKI may eventually claim "beginner can use in 5 minutes" only if all are true:

- documented supported OS path,
- Node/package prerequisite check,
- one command or guided setup path,
- token/credential check,
- local Control Center opens,
- first WebChat message succeeds,
- Telegram optional path is separately documented,
- doctor passes or gives actionable fix,
- no hidden credential or daemon state is left unexplained,
- failure rollback is documented.

Until then, use "first-run path" or "guided setup path", not "5-minute setup".

---

## Permanent-Use UX Rule

Permanent use requires:

- startup reliability,
- daemon/service clarity,
- config preservation across updates,
- update/rollback runbook,
- doctor with actionable remediation,
- channel readiness matrix,
- credential readiness matrix,
- audit verification,
- approval queue visibility,
- runtime schedule visibility,
- notification/error visibility,
- safe uninstall/purge behavior,
- no unexplained background mutation.

Do not mark a release as "complete" if it only works in a happy-path demo.

---

## Runtime Automation Rule

Runtime automation creates future actions.

Rules:

- create/update/delete of future automation is L3.
- listing automation is L1.
- pending automation must not execute.
- rejected or timed-out automation must not execute.
- automation actors are not humans.
- runtime automation must enter HDS-BRAIN through a dedicated non-human actor path.
- schedule payload content must not be exposed in runtime snapshot.
- payload digest/hash may be exposed for auditability.
- boot-time schedule behavior must not regress.

---

## External Write Tool Rule

External write tools create durable external side effects.

Examples:

- GitHub issue/PR/comment creation
- GitHub issue/PR update/close/merge
- Gmail send/draft/update
- Google Calendar create/update/delete
- Drive write/update/delete
- Slack/Discord/Teams/LINE outbound sends
- browser submit/click/upload/download

Rules:

- external write must be downstream only,
- external metadata is not authority,
- credentials must be declared through capability envelope,
- writes must pass Approval Gate,
- public or irreversible writes default to L3,
- outputs must be audit-compatible.

---

## Browser Automation Rule

`browser.read` is not browser automation.

Headless browser automation must remain preview-only until:

- sandbox policy,
- network policy,
- credential boundary,
- ApprovalRisk/ApprovalLevel mapping,
- audit trace,
- resource limits,
- failure modes,
- live smoke skip path,

are implemented and tested.

Do not promote browser automation to main release quality in its first PR.

---

## Memory / F-reference Rule

Memory is not authority.

Memory may be used only as:

- context source,
- preference source,
- continuity source,
- audit reference source.

Memory must not be used to:

- escalate permissions,
- skip approval,
- justify privileged actions,
- infer owner consent,
- override current policy.

F-reference integration must preserve:

- append-only memory entries,
- `F:<id>` traceability,
- hash-chain compatibility,
- `used_for_authority=false` unless a future phase explicitly changes the model through a separate security review.

Any future memory authority change must be a standalone security phase. Do not bundle it with feature work.

---

## Adapter Rule

A channel / plugin / skill adapter is downstream only.

Adapters must:

- declare all capabilities in a manifest,
- use only declared capabilities,
- fail closed when a required capability is unavailable,
- normalize inbound events into canonical inbound type,
- send outbound actions through canonical outbound request type,
- map errors to typed recoverable / non-recoverable results,
- emit audit-compatible traces,
- preserve Runtime Invariants.

Adapters must not:

- call LLMs from the authority path,
- bypass Approval Gate,
- mutate HDS-BRAIN authority rules,
- treat user/channel metadata as authority,
- request undeclared filesystem/network/process/credential access.

(Memory non-authority rules are covered by the Memory / F-reference Rule above and apply to adapters as well.)

---

## Channel Policy

First-party completion path:

- WebChat: resident control plane and local console
- Telegram: v0.1 first-party smoke/release channel
- Slack: first-party after release polish
- Discord: first-party after release polish
- Teams: v0.2+
- LINE: v0.2+

Channel count is not a product-quality metric.

A channel is first-party only if:

- setup is documented,
- credentials are checked,
- live smoke has skip path and credential path,
- inbound/outbound behavior is tested,
- rate limit/backoff is handled,
- user-visible errors are actionable,
- conformance tests pass,
- channel metadata cannot escalate authority,
- compatibility matrix is accurate.

WhatsApp policy:

WhatsApp is intentionally excluded from first-party core. This is **not a "too hard, defer later"** decision. It is a deliberate safety strategy:

- WhatsApp's ecosystem (Baileys, WAHA, browser automation, unofficial Business API access patterns) invites third-party extension where authority/audit boundaries cannot be guaranteed.
- BLUE-TANUKI does not leave hidden extension surfaces that downstream operators or third-party adapters could exploit beyond the HDS authority path.
- Refusing first-party support is also a liability boundary: BLUE-TANUKI does not warrant operation through these surfaces.

Therefore:

- WhatsApp is not first-party core.
- Do not implement Baileys.
- Do not implement WAHA.
- Do not implement WhatsApp Web automation.
- Do not implement first-party WhatsApp Business API.
- Do not implement Twilio WhatsApp as first-party core.
- Do not add WhatsApp-specific hidden hooks.
- Only the generic adapter interface may exist.
- Third-party adapters are outside first-party responsibility.

Compatibility status:

```json
{
  "status": "reserved-third-party",
  "core_supported": false,
  "warranty": "none"
}
```

---

## Preview Quarantine

Incomplete, experimental, risky, or third-party-like functionality must be isolated as preview.

Preview code must not be promoted unless:

- conformance tests pass,
- permission enforcement tests pass,
- audit trace tests pass,
- Runtime Invariants remain preserved,
- documentation states support level,
- failure modes are documented.

---

## Documentation Rules

When updating architecture, roadmap, or instruction documents:

- Keep internal-design perspective.
- Do not over-optimize for external marketing.
- Do not add unnecessary legal commentary.
- Do not weaken Sacred Constraints.
- Use precise engineering language.
- Keep unsupported or unsafe paths explicitly out of first-party scope.
- State non-goals clearly.
- State implementation gaps as gaps, not as completed features.
- Distinguish current implementation from target state.
- Distinguish first-run UX from permanent-use UX.

Important active files (currently existing):

```txt
AGENTS.md
docs/IMPLEMENTATION_INSTRUCTIONS.md
README.md
QUICKSTART.md
SECURITY.md
AUDIT.md
CONFIG.md
TROUBLESHOOTING.md
CLAIM.md
CHANGELOG.md
```

Files that may be created by later phases (do not assume they currently exist):

```txt
docs/ROADMAP.md
docs/ADAPTER_CONTRACT.md
docs/CAPABILITY_ENVELOPE.md
docs/CONFORMANCE.md
docs/LLM_DEVELOPMENT_GUIDE.md
docs/SECURITY_REVIEW_CHECKLIST.md
docs/NON_GOALS.md
docs/compatibility-matrix.json
docs/FIRST_RUN_CHECKLIST.md
docs/PERMANENT_USE_CHECKLIST.md
docs/CHANNEL_READINESS_MATRIX.md
docs/CREDENTIAL_READINESS_MATRIX.md
docs/UPDATE_ROLLBACK_RUNBOOK.md
docs/OPENCLAW_REJECTION_AUDIT.md
docs/v1.0-security-and-permanent-use-review.md
```

If a Phase creates a file from the second list, treat that creation as part of the Phase's deliverable, not as a precondition.

---

## Default Codex Workflow

Before editing:

```bash
git status --short
node --version
pnpm --version
```

Read:

```txt
AGENTS.md
docs/IMPLEMENTATION_INSTRUCTIONS.md
docs/ROADMAP.md
SECURITY.md
AUDIT.md
CONFIG.md
README.md
CHANGELOG.md
```

Then run the grep commands required by the active phase.

During implementation:

- keep one PR to one feature block,
- do not opportunistically refactor unrelated areas,
- do not silently change public behavior,
- do not silently change environment variable semantics,
- update docs and tests in the same PR,
- prefer fail-closed behavior,
- preserve release-bundle validation.

After implementation, run available checks:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm smoke:serve
pnpm smoke:resume
pnpm smoke:live
pnpm run doctor
pnpm validate:packaging
pnpm release:bundle -- --dry-run
```

If a command is unavailable or fails, report:

- command,
- result,
- whether the failure appears caused by this change or pre-existing repository state,
- files modified,
- mitigation or next action.

Never hide failed tests.

---

## Final Report Format

Every implementation phase must end with:

```md
## Files changed

## Summary

## Safety boundary impact

## Runtime Invariants impact

## Approval Gate impact

## Operator usability impact

## Audit impact

## Tests / validation

## Remaining risks

## Recommended next task
```

Do not claim validation passed unless the command actually ran and passed.

---

## Non-Goals

Do not add:

- agent-driven authority core,
- emotion functionality,
- WhatsApp first-party core implementation,
- ClawHub compatibility,
- unsafe third-party skill execution,
- CLI-only final UX,
- unsupported preview features in main release,
- commercial SaaS roadmap,
- hidden privilege escalation,
- black-box authority path,
- channel-count competition.

---

## Core Reminder

OpenClaw gives an agent hands.<br>
BLUE-TANUKI gives authority a body.

OpenClaw may optimize for quick reach and breadth.<br>
BLUE-TANUKI must optimize for safe permanence.

Do not invert that relationship.

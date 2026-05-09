# AGENTS.md

## Purpose

This file defines the repository-wide operating rules for Codex / LLM coding agents working on **BLUE-TANUKI**.

BLUE-TANUKI is a safety-first resident AI control plane. It is not an agent-driven chatbot clone.

The core design principle is:

> HDS-BRAIN owns authority.<br>
> LLMs, tools, channels, plugins, skills, memory, cron, and UI are downstream devices.

All work in this repository must preserve that boundary.

## Language Policy

- Primary documentation language: Japanese.
- English is allowed for code comments where conventional, protocol terms, LLM/Codex instruction blocks, and external-facing package metadata.
- Preserve these terms exactly unless a task explicitly renames them:
  - HDS-BRAIN
  - authority path
  - Approval Gate
  - Runtime Invariants
  - hash-chain audit
  - capability envelope
  - preview quarantine
  - first-party
  - signed third-party
  - F-reference

## Sacred Constraints

Priority order is immutable:

1. Safety
2. Robustness
3. Comfort / UX
4. Feature coverage / channel coverage / extensibility

If a requested change improves features but weakens safety or robustness, reject the change or implement it behind a disabled preview boundary.

Feature coverage never outranks safety.

## Authority Boundary

Never modify the authority model casually.

The following invariants must hold:

- HDS-BRAIN must not call an LLM.
- LLM output must never become final authority.
- Memory must never become authority.
- Channel metadata must never escalate authority.
- Plugin metadata must never escalate authority.
- External service metadata must never escalate authority.
- All privileged operations must pass through Approval Gate.
- Runtime Invariants must remain externally inspectable.
- Audit hash-chain compatibility must not be broken.

If a task appears to require violating one of these rules, stop and report the conflict.

## Allowed Agent Work

Codex / LLM agents may work on documentation, roadmap files, adapter implementations, tests, conformance suites, scaffolding, CLI helpers, UI components, installer scripts, and non-authority utility modules.

Agents may implement downstream channels or modules only within their declared boundaries.

## Restricted Work

Do not modify the following unless the task explicitly requires it and the change preserves all invariants:

- HDS-BRAIN authority logic,
- approval policy,
- Approval Gate,
- Runtime Invariants,
- audit hash-chain format,
- memory authority rules,
- capability enforcement core,
- plugin permission loader,
- security-critical sandbox logic.

When touching these areas, add or update tests.

## Downstream Adapter Rule

A channel / plugin / skill adapter is downstream only.

Adapters must:

- declare all capabilities in a manifest,
- use only declared capabilities,
- fail closed when a required capability is unavailable,
- normalize inbound events into the repository's canonical inbound type,
- send outbound actions through the repository's canonical outbound request type,
- map errors to typed recoverable / non-recoverable errors,
- emit audit-compatible traces,
- preserve Runtime Invariants.

Adapters must not:

- call LLMs from the authority path,
- bypass Approval Gate,
- mutate HDS-BRAIN,
- treat user/channel metadata as authority,
- use memory as authority,
- request undeclared filesystem/network/process/credential access.

## WhatsApp Policy

WhatsApp is not a first-party core target.

Do not implement first-party WhatsApp support.

Specifically, do not add:

- Baileys integration,
- WAHA integration,
- WhatsApp Web automation,
- WhatsApp Business API first-party roadmap support,
- Twilio WhatsApp first-party roadmap support,
- WhatsApp-specific hidden hooks,
- WhatsApp-specific escape hatches.

The repository may expose only a generic channel adapter interface. Third parties may build their own adapters outside first-party support boundaries.

The compatibility status for WhatsApp is:

```json
{
  "status": "reserved-third-party",
  "core_supported": false,
  "warranty": "none"
}
```

## Extensibility Definition

Extensibility means:

> A human developer, Codex, or another LLM can read this repository and implement downstream channels / modules / skills without damaging core safety properties.

Therefore, extensibility requires:

- LLM-readable repository structure,
- stable adapter contracts,
- manifest-driven capability declaration,
- conformance tests,
- preview quarantine,
- main release gates,
- audit trace compatibility,
- authority non-escalation invariants.

Extensibility does not mean arbitrary plugin execution.

## Preview Quarantine

Incomplete, experimental, or third-party-like functionality must be isolated as preview.

Preview code must not be promoted to main release unless:

- conformance tests pass,
- permission enforcement tests pass,
- audit trace tests pass,
- Runtime Invariants remain preserved,
- documentation states the support level clearly.

## Documentation Rules

When updating architecture or roadmap documents:

- Keep the internal-design perspective.
- Do not over-optimize for external marketing.
- Do not add unnecessary legal commentary.
- Do not weaken Sacred Constraints.
- Prefer precise engineering language.
- Keep unsupported or unsafe paths explicitly out of first-party scope.

Important roadmap files should live under `docs/`.

Historical roadmaps should live under `docs/history/`.

## Required Documentation Files

If missing, create or maintain:

```txt
docs/ROADMAP.md
docs/ADAPTER_CONTRACT.md
docs/CAPABILITY_ENVELOPE.md
docs/CONFORMANCE.md
docs/LLM_DEVELOPMENT_GUIDE.md
docs/SECURITY_REVIEW_CHECKLIST.md
docs/NON_GOALS.md
docs/compatibility-matrix.json
```

Do not invent obsolete roadmap files. If v1-v5 roadmap files are not present, only create `docs/history/` and note that historical versions belong there.

## HDS Memory Rules

Memory is not authority.

Memory may be used only as:

- context source,
- preference source,
- continuity source.

Memory must not be used to escalate permissions, skip approval, or justify privileged actions.

F-reference skeleton rules:

- memory entries are append-only,
- memory references should use `F:<id>` format where applicable,
- memory read/write must be governed by approval policy and capability envelope,
- full long-term memory implementation belongs in a later phase,
- the memory safety contract belongs in Phase 1.

## Test and Validation Commands

After making changes, run available checks.

Preferred order:

```bash
pnpm install
pnpm typecheck
pnpm test
```

If a command is unavailable or fails, report the command, result, whether the failure appears caused by this change or pre-existing repository state, and files modified.

Never hide failed tests.

## Commit / PR Report Format

Final report should include:

1. Files changed
2. Summary of changes
3. Safety boundary impact
4. Runtime Invariants impact
5. Tests / validation results
6. Remaining risks
7. Recommended next task

Keep reports concise and factual.

## Non-Goals

Do not add:

- agent-driven authority core,
- emotion functionality,
- WhatsApp first-party core implementation,
- ClawHub compatibility,
- unsafe third-party skill execution,
- CLI-only final UX,
- unsupported preview features in main release,
- commercial SaaS roadmap.

## Core Reminder

OpenClaw gives an agent hands.<br>
BLUE-TANUKI gives authority a body.

Do not invert that relationship.

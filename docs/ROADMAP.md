# BLUE-TANUKI Roadmap v9

この文書は `docs/IMPLEMENTATION_INSTRUCTIONS.md` と同じ実行順序を示す短縮ロードマップである。

実装時の source of truth は常に `docs/IMPLEMENTATION_INSTRUCTIONS.md` と `AGENTS.md`。この文書は人間が全体像を素早く確認するための案内であり、詳細な phase 要件・検証コマンド・acceptance criteria は active instruction file を参照する。

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

- operator usability docs (Phase 8-S2a)
- doctor actionable output + Control Center first-run status (Phase 8-S2b)
- OpenClaw rejection audit document (Phase 8-S3)
- v0.1 live smoke cleanup
- docs consistency

### Band C - v0.1.x Stabilization

Goal:

- GitHub write downstream tool
- Slack / Discord release polish
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
| 8-S2a | B | Operator Usability Docs (First-Run + Permanent-Use + Matrices + Runbook) | P0 | current |
| 8-S2b | B | Doctor Actionable Output + Control Center First-Run Status | P0 | 8-S2a |
| 8-S3 | B | OpenClaw Rejection Audit document | P0 | 8-S2b |
| 8-S4 | C | GitHub write tool | P1 | 8-S1 |
| 8-S5 | C | Slack / Discord release polish + live smoke | P1 | 8-S2b |
| 8-S6 | C | Browser automation preview | P2 | 8-S1 |
| 9-S1 | D | F-reference audit integration | P1 | 8-S2b |
| 9-S2 | D | Gmail / Google Calendar / Drive read integration | P1 | 9-S1 |
| 9-S3 | D | Google write integration | P2 | 9-S2 |
| 9-S4 | D | Teams / LINE adapters | P2 | 8-S5 |
| 10-S1 | E | Control Center approval UX polish | P1 | 8-S1, 8-S2b |
| 10-S2 | E | Resident notification center | P2 | 10-S1 |
| 10-S3 | E | Distribution UX hardening | P1 | 8-S2a, 8-S2b |
| 11-S1 | F | v1.0 security review closure | P0 | all main features |
| 11-S2 | F | v1.0 permanent-use release candidate | P0 | 11-S1 |

## 3. Current Active Phase

```txt
Phase 8-S2a - Operator Usability Docs
```

Do not begin Phase 8-S2b, 8-S3, GitHub write, Slack/Discord polish, browser automation, onboarding/daemon work, or OpenClaw rejection audit docs before Phase 8-S2a is completed unless explicitly instructed.

## 4. Phase 8-S1 Summary

Objective:

- Convert L1/L2/L3 approval model into first-class TypeScript workflow layer.
- Implement runtime `schedule.*` CRUD on top of that layer.

Key requirements:

- Keep `ApprovalRisk` as `"low" | "medium" | "high"`.
- Add `ApprovalLevel` as `"L1_observe" | "L2_operate" | "L3_final_review"`.
- `schedule.list` maps to L1.
- `schedule.create`, `schedule.update`, and `schedule.delete` map to L3.
- Pending or rejected schedules must not execute.
- Boot-time schedules and Daily Brief smoke must not regress.
- Runtime snapshot must not expose schedule payload content.
- Audit lifecycle must record schedule request, approval/rejection, activation/update/delete, and fire events.
- Runtime Invariants must remain unchanged.

Full requirements live in:

```txt
docs/IMPLEMENTATION_INSTRUCTIONS.md
```

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
- [Adapter Contract](ADAPTER_CONTRACT.md)
- [Capability Envelope](CAPABILITY_ENVELOPE.md)
- [Conformance](CONFORMANCE.md)
- [LLM Development Guide](LLM_DEVELOPMENT_GUIDE.md)
- [Security Review Checklist](SECURITY_REVIEW_CHECKLIST.md)
- [Non-Goals](NON_GOALS.md)
- [Compatibility Matrix](compatibility-matrix.json)

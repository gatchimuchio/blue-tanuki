# BLUE-TANUKI v0.1 Security Model

## Priority

1. Safety
2. User experience
3. Channel breadth

## Design stance

BLUE-TANUKI is designed for a local owner-operated environment where
full-root / full-access operation may be the practical default.

That default does not weaken the safety path:

- Full-root operation may give the local operator broad system reach, but the
  BLUE-TANUKI authority path must still route privileged actions through the
  Approval Gate.
- The final-review boundary must be treated as a non-bypassable architecture
  boundary. Full access, reusable grants, automation, cron, webhook ingress,
  channel metadata, memory, LLM output, and executor feedback must not bypass
  it. The current code-level guarantee label is recorded in Hard invariants.
- "Use at your own risk" is a statement about operational responsibility, not
  permission to relax robustness requirements.
- Robustness requirements remain in force regardless of disclaimers, support
  boundaries, or no-support OSS positioning.

This stance is implemented by the Hard invariants below and by the
Final-review operations section: broad local capability is permitted only while
the final-review boundary remains non-bypassable.

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

## Hard invariants

The Runtime Invariants endpoint exposes the current values for the core
containment checks. Each invariant is also labeled by the kind of guarantee
BLUE-TANUKI currently provides:

- **Structural guarantee**: the dependency graph, type shape, or module boundary
  makes the forbidden path physically absent from the authority path.
- **Runtime guarantee**: the path exists as data or policy evaluation, and is
  denied by deterministic checks and tests. Runtime checks remain in place even
  when a structural guarantee exists.

| Invariant | Runtime snapshot key | Current guarantee | Evidence |
|---|---|---|---|
| HDS-BRAIN never calls an LLM. | `hds_calls_llm=false` | Structural guarantee | `@blue-tanuki/hds-brain` depends only on `@blue-tanuki/protocol`; it emits `llm_call` commands but has no LLM client dependency. Static import tests guard this boundary. |
| HDS-BRAIN never trusts session history. | covered by `hds_calls_llm=false` and authority-path tests | Structural guarantee | Session history belongs to the downstream executor/session store. HDS-BRAIN receives only the current `InboundRequest` and passes `session_id` as an execution hint. |
| External metadata cannot upgrade actor/process authority. | `external_metadata_can_escalate_authority=false` | Runtime guarantee (structuralization pending) | Channel metadata is ignored for actor/process upgrades unless gateway normalization marks it as internal; spoofed external metadata is covered by process hardening tests. |
| MemoryTrace is `used_for_authority=false` in v0.1. | `memory_used_for_authority=false` | Structural guarantee | `MemoryTrace.used_for_authority` is typed as the literal `false`; memory traces are context/audit inputs only. |
| Process execution policy is enforced before command emission. | `process_policy_enforced=true` | Runtime guarantee | HDS-BRAIN evaluates actor/process policy and command execution policy before returning an executable command. |
| final-review operations cannot be bypassed by full access. | `final_review_boundary_enforced_by_approval_gate=true` | Runtime guarantee | Approval Gate evaluation remains between HDS ASSERT and executor execution; full access and reusable grants cannot skip final-review operations. |
| cron/webhook actors are not treated as humans. | covered by actor/process policy tests | Runtime guarantee | `cron` and `webhook` resolve to dedicated actor/process kinds with constrained execution policies. |
| executor feedback is audit evidence, not an authority signal. | covered by audit/feedback tests | Structural guarantee | Feedback is appended as an audit entry and has no code path that resumes a suspended request or creates authority. |

## Final-review operations

These always require review regardless of full-access default:

- file delete
- shell exec
- external send
- credential access
- settings write
- payment charge
- schedule create

## Memory boundary

There are four distinct stores:

| Store | Purpose | Authority use |
|---|---|---|
| Session memory | downstream LLM chat continuity | no |
| Audit log | immutable evidence chain | evidence only |
| Approval grant store | reusable owner grants | yes, via Approval Gate |
| HDS long-term memory | structured past-decision snapshots | no in v0.1 |

## Skill registry boundary

v0.1 intentionally does not implement a public Skill registry. Third-party plugin marketplaces are a supply-chain risk and are out of scope.

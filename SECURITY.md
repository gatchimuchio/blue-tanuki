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
- The final-review boundary is a structural safety boundary. Full access,
  reusable grants, automation, cron, webhook ingress, channel metadata, memory,
  LLM output, and executor feedback must not bypass it.
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

- HDS-BRAIN never calls an LLM.
- HDS-BRAIN never trusts session history.
- External metadata cannot upgrade actor/process authority.
- MemoryTrace is `used_for_authority=false` in v0.1.
- final-review operations cannot be bypassed by full access.
- cron/webhook actors are not treated as humans.
- executor feedback is audit evidence, not an authority signal.

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

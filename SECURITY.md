# BLUE-TANUKI v0.1 Security Model

## Priority

1. Safety
2. User experience
3. Channel breadth

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

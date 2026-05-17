# HDS-BRAIN Risk / Approval Boundary

Phase 12-S0 locks `ApprovalRisk` and `ApprovalLevel` as separate axes.

## Axes

`ApprovalRisk` is severity:

```ts
type ApprovalRisk = "low" | "medium" | "high";
```

`ApprovalLevel` is workflow:

```ts
type ApprovalLevel =
  | "L1_observe"
  | "L2_operate"
  | "L3_final_review";
```

`critical` is not part of the current release line. If a future operation cannot be represented by `high -> L3_final_review`, that change must be a separate security phase.

## Level Boundary

| Level | Boundary | Examples | Execution rule |
|---|---|---|---|
| `L1_observe` | read-only, display, noop, ordinary LLM response, safe metadata, state check | `noop`, `llm.call`, file search/read, schedule list | may auto-allow when policy permits; audit still records evaluation |
| `L2_operate` | bounded local operation with reversible or regenerable state | sandboxed file write/edit, bounded network read, browser snapshot | reusable grants may apply |
| `L3_final_review` | irreversible, external, credentialed, privileged, policy-changing, unknown, or unclassified | file delete, shell exec, external send, credential access, settings write, schedule mutation, public write, browser automation, payment, `tool.call`, `unknown` | full access and reusable grants must not bypass owner review |

## Deterministic Classifier

Risk and ApprovalLevel are determined by deterministic HDS-BRAIN code:

- command type
- resolved operation
- declared capabilities
- target scope
- actor
- process policy
- final-review operation set
- policy version

Forbidden classifiers:

- LLM self-classification
- tool result self-classification
- plugin metadata self-classification
- channel metadata self-classification
- external metadata self-classification

## Unknown Boundary

`tool.call` and `unknown` are high-risk L3 operations. A tool call that cannot be resolved to a known operation does not inherit full-access auto-allow.

Unknown does not mean "safe by default". Unknown means "not proven safe", so it escalates to L3 or suspends.

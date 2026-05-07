# Phase 7-S4: Transparent Full-Access Authority

## Position

BLUE-TANUKI is designed as a full-access local resident AI control console.
It is not a chatbot wrapper and not a permission-dialog simulator.

The operator is expected to grant broad local authority. The safety mechanism is
not repeated confirmation. The safety mechanism is the HDS upper-control path:

```text
HDS ASSERT
  -> approval evaluation
  -> transparent authority trace
  -> executor execution or final review
  -> executor feedback
  -> hash-chain audit closure
```

## OpenClaw differentiation

The differentiation from OpenClaw-style agent shells is not merely UI or tool
coverage. The product claim is an authority-management claim:

```text
Full access is allowed as the default operating posture,
but BLUE-TANUKI does not hide the authority path behind an agent black box.
```

In concrete terms:

- HDS-BRAIN does not call an LLM.
- HDS-BRAIN emits structured commands only after F→M→C judgment.
- Approval evaluation resolves operation, scope, risk, actor, grant match, and
  final-review status as structured data.
- The authority evaluation includes a machine-readable trace:
  `black_box_boundary="none_in_hds_authority_path"`.
- Approval, command lifecycle, and executor feedback are appended to the same
  tamper-evident audit chain.

## No-black-box scope

The no-black-box claim is scoped to BLUE-TANUKI's own authority path.

It means:

```text
No black box in HDS authority path.
```

It does not mean:

```text
No opacity exists inside the OS, shell, external LLM provider, network,
third-party library, or user-installed tool.
```

Those surfaces can be opaque internally. They are not allowed to own final
authority inside BLUE-TANUKI. They remain downstream execution surfaces whose
invocation, scope, and result are recorded by the upstream audit path.

## Full-access invariant

Default approval mode is `full_access`.

A non-final-review local command may pass without repeated user prompts when
HDS has asserted the command and the approval runtime resolves it as ordinary
operator work.

Final review remains mandatory for operations that can create irreversible,
external, credential, or billing effects:

- file delete
- shell exec
- external send / post
- credential / secret access
- settings mutation
- payment / billing
- schedule creation

This is not defensive hesitation. It is the explicit hard boundary between
owner-operated full access and unbounded autonomous authority.

## Machine-readable authority trace

Every `ApprovalEvaluation` now carries `authority_trace`:

```json
{
  "authority_model": "owner_operated_full_access",
  "control_plane_black_boxes": [],
  "black_box_boundary": "none_in_hds_authority_path",
  "hds_position": "upper_control_self_norm",
  "full_access_default": true,
  "resolved_factors": {
    "operation": "tool.file.write",
    "target_scope": "file",
    "risk": "medium",
    "actor": "local-user",
    "final_review_required": false,
    "reason": "default_full_access_without_final_review_exception"
  },
  "audit_closure": {
    "decision": "hash_chain",
    "approval": "hash_chain",
    "execution_feedback": "hash_chain"
  }
}
```

This trace is the implementation-level expression of the product claim:

```text
Full access can be the default because the authority path is explicit,
structured, and audit-closed.
```

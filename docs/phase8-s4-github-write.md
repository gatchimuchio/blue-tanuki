# Phase 8-S4 - GitHub Write Tool

## Objective

Add authenticated GitHub write operations as downstream tools while preserving HDS-BRAIN authority ownership and Approval Gate containment.

## Implemented Surface

`github.write` supports:

- `issue.create`
- `issue.comment.create`
- `issue.update` for title/body only
- `pr.create`
- `pr.comment.create`

Deferred:

- merge PR
- close issue/PR
- delete branch
- force update
- release publish
- workflow dispatch
- secrets
- repository settings

## Safety Boundary

`github.write` is downstream only.

- HDS-BRAIN does not call GitHub.
- GitHub metadata is not authority.
- `github.write` requires `GITHUB_TOKEN`.
- `github.write` requires `BLUE_TANUKI_GITHUB_REPOS`.
- Non-allowlisted repositories fail before network mutation.
- Approval Gate maps `github.write` to `L3_final_review`.
- Full access and reusable grants cannot bypass `github.write`.
- Tool output never prints the token.

## Commands

```text
tool:github.write operation=issue.create owner=gatchimuchio repo=blue-tanuki title="Bug report" body="details"
tool:github.write operation=issue.comment.create owner=gatchimuchio repo=blue-tanuki number=1 body="follow-up"
tool:github.write operation=issue.update owner=gatchimuchio repo=blue-tanuki number=1 title="Updated title"
tool:github.write operation=pr.create owner=gatchimuchio repo=blue-tanuki title="Change" head=feature base=main draft=true
tool:github.write operation=pr.comment.create owner=gatchimuchio repo=blue-tanuki number=1 body="review note"
```

## Env

```bash
GITHUB_TOKEN=github-token-with-issue-pr-scope
BLUE_TANUKI_GITHUB_REPOS=gatchimuchio/blue-tanuki
```

`BLUE_TANUKI_GITHUB_REPOS` accepts comma/space separated `owner/repo` entries.

## Audit

The write attempt is represented by existing hash-chain records:

- HDS decision log
- `approval_gate`
- `authority_event`
- `command_lifecycle`
- `executor_feedback`

Successful tool output includes safe GitHub ids/URLs and `result_digest`. Failed API responses report `mutation_status=not_confirmed` and instruct the owner to check GitHub/audit before retrying.

## Validation

Implemented tests cover:

- tool registration and capability envelope
- HDS route construction
- L3 final-review classification
- token / repository allowlist fail-closed behavior
- issue creation
- PR creation
- issue/PR comments
- issue update
- API error safe retry messaging

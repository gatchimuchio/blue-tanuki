# Phase 7-S5: HDS Process / Memory Closure

Status: implemented in source and emitted to `dist/` where local tooling allowed.

## Objective

Close the BLUE-TANUKI v0.1 differentiation point above channels:

- HDS-BRAIN is the upstream authority OS.
- LLM / tools / channels / cron / mobile nodes are downstream devices.
- Session history is not an authority input.
- HDS long-term memory is deterministic, append-only, hash-verifiable, and visible as `memory_trace`.
- Memory may inform context, but may not expand authority.

## Implemented pieces

### 1. ActorRef

Each inbound request is classified before framing:

- `owner`
- `user`
- `system`
- `webhook`
- `cron`

Each actor also receives a trust level:

- `owner`
- `trusted`
- `limited`
- `untrusted`

Default behavior is intentionally conservative: webhook is `limited`; CLI local-user is `owner`; WebChat is `trusted`.

### 2. ProcessResolver

Each request is mapped into one HDS process:

- `chat.process`
- `tool.process`
- `approval.process`
- `cron.process`
- `webhook.process`

The process definition carries:

- trigger kind
- actor policy
- memory read policy
- approval profile
- execution policy
- capture policy

### 3. MemoryTrace

Frame now attaches:

```ts
frame.actor
frame.process
frame.memory_trace
```

Retrieval modes are deterministic only:

- `exact`
- `tag`
- `recent`

No semantic embedding / LLM summarization / fuzzy authority inference is used in v0.1.

Invariant:

```ts
memory_trace.used_for_authority === false
```

### 4. Authority ledger events

Approval evaluation now writes two audit records:

1. `approval_gate`
2. `authority_event`

Authority events include:

- `approval_asked`
- `approval_allowed`
- `approval_denied`
- `grant_created`
- future-compatible event names for revoke/use/expiry

This makes the authority path visible in the same hash-chain audit plane.

### 5. Runtime snapshot

WebChat can expose runtime state at:

```text
GET /runtime/snapshot
Authorization: Bearer $WEBCHAT_TOKEN
```

Snapshot includes:

- HDS state
- suspended requests
- in-flight commands
- audit chain status
- memory chain status
- pending approvals

### 6. HDS memory persistence wiring

Gateway now builds an HDS memory store:

- `BLUE_TANUKI_MEMORY_FILE=/path/to/memory.jsonl`
- or `BLUE_TANUKI_MEMORY_DIR=/path/to/dir`
- fallback: in-memory store

The persistent store is append-only JSONL with hash verification.

## Safety invariants

| Invariant | Enforcement |
|---|---|
| HDS-BRAIN does not call LLM | unchanged controller invariant |
| Session history is downstream only | HDS reads only HDS LTM, not SessionStore |
| Memory cannot expand authority | `used_for_authority: false` |
| Every memory hit is visible | `frame.memory_trace.hits[]` |
| Approval state is auditable | `approval_gate` + `authority_event` |
| Final review remains superior to full access | existing ApprovalPolicy invariant |
| Webhook is not human | ActorRef `webhook` + limited trust |
| Cron is not owner | ActorRef `cron` + explicit process |

## Verification notes

Local environment lacked `pnpm` and could not fetch from npm registry via corepack, so full `pnpm typecheck/test` could not be completed here.

Performed local checks:

- `tsc -p packages/hds-brain/tsconfig.json` emitted `dist`; remaining errors were missing local Node type declarations in this sandbox.
- `tsc -p packages/channel-webchat/tsconfig.json` emitted `dist`; remaining errors were missing local Node/ws type declarations in this sandbox.
- `tsc -p apps/gateway/tsconfig.json` emitted `dist`; remaining errors were missing local Node type declarations in this sandbox.
- Node smoke confirmed HDS actor/process/memory_trace behavior and audit-chain validity.

Required handoff command in a normal dev environment:

```bash
pnpm install
pnpm typecheck
pnpm test
```

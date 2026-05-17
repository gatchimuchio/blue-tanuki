# HDS-BRAIN Standalone Boundary

## 1. Definition

HDS-BRAIN is the standalone authority control kernel.

It can be imported, instantiated, asked to decide on an `InboundRequest`, asked to evaluate approval, and asked to verify audit state without `apps/gateway`, channel adapters, the executor, the Control Center, plugin loading, an LLM backend, or external APIs.

BLUE-TANUKI is the resident AI control plane that embeds HDS-BRAIN and connects downstream limbs around it.

## 2. Responsibility

HDS-BRAIN owns:

- actor and process resolution
- Frame / Model / Commit execution
- command-envelope emission
- approval classification
- final-review classification
- hash-chain audit append and verification
- runtime invariant snapshot
- standalone health baseline

HDS-BRAIN does not own or directly execute:

- LLM calls
- tool calls
- channel sends
- scheduler execution
- browser automation
- external API calls
- Control Center rendering
- resident application lifecycle
- plugin loading

## 3. Downstream Limbs Doctrine

Downstream devices are limbs, not authority.

LLMs, tools, plugins, skills, channels, executors, schedulers, browser automation, external APIs, UI, Control Center, memory, history, session stores, audit viewers, and notification surfaces may sense, generate, execute, store, display, or report. They must not decide authority, substitute approval, escalate privileges, rewrite policy, override risk, bypass final review, or convert result/reference material into authority.

The allowed flow is:

```text
HDS-BRAIN
  -> command envelope
  -> downstream limb
  -> result / feedback / event
  -> HDS-BRAIN audit / history / next decision
```

## 4. Allowed Dependencies

`packages/hds-brain` may depend on:

- Node built-ins
- `@blue-tanuki/protocol`
- local pure TypeScript modules
- deterministic policy/config parsing
- file-backed audit or memory interfaces owned by HDS-BRAIN

## 5. Forbidden Dependencies

`packages/hds-brain` must not depend on:

- `apps/gateway`
- `@blue-tanuki/core`
- `@blue-tanuki/channel-*`
- `@blue-tanuki/operator-*`
- gateway `plugin_loader`
- LLM backend implementations
- browser implementations
- Google / Gmail / Drive / Calendar clients
- GitHub clients
- Control Center UI
- resident notification UI

Those components are adapters or downstream limbs.

## 6. Public API

The package exports:

- `HDSUpperController`
- approval policy functions and types
- `AuditLog`
- `LongTermMemoryStore`
- `CompleteHistoryStore`
- `OutputAudit`
- `RuntimeInvariantEvidenceReport`
- runtime snapshot types
- `HDSBrainHealth`
- `runStandaloneHDSBrain`
- downstream port types

## 7. Standalone Smoke

Run:

```bash
pnpm hds:standalone
pnpm --filter @blue-tanuki/hds-brain test
pnpm --filter @blue-tanuki/hds-brain build
```

The default smoke sends a sample CLI `InboundRequest` to HDS-BRAIN and returns a JSON result containing decision, command envelope type, approval level, audit verification, health, runtime invariants, and runtime invariant evidence.

Tool-envelope smoke:

```bash
pnpm hds:standalone -- "tool:file.search root=. query=needle max_results=5"
```

## 8. Acceptance Criteria

- HDS-BRAIN imports without gateway.
- `HDSUpperController` instantiates without gateway.
- A sample `InboundRequest` returns a decision.
- Ordinary text returns an `llm_call` command envelope without calling an LLM.
- Explicit tool text returns a `tool_call` command envelope without executing the tool.
- Approval evaluation runs standalone.
- `AuditLog` append/verify runs standalone.
- Runtime snapshot and health baseline are available standalone.
- Downstream results remain evidence/material, not authority.

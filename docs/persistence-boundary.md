# Persistence Boundary: HDS-BRAIN Audit vs. Executor Session

Status: Phase 4-S2 — normative.

## TL;DR

There are two persistent stores in blue-tanuki, and they are intentionally separate. Mixing them would break the integrity guarantees of one or both.

| Store                    | Owner          | Purpose                                              | Location                                                         |
| ------------------------ | -------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Audit log                | HDS-BRAIN      | Hash-chained, append-only F→M→C decision record      | `@blue-tanuki/hds-brain` `AuditLog` (in-memory + JSONL on flush) |
| Session history          | Executor       | Per-`(channel, user)` chat history for context       | `@blue-tanuki/core` `SessionStore` → `BLUE_TANUKI_SESSION_DIR`   |

These MUST NOT share files, directories, or formats.

## Why the separation matters

### 1. The audit log is a security-critical evidence chain

HDS-BRAIN's `AuditLog` is the source of truth for *why* every downstream action was authorised. It is hash-chained: each entry carries `prev_hash` derived from the previous entry's serialised content, and `verify()` walks the chain to detect any tampering. The chain is the reason we can answer questions like "what did upstream judge at the moment of decision?" weeks after the fact.

Anything that mutates audit-store files is suspect. If conversational session data shared the same file, every assistant turn — written by the executor, downstream — would produce a write to a file that upstream is supposed to own. That inverts the containment property: a misbehaving downstream could in principle pollute the upstream evidence record.

### 2. The session store is overwriteable user data

Sessions are not security artifacts. They get truncated by cap eviction, cleared by user request, and (eventually, in Phase 5+) wiped by retention policies. Treating them with audit-grade integrity would burn rotation effort on data that is meant to age out.

### 3. Different lifecycles, different guarantees

| Property           | Audit log                                    | Session history                              |
| ------------------ | -------------------------------------------- | -------------------------------------------- |
| Append-only?       | Yes.                                         | No — eviction by FIFO when over cap.         |
| Tamper-evident?    | Yes — hash chain.                            | No.                                          |
| User-deletable?    | No (operator-deletable only).                | Yes — `clear(session_id)`.                   |
| Read by HDS-BRAIN? | Yes (own data).                              | No — HDS judges the latest request only.    |
| Read by executor?  | No — executor writes feedback, never reads.  | Yes (history merge before `llm_call`).       |

## Concrete rules

1. **Different env vars / different paths.**
   - HDS audit (when an on-disk audit ships) goes under a host-supplied path that is separate from `BLUE_TANUKI_SESSION_DIR`.
   - Today, AuditLog is in-memory only; the `verify()` chain is exercised end-of-session via `getAudit().verify()`. When persistence ships, it gets its own env (e.g. `BLUE_TANUKI_AUDIT_DIR`) and its own filename pattern (e.g. `audit-YYYYMMDD.jsonl`).
   - Session JSONL filenames are URL-safe-base64 of the session id with `.jsonl` extension.

2. **No cross-reading.**
   - HDS-BRAIN never reads the executor's session history when judging. F→M→C is performed on the inbound request only. This is structural, not stylistic — if HDS-BRAIN started consulting downstream-written data to make decisions, the containment property would break.
   - The executor never reads the audit log. Feedback is one-way.

3. **No shared format.**
   - Session lines are `ChatMessage` JSON (`role`, `content`, `timestamp`).
   - Audit lines are `DecisionLog` JSON with `prev_hash`/`hash` fields.
   - A defensive parser MUST reject the wrong type if it ever sees the wrong file.

4. **Manifests reflect the boundary.**
   - `@blue-tanuki/hds-brain` declares `fs:append:audit_dir` only.
   - `@blue-tanuki/core` declares `fs:append:session_dir` / `fs:read:session_dir` / `fs:write:session_dir` only.
   - The host (gateway) is the only component that sees both env vars, and even there, they are passed to different store constructors.

## What this rules out

- A future "unified replay store" that mixes audit entries and chat lines for debugging convenience. If we want a combined view, build a read-only joiner that consumes both stores rather than a writer that targets a single file.
- Putting `audit-*.jsonl` in `BLUE_TANUKI_SESSION_DIR` "to keep things tidy". The neat-looking single directory is exactly the configuration mistake this document exists to prevent.
- Re-deriving HDS audit signatures over executor session content. The chain is over upstream decisions; including downstream-controlled content would let the downstream influence the chain.

## Failure to honour the boundary

If a future change accidentally writes session content to the audit dir or vice versa:

- `AuditLog.verify()` would still pass (the chain check is over its own entries) but the JSONL files would contain garbage interleaved with real entries.
- A defensive parser at read time would skip the foreign lines, masking the bug.
- Reviewers would have no easy signal to detect the mix.

The mitigation is the boundary itself: keep the directories disjoint and the filenames distinguishable so that operational checks (and `--doctor` in Phase 5+) can spot a mistake before it accumulates.

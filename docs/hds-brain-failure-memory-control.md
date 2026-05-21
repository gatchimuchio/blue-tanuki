# HDS-BRAIN Failure Memory Control

この文書は HDS-BRAIN failure memory control v2 の境界と運用仕様を固定する。

## Purpose

Failure memory は complete history / command result / tool result / test result / workflow result / LLM output validation / authority boundary decision から failure signature を作り、将来の実行前に deterministic gate として参照する制御資産である。

目的は static blacklist ではない。

```txt
Complete Log
-> Failure Signature Extraction
-> Failure Memory Store
-> Pre-Execution Failure Gate
-> Execution Result
-> Complete Log
-> Periodic Verification
-> Rule Update / Revalidation / Retirement
-> Pre-Execution Gate
```

この loop は repeated failure を減らすためのものであり、探索を永久凍結するためのものではない。

## Authority Boundary

- LLM は failure log の要約、分類候補、signature 候補説明を補助してよい。
- LLM proposal は `draft` signature として扱い、final `suppression_policy` を直接設定できない。
- HDS-BRAIN の deterministic failure-memory logic だけが `warn` / `downrank` / `rewrite` / `require_approval` / `block` を決める。
- Complete history は evidence であり authority ではない。
- Failure memory は reusable control asset だが、Approval Gate や final-review boundary を置き換えない。

`FailureSeverity` の `critical` は failure-memory 専用の severity であり、Approval Gate の `ApprovalRisk = low | medium | high` とは別軸である。

## Store

`FailureMemoryStore` は `packages/hds-brain` 内の standalone component であり、gateway / executor / UI / channel / LLM backend に依存しない。

保存先:

- `BLUE_TANUKI_FAILURE_MEMORY_FILE=/path/to/failure-memory.json`
- `BLUE_TANUKI_FAILURE_MEMORY_DIR=/path/to/dir` の場合は `failure-memory.json`
- 未設定時は in-memory

保存される signature は evidence log id、state、confidence、severity、suppression policy、probe policy、revalidation schedule、TTL/decay を持つ。retired rule は削除せず history として残す。

## Pre-Execution Gate

gateway serve / CLI one-shot は executor 実行前に failure-memory gate を評価する。

適用:

| Gate result | Runtime behavior |
|---|---|
| `allow` | 通常の Approval Gate / executor path へ進む |
| `warn` / `downrank` / `rewrite` | gate decision を complete history に記録し、現時点では実行を止めない |
| `require_approval` | WebChat serve では human approval を要求する。CLI one-shot では fail-closed に停止する |
| `block` | executor を呼ばず、command lifecycle を rejected として audit に残す |

human approval で再開する場合でも `block` rule は通過できない。`require_approval` はその command に対する人間の明示確認で進める。

## Match Levels

- Level 0: exact match。exact command/path/test/environment/boundary を対象にできる。
- Level 1: normalized match。UUID、timestamp、hash、path、whitespace を deterministic に正規化する。
- Level 2: structural match。scope と action structure が同じ場合だけ conservative に一致させる。
- Level 3: semantic match。似た token shape のみ。auto-block は禁止。

Level 3 は `warn` / `downrank` までであり、`block` / `require_approval` へは昇格しない。

## Periodic Verification

manual / daily / startup / after-test-failure / before-release / post-failure trigger を `runPeriodicFailureMemoryVerification` が受ける。gateway CLI では次を使う。

```bash
pnpm gateway -- --failure-memory-verify
pnpm gateway -- --failure-memory-verify --json
pnpm gateway -- --failure-memory-verify --before-release
```

verifier は以下を検出する。

- repeated failures
- unconverted failure events
- stale block rules
- old evidence rules
- high hit count / low confidence rules
- aggressive semantic-only rules
- downgrade candidates for stale block rules
- repeated warning promotion candidates
- authority / boundary near-miss review candidates

report は `PeriodicVerificationReport` として structured output を返す。

## Revalidation / Decay / Retirement

`block` rule は次のどれかを持つ必要がある。

- `next_revalidation_at`
- `probe_policy = never` と `never_probe_justification:...`
- critical severity の permanent block justification

probe policy:

| Probe policy | Meaning |
|---|---|
| `manual` | 人間確認なしに probing しない |
| `sandbox` | isolated/safe context で検証できる |
| `shadow_only` | 実行せず future candidate matching だけを見る |
| `never` | destructive / credential / security / authority / boundary rule 用 |

critical rule は automatic retirement しない。low / medium / high は TTL と decay により probation / retired へ移れる。false positive は probation または retired へ移し、audit history は保持する。

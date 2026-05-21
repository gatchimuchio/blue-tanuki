# Production Import Graph

この文書は Repository health phase 4 時点の gateway 実行境界を固定する。

## Production Entrypoints

| File | Role | Static import boundary |
|---|---|---|
| `apps/gateway/src/main.ts` | process entry | `cli_router` と logger のみ |
| `apps/gateway/src/runtime.ts` | CLI one-shot runtime | HDS-BRAIN / executor / plugin loader / runtime schedule のみ |
| `apps/gateway/src/serve.ts` | long-running runtime | HDS-BRAIN / executor / WebChat / Telegram / plugin loader / runtime schedule のみ |

Production runtime は `doctor`, `setup`, `audit_dump`, `audit_verify`, `repair`, `installer` を import / export / dynamic import しない。WebChat の live audit surface は `serve.ts` 内で live audit metadata を直接整形し、CLI-only audit dump module を読み込まない。

## CLI-only Entrypoint

`apps/gateway/src/cli_router.ts` は CLI-only router である。`--doctor`, `--setup`, `--audit-dump`, `--audit-verify`, `--failure-memory-verify`, `--serve`, and one-shot CLI runtime are command-gated dynamic imports. `main -> cli_router` の eager graph は `serve.ts` / `runtime.ts` / doctor / setup / audit tools / failure-memory verifier を読み込まない。

`pnpm validate:repo-health` は TypeScript AST で import / export / literal dynamic import を解析する。コメント、通常の文字列、type-only import/export は production runtime import として扱わない。production CLI graph 内の non-literal dynamic import は検査不能な runtime 分岐を作るため fail する。

## Gate Limits

この gate は source-level regression gate であり、Node の完全な module resolver、外部 package の side effect、build output の全 dependency tree、runtime branch coverage は証明しない。これらは `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm release:verify` の展開後 install/build/doctor/repo-health と組み合わせて閉じる。

## Preview / Installer Boundary

Slack / Discord / Teams / LINE, operator packages, installer, resident helpers, platform installers, and credentialed live smoke are preview or distribution evidence. They must not become authority and must not be added to the core release allowlist without a dedicated promotion phase.

# Production Import Graph

この文書は Repository health phase 2 時点の gateway 実行境界を固定する。

## Production Entrypoints

| File | Role | Static import boundary |
|---|---|---|
| `apps/gateway/src/main.ts` | process entry | `cli_router` と logger のみ |
| `apps/gateway/src/runtime.ts` | CLI one-shot runtime | HDS-BRAIN / executor / plugin loader / runtime schedule のみ |
| `apps/gateway/src/serve.ts` | long-running runtime | HDS-BRAIN / executor / WebChat / Telegram / plugin loader / runtime schedule のみ |

Production runtime は `doctor`, `setup`, `audit_dump`, `audit_verify`, `repair`, `installer` を static import しない。WebChat の audit dump surface は owner action が要求された時だけ `import("./audit_dump.js")` で読み込む。

## CLI-only Entrypoint

`apps/gateway/src/cli_router.ts` は CLI-only router である。`--doctor`, `--setup`, `--audit-dump`, `--audit-verify` は dynamic import で隔離される。

## Preview / Installer Boundary

Slack / Discord / Teams / LINE, operator packages, installer, resident helpers, platform installers, and credentialed live smoke are preview or distribution evidence. They must not become authority and must not be added to the v0.1 core release allowlist without a dedicated promotion phase.

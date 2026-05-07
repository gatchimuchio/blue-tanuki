# `--doctor` Diagnostic

Status: Phase 5-S6
Entry: `apps/gateway` → `node ./dist/main.js --doctor [--json]`
Convenience: `pnpm --filter @blue-tanuki/gateway run doctor` or `pnpm --filter @blue-tanuki/gateway run doctor:dev`

> Note: `pnpm doctor` (without `run`) is reserved by pnpm itself; use `pnpm run doctor`, `pnpm --filter @blue-tanuki/gateway run doctor`, or `node ./dist/main.js --doctor` directly.

## What it is

A fast, hermetic, side-effect-light probe that answers a single question: *will `serve` start cleanly with the current environment?*

Doctor never makes outbound network calls. It checks local invariants only.

## Exit codes

| Code | Meaning              | Example                                          |
| ---- | -------------------- | ------------------------------------------------ |
| `0`  | All checks pass      | Required envs set, optional envs set, port free  |
| `1`  | One or more warnings | Optional envs unset (non-blocking)               |
| `2`  | One or more errors   | `WEBCHAT_TOKEN` / `WEBCHAT_RESUME_TOKEN` missing, port in use, Node too old |

CI pipelines should treat `0` as green, `1` as yellow (proceed but flag), `2` as red (block deploy).

## Checks performed

| Check id             | Level on miss | What it inspects                                   |
| -------------------- | ------------- | -------------------------------------------------- |
| `node_version`       | error         | `process.versions.node` ≥ 22.14.0                  |
| `env:WEBCHAT_TOKEN`  | error         | Required for `/inbound` and `/ws-ticket`. Length-only, never logged. |
| `env:WEBCHAT_RESUME_TOKEN` | error   | Required for `/resume`. Length-only, never logged. |
| `webchat_token_separation` | error   | `WEBCHAT_RESUME_TOKEN` must differ from `WEBCHAT_TOKEN`. |
| `env:SLACK_BOT_TOKEN` | warn         | Optional. Slack runs silent if unset.              |
| `env:SLACK_APP_TOKEN` | warn         | Optional. Slack runs silent if unset.              |
| `env:DISCORD_BOT_TOKEN` | warn        | Optional. Discord runs silent if unset.            |
| `env:ANTHROPIC_API_KEY` | warn        | Optional unless `LLM_BACKEND=anthropic`.            |
| `llm_backend`        | error         | Validates `stub`, `anthropic`, `openai`, `openai-compatible`, and `LLM_PROVIDERS_JSON` names/aliases. |
| `llm_command_route`  | error         | Validates HDS-BRAIN's configured per-command LLM route hint and limits. |
| `session_dir`        | error         | If `BLUE_TANUKI_SESSION_DIR` is set, the directory must be creatable and writable. |
| `audit_dir`          | error         | If `BLUE_TANUKI_AUDIT_DIR` is set, the directory must be creatable and writable. |
| `manifests`          | error         | Each bundled package has a schema-valid `blue-tanuki.plugin.json` matching package name/version/entry metadata. |
| `port`               | error         | `WEBCHAT_HOST:WEBCHAT_PORT` (default `127.0.0.1:8787`) is bindable. |

## What doctor explicitly does NOT check

- Live Slack / Discord / LLM API connectivity. Those are slow, side-effecting, and depend on network conditions; they belong to `pnpm smoke:live`, not to a fast hermetic probe.
- Slack / Discord token *validity*. Doctor only checks presence and length. A real call would issue an `auth.test` and would no longer be hermetic.
- HDS-BRAIN policy soundness. The detector / policy invariants are guarded by `@blue-tanuki/hds-brain`'s own test suite.

## Output formats

### Text (default)

```
blue-tanuki doctor — OK (2026-04-30T07:24:21Z)

  ✓ Node.js version              22.22.2 (>= 22.14.0)
  ✓ env WEBCHAT_TOKEN            present (length=16)
  ✓ env WEBCHAT_RESUME_TOKEN     present (length=24)
  ✓ webchat token separation     inbound and resume tokens differ
  ✓ env SLACK_BOT_TOKEN          present (length=12)
  ...
  ✓ plugin manifests             7 manifests valid
  ✓ port 127.0.0.1:8787          bindable

Summary: 14 ok, 0 warn, 0 error.
Exit code: 0
```

Glyphs: `✓` ok, `!` warn, `✗` error.

### JSON (`--json`)

```json
{
  "ok": true,
  "exit_code": 0,
  "timestamp": "2026-04-30T07:24:21Z",
  "checks": [
    { "id": "node_version", "level": "ok", "label": "Node.js version", "detail": "22.22.2 (>= 22.14.0)" }
  ]
}
```

Stable contract (locked by tests):

- `ok: boolean`
- `exit_code: 0 | 1 | 2`
- `timestamp: string` (ISO-8601 UTC)
- `checks: { id, level, label, detail }[]`
- `level ∈ "ok" | "warn" | "error"`

### Machine consumption

```bash
node ./dist/main.js --doctor --json | jq -e '.exit_code == 0 and ([.checks[] | select(.level=="error")] | length == 0)'
```

## Privacy

- No env value is ever logged. For `WEBCHAT_TOKEN`, `WEBCHAT_RESUME_TOKEN`, and other secrets, only the string length is reported, and only as a sanity check.
- The bundled-manifests check parses manifest contents but never loads or imports plugin code.

## Failure modes & remediation

| Failure                                                                | Remediation                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `env WEBCHAT_TOKEN: missing (required)`                                | Set `WEBCHAT_TOKEN` to a sufficiently random value (≥ 16 chars).           |
| `env WEBCHAT_TOKEN: present but suspiciously short`                    | The token is present but < 8 chars. Replace with a real secret.            |
| `env WEBCHAT_RESUME_TOKEN: missing (required)`                         | Set a separate resume token before starting serve mode.                    |
| `webchat token separation: WEBCHAT_RESUME_TOKEN must differ from WEBCHAT_TOKEN` | Generate a distinct resume token; do not reuse the inbound token. |
| `Node.js version: 20.x is below required 22.14.0`                      | Upgrade Node to ≥ 22.14.0.                                                 |
| `LLM_BACKEND: anthropic but ANTHROPIC_API_KEY is unset`                | Either set the key, or fall back to `LLM_BACKEND=stub`.                    |
| `LLM_BACKEND: unknown value 'made-up'`                                 | Use `stub`, `anthropic`, `openai`, `openai-compatible`, or a provider name/alias from `LLM_PROVIDERS_JSON`. |
| `LLM_BACKEND: invalid LLM_PROVIDERS_JSON`                              | Fix the provider catalog JSON. Each provider needs `name`, `endpoint`, and `model`. |
| `LLM command route: backend_hint 'missing' is not registered`           | Set `BLUE_TANUKI_LLM_BACKEND_HINT` to a configured provider name/alias, or unset it. |
| `BLUE_TANUKI_SESSION_DIR: cannot create '…'`                           | Pick a path the user owns; ensure no file exists at that path.             |
| `BLUE_TANUKI_AUDIT_DIR: cannot create '…'`                              | Pick a path the user owns; ensure no file exists at that path.             |
| `port 127.0.0.1:8787: cannot bind: EADDRINUSE`                         | Stop the conflicting process or set `WEBCHAT_PORT` to a free port.         |
| `plugin manifests: packages/foo: readManifest: ...`                     | Restore or fix the package's `blue-tanuki.plugin.json`.                    |
| `plugin manifests: packages/foo: name/version/entry mismatch`           | Align the manifest with package.json before booting a loader-enabled build. |

## Future work

- Keep plugin loading and permission enforcement boot-fail containment intact.
- Keep live external checks in `pnpm smoke:live` so `--doctor` remains hermetic.

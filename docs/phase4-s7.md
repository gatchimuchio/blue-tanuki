# Phase 4-S7: HDS Action Router

Status: implemented.

## Intent

S6 made tool execution permission-gated. S7 lets HDS-BRAIN emit bounded
`tool_call` commands for explicit, read-only actions instead of always emitting
`llm_call`.

HDS-BRAIN still does not invoke tools. It decides, builds a command, and
attaches the execution envelope. BLUE-TANUKI core enforces that envelope.

## Supported explicit actions

Content syntax:

```text
tool:file.search root=. query=needle max_results=5
tool:http.fetch url=https://example.com method=HEAD
/tool echo text="hello"
tool:http.fetch {"url":"https://example.com","method":"GET"}
```

Metadata syntax:

```json
{
  "blue_tanuki.tool_call": {
    "tool_name": "file.search",
    "arguments": {
      "root": ".",
      "query": "needle"
    }
  }
}
```

Supported routes:

| Tool | Capabilities | Timeout |
|---|---|---|
| `echo` | `tool:echo` | 5000 ms |
| `file.search` | `tool:file.search`, `fs:read` | 10000 ms |
| `http.fetch` | `tool:http.fetch`, `network:http` | 15000 ms |

Unknown explicit tool requests become `noop` and are not passed to the LLM as
ordinary text.

## Boundary

- Only explicit tool requests route to tools.
- Dangerous content still goes through the existing HDS policy before command
  construction, so SUSPEND/FAIL wins before any tool route is emitted.
- No write, shell, browser, or arbitrary network action is introduced here.

## Verification

- `pnpm build`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 257 tests

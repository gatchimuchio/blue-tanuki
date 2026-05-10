# Phase 4-S6: Tool Permission Envelope

Status: implemented.

## Intent

S6 moves BLUE-TANUKI from "LLM reference + channels" toward an agent that can
act, while keeping HDS-BRAIN upstream. Tools now declare the capabilities they
need, and the executor refuses a `tool_call` unless the command's envelope
explicitly allows those capabilities.

## Implemented

- Protocol `CommandConstraints` now includes `allowed_capabilities`.
- `Tool` now supports `required_capabilities`.
- `Executor` enforces:
  - `allowed_tools` before lookup/invoke.
  - `allowed_capabilities` after lookup and before invoke.
- Built-in tools:
  - `echo` requires `tool:echo`.
  - `file.search` requires `tool:file.search` and `fs:read`.
  - `http.fetch` requires `tool:http.fetch` and `network:http`.
- `registerBuiltinTools()` wires the built-ins into the gateway registry.
- Manifest/docs now describe command-level capabilities separately from
  package-level permission declarations.

## Boundary

`allowed_capabilities` is a per-command execution envelope. It is not a
provider preference and it is not an LLM instruction. HDS-BRAIN or a future
policy/router emits the envelope; BLUE-TANUKI core enforces it at execution
time.

## Verification

- `pnpm build`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 254 tests

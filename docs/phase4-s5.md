# Phase 4-S5: Provider-Neutral LLM Boundary

Status: implemented.

## Intent

BLUE-TANUKI treats LLMs as downstream reference providers. They are not the
agent authority and they do not own state transitions. HDS-BRAIN decides
ASSERT/SUSPEND/OUT_OF_SCOPE/FAIL, then BLUE-TANUKI resolves an optional
`backend_hint` against a configured LLM registry.

This pass makes that boundary explicit:

- `LLMRequest` now carries `backend_hint`, `model`, and `temperature`.
- `LLMCallPayload` now carries `backend_hint`, `model`, and `temperature`.
- `Executor` passes those fields to the LLM boundary after session history is
  merged.
- `LLMRegistry` routes calls to the default backend or a hinted backend alias.
- `OpenAICompatibleBackend` supports OpenAI-style chat-completions APIs,
  including local/self-hosted providers.
- Gateway LLM setup is centralized in `apps/gateway/src/llm_config.ts`.
- `LLM_PROVIDERS_JSON` registers multiple arbitrary named providers and
  aliases without moving authority into the LLM layer.
- `ControllerOptions.llm_route` lets HDS-BRAIN attach approved command-level
  `backend_hint`, `model`, temperature, max-token, and timeout settings.
- Gateway env `BLUE_TANUKI_LLM_*` builds that upstream route, and `doctor`
  verifies the route hint resolves before serve starts.
- `pnpm smoke:live` now checks the configured non-stub LLM provider rather
  than being Anthropic-only.

## Supported Providers

Built in:

- `stub`: always available, offline-safe.
- `anthropic`: enabled by `ANTHROPIC_API_KEY`.
- `openai`: OpenAI-compatible adapter with the standard OpenAI endpoint unless
  `OPENAI_ENDPOINT` is set.
- `openai-compatible`: OpenAI-compatible adapter for routers/local runtimes
  such as OpenRouter-style gateways, vLLM, llama.cpp servers, and Ollama's
  OpenAI endpoint.
- `LLM_PROVIDERS_JSON`: named OpenAI-compatible providers with custom
  endpoints, models, API-key env vars, headers, and aliases.

Extension path:

- Implement `LLMBackend`.
- Register it in `LLMRegistry` with any desired aliases.
- Keep HDS-BRAIN free of provider SDKs and network calls.

## Verification

- `pnpm build`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS, 237 tests

After the provider catalog continuation, tests still need to be re-run when
command execution approval is available. The code changes are covered by new
unit tests, but the current session could not launch another package-manager
run because command approval was exhausted.

Credentialed live LLM execution is still operator-gated because it can call a
third-party or local model service.

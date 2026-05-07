/**
 * LLM backend abstraction.
 *
 * BLUE-TANUKI treats LLMs as one tool among many. Any provider (Anthropic,
 * OpenAI, Google, local Ollama, etc.) implements this interface and becomes
 * pluggable.
 *
 * Key design point vs OpenClaw: in BLUE-TANUKI, the LLM is invoked downstream,
 * after upstream HDS-BRAIN has already decided ASSERT. The LLM does not control
 * the agent's state — HDS-BRAIN does.
 */
export {};
//# sourceMappingURL=base.js.map
# NON_GOALS

BLUE-TANUKI の明示的 non-goals:

- No agent-driven authority core
- No emotion functionality
- No WhatsApp first-party core implementation
- No ClawHub compatibility
- No unsafe third-party skill execution
- No CLI-only final UX
- No unsupported preview feature in main release
- No commercial SaaS roadmap

## Notes

- LLM は downstream device であり、authority source ではない。
- OpenClaw compatibility は safety-first scope control の下で扱う。
- WhatsApp は `reserved-third-party` として compatibility matrix に残すが、first-party core では実装しない。
- preview は main release と同じ運用責任を持たない。昇格には conformance と security review が必要。

# BLUE-TANUKI v0.1 Claim Boundary

## Claim

BLUE-TANUKI v0.1 is a local, owner-operated resident control plane built around **HDS-BRAIN**.

The core claim is not "more channels than OpenClaw."

The core claim is:

```text
No black box in BLUE-TANUKI's HDS authority path.
```

Meaning:

- actor is resolved as structured data
- process is resolved as structured data
- process authority policy is enforced before command emission
- execution policy is enforced before executor handoff
- approval operation/scope/risk/final-review status is resolved as structured data
- memory hits are traced and explicitly not used for authority escalation
- decisions, approvals, command lifecycle, and executor feedback are recorded in a hash-chain audit log

## Non-claim

BLUE-TANUKI does not claim that the following are internally transparent:

- OS kernel
- network providers
- Telegram / Slack / Discord platforms
- LLM providers
- browser engines
- external APIs
- user-provided tools

The transparency claim is limited to BLUE-TANUKI's own authority path.

## v0.1 Completed Quality

- WebChat Control Center
- HDS Process / Memory / Authority closure
- Approval Gate with final-review boundary
- hash-chain audit
- runtime snapshot
- Telegram channel
- Slack / Discord existing adapters with silent fallback
- Daily Brief and generic scheduled-message smoke with optional read-only Google source

## v0.1 Explicit Preview / Deferred

- WhatsApp: reserved-third-party only. BLUE-TANUKI does not ship first-party WhatsApp core support, Baileys/WAHA/WhatsApp Web automation, Business API support, or Twilio WhatsApp support.
- Gmail / Google Calendar / Drive: read-only summaries only; write operations are deferred
- Voice / Mobile: interface/design only, real product quality v0.2+
- Rich Canvas / A2UI: v0.2+
- third-party Skill registry: intentionally excluded

# BLUE-TANUKI v1.0 GA Bar Definition

## 1. Purpose

This document defines the promotion bar from `1.0.0-rc.1` to `1.0.0` GA.

It is the decision boundary for when BLUE-TANUKI can publish the external OpenClaw complete-superiority claim inside the selected scope.

## 2. RC vs GA Distinction

RC means technical release candidate: the internal engineering candidate is coherent enough to validate.

GA means the repository is ready to publicly claim OpenClaw complete superiority inside the selected scope.

Publishing GA before the bar is met creates public ridicule risk, damages Stage 1 credibility, and weakens the trust base needed for Stage 2 and Stage 3.

## 3. GA Bar Items

Bar A: Authority and Safety Closure.

- HDS-BRAIN authority remains upstream.
- Approval Gate and final-review boundaries are non-bypassable.
- Runtime Invariants and hash-chain audit remain valid.

Bar B: First-Party Surface Closure.

- Writing Operator, Daily Operator, and Developer Operator are specified and implemented as equal first-party surfaces.
- No surface creates an authority path.

Bar C: Installer and Setup Experience.

- A downloadable portable installer path exists.
- LLM API setup has a SIM-like configuration UX.
- Setup produces actionable remediation rather than hidden state.

Bar D: Resident Application Experience.

- OS-integrated resident app path exists.
- Tray/menu/autostart/lifecycle behavior is documented and validated where supported.

Bar E: Channel Selection Completeness.

- Tier S selected channels are first-party.
- WhatsApp remains reserved-third-party.
- Channel count is not treated as product quality.
- Preview-to-first-party promotion is gated by `pnpm validate:channels` and owner-run evidence.

Bar F: Platform Extension Surface.

- Plugin Review Gate exists.
- Plugin HIG exists.
- Skill Loader Contract exists.
- Layer B cannot bypass Layer A authority.

Bar G: Public Claim Eligibility.

- Bar A through Bar F all PASS.
- Technical validation all PASS.
- Owner explicitly decides GO.

## 4. Public Claim Eligibility

Public claim activation is allowed only when all of the following are true:

- Bar A through Bar F are documented as PASS.
- Technical validation passes.
- Owner gives an explicit GA decision.

Before that point, README, QUICKSTART, CLAIM, and other external-facing documents must not claim OpenClaw complete superiority. "Almost achieved" or similar vague external wording is also prohibited.

## 5. Items Not in GA Bar

The v1.0 GA bar does not include:

- WhatsApp first-party implementation
- commercial SaaS route
- mobile app
- public third-party skill registry
- Stage 2 or Stage 3 elements
- perfect safety or 5-minute setup guarantees

## 6. Decision Procedure

1. Snapshot Bar A through Bar F.
2. Document evidence for each bar.
3. Run technical validation.
4. Owner reviews the evidence.
5. If the decision is GO, promote to `1.0.0`.
6. Update external claim language.
7. Regenerate and verify the release bundle.

## 7. Cross-References

- [Strategy Frame](STRATEGY_FRAME.md)
- [v1.0 Release Candidate](v1.0-release-candidate.md)
- [v1.0 Security and Permanent-Use Review](v1.0-security-and-permanent-use-review.md)
- [Roadmap](ROADMAP.md)
- [AGENTS.md](../AGENTS.md)

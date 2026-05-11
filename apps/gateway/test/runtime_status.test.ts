import { describe, expect, it } from "vitest";
import type { HDSRuntimeSnapshot } from "@blue-tanuki/hds-brain";
import { buildRuntimeStatusSnapshot } from "../src/runtime_status.js";

function hdsSnapshot(
  overrides: Partial<HDSRuntimeSnapshot> = {},
): HDSRuntimeSnapshot {
  return {
    state: "IDLE",
    suspended: [],
    inflight: [],
    audit: { entries: 0, chain_valid: true },
    memory: { configured: false },
    invariants: {
      hds_calls_llm: false,
      process_policy_enforced: true,
      external_metadata_can_escalate_authority: false,
      memory_used_for_authority: false,
      final_review_boundary_enforced_by_approval_gate: true,
    },
    ...overrides,
  };
}

describe("buildRuntimeStatusSnapshot", () => {
  it("exposes first-run status without leaking credential values", () => {
    const status = buildRuntimeStatusSnapshot({
      gateway_status: "running",
      hds: hdsSnapshot(),
      webchat_token: "SECRET-WEBCHAT-TOKEN",
      webchat_resume_token: "SECRET-RESUME-TOKEN",
      telegram_bot_token: undefined,
      pending_approvals_count: 0,
      runtime_schedules_count: 0,
      pending_schedule_approvals_count: 0,
    });

    expect(status).toMatchObject({
      gateway_status: "running",
      hds_invariants_ok: true,
      webchat_ready: true,
      telegram_configured: false,
      pending_approvals_count: 0,
      runtime_schedules_count: 0,
      pending_schedule_approvals_count: 0,
      audit_chain_valid: true,
      next_recommended_action: "Configure TELEGRAM_BOT_TOKEN to enable Telegram",
    });
    expect(JSON.stringify(status)).not.toContain("SECRET-WEBCHAT-TOKEN");
    expect(JSON.stringify(status)).not.toContain("SECRET-RESUME-TOKEN");
  });

  it("prioritizes invariant and audit failures before optional Telegram setup", () => {
    const badInvariants = buildRuntimeStatusSnapshot({
      hds: hdsSnapshot({
        invariants: {
          hds_calls_llm: false,
          process_policy_enforced: false as true,
          external_metadata_can_escalate_authority: false,
          memory_used_for_authority: false,
          final_review_boundary_enforced_by_approval_gate: true,
        },
      }),
      webchat_token: "webchat",
      webchat_resume_token: "resume",
      telegram_bot_token: undefined,
      pending_approvals_count: 0,
      runtime_schedules_count: 0,
      pending_schedule_approvals_count: 0,
    });
    expect(badInvariants.gateway_status).toBe("degraded");
    expect(badInvariants.hds_invariants_ok).toBe(false);
    expect(badInvariants.next_recommended_action).toContain("Runtime Invariants");

    const badAudit = buildRuntimeStatusSnapshot({
      hds: hdsSnapshot({ audit: { entries: 1, chain_valid: false } }),
      webchat_token: "webchat",
      webchat_resume_token: "resume",
      telegram_bot_token: undefined,
      pending_approvals_count: 0,
      runtime_schedules_count: 0,
      pending_schedule_approvals_count: 0,
    });
    expect(badAudit.gateway_status).toBe("degraded");
    expect(badAudit.audit_chain_valid).toBe(false);
    expect(badAudit.next_recommended_action).toContain("audit verification");
  });

  it("surfaces approval and schedule queues as next actions", () => {
    const approval = buildRuntimeStatusSnapshot({
      hds: hdsSnapshot(),
      webchat_token: "webchat",
      webchat_resume_token: "resume",
      telegram_bot_token: "telegram",
      pending_approvals_count: 2,
      runtime_schedules_count: 1,
      pending_schedule_approvals_count: 1,
    });
    expect(approval.next_recommended_action).toBe("Review pending approvals in Control Center");

    const schedule = buildRuntimeStatusSnapshot({
      hds: hdsSnapshot(),
      webchat_token: "webchat",
      webchat_resume_token: "resume",
      telegram_bot_token: "telegram",
      pending_approvals_count: 0,
      runtime_schedules_count: 1,
      pending_schedule_approvals_count: 1,
    });
    expect(schedule.next_recommended_action).toBe("Review pending runtime schedule approvals");
  });
});

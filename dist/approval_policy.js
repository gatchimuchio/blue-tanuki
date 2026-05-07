import { createHash } from "node:crypto";
const RISK_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };
export const FINAL_REVIEW_OPERATIONS = new Set([
    "tool.file.delete", "tool.shell.exec", "external.send", "credential.access", "settings.write", "schedule.create", "payment.charge",
]);
export function approvalContextFromCommand(command, opts = {}) {
    const actor = opts.actor?.trim() || "local-user";
    const now = opts.now ?? Date.now();
    const caps = command.constraints?.allowed_capabilities ?? [];
    const op = operationFromCommand(command, caps);
    const scope = scopeFromCommand(command, op);
    const risk = riskForOperation(op, caps);
    return {
        operation: op,
        target_scope: scope.target_scope,
        target: scope.target,
        path_pattern: scope.path_pattern,
        channel: scope.channel,
        risk,
        actor,
        capabilities: [...caps],
        command_type: command.type,
        command_id: command.id,
        upstream_commit_hash: command.upstream_decision.commit_hash,
        created_at: now,
    };
}
export function operationFromCommand(command, caps = command.constraints?.allowed_capabilities ?? []) {
    if (command.type === "noop")
        return "noop";
    if (hasAny(caps, ["credential:read", "credential.access", "secrets:read"]))
        return "credential.access";
    if (hasAny(caps, ["payment:charge", "billing:write"]))
        return "payment.charge";
    if (hasAny(caps, ["schedule:create", "automation:create"]))
        return "schedule.create";
    if (hasAny(caps, ["settings:write"]))
        return "settings.write";
    if (hasAny(caps, ["shell:exec", "process:exec"]))
        return "tool.shell.exec";
    if (hasAny(caps, ["fs:delete", "file:delete"]))
        return "tool.file.delete";
    if (hasAny(caps, ["fs:write", "file:write"]))
        return "tool.file.write";
    if (hasAny(caps, ["fs:read", "file:read"])) {
        if (command.type === "tool_call" && command.payload.tool_name === "file.search")
            return "tool.file.search";
        return "tool.file.read";
    }
    if (hasAny(caps, ["network:http", "http.fetch"]))
        return "tool.network.http";
    if (hasAny(caps, ["external:send", "email:send", "slack:send", "discord:send"]))
        return "external.send";
    if (command.type === "llm_call")
        return "llm.call";
    if (command.type === "channel_send")
        return "channel.send";
    if (command.type === "tool_call") {
        if (command.payload.tool_name === "file.search")
            return "tool.file.search";
        if (command.payload.tool_name === "http.fetch")
            return "tool.network.http";
        return "tool.call";
    }
    return "unknown";
}
export function riskForOperation(op, caps = []) {
    if (op === "credential.access" || op === "payment.charge")
        return "critical";
    if (["tool.file.delete", "tool.shell.exec", "external.send", "settings.write", "schedule.create"].includes(op))
        return "high";
    if (["tool.file.write", "tool.network.http", "channel.send"].includes(op) || hasAny(caps, ["network:*", "fs:*"]))
        return "medium";
    return "low";
}
export function finalReviewRequired(ctx) {
    return FINAL_REVIEW_OPERATIONS.has(ctx.operation) || ctx.risk === "critical";
}
export function evaluateApproval(command, grants, opts = {}) {
    const now = opts.now ?? Date.now();
    const ctx = approvalContextFromCommand(command, { actor: opts.actor, now });
    const defaultMode = opts.default_mode ?? "full_access";
    const needsFinalReview = finalReviewRequired(ctx);
    const matched = grants.filter((g) => grantMatches(g, ctx, now)).sort((a, b) => specificity(b) - specificity(a))[0];
    const withTrace = (base) => ({
        ...base,
        authority_trace: buildAuthorityTransparencyTrace(ctx, {
            final_review_required: base.final_review_required,
            matched_grant_id: base.matched_grant_id,
            reason: base.reason,
            full_access_default: defaultMode === "full_access",
        }),
    });
    if (matched) {
        if (matched.decision === "deny") {
            return withTrace({ decision: "deny", mode: matched.mode, risk: ctx.risk, reason: `deny_grant_matched:${matched.id}`, matched_grant_id: matched.id, final_review_required: needsFinalReview, context: ctx });
        }
        if (needsFinalReview) {
            return withTrace({ decision: "ask", mode: matched.mode, risk: ctx.risk, reason: `grant_matched_but_final_review_required:${matched.id}`, matched_grant_id: matched.id, final_review_required: true, context: ctx });
        }
        return withTrace({ decision: matched.decision, mode: matched.mode, risk: ctx.risk, reason: `grant_matched:${matched.id}`, matched_grant_id: matched.id, final_review_required: false, context: ctx });
    }
    if (defaultMode === "full_access" && !needsFinalReview) {
        return withTrace({ decision: "allow", mode: "full_access", risk: ctx.risk, reason: "default_full_access_without_final_review_exception", final_review_required: false, context: ctx });
    }
    return withTrace({ decision: "ask", mode: defaultMode, risk: ctx.risk, reason: "no_matching_approval_grant", final_review_required: needsFinalReview, context: ctx });
}
export function buildAuthorityTransparencyTrace(ctx, opts) {
    return {
        authority_model: "owner_operated_full_access",
        control_plane_black_boxes: [],
        black_box_boundary: "none_in_hds_authority_path",
        hds_position: "upper_control_self_norm",
        full_access_default: opts.full_access_default ?? true,
        final_review_boundary: Array.from(FINAL_REVIEW_OPERATIONS).sort(),
        resolved_factors: {
            operation: ctx.operation,
            target_scope: ctx.target_scope,
            risk: ctx.risk,
            actor: ctx.actor,
            final_review_required: opts.final_review_required,
            matched_grant_id: opts.matched_grant_id,
            reason: opts.reason,
        },
        audit_closure: {
            decision: "hash_chain",
            approval: "hash_chain",
            execution_feedback: "hash_chain",
        },
    };
}
export function buildApprovalGrant(input) {
    const created_at = input.created_at ?? Date.now();
    const revocable = input.revocable ?? true;
    const withoutId = { ...input, created_at, revocable, id: undefined };
    const id = input.id ?? createHash("sha256").update(stableJson(withoutId)).digest("hex");
    return { ...input, id, created_at, revocable };
}
export function approvalGrantFromEvaluation(evaluation, opts) {
    const ctx = evaluation.context;
    const mode = opts.mode ?? "remember_this_decision";
    const full = opts.widen_to_full_access || mode === "full_access";
    return buildApprovalGrant({
        mode,
        decision: opts.decision ?? "allow",
        operation: full ? "*" : ctx.operation,
        target_scope: full ? "*" : ctx.target_scope,
        target: full ? undefined : ctx.target,
        path_pattern: full ? undefined : ctx.path_pattern,
        channel: full ? undefined : ctx.channel,
        risk: full ? "*" : ctx.risk,
        actor: ctx.actor,
        capabilities: full ? undefined : ctx.capabilities,
        created_by: opts.created_by,
        expires_at: opts.expires_at ?? null,
        note: opts.note,
    });
}
export function grantMatches(grant, ctx, now = Date.now()) {
    if (grant.expires_at !== null && grant.expires_at <= now)
        return false;
    if (grant.operation !== "*" && grant.operation !== ctx.operation)
        return false;
    if (grant.target_scope !== "*" && grant.target_scope !== ctx.target_scope)
        return false;
    if (grant.actor !== "*" && grant.actor !== ctx.actor)
        return false;
    if (grant.risk !== "*" && RISK_ORDER[ctx.risk] > RISK_ORDER[grant.risk])
        return false;
    if (grant.channel && grant.channel !== ctx.channel)
        return false;
    if (grant.target && grant.target !== ctx.target)
        return false;
    if (grant.path_pattern && ctx.path_pattern && grant.path_pattern !== ctx.path_pattern)
        return false;
    if (grant.capabilities?.length) {
        const s = new Set(ctx.capabilities);
        for (const cap of grant.capabilities)
            if (!s.has(cap))
                return false;
    }
    return true;
}
function scopeFromCommand(command, op) {
    if (command.type === "channel_send")
        return { target_scope: "channel", channel: command.payload.channel, target: `${command.payload.channel}:${command.payload.target}` };
    if (command.type === "tool_call") {
        const args = command.payload.arguments;
        const pathValue = typeof args.path === "string" ? args.path : undefined;
        const rootValue = typeof args.root === "string" ? args.root : undefined;
        const queryValue = typeof args.query === "string" ? args.query : undefined;
        const fileTarget = pathValue ?? rootValue;
        if (fileTarget)
            return { target_scope: op === "tool.file.read" || op === "tool.file.search" ? "folder" : "file", target: fileTarget, path_pattern: fileTarget };
        if (queryValue)
            return { target_scope: "task_type", target: `${command.payload.tool_name}:${queryValue}` };
        return { target_scope: "task_type", target: command.payload.tool_name };
    }
    if (command.type === "llm_call")
        return { target_scope: "task_type", target: "llm_call" };
    if (command.type === "noop")
        return { target_scope: "task_type", target: "noop" };
    throw new Error(`scopeFromCommand: unhandled command type: ${String(command.type)}`);
}
function hasAny(caps, needles) { const s = new Set(caps); return needles.some((n) => s.has(n)); }
function specificity(grant) { let n = 0; if (grant.operation !== "*")
    n += 8; if (grant.target_scope !== "*")
    n += 4; if (grant.target)
    n += 3; if (grant.path_pattern)
    n += 3; if (grant.channel)
    n += 2; if (grant.actor !== "*")
    n += 2; if (grant.risk !== "*")
    n += 1; if (grant.capabilities?.length)
    n += grant.capabilities.length; return n; }
function stableJson(value) { const seen = new WeakSet(); const normalize = (v) => { if (v === undefined)
    return "[undefined]"; if (typeof v === "bigint")
    return v.toString(); if (typeof v !== "object" || v === null)
    return v; if (seen.has(v))
    return "[circular]"; seen.add(v); if (Array.isArray(v))
    return v.map((item) => normalize(item)); const out = {}; for (const key of Object.keys(v).sort())
    out[key] = normalize(v[key]); return out; }; return JSON.stringify(normalize(value)); }
//# sourceMappingURL=approval_policy.js.map
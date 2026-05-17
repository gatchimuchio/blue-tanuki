import { runStandaloneHDSBrain } from "../packages/hds-brain/src/index.js";

const content = process.argv.slice(2).join(" ").trim() || "hello";

const result = runStandaloneHDSBrain({
  id: "standalone-smoke-req",
  channel: "cli",
  user: "local-user",
  content,
  metadata: {},
});

const output = {
  decision: result.decision,
  command_type: result.command_type,
  operation: result.operation,
  approval_level: result.approval_level,
  final_review_required: result.final_review_required,
  audit_chain_valid: result.audit_chain_valid,
  memory_used_for_authority: result.memory_used_for_authority,
  complete_history_used_for_authority: result.complete_history_used_for_authority,
  health: result.health.status,
  invariants: result.invariants,
};

console.log(JSON.stringify(output, null, 2));

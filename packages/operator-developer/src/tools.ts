import { createHash } from "node:crypto";
import type { DeveloperInvocation, DeveloperOperationKind } from "./types.js";
import { getDeveloperOperationSpec } from "./surface.js";

export function digestDeveloperInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildDeveloperInvocation(input: {
  operation: DeveloperOperationKind;
  content: string;
  source?: DeveloperInvocation["source"];
  target?: string;
}): DeveloperInvocation {
  getDeveloperOperationSpec(input.operation);
  return {
    operation: input.operation,
    input_digest: digestDeveloperInput(input.content),
    source: input.source ?? "prompt",
    target: input.target,
  };
}

export function developerMetadataForOperation(operation: DeveloperOperationKind): Record<string, string> {
  const spec = getDeveloperOperationSpec(operation);
  return {
    "blue_tanuki.operator_surface": "developer",
    "blue_tanuki.developer.operation": spec.kind,
    "blue_tanuki.approval_level": spec.approval_level,
    "blue_tanuki.approval_risk": spec.approval_risk,
    "blue_tanuki.final_review_required": String(spec.final_review_required),
  };
}

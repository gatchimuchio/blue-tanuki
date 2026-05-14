import { createHash } from "node:crypto";
import type { WritingInvocation, WritingOperationKind } from "./types.js";
import { getWritingOperationSpec } from "./surface.js";

export function digestWritingInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildWritingInvocation(input: {
  operation: WritingOperationKind;
  content: string;
  source?: WritingInvocation["source"];
  target?: string;
}): WritingInvocation {
  getWritingOperationSpec(input.operation);
  return {
    operation: input.operation,
    input_digest: digestWritingInput(input.content),
    source: input.source ?? "prompt",
    target: input.target,
  };
}

export function writingMetadataForOperation(operation: WritingOperationKind): Record<string, string> {
  const spec = getWritingOperationSpec(operation);
  return {
    "blue_tanuki.operator_surface": "writing",
    "blue_tanuki.writing.operation": spec.kind,
    "blue_tanuki.approval_level": spec.approval_level,
    "blue_tanuki.approval_risk": spec.approval_risk,
    "blue_tanuki.final_review_required": String(spec.final_review_required),
  };
}

import { createHash } from "node:crypto";
import type { DailyOperationKind } from "./types.js";
import { getDailyOperationSpec } from "./surface.js";

export function digestDailyInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function dailyMetadataForOperation(operation: DailyOperationKind): Record<string, string> {
  const spec = getDailyOperationSpec(operation);
  return {
    "blue_tanuki.operator_surface": "daily",
    "blue_tanuki.daily.operation": spec.kind,
    "blue_tanuki.approval_level": spec.approval_level,
    "blue_tanuki.approval_risk": spec.approval_risk,
    "blue_tanuki.final_review_required": String(spec.final_review_required),
  };
}

import type { ExecuteCommand, ExecuteFeedback } from "@blue-tanuki/protocol";
export interface RenderOptions {
    max_chars?: number;
}
export declare function renderCommandOutput(cmd: ExecuteCommand, feedback: ExecuteFeedback, opts?: RenderOptions): string | null;
//# sourceMappingURL=result_render.d.ts.map
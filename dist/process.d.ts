import type { InboundRequest } from "@blue-tanuki/protocol";
import type { ActorRef, HDSProcessDefinition } from "./types.js";
export declare function resolveActor(req: InboundRequest): ActorRef;
export declare function resolveProcess(req: InboundRequest, actor: ActorRef): HDSProcessDefinition;
//# sourceMappingURL=process.d.ts.map
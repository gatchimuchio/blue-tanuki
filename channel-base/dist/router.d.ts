import type { InboundChannel, InboundHandler } from "./types.js";
/**
 * InboundRouter — multiplexes multiple InboundChannels into a single handler.
 *
 * Phase 2: registration is in-memory. Each channel calls the handler
 * independently; ordering across channels is not guaranteed.
 *
 * Pure routing layer. No judgment. No LLM. The handler typically wires to
 * HDS-BRAIN's `decide()`.
 */
export declare class InboundRouter {
    private readonly channels;
    private started;
    private handler;
    register(channel: InboundChannel): void;
    /**
     * Start every registered channel with the given handler.
     * The handler is invoked once per inbound message from any channel.
     */
    start(handler: InboundHandler): Promise<void>;
    stop(): Promise<void>;
    list(): readonly string[];
}
//# sourceMappingURL=router.d.ts.map
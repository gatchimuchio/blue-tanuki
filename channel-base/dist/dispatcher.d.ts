import type { ChannelSendPayload } from "@blue-tanuki/protocol";
import type { OutboundChannel, SendMeta, SendResult } from "./types.js";
/**
 * OutboundDispatcher — routes ChannelSendPayload to the matching OutboundChannel.
 *
 * Routing is done by `payload.channel` exact match against `OutboundChannel.name`.
 * Unknown channels return a structured failure (never throw) so the executor
 * can record it as ExecuteFeedback without crashing.
 */
export declare class OutboundDispatcher {
    private readonly channels;
    register(channel: OutboundChannel): void;
    dispatch(payload: ChannelSendPayload, meta: SendMeta): Promise<SendResult>;
    list(): readonly string[];
}
//# sourceMappingURL=dispatcher.d.ts.map
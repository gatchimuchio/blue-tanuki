/**
 * OutboundDispatcher — routes ChannelSendPayload to the matching OutboundChannel.
 *
 * Routing is done by `payload.channel` exact match against `OutboundChannel.name`.
 * Unknown channels return a structured failure (never throw) so the executor
 * can record it as ExecuteFeedback without crashing.
 */
export class OutboundDispatcher {
    channels = new Map();
    register(channel) {
        if (this.channels.has(channel.name)) {
            throw new Error(`OutboundDispatcher: channel already registered: ${channel.name}`);
        }
        this.channels.set(channel.name, channel);
    }
    async dispatch(payload, meta) {
        const ch = this.channels.get(payload.channel);
        if (!ch) {
            return {
                delivered: false,
                error: `no_channel_registered:${payload.channel}`,
            };
        }
        try {
            return await ch.send(payload, meta);
        }
        catch (e) {
            return {
                delivered: false,
                error: e instanceof Error ? e.message : String(e),
            };
        }
    }
    list() {
        return Array.from(this.channels.keys());
    }
}
//# sourceMappingURL=dispatcher.js.map
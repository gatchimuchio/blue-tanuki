/**
 * InboundRouter — multiplexes multiple InboundChannels into a single handler.
 *
 * Phase 2: registration is in-memory. Each channel calls the handler
 * independently; ordering across channels is not guaranteed.
 *
 * Pure routing layer. No judgment. No LLM. The handler typically wires to
 * HDS-BRAIN's `decide()`.
 */
export class InboundRouter {
    channels = new Map();
    started = false;
    handler = null;
    register(channel) {
        if (this.channels.has(channel.name)) {
            throw new Error(`InboundRouter: channel already registered: ${channel.name}`);
        }
        if (this.started) {
            throw new Error(`InboundRouter: cannot register '${channel.name}' after start()`);
        }
        this.channels.set(channel.name, channel);
    }
    /**
     * Start every registered channel with the given handler.
     * The handler is invoked once per inbound message from any channel.
     */
    async start(handler) {
        if (this.started) {
            throw new Error("InboundRouter: already started");
        }
        this.handler = handler;
        const wrapped = async (req) => {
            // Defensive: never let one inbound throw take down a channel listener.
            try {
                await handler(req);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                // eslint-disable-next-line no-console
                console.error(`[inbound-router] handler threw on ${req.channel}/${req.id}: ${msg}`);
            }
        };
        this.started = true;
        await Promise.all(Array.from(this.channels.values()).map((c) => c.start(wrapped)));
    }
    async stop() {
        if (!this.started)
            return;
        this.started = false;
        this.handler = null;
        await Promise.all(Array.from(this.channels.values()).map((c) => c.stop()));
    }
    list() {
        return Array.from(this.channels.keys());
    }
}
//# sourceMappingURL=router.js.map
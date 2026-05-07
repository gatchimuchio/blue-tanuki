/**
 * Executor: the top-level dispatcher for BLUE-TANUKI.
 *
 * Receives ExecuteCommand from HDS-BRAIN, switches on command type,
 * routes to the right subsystem, returns ExecuteFeedback.
 *
 * Critical: this layer enforces command constraints (timeout, allowed_tools,
 * allowed_capabilities). Upstream HDS-BRAIN sets the policy; the Executor is
 * the gatekeeper that applies it at the moment of execution.
 */
export class Executor {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(cmd) {
        const start = Date.now();
        try {
            switch (cmd.type) {
                case "llm_call":
                    return await this.executeLLMCall(cmd.id, cmd.payload, cmd.constraints, start);
                case "tool_call":
                    return await this.executeToolCall(cmd.id, cmd.payload, cmd.constraints, start, cmd.upstream_decision.commit_hash);
                case "channel_send":
                    return await this.executeChannelSend(cmd.id, cmd.payload, start, cmd.upstream_decision.commit_hash);
                case "noop":
                    return {
                        command_id: cmd.id,
                        status: "success",
                        result: null,
                        metrics: { duration_ms: Date.now() - start },
                    };
            }
        }
        catch (e) {
            return {
                command_id: cmd.id,
                status: "failed",
                error: e instanceof Error ? e.message : String(e),
                metrics: { duration_ms: Date.now() - start },
            };
        }
    }
    async executeLLMCall(id, payload, constraints, start) {
        // History merge: when a session_store is configured AND the payload
        // declares a session_id, prepend retained history before invoking
        // the LLM. The current user message (typically payload.messages[-1])
        // is NOT pre-appended here — it is appended only on success below,
        // together with the assistant reply, so that failed calls don't
        // pollute the history.
        const session_store = this.deps.session_store;
        const session_id = payload.session_id;
        let effectiveMessages = payload.messages;
        if (session_store && session_id) {
            const history = await session_store.getMessages(session_id, {
                limit: this.deps.history_limit,
            });
            if (history.length > 0) {
                effectiveMessages = [
                    ...history.map((m) => ({ role: m.role, content: m.content })),
                    ...payload.messages,
                ];
            }
        }
        const resp = await this.withTimeout(this.deps.llm.call({
            messages: effectiveMessages,
            backend_hint: payload.backend_hint,
            model: payload.model,
            temperature: payload.temperature,
            max_tokens: constraints?.max_tokens,
        }), constraints?.timeout_ms);
        // Append on success. We persist the messages that the *current call*
        // contributed (i.e. payload.messages, not the prepended history,
        // which is already on disk) plus the assistant reply.
        if (session_store && session_id) {
            const now = Date.now();
            for (const m of payload.messages) {
                await session_store.append(session_id, {
                    role: m.role,
                    content: m.content,
                    timestamp: now,
                });
            }
            await session_store.append(session_id, {
                role: "assistant",
                content: resp.content,
                timestamp: Date.now(),
            });
        }
        return {
            command_id: id,
            status: "success",
            result: resp,
            metrics: {
                duration_ms: Date.now() - start,
                tokens_used: resp.tokens_used,
            },
        };
    }
    async executeToolCall(id, payload, constraints, start, commit_hash) {
        if (constraints?.allowed_tools && !constraints.allowed_tools.includes(payload.tool_name)) {
            return {
                command_id: id,
                status: "failed",
                error: `Tool not in allowed_tools: ${payload.tool_name}`,
                metrics: { duration_ms: Date.now() - start },
            };
        }
        const tool = this.deps.tools.get(payload.tool_name);
        if (!tool) {
            return {
                command_id: id,
                status: "failed",
                error: `Tool not registered: ${payload.tool_name}`,
                metrics: { duration_ms: Date.now() - start },
            };
        }
        const required = tool.required_capabilities ?? [];
        const allowed = new Set(constraints?.allowed_capabilities ?? []);
        const missing = required.filter((cap) => !allowed.has(cap));
        if (missing.length > 0) {
            return {
                command_id: id,
                status: "failed",
                error: `Tool capability not allowed: ${payload.tool_name} requires ` +
                    missing.join(", "),
                metrics: { duration_ms: Date.now() - start },
            };
        }
        const result = await this.withTimeout(tool.invoke(payload.arguments, {
            command_id: id,
            upstream_commit_hash: commit_hash,
        }), constraints?.timeout_ms);
        return {
            command_id: id,
            status: "success",
            result,
            metrics: { duration_ms: Date.now() - start, tool_calls: 1 },
        };
    }
    async executeChannelSend(id, payload, start, commit_hash) {
        if (this.deps.dispatcher) {
            const r = await this.deps.dispatcher.dispatch(payload, {
                command_id: id,
                upstream_commit_hash: commit_hash,
            });
            if (r.delivered) {
                return {
                    command_id: id,
                    status: "success",
                    result: {
                        sent: true,
                        channel: payload.channel,
                        target: payload.target,
                        external_id: r.external_id,
                    },
                    metrics: { duration_ms: Date.now() - start },
                };
            }
            return {
                command_id: id,
                status: "failed",
                error: r.error ?? "channel_dispatch_failed",
                metrics: { duration_ms: Date.now() - start },
            };
        }
        // Fallback: Phase 0/1 behavior — log only.
        // eslint-disable-next-line no-console
        console.log(`[channel:${payload.channel}] -> ${payload.target}: ${payload.content}`);
        return {
            command_id: id,
            status: "success",
            result: { sent: true, channel: payload.channel, target: payload.target },
            metrics: { duration_ms: Date.now() - start },
        };
    }
    async withTimeout(p, timeout_ms) {
        if (!timeout_ms)
            return p;
        return await Promise.race([
            p,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${timeout_ms}ms`)), timeout_ms)),
        ]);
    }
}
//# sourceMappingURL=executor.js.map
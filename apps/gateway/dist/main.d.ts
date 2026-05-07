import { LongTermMemoryStore } from "@blue-tanuki/hds-brain";
import { type SessionStore } from "@blue-tanuki/core";
import { buildAuditLog, AUDIT_FILENAME } from "./audit_config.js";
import { type PluginRuntime } from "./plugin_loader.js";
export { buildAuditLog, AUDIT_FILENAME };
/**
 * Gateway wires HDS-BRAIN (upstream) to BLUE-TANUKI/core (executor).
 *
 * Modes:
 *   - CLI one-shot: argv becomes one inbound message.
 *   - serve: long-running WebChat/Slack/Discord gateway.
 */
/**
 * Build the SessionStore from env. Default in CLI mode is in-memory only
 * (one-shot has nothing to persist across runs); set
 * BLUE_TANUKI_SESSION_DIR to use the JSON file backend.
 */
export declare function buildHDSMemoryStore(env?: NodeJS.ProcessEnv): LongTermMemoryStore;
export declare function buildSessionStore(plugins?: PluginRuntime, env?: NodeJS.ProcessEnv): SessionStore;
//# sourceMappingURL=main.d.ts.map
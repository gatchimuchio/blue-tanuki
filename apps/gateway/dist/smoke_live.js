import { randomUUID } from "node:crypto";
import { buildLLMBackendFromEnv, describeLLMConfig } from "./llm_config.js";
import { loadPluginRuntime } from "./plugin_loader.js";
const LIVE_REQUIRED = process.env.BLUE_TANUKI_LIVE_REQUIRED === "1";
const TIMEOUT_MS = parsePositiveInt(process.env.BLUE_TANUKI_LIVE_TIMEOUT_MS, 30_000);
const SLACK_PACKAGE = "@blue-tanuki/channel-slack";
const DISCORD_PACKAGE = "@blue-tanuki/channel-discord";
const SLACK_LIVE_PERMISSIONS = [
    "network:slack.com",
    "secrets:SLACK_BOT_TOKEN",
    "secrets:SLACK_APP_TOKEN",
];
const DISCORD_LIVE_PERMISSIONS = [
    "network:discord.com",
    "secrets:DISCORD_BOT_TOKEN",
];
async function main() {
    const plugins = await loadPluginRuntime();
    const results = [];
    results.push(await runSmoke("llm", () => smokeLLM(plugins)));
    results.push(await runSmoke("slack", () => smokeSlack(plugins)));
    results.push(await runSmoke("discord", () => smokeDiscord(plugins)));
    for (const r of results) {
        console.log(`[live:${r.name}] ${r.status.toUpperCase()} ${r.detail}`);
    }
    const ran = results.filter((r) => r.status !== "skip").length;
    const failed = results.filter((r) => r.status === "fail");
    if (failed.length > 0) {
        process.exit(1);
    }
    if (LIVE_REQUIRED && ran === 0) {
        console.error("[live] FAIL no live smoke was configured; unset BLUE_TANUKI_LIVE_REQUIRED or provide live credentials");
        process.exit(1);
    }
    console.log(`[live] complete ran=${ran} skipped=${results.length - ran}`);
}
async function runSmoke(name, fn) {
    try {
        const detail = await fn();
        if (detail === null) {
            return { name, status: "skip", detail: "credentials/target not configured" };
        }
        return { name, status: "pass", detail };
    }
    catch (e) {
        return {
            name,
            status: "fail",
            detail: e instanceof Error ? e.message : String(e),
        };
    }
}
async function smokeLLM(plugins) {
    plugins.enforceLLMConfig(process.env);
    const cfg = describeLLMConfig();
    if (cfg.default_backend === "stub")
        return null;
    const backend = buildLLMBackendFromEnv();
    const res = await withTimeout("llm call", backend.call({
        max_tokens: 24,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: "Reply with exactly: BLUE-TANUKI-LIVE-OK",
            },
            { role: "user", content: "live smoke" },
        ],
    }), parsePositiveInt(process.env.BLUE_TANUKI_LIVE_LLM_TIMEOUT_MS ??
        process.env.BLUE_TANUKI_LLM_TIMEOUT_MS, TIMEOUT_MS));
    if (!res.content.includes("BLUE-TANUKI-LIVE-OK")) {
        throw new Error(`unexpected response from ${res.model}: ${JSON.stringify(res.content)}`);
    }
    return `model=${res.model} tokens=${res.tokens_used}`;
}
async function smokeSlack(plugins) {
    const target = process.env.SLACK_LIVE_TARGET;
    if (!target)
        return null;
    plugins.requirePermissions(SLACK_PACKAGE, SLACK_LIVE_PERMISSIONS, "live smoke slack");
    const botToken = process.env.SLACK_BOT_TOKEN;
    const appToken = process.env.SLACK_APP_TOKEN;
    if (!botToken || !appToken || !target)
        return null;
    const slack = plugins.createChannel({
        package_name: SLACK_PACKAGE,
        required_permissions: SLACK_LIVE_PERMISSIONS,
        action: "live smoke slack",
        constructor_args: [{
                bot_token: botToken,
                app_token: appToken,
                log: (line) => console.log(`[live:slack:transport] ${line}`),
            }],
    });
    try {
        await withTimeout("slack start", slack.start(async () => undefined), TIMEOUT_MS);
        const result = await withTimeout("slack send", slack.send({
            channel: "slack",
            target,
            content: `BLUE-TANUKI live smoke ${new Date().toISOString()}`,
        }, {
            command_id: `live-${randomUUID()}`,
            upstream_commit_hash: "live-smoke",
        }), TIMEOUT_MS);
        if (!result.delivered) {
            throw new Error(result.error ?? "send_not_delivered");
        }
        return `target=${target} external_id=${result.external_id ?? "unknown"}`;
    }
    finally {
        await slack.stop();
    }
}
async function smokeDiscord(plugins) {
    const target = process.env.DISCORD_LIVE_TARGET;
    if (!target)
        return null;
    plugins.requirePermissions(DISCORD_PACKAGE, DISCORD_LIVE_PERMISSIONS, "live smoke discord");
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || !target)
        return null;
    const discord = plugins.createChannel({
        package_name: DISCORD_PACKAGE,
        required_permissions: DISCORD_LIVE_PERMISSIONS,
        action: "live smoke discord",
        constructor_args: [{
                bot_token: botToken,
                log: (line) => console.log(`[live:discord:transport] ${line}`),
            }],
    });
    try {
        await withTimeout("discord start", discord.start(async () => undefined), TIMEOUT_MS);
        const result = await withTimeout("discord send", discord.send({
            channel: "discord",
            target,
            content: `BLUE-TANUKI live smoke ${new Date().toISOString()}`,
        }, {
            command_id: `live-${randomUUID()}`,
            upstream_commit_hash: "live-smoke",
        }), TIMEOUT_MS);
        if (!result.delivered) {
            throw new Error(result.error ?? "send_not_delivered");
        }
        return `target=${target} external_id=${result.external_id ?? "unknown"}`;
    }
    finally {
        await discord.stop();
    }
}
async function withTimeout(label, promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
function parsePositiveInt(raw, fallback) {
    if (!raw)
        return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
main().catch((e) => {
    console.error("[live] crashed:", e);
    process.exit(1);
});
//# sourceMappingURL=smoke_live.js.map
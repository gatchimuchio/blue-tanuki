export function renderControlCenterHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BLUE-TANUKI Control Center</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0c1118;
        --panel: #141b24;
        --panel-2: #19222d;
        --panel-3: #202b38;
        --line: #314052;
        --text: #f3f6fa;
        --muted: #9facbd;
        --good: #5fe0a5;
        --warn: #ffd166;
        --bad: #ff6f7d;
        --review: #d7a7ff;
        --accent: #74b9ff;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 14px;
        letter-spacing: 0;
        line-height: 1.45;
      }

      button,
      input {
        font: inherit;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 20px;
        border-bottom: 1px solid var(--line);
        background: #111820;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        font-size: 18px;
        font-weight: 760;
      }

      h2 {
        font-size: 14px;
        font-weight: 720;
      }

      h3 {
        font-size: 13px;
        font-weight: 700;
      }

      .muted {
        color: var(--muted);
      }

      .mono {
        font-family:
          "SFMono-Regular",
          Consolas,
          "Liberation Mono",
          monospace;
      }

      .shell {
        display: grid;
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(320px, 430px);
        min-height: calc(100vh - 58px);
      }

      nav,
      aside {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        padding: 14px;
        border-right: 1px solid var(--line);
        background: #101720;
        overflow-y: auto;
      }

      aside {
        border-right: 0;
        border-left: 1px solid var(--line);
      }

      main {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        overflow-y: auto;
      }

      .card {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }

      .stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
      }

      .metric,
      .state-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
        padding: 8px 9px;
        border: 1px solid #273444;
        border-radius: 8px;
        background: var(--panel-2);
      }

      .metric span:first-child,
      .state-row span:first-child {
        min-width: 0;
        color: var(--muted);
      }

      .metric span:last-child,
      .state-row span:last-child {
        min-width: 0;
        overflow-wrap: anywhere;
        text-align: right;
        font-weight: 650;
      }

      .status-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        max-width: 100%;
        padding: 3px 8px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--panel-3);
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .badge.good {
        border-color: rgba(95, 224, 165, 0.5);
        color: var(--good);
      }

      .badge.warn {
        border-color: rgba(255, 209, 102, 0.5);
        color: var(--warn);
      }

      .badge.bad {
        border-color: rgba(255, 111, 125, 0.5);
        color: var(--bad);
      }

      .badge.review {
        border-color: rgba(215, 167, 255, 0.6);
        color: var(--review);
      }

      .policy-row,
      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      label.policy {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 142px;
        flex: 1;
        padding: 9px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-2);
      }

      input[type="password"],
      input[type="text"] {
        width: 100%;
        min-height: 36px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #0e141c;
        color: var(--text);
        padding: 8px 10px;
      }

      button {
        min-height: 34px;
        min-width: 74px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-3);
        color: var(--text);
        cursor: pointer;
      }

      button.primary {
        border-color: rgba(116, 185, 255, 0.55);
        color: var(--accent);
      }

      button.danger {
        border-color: rgba(255, 111, 125, 0.55);
        color: var(--bad);
      }

      button:hover {
        border-color: var(--accent);
      }

      .log {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .msg {
        max-width: 860px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }

      .msg.system {
        border-color: rgba(116, 185, 255, 0.5);
      }

      .queue-list,
      .notification-list,
      .schedule-list,
      .trace-list,
      .audit-list {
        display: grid;
        gap: 8px;
      }

      .queue-item,
      .notification-item,
      .schedule-item,
      .trace-item,
      .audit-item {
        display: grid;
        gap: 8px;
        min-width: 0;
        padding: 10px;
        border: 1px solid #2b394a;
        border-radius: 8px;
        background: #111923;
      }

      .kv {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 6px 10px;
        min-width: 0;
      }

      .kv dt {
        color: var(--muted);
      }

      .kv dd {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      pre {
        max-height: 240px;
        min-height: 44px;
        margin: 0;
        overflow: auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        padding: 10px;
        border: 1px solid #273444;
        border-radius: 8px;
        background: #0e141c;
        color: #dce6f2;
        font-size: 12px;
      }

      @media (max-width: 1120px) {
        .shell {
          grid-template-columns: minmax(210px, 270px) minmax(0, 1fr);
        }

        aside {
          grid-column: 1 / -1;
          border-left: 0;
          border-top: 1px solid var(--line);
        }
      }

      @media (max-width: 760px) {
        header,
        .shell,
        nav,
        main,
        aside {
          display: block;
        }

        header {
          padding: 12px;
        }

        nav,
        main,
        aside {
          padding: 12px;
          border-left: 0;
          border-right: 0;
        }

        nav,
        main {
          border-bottom: 1px solid var(--line);
        }

        .status-grid {
          grid-template-columns: 1fr;
        }

        .kv {
          grid-template-columns: 92px minmax(0, 1fr);
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="row">
        <h1>BLUE-TANUKI Control Center</h1>
        <span id="header-status" class="badge warn">not loaded</span>
      </div>
      <span class="badge">HDS resident console</span>
    </header>

    <div class="shell">
      <nav aria-label="Control Center status">
        <section class="card">
          <h2>Permanent-Use Status</h2>
          <div id="permanent-use-status" class="status-grid">
            <div class="state-row"><span>Gateway</span><span>not loaded</span></div>
            <div class="state-row"><span>HDS</span><span>not loaded</span></div>
            <div class="state-row"><span>Audit</span><span>not loaded</span></div>
            <div class="state-row"><span>Approvals</span><span>not loaded</span></div>
          </div>
        </section>

        <section class="card">
          <h2>First-Run Next Action</h2>
          <div class="metric">
            <span>Next</span>
            <span id="first-run-next-action">not loaded</span>
          </div>
        </section>

        <section class="card">
          <h2>Approval Policy</h2>
          <div class="policy-row">
            <label class="policy"><input type="radio" name="policy" checked /> suggest</label>
            <label class="policy"><input type="radio" name="policy" /> review-only</label>
          </div>
          <div class="metric">
            <span>Final Review</span>
            <span id="policy-final-review">required</span>
          </div>
        </section>

        <section class="card">
          <h2>Runtime Snapshot</h2>
          <div class="metric"><span>Gateway</span><span id="gateway-status">not loaded</span></div>
          <div class="metric"><span>HDS Invariants</span><span id="runtime-invariant">not loaded</span></div>
          <div class="metric"><span>Audit Chain</span><span id="runtime-audit">not loaded</span></div>
          <input id="runtime-token" type="password" autocomplete="off" placeholder="webchat token" />
          <button id="load-runtime" class="primary">Load</button>
        </section>

        <section class="card">
          <h2>Scheduled Tasks / Runtime Schedules</h2>
          <div class="metric"><span>Configured</span><span id="schedule-count">not loaded</span></div>
          <div class="metric"><span>Active</span><span id="schedule-active-count">not loaded</span></div>
          <div class="metric"><span>Pending</span><span id="schedule-pending-count">not loaded</span></div>
        </section>
      </nav>

      <main>
        <section class="log" aria-live="polite">
          <article class="msg system">
            <h2>System</h2>
            <p class="muted">Resident status, approval gates, schedule state, authority trace, and audit chain are surfaced without command content or credential values.</p>
          </article>
          <article class="msg">
            <h2>Approval Model</h2>
            <p class="muted">L3 and final-review work remains a one-time operator decision. The console only submits explicit approve, reject, or block verdicts.</p>
          </article>
        </section>

        <section class="card">
          <div class="row">
            <h2>Notification Center</h2>
            <span id="notification-summary" class="badge warn">not loaded</span>
          </div>
          <input id="notifications-token" type="password" autocomplete="off" placeholder="webchat token" />
          <button id="load-notifications" class="primary">Load</button>
          <div id="notification-list" class="notification-list"></div>
        </section>

        <section class="card">
          <div class="row">
            <h2>Approval Queue</h2>
            <span id="approval-summary" class="badge warn">not loaded</span>
          </div>
          <div class="status-grid">
            <div class="metric"><span>Pending</span><span id="approval-count">not loaded</span></div>
            <div class="metric"><span>Final Review</span><span id="approval-final-review-count">not loaded</span></div>
            <div class="metric"><span>ApprovalLevel</span><span id="approval-level-scope">not loaded</span></div>
            <div class="metric"><span>Token expiry</span><span id="approval-token-expiry">not loaded</span></div>
          </div>
          <input id="approval-token" type="password" autocomplete="off" placeholder="resume token" />
          <button id="load-approvals" class="primary">Load</button>
          <div id="approval-list" class="queue-list"></div>
        </section>

        <section class="card">
          <div class="row">
            <h2>Runtime Schedules</h2>
            <span id="schedule-summary" class="badge warn">not loaded</span>
          </div>
          <div id="runtime-schedule-list" class="schedule-list"></div>
        </section>

        <section class="card">
          <div class="row">
            <h2>Authority Trace</h2>
            <span id="authority-summary" class="badge warn">not loaded</span>
          </div>
          <input id="authority-token" type="password" autocomplete="off" placeholder="webchat token" />
          <button id="load-authority" class="primary">Load</button>
          <div id="authority-trace-list" class="trace-list"></div>
          <pre id="authority-json">not loaded</pre>
        </section>
      </main>

      <aside>
        <section class="card">
          <div class="row">
            <h2>Authority Audit</h2>
            <span id="audit-status" class="badge warn">not loaded</span>
          </div>
          <div class="metric"><span>Chain Valid</span><span id="audit-chain-valid">not loaded</span></div>
          <div class="metric"><span>Entries</span><span id="audit-entry-count">not loaded</span></div>
          <input id="audit-token" type="password" autocomplete="off" placeholder="webchat token" />
          <div class="action-row">
            <button id="load-audit" class="primary">Load Audit</button>
            <button id="verify-audit">Verify Chain</button>
          </div>
          <div id="audit-list" class="audit-list"></div>
          <pre id="audit-text">not loaded</pre>
        </section>

        <section class="card">
          <h2>Runtime Snapshot JSON</h2>
          <pre id="runtime-json">not loaded</pre>
        </section>

        <section class="card">
          <h2>Schedule Snapshot JSON</h2>
          <pre id="schedule-json">not loaded</pre>
        </section>

        <section class="card">
          <h2>Scope</h2>
          <div class="metric"><span>Gateway</span><span>telemetry only</span></div>
          <div class="metric"><span>Executor</span><span>not embedded</span></div>
          <div class="metric"><span>Memory</span><span>HDS only</span></div>
        </section>

        <section class="card">
          <h2>Final Review Remains</h2>
          <div class="metric"><span>L3</span><span>one-time gate</span></div>
          <div class="metric"><span>Full access</span><span>manual only</span></div>
        </section>

        <section class="card">
          <h2>HDS Memory Rule</h2>
          <div class="metric"><span>Allowed</span><span>mode / task / summary</span></div>
          <div class="metric"><span>Forbidden</span><span>credentials / secrets / raw content</span></div>
        </section>
      </aside>
    </div>

    <script>
      const state = {
        runtimeToken: sessionStorage.getItem("bt.runtimeToken") || "",
        approvalToken: sessionStorage.getItem("bt.approvalToken") || "",
        auditToken: sessionStorage.getItem("bt.auditToken") || "",
        authorityToken: sessionStorage.getItem("bt.authorityToken") || "",
        notificationsToken: sessionStorage.getItem("bt.notificationsToken") || "",
        approvalTokens: Object.create(null)
      };

      const redactKeyParts = ["token", "secret", "authorization", "cookie", "content", "credential", "password"];

      function byId(id) {
        return document.getElementById(id);
      }

      function setText(id, value) {
        const node = byId(id);
        if (node) node.textContent = String(value);
      }

      function setHtml(id, value) {
        const node = byId(id);
        if (node) node.innerHTML = value;
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function badge(value, tone) {
        const safeTone = tone ? " " + tone : "";
        return '<span class="badge' + safeTone + '">' + escapeHtml(value) + '</span>';
      }

      function toneForBoolean(value) {
        if (value === true) return "good";
        if (value === false) return "bad";
        return "warn";
      }

      function labelForBoolean(value) {
        if (value === true) return "ok";
        if (value === false) return "blocked";
        return "unknown";
      }

      function compactJson(value) {
        return JSON.stringify(value, null, 2);
      }

      function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
      }

      function redactRuntimeValue(value) {
        if (Array.isArray(value)) {
          return value.map(redactRuntimeValue);
        }
        if (!isObject(value)) {
          return value;
        }
        const output = {};
        for (const key of Object.keys(value)) {
          const lower = key.toLowerCase();
          const shouldRedact = redactKeyParts.some((part) => lower.includes(part));
          output[key] = shouldRedact ? "[redacted]" : redactRuntimeValue(value[key]);
        }
        return output;
      }

      function formatDate(ms) {
        if (typeof ms !== "number" || !Number.isFinite(ms)) return "not set";
        return new Date(ms).toLocaleString();
      }

      function formatInterval(ms) {
        if (typeof ms !== "number" || !Number.isFinite(ms)) return "not set";
        if (ms < 1000) return String(ms) + " ms";
        if (ms < 60000) return String(Math.round(ms / 1000)) + " sec";
        if (ms < 3600000) return String(Math.round(ms / 60000)) + " min";
        return String(Math.round(ms / 3600000)) + " hr";
      }

      function authHeaders(token) {
        return token ? { Authorization: "Bearer " + token } : {};
      }

      async function fetchJson(path, token) {
        const response = await fetch(path, { headers: authHeaders(token) });
        if (!response.ok) throw new Error(path + " failed: HTTP " + response.status);
        return response.json();
      }

      function syncInputs() {
        byId("runtime-token").value = state.runtimeToken;
        byId("approval-token").value = state.approvalToken;
        byId("audit-token").value = state.auditToken;
        byId("authority-token").value = state.authorityToken;
        byId("notifications-token").value = state.notificationsToken;
      }

      function severityTone(severity) {
        if (severity === "critical") return "bad";
        if (severity === "warning" || severity === "action_required") return "review";
        return "good";
      }

      function updatePermanentUseStatus(body) {
        const pendingApprovals = Number(body.pending_approvals_count ?? 0);
        const pendingSchedules = Number(body.pending_schedule_approvals_count ?? 0);
        const items = [
          ["Gateway", body.gateway_status || "unknown", body.gateway_status === "ready" ? "good" : "warn"],
          ["HDS", labelForBoolean(body.hds_invariants_ok), toneForBoolean(body.hds_invariants_ok)],
          ["Audit", labelForBoolean(body.audit_chain_valid), toneForBoolean(body.audit_chain_valid)],
          ["WebChat", labelForBoolean(body.webchat_ready), toneForBoolean(body.webchat_ready)],
          ["Approvals", String(pendingApprovals), pendingApprovals === 0 ? "good" : "review"],
          ["Schedules", String(pendingSchedules), pendingSchedules === 0 ? "good" : "review"],
          ["Telegram", body.telegram_configured ? "configured" : "optional", body.telegram_configured ? "good" : "warn"],
          ["Runtime", body.runtime_schedules_count ?? "0", "good"]
        ];
        setHtml(
          "permanent-use-status",
          items
            .map(function (item) {
              return '<div class="state-row"><span>' + escapeHtml(item[0]) + '</span><span>' + badge(item[1], item[2]) + '</span></div>';
            })
            .join("")
        );
      }

      function renderSchedules(body) {
        const runtimeSchedules = Array.isArray(body.runtime_schedules) ? body.runtime_schedules : [];
        const configuredTasks = Array.isArray(body.scheduled_tasks) ? body.scheduled_tasks : [];
        const activeCount = runtimeSchedules.filter((item) => item.status === "active" || item.enabled === true).length;
        const pendingCount = runtimeSchedules.filter((item) => item.status === "pending" || Boolean(item.pending_operation)).length;
        const displayActive = body.runtime_schedules_count ?? activeCount;
        const displayPending = body.pending_schedule_approvals_count ?? pendingCount;

        setText("schedule-count", configuredTasks.length);
        setText("schedule-active-count", displayActive);
        setText("schedule-pending-count", displayPending);
        setText("schedule-summary", String(displayActive) + " active / " + String(displayPending) + " pending");
        byId("schedule-summary").className = "badge " + (displayPending > 0 ? "review" : "good");

        const rows = runtimeSchedules.length > 0 ? runtimeSchedules : configuredTasks;
        if (rows.length === 0) {
          setHtml("runtime-schedule-list", '<div class="schedule-item muted">no runtime schedules</div>');
        } else {
          setHtml(
            "runtime-schedule-list",
            rows
              .map(function (item) {
                const status = item.status || (item.enabled === false ? "disabled" : "active");
                const tone = status === "active" ? "good" : status === "pending" ? "review" : status === "rejected" ? "bad" : "warn";
                const pending = item.pending_operation ? badge(item.pending_operation, "review") : badge("none", "good");
                const fields = [
                  ["id", item.id || item.schedule_id || "unknown", false],
                  ["status", badge(status, tone), true],
                  ["channel", item.channel || "unknown", false],
                  ["target", item.target || "unknown", false],
                  ["time", item.time || "not set", false],
                  ["interval", formatInterval(item.interval_ms), false],
                  ["pending", pending, true],
                  ["approval", item.pending_command_id || "none", false],
                  ["expires", formatDate(item.approval_expires_at_ms), false],
                  ["payload", item.payload_hash || "not recorded", false]
                ];
                return '<article class="schedule-item"><dl class="kv">' +
                  fields
                    .map(function (field) {
                      const value = field[2] ? field[1] : escapeHtml(field[1]);
                      return '<dt>' + escapeHtml(field[0]) + '</dt><dd>' + value + '</dd>';
                    })
                    .join("") +
                  "</dl></article>";
              })
              .join("")
          );
        }

        setText("schedule-json", compactJson(redactRuntimeValue({ runtime_schedules: runtimeSchedules, scheduled_tasks: configuredTasks })));
      }

      function renderRuntime(body) {
        const invariantOk = body.hds_invariants_ok ?? body.hds?.invariants?.process_policy_enforced;
        const auditOk = body.audit_chain_valid ?? body.hds?.audit?.chain_valid;
        setText("gateway-status", body.gateway_status || "unknown");
        setText("runtime-invariant", labelForBoolean(invariantOk));
        setText("runtime-audit", labelForBoolean(auditOk));
        setText("first-run-next-action", body.next_recommended_action || "none");
        setText("runtime-json", compactJson(redactRuntimeValue(body)));
        setText("header-status", body.gateway_status || "loaded");
        byId("header-status").className = "badge " + (body.gateway_status === "ready" ? "good" : "warn");
        updatePermanentUseStatus(body);
        renderSchedules(body);
      }

      function renderApprovals(body) {
        const pending = Array.isArray(body.pending) ? body.pending : [];
        const finalReviewCount = pending.filter((item) => item.final_review_required).length;
        const levels = Array.from(new Set(pending.map((item) => item.approval_level || "unknown")));
        const expiries = pending
          .map((item) => item.approval_token_expires_at_ms)
          .filter((value) => typeof value === "number")
          .sort((left, right) => left - right);

        setText("approval-count", pending.length);
        setText("approval-final-review-count", finalReviewCount);
        setText("approval-level-scope", levels.length > 0 ? levels.join(", ") : "none");
        setText("approval-token-expiry", expiries.length > 0 ? formatDate(expiries[0]) : "not set");
        setText("approval-summary", String(pending.length) + " pending");
        byId("approval-summary").className = "badge " + (pending.length > 0 ? "review" : "good");
        state.approvalTokens = Object.create(null);

        if (pending.length === 0) {
          setHtml("approval-list", '<div class="queue-item muted">no pending approvals</div>');
          return;
        }

        setHtml(
          "approval-list",
          pending
            .map(function (item) {
              const level = item.approval_level || "unknown";
              const finalBadge = item.final_review_required ? badge("Final Review", "review") : badge("one-time", "good");
              const riskTone = item.risk === "high" || item.risk === "critical" ? "bad" : item.risk === "medium" ? "warn" : "good";
              const authority = item.authority_trace ? compactJson(redactRuntimeValue(item.authority_trace)) : "not recorded";
              if (item.command_id && item.approval_token) {
                state.approvalTokens[item.command_id] = item.approval_token;
              }
              return '<article class="queue-item" data-command="' + escapeHtml(item.command_id || "") + '">' +
                '<div class="row"><h3>' + escapeHtml(item.operation || "unknown operation") + '</h3><span>' + finalBadge + '</span></div>' +
                '<dl class="kv">' +
                '<dt>command</dt><dd class="mono">' + escapeHtml(item.command_id || "unknown") + '</dd>' +
                '<dt>request</dt><dd class="mono">' + escapeHtml(item.request_id || "unknown") + '</dd>' +
                '<dt>risk</dt><dd>' + badge(item.risk || "unknown", riskTone) + '</dd>' +
                '<dt>ApprovalLevel</dt><dd>' + badge(level, level === "L3" ? "review" : "good") + '</dd>' +
                '<dt>expires</dt><dd>' + escapeHtml(formatDate(item.approval_token_expires_at_ms)) + '</dd>' +
                '<dt>reason</dt><dd>' + escapeHtml(item.reason || "not recorded") + '</dd>' +
                '</dl>' +
                '<pre>' + escapeHtml(authority) + '</pre>' +
                '<div class="action-row">' +
                '<button class="primary" data-verdict="approve" data-command="' + escapeHtml(item.command_id || "") + '">Approve</button>' +
                '<button data-verdict="reject" data-command="' + escapeHtml(item.command_id || "") + '">Reject</button>' +
                '<button class="danger" data-verdict="block" data-command="' + escapeHtml(item.command_id || "") + '">Block</button>' +
                '</div>' +
                '</article>';
            })
            .join("")
        );
      }

      function renderNotifications(body) {
        const notifications = Array.isArray(body.notifications) ? body.notifications : [];
        setText("notification-summary", String(notifications.length) + " active");
        byId("notification-summary").className = "badge " + (notifications.length > 0 ? "review" : "good");

        if (notifications.length === 0) {
          setHtml("notification-list", '<div class="notification-item muted">no resident notifications</div>');
          return;
        }

        setHtml(
          "notification-list",
          notifications
            .map(function (item) {
              const fields = [
                ["kind", item.kind || "unknown"],
                ["severity", badge(item.severity || "info", severityTone(item.severity))],
                ["source", item.source || "unknown"],
                ["request", item.request_id || "none"],
                ["command", item.command_id || "none"],
                ["schedule", item.schedule_id || "none"],
                ["ApprovalLevel", item.approval_level || "none"],
                ["risk", item.risk || "none"],
                ["payload", item.payload_hash || "not recorded"],
                ["next", item.next_action || "none"],
                ["authority", item.authority || "display_only"]
              ];
              return '<article class="notification-item">' +
                '<div class="row"><h3>' + escapeHtml(item.title || "Notification") + '</h3>' + badge("read only", "good") + '</div>' +
                '<p class="muted">' + escapeHtml(item.message || "") + '</p>' +
                '<dl class="kv">' +
                fields
                  .map(function (field) {
                    const value = field[0] === "severity" ? field[1] : escapeHtml(field[1]);
                    return '<dt>' + escapeHtml(field[0]) + '</dt><dd>' + value + '</dd>';
                  })
                  .join("") +
                '</dl>' +
                '</article>';
            })
            .join("")
        );
      }

      function renderAudit(body) {
        const chainValid = body.chain_valid ?? body.valid ?? body.audit_chain_valid;
        const entries = Array.isArray(body.entries) ? body.entries : Array.isArray(body.audit_log) ? body.audit_log : [];
        setText("audit-chain-valid", labelForBoolean(chainValid));
        setText("audit-entry-count", entries.length);
        setText("audit-status", chainValid === true ? "valid" : chainValid === false ? "invalid" : "unknown");
        byId("audit-status").className = "badge " + toneForBoolean(chainValid);

        if (entries.length === 0) {
          setHtml("audit-list", '<div class="audit-item muted">no audit entries in response</div>');
          return;
        }

        setHtml(
          "audit-list",
          entries
            .slice(-6)
            .reverse()
            .map(function (entry) {
              const safe = redactRuntimeValue(entry);
              const event = safe.event || safe.kind || "audit";
              const actor = safe.actor || safe.channel || "unknown";
              const hash = safe.payload_hash || safe.hash || "not recorded";
              return '<article class="audit-item"><dl class="kv">' +
                '<dt>event</dt><dd>' + escapeHtml(event) + '</dd>' +
                '<dt>actor</dt><dd>' + escapeHtml(actor) + '</dd>' +
                '<dt>hash</dt><dd class="mono">' + escapeHtml(hash) + '</dd>' +
                '<dt>time</dt><dd>' + escapeHtml(safe.timestamp || safe.timestamp_ms || "not recorded") + '</dd>' +
                '</dl></article>';
            })
            .join("")
        );
      }

      function renderAuthorityTrace(body) {
        const trace = Array.isArray(body.authority_trace) ? body.authority_trace : Array.isArray(body.trace) ? body.trace : [];
        setText("authority-summary", String(trace.length) + " events");
        byId("authority-summary").className = "badge " + (trace.length > 0 ? "good" : "warn");

        if (trace.length === 0) {
          setHtml("authority-trace-list", '<div class="trace-item muted">no authority trace events</div>');
        } else {
          setHtml(
            "authority-trace-list",
            trace
              .slice(-10)
              .reverse()
              .map(function (entry) {
                const safe = redactRuntimeValue(entry);
                return '<article class="trace-item"><dl class="kv">' +
                  '<dt>event</dt><dd>' + escapeHtml(safe.event || safe.kind || "unknown") + '</dd>' +
                  '<dt>request</dt><dd class="mono">' + escapeHtml(safe.request_id || "none") + '</dd>' +
                  '<dt>command</dt><dd class="mono">' + escapeHtml(safe.command_id || "none") + '</dd>' +
                  '<dt>operation</dt><dd>' + escapeHtml(safe.operation || "none") + '</dd>' +
                  '<dt>risk</dt><dd>' + escapeHtml(safe.risk || "unknown") + '</dd>' +
                  '<dt>ApprovalLevel</dt><dd>' + escapeHtml(safe.approval_level || "unknown") + '</dd>' +
                  '<dt>schedule</dt><dd class="mono">' + escapeHtml(safe.schedule_id || "none") + '</dd>' +
                  '<dt>hash</dt><dd class="mono">' + escapeHtml(safe.payload_hash || "not recorded") + '</dd>' +
                  '</dl></article>';
              })
              .join("")
          );
        }

        setText("authority-json", compactJson(redactRuntimeValue(body)));
      }

      async function loadRuntime() {
        const token = byId("runtime-token").value.trim();
        state.runtimeToken = token;
        sessionStorage.setItem("bt.runtimeToken", token);
        try {
          const body = await fetchJson("/runtime/snapshot", token);
          renderRuntime(body);
        } catch (error) {
          setText("runtime-json", error.message);
          setText("header-status", "runtime error");
          byId("header-status").className = "badge bad";
        }
      }

      async function loadApprovals() {
        const token = byId("approval-token").value.trim();
        state.approvalToken = token;
        sessionStorage.setItem("bt.approvalToken", token);
        try {
          const body = await fetchJson("/approval", token);
          renderApprovals(body);
        } catch (error) {
          setHtml("approval-list", '<div class="queue-item">' + escapeHtml(error.message) + '</div>');
          setText("approval-summary", "error");
          byId("approval-summary").className = "badge bad";
        }
      }

      async function loadNotifications() {
        const token = byId("notifications-token").value.trim();
        state.notificationsToken = token;
        sessionStorage.setItem("bt.notificationsToken", token);
        try {
          const body = await fetchJson("/notifications", token);
          renderNotifications(body);
        } catch (error) {
          setHtml("notification-list", '<div class="notification-item">' + escapeHtml(error.message) + '</div>');
          setText("notification-summary", "error");
          byId("notification-summary").className = "badge bad";
        }
      }

      async function submitApproval(commandId, verdict, approvalToken) {
        const token = byId("approval-token").value.trim();
        const response = await fetch("/approval/" + encodeURIComponent(commandId), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeaders(token)
          },
          body: JSON.stringify({ verdict: verdict, approval_token: approvalToken })
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error("approval failed: HTTP " + response.status + " " + text);
        }
        await loadApprovals();
      }

      async function loadAuditText() {
        const token = byId("audit-token").value.trim();
        state.auditToken = token;
        sessionStorage.setItem("bt.auditToken", token);
        try {
          const response = await fetch("/audit/dump", { headers: authHeaders(token) });
          if (!response.ok) throw new Error("audit dump failed: HTTP " + response.status);
          const text = await response.text();
          setText("audit-text", text);
        } catch (error) {
          setText("audit-text", error.message);
          setText("audit-status", "error");
          byId("audit-status").className = "badge bad";
        }
      }

      async function verifyAudit() {
        const token = byId("audit-token").value.trim();
        state.auditToken = token;
        sessionStorage.setItem("bt.auditToken", token);
        try {
          const body = await fetchJson("/audit/dump?format=json", token);
          renderAudit(body);
          setText("audit-text", compactJson(redactRuntimeValue({
            chain_valid: body.chain_valid ?? body.valid ?? body.audit_chain_valid,
            entry_count: Array.isArray(body.entries) ? body.entries.length : Array.isArray(body.audit_log) ? body.audit_log.length : 0,
            failure: body.failure || body.error || null
          })));
        } catch (error) {
          setText("audit-text", error.message);
          setText("audit-status", "error");
          byId("audit-status").className = "badge bad";
        }
      }

      async function loadAuthorityTrace() {
        const token = byId("authority-token").value.trim();
        state.authorityToken = token;
        sessionStorage.setItem("bt.authorityToken", token);
        try {
          const body = await fetchJson("/authority/trace", token);
          renderAuthorityTrace(body);
        } catch (error) {
          setText("authority-json", error.message);
          setHtml("authority-trace-list", '<div class="trace-item">' + escapeHtml(error.message) + '</div>');
          setText("authority-summary", "error");
          byId("authority-summary").className = "badge bad";
        }
      }

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) return;
        const verdict = target.dataset.verdict;
        if (!verdict) return;
        target.disabled = true;
        try {
          const commandId = target.dataset.command || "";
          await submitApproval(commandId, verdict, state.approvalTokens[commandId] || "");
        } catch (error) {
          alert(error.message);
        } finally {
          target.disabled = false;
        }
      });

      byId("load-runtime").addEventListener("click", loadRuntime);
      byId("load-notifications").addEventListener("click", loadNotifications);
      byId("load-approvals").addEventListener("click", loadApprovals);
      byId("load-audit").addEventListener("click", loadAuditText);
      byId("verify-audit").addEventListener("click", verifyAudit);
      byId("load-authority").addEventListener("click", loadAuthorityTrace);

      syncInputs();
    </script>
  </body>
</html>`;
}

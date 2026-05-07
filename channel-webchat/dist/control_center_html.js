/**
 * Built-in local Control Center shell.
 *
 * This is deliberately a small static page, not an SPA framework. The gateway
 * should remain easy to audit: one HTML document, no CDN, no third-party JS.
 */
export function renderControlCenterHtml() {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BLUE-TANUKI Control Center</title>
<style>
:root {
  color-scheme: dark;
  --bg: #0b0e12;
  --panel: #151b24;
  --panel-2: #101620;
  --line: #263241;
  --text: #e8edf4;
  --muted: #9aa7b6;
  --good: #8bdc9b;
  --warn: #ffd166;
  --bad: #ff7b7b;
  --accent: #7cc7ff;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
header { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border-bottom: 1px solid var(--line); background: #0d1219; }
header strong { letter-spacing: 0.03em; }
header .status { display: flex; gap: 10px; align-items: center; color: var(--muted); font-size: 13px; }
.dot { width: 9px; height: 9px; border-radius: 999px; background: var(--good); box-shadow: 0 0 16px var(--good); }
.shell { display: grid; grid-template-columns: 280px 1fr 360px; min-height: calc(100vh - 56px); }
nav { border-right: 1px solid var(--line); background: var(--panel-2); padding: 14px; }
nav h2, aside h2 { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .12em; margin: 14px 0 8px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.metric { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; margin: 8px 0; }
.metric span:first-child { color: var(--muted); }
.badge { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--accent); font-size: 12px; }
main { display: grid; grid-template-rows: 1fr auto; min-width: 0; }
.log { padding: 18px; overflow: auto; }
.msg { max-width: 900px; border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 12px 14px; margin: 0 0 12px; }
.msg .meta { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.composer { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 14px; border-top: 1px solid var(--line); background: #0d1219; }
textarea { width: 100%; resize: vertical; min-height: 54px; max-height: 160px; background: #0a0f16; color: var(--text); border: 1px solid var(--line); border-radius: 12px; padding: 12px; font: inherit; }
button, select, input { background: #101722; color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font: inherit; }
button { cursor: pointer; }
button.primary { border-color: #2b78a0; background: #12324a; }
button.danger { border-color: #7d3131; background: #321414; }
aside { border-left: 1px solid var(--line); background: var(--panel-2); padding: 14px; overflow: auto; }
.policy-grid { display: grid; gap: 8px; }
.policy-row { display: grid; grid-template-columns: 20px 1fr; gap: 8px; align-items: start; padding: 9px; border: 1px solid var(--line); border-radius: 12px; background: #0d141d; }
.policy-row small { display: block; color: var(--muted); margin-top: 2px; line-height: 1.35; }
.risk { color: var(--warn); }
.stop { width: 100%; margin-top: 8px; border-color: #8b3030; background: #381818; color: #ffdede; font-weight: 700; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0a0f16; border: 1px solid var(--line); border-radius: 12px; padding: 10px; font-size: 12px; color: var(--muted); }
@media (max-width: 980px) { .shell { grid-template-columns: 1fr; } nav, aside { border: 0; border-bottom: 1px solid var(--line); } }
</style>
</head>
<body>
<header>
  <strong>BLUE-TANUKI Control Center</strong>
  <div class="status"><span class="dot"></span><span>local resident console / HDS upstream control</span></div>
</header>
<div class="shell">
  <nav>
    <h2>System</h2>
    <div class="card">
      <div class="metric"><span>Mode</span><b>Engineering Preview</b></div>
      <div class="metric"><span>Authority</span><b>Full access by default</b></div>
      <div class="metric"><span>HDS</span><b>Upstream</b></div>
      <div class="metric"><span>LLM</span><b>Downstream Tool</b></div>
      <div class="metric"><span>Process</span><b>Actor-bound</b></div>
      <div class="metric"><span>Memory</span><b>Traceable / non-authority</b></div>
    </div>
    <h2>Windows</h2>
    <div class="card">
      <div class="metric"><span>Control Center</span><span class="badge">active</span></div>
      <div class="metric"><span>Console</span><span class="badge">audit</span></div>
      <div class="metric"><span>Notifications</span><span class="badge">review</span></div>
      <div class="metric"><span>Authority</span><span class="badge">ledger</span></div>
      <div class="metric"><span>Memory</span><span class="badge">trace</span></div>
      <div class="metric"><span>Chat</span><span class="badge">input</span></div>
    </div>
    <button class="stop" title="UI placeholder. Runtime shutdown remains process/supervisor controlled.">STOP / PAUSE AGENT</button>
  </nav>
  <main>
    <section class="log" id="log">
      <div class="msg"><div class="meta">system</div>Ready. This shell is intentionally local-first. Use /ws-ticket + /ws for live frames.</div>
      <div class="msg"><div class="meta">approval model</div>Default stance is full access for local operator work. Final review remains for irreversible or external-impact operations.</div>
    </section>
    <section class="composer">
      <textarea id="input" placeholder="Message to BLUE-TANUKI"></textarea>
      <button class="primary" id="send">Send</button>
    </section>
  </main>
  <aside>
    <h2>Approval Policy</h2>
    <div class="card policy-grid">
      <label class="policy-row"><input type="radio" name="policy"><span>Ask every time<small>Strict mode for high-risk review or unfamiliar environments.</small></span></label>
      <label class="policy-row"><input type="radio" name="policy"><span>Remember this decision<small>Allow only the same operation, same scope, same risk, same actor, inside duration.</small></span></label>
      <label class="policy-row"><input type="radio" name="policy" checked><span>Full access<small><span class="risk">Default.</span> Local operations proceed unless final review is required: delete / shell / external send / credentials / settings / payment / schedules.</small></span></label>
    </div>
    <h2>Runtime Snapshot</h2>
    <div class="card">
      <div class="metric"><span>Endpoint</span><span>/runtime/snapshot</span></div>
      <div class="metric"><span>Auth</span><span>WEBCHAT_TOKEN</span></div>
      <div class="metric"><span>Shows</span><span>HDS / pending / memory</span></div>
      <div class="metric"><span>Invariant</span><span>process policy enforced</span></div>
      <div class="metric"><span>Metadata</span><span>no external escalation</span></div>
    </div>
    <h2>Scope</h2>
    <div class="card">
      <div class="metric"><span>This file</span><span>narrow</span></div>
      <div class="metric"><span>This folder</span><span>bounded</span></div>
      <div class="metric"><span>This repo</span><span>project</span></div>
      <div class="metric"><span>This task type</span><span>repeatable</span></div>
    </div>
    <h2>Final Review Remains</h2>
    <pre>delete
shell exec
external send
credential access
settings write
payment / billing
schedule creation</pre>
    <h2>HDS Memory Rule</h2>
    <pre>Memory may inform context.
Memory must not expand authority.
Every memory hit is exposed as memory_trace.
Session history is downstream and non-authority.
External metadata cannot upgrade actor/process authority.</pre>
  </aside>
</div>
<script>
const log = document.querySelector('#log');
const input = document.querySelector('#input');
document.querySelector('#send').addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = '<div class="meta">local draft</div>' + text.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  log.appendChild(div);
  input.value = '';
  log.scrollTop = log.scrollHeight;
});
</script>
</body>
</html>`;
}
//# sourceMappingURL=control_center_html.js.map
#!/usr/bin/env sh
set -eu

COMMAND="${1:-status}"
if [ "$#" -gt 0 ]; then
  shift
fi

INSTALL_ROOT="${INSTALL_ROOT:-$(pwd)}"
ENV_FILE="${ENV_FILE:-${BLUE_TANUKI_ENV_FILE:-}}"
DATA_ROOT="${DATA_ROOT:-$HOME/.local/share/blue-tanuki}"
LAUNCHER="${LAUNCHER:-$HOME/.local/bin/blue-tanuki}"
PID_FILE="$DATA_ROOT/blue-tanuki.pid"
LOG_DIR="$DATA_ROOT/logs"
STDOUT_LOG="$LOG_DIR/blue-tanuki.out.log"
STDERR_LOG="$LOG_DIR/blue-tanuki.err.log"
CONTROL_CENTER_URL="${BLUE_TANUKI_CONTROL_CENTER_URL:-http://127.0.0.1:8787/}"

fail() {
  echo "error: $*" >&2
  exit 2
}

need_env_file() {
  [ -n "$ENV_FILE" ] || fail "ENV_FILE or BLUE_TANUKI_ENV_FILE is required."
}

read_pid() {
  if [ -f "$PID_FILE" ]; then
    sed -n '1p' "$PID_FILE"
  fi
}

is_running() {
  pid="$(read_pid)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

resident_start() {
  need_env_file
  if is_running; then
    echo "resident_status=running pid=$(read_pid)"
    return
  fi
  mkdir -p "$DATA_ROOT" "$LOG_DIR"
  (
    cd "$INSTALL_ROOT"
    nohup node apps/gateway/dist/main.js --serve --env-file "$ENV_FILE" "$@" >>"$STDOUT_LOG" 2>>"$STDERR_LOG" &
    echo "$!" > "$PID_FILE"
  )
  echo "resident_status=started pid=$(read_pid)"
  echo "control_center=$CONTROL_CENTER_URL"
  echo "logs=$LOG_DIR"
}

resident_stop() {
  pid="$(read_pid)"
  if [ -z "$pid" ]; then
    echo "resident_status=stopped"
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "resident_status=stopped pid=$pid"
  else
    echo "resident_status=stale pid=$pid"
  fi
  rm -f -- "$PID_FILE"
}

resident_status() {
  if is_running; then
    echo "resident_status=running pid=$(read_pid)"
  else
    echo "resident_status=stopped"
  fi
  echo "control_center=$CONTROL_CENTER_URL"
  echo "env_file=$ENV_FILE"
  echo "logs=$LOG_DIR"
}

resident_open() {
  if command -v open >/dev/null 2>&1; then
    open "$CONTROL_CENTER_URL" >/dev/null 2>&1 || true
    echo "opened=$CONTROL_CENTER_URL"
    return
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$CONTROL_CENTER_URL" >/dev/null 2>&1 || true
    echo "opened=$CONTROL_CENTER_URL"
    return
  fi
  echo "open_manually=$CONTROL_CENTER_URL"
}

resident_logs() {
  echo "stdout=$STDOUT_LOG"
  echo "stderr=$STDERR_LOG"
  if [ -f "$STDOUT_LOG" ]; then
    echo "--- stdout tail ---"
    tail -n 80 "$STDOUT_LOG"
  fi
  if [ -f "$STDERR_LOG" ]; then
    echo "--- stderr tail ---"
    tail -n 80 "$STDERR_LOG"
  fi
}

node_path() {
  command -v node || fail "node is required for resident autostart."
}

autostart_enable_macos() {
  need_env_file
  plist_dir="$HOME/Library/LaunchAgents"
  plist="$plist_dir/com.blue-tanuki.gateway.plist"
  mkdir -p "$plist_dir"
  node_bin="$(node_path)"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.blue-tanuki.gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>$node_bin</string>
    <string>apps/gateway/dist/main.js</string>
    <string>--serve</string>
    <string>--env-file</string>
    <string>$ENV_FILE</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$INSTALL_ROOT</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$STDOUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$STDERR_LOG</string>
</dict>
</plist>
EOF
  if command -v launchctl >/dev/null 2>&1; then
    launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
    launchctl enable "gui/$(id -u)/com.blue-tanuki.gateway" >/dev/null 2>&1 || true
  fi
  echo "autostart_status=enabled"
  echo "autostart_entry=$plist"
}

autostart_enable_linux_systemd() {
  need_env_file
  unit_dir="$HOME/.config/systemd/user"
  unit="$unit_dir/blue-tanuki.service"
  mkdir -p "$unit_dir"
  node_bin="$(node_path)"
  cat > "$unit" <<EOF
[Unit]
Description=BLUE-TANUKI Gateway resident app
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_ROOT
Environment=BLUE_TANUKI_ENV_FILE=$ENV_FILE
ExecStart=$node_bin apps/gateway/dist/main.js --serve --env-file $ENV_FILE
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable blue-tanuki.service
  echo "autostart_status=enabled"
  echo "autostart_entry=$unit"
}

autostart_enable_linux_xdg() {
  need_env_file
  autostart_dir="$HOME/.config/autostart"
  desktop="$autostart_dir/blue-tanuki.desktop"
  mkdir -p "$autostart_dir"
  cat > "$desktop" <<EOF
[Desktop Entry]
Type=Application
Name=BLUE-TANUKI
Comment=Start BLUE-TANUKI resident gateway
Exec=$LAUNCHER resident-start
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
  echo "autostart_status=enabled"
  echo "autostart_entry=$desktop"
}

autostart_enable() {
  case "$(uname -s)" in
    Darwin)
      autostart_enable_macos
      ;;
    Linux)
      if command -v systemctl >/dev/null 2>&1 && systemctl --user --version >/dev/null 2>&1; then
        autostart_enable_linux_systemd
      else
        autostart_enable_linux_xdg
      fi
      ;;
    *)
      fail "resident autostart is supported only on macOS and Linux by this script."
      ;;
  esac
}

autostart_disable() {
  if [ "$(uname -s)" = "Darwin" ]; then
    plist="$HOME/Library/LaunchAgents/com.blue-tanuki.gateway.plist"
    if command -v launchctl >/dev/null 2>&1; then
      launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
      launchctl disable "gui/$(id -u)/com.blue-tanuki.gateway" >/dev/null 2>&1 || true
    fi
    rm -f -- "$plist"
    echo "autostart_status=disabled"
    return
  fi
  unit="$HOME/.config/systemd/user/blue-tanuki.service"
  desktop="$HOME/.config/autostart/blue-tanuki.desktop"
  if command -v systemctl >/dev/null 2>&1 && [ -f "$unit" ]; then
    systemctl --user disable blue-tanuki.service >/dev/null 2>&1 || true
    systemctl --user daemon-reload >/dev/null 2>&1 || true
  fi
  rm -f -- "$unit" "$desktop"
  echo "autostart_status=disabled"
}

autostart_status() {
  case "$(uname -s)" in
    Darwin)
      entry="$HOME/Library/LaunchAgents/com.blue-tanuki.gateway.plist"
      ;;
    Linux)
      if [ -f "$HOME/.config/systemd/user/blue-tanuki.service" ]; then
        entry="$HOME/.config/systemd/user/blue-tanuki.service"
      else
        entry="$HOME/.config/autostart/blue-tanuki.desktop"
      fi
      ;;
    *)
      entry=""
      ;;
  esac
  if [ -n "$entry" ] && [ -f "$entry" ]; then
    echo "autostart_status=enabled"
    echo "autostart_entry=$entry"
  else
    echo "autostart_status=disabled"
  fi
}

case "$COMMAND" in
  start|resident-start)
    resident_start "$@"
    ;;
  stop|resident-stop)
    resident_stop
    ;;
  status|resident-status)
    resident_status
    ;;
  open|resident-open)
    resident_open
    ;;
  logs|resident-logs)
    resident_logs
    ;;
  autostart-enable|resident-autostart-enable)
    autostart_enable
    ;;
  autostart-disable|resident-autostart-disable)
    autostart_disable
    ;;
  autostart-status|resident-autostart-status)
    autostart_status
    ;;
  *)
    fail "unknown resident command: $COMMAND"
    ;;
esac

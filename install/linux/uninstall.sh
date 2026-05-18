#!/usr/bin/env sh
set -eu

INSTALL_ROOT="${INSTALL_ROOT:-$HOME/.local/share/blue-tanuki/app}"
DATA_ROOT="${DATA_ROOT:-$HOME/.local/share/blue-tanuki}"
CONFIG_ROOT="${CONFIG_ROOT:-$HOME/.config/blue-tanuki}"
BIN_ROOT="${BIN_ROOT:-$HOME/.local/bin}"
LAUNCHER="$BIN_ROOT/blue-tanuki"
ENV_FILE="$CONFIG_ROOT/blue-tanuki.env"
RESIDENT_SCRIPT="$INSTALL_ROOT/install/resident/blue-tanuki-resident.sh"
PURGE="${PURGE:-0}"
DRY_RUN="${DRY_RUN:-0}"

fail() {
  echo "error: $*" >&2
  exit 1
}

abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s\n' "$(pwd)/$1" ;;
  esac
}

safe_target() {
  target=$(abs_path "$1")
  case "$target" in
    "/"|"."|"") fail "$2 points to an unsafe path: $target" ;;
    "$HOME"|"$HOME/"|"$HOME/.local"|"$HOME/.local/share"|"$HOME/.local/bin"|"$HOME/.config")
      fail "$2 points to a broad user directory: $target"
      ;;
  esac
  printf '%s\n' "$target"
}

remove_target() {
  target=$(safe_target "$1" "$2")
  if [ ! -e "$target" ]; then
    echo "Skip missing $2: $target"
    return
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "Would remove $2: $target"
    return
  fi
  rm -rf -- "$target"
  echo "Removed $2: $target"
}

remove_file() {
  target=$(abs_path "$1")
  if [ ! -e "$target" ]; then
    echo "Skip missing $2: $target"
    return
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "Would remove $2: $target"
    return
  fi
  rm -f -- "$target"
  echo "Removed $2: $target"
}

if [ -f "$RESIDENT_SCRIPT" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "Would stop resident gateway and disable resident autostart."
  else
    INSTALL_ROOT="$INSTALL_ROOT" ENV_FILE="$ENV_FILE" DATA_ROOT="$DATA_ROOT" LAUNCHER="$LAUNCHER" sh "$RESIDENT_SCRIPT" resident-stop || true
    INSTALL_ROOT="$INSTALL_ROOT" ENV_FILE="$ENV_FILE" DATA_ROOT="$DATA_ROOT" LAUNCHER="$LAUNCHER" sh "$RESIDENT_SCRIPT" resident-autostart-disable || true
  fi
fi

remove_target "$INSTALL_ROOT" "app"
remove_file "$LAUNCHER" "launcher"

if [ "$PURGE" = "1" ]; then
  remove_target "$DATA_ROOT" "data root"
  remove_target "$CONFIG_ROOT" "config root"
  echo "BLUE-TANUKI uninstalled with data purge."
else
  echo "BLUE-TANUKI app removed. Data retained at: $DATA_ROOT"
  echo "Config retained at: $CONFIG_ROOT"
  echo "Re-run with PURGE=1 to remove env, audit, session, and local data."
fi

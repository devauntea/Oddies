#!/bin/sh
# Keeps the API keys in the macOS keychain instead of a file.
#
#   scripts/keys.sh add             store or replace the three keys (asks for each one)
#   scripts/keys.sh status          show which keys are stored (never prints them)
#   scripts/keys.sh run <command>   run a command with the keys in its environment
#   scripts/keys.sh fly             send the stored keys to Fly as secrets
#
# Keychain service names: oddies-gemini, oddies-nimble, oddies-sentry.
set -e

read_key() {
  security find-generic-password -a oddies -s "$1" -w 2>/dev/null || true
}

case "$1" in
  add)
    for pair in "oddies-gemini:Gemini API key" "oddies-nimble:Nimble API key" "oddies-sentry:Sentry DSN"; do
      service=${pair%%:*}
      label=${pair#*:}
      printf '%s (leave blank to skip): ' "$label"
      stty -echo 2>/dev/null || true
      IFS= read -r value
      stty echo 2>/dev/null || true
      printf '\n'
      if [ -n "$value" ]; then
        security add-generic-password -U -a oddies -s "$service" -w "$value"
        echo "  saved $service"
      fi
    done
    ;;
  status)
    for service in oddies-gemini oddies-nimble oddies-sentry; do
      if [ -n "$(read_key "$service")" ]; then echo "$service: stored"; else echo "$service: missing"; fi
    done
    ;;
  run)
    shift
    [ -n "$GEMINI_API_KEY" ] || GEMINI_API_KEY=$(read_key oddies-gemini)
    [ -n "$NIMBLE_API_KEY" ] || NIMBLE_API_KEY=$(read_key oddies-nimble)
    [ -n "$SENTRY_DSN" ] || SENTRY_DSN=$(read_key oddies-sentry)
    export GEMINI_API_KEY NIMBLE_API_KEY SENTRY_DSN
    exec "$@"
    ;;
  fly)
    app=$(sed -n 's/^app = "\(.*\)"/\1/p' "$(dirname "$0")/../fly.toml")
    {
      for pair in "GEMINI_API_KEY:oddies-gemini" "NIMBLE_API_KEY:oddies-nimble" "SENTRY_DSN:oddies-sentry"; do
        value=$(read_key "${pair#*:}")
        [ -n "$value" ] && printf '%s=%s\n' "${pair%%:*}" "$value"
      done
    } | fly secrets import -a "$app"
    ;;
  *)
    sed -n '2,9p' "$0"
    exit 1
    ;;
esac

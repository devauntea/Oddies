#!/bin/sh
# Saves whatever is on the clipboard as one of the project keys in the macOS
# keychain. Nothing to type, and the key is never shown.
#
#   1. Copy the key.
#   2. scripts/paste-key.sh gemini     (or nimble, or sentry)
#
# The clipboard is emptied afterwards so the key does not linger there.
set -e

case "$1" in
  gemini | nimble | sentry) ;;
  *)
    echo "usage: scripts/paste-key.sh gemini|nimble|sentry"
    exit 1
    ;;
esac

value=$(pbpaste | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [ -z "$value" ]; then
  echo "The clipboard is empty. Copy the $1 key first, then run this again."
  exit 1
fi

# Catch the wrong thing on the clipboard, without ever printing it.
case "$value" in
  *" "*)
    echo "The clipboard has spaces in it, so it is not a key. Nothing saved. Copy the $1 key and run this again."
    exit 1
    ;;
esac
if [ "$1" = "sentry" ]; then
  case "$value" in
    https://*@*) ;;
    *)
      echo "That is not a Sentry DSN (a DSN starts with https:// and has an @ in it). Nothing saved."
      exit 1
      ;;
  esac
fi

security add-generic-password -U -a oddies -s "oddies-$1" -w "$value"
printf '' | pbcopy
echo "Saved oddies-$1 (${#value} characters). Clipboard cleared."

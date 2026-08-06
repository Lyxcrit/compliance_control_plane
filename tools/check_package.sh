#!/usr/bin/env bash
set -euo pipefail

PACKAGE="${1:?usage: check_package.sh path/to/package.tgz}"

if [[ ! -f "$PACKAGE" ]]; then
  printf 'Package does not exist: %s\n' "$PACKAGE" >&2
  exit 1
fi

entries="$(tar -tzf "$PACKAGE")"
while IFS= read -r entry; do
  case "$entry" in
    */.*|*/__pycache__/*|*.pyc|*/local/*|*/lookups/*.bak)
      printf 'Disallowed package entry: %s\n' "$entry" >&2
      exit 1
      ;;
  esac
done <<< "$entries"

if ! grep -q '^compliance_control_plane/$' <<< "$entries"; then
  printf 'Package is missing the app root directory.\n' >&2
  exit 1
fi

printf 'Package hygiene checks passed: %s\n' "$PACKAGE"

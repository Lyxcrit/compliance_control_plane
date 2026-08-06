#!/usr/bin/env bash
set -euo pipefail

OLD_PACKAGE="${1:?usage: lifecycle_check.sh old-package.tgz new-package.tgz}"
NEW_PACKAGE="${2:?usage: lifecycle_check.sh old-package.tgz new-package.tgz}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

tar -xzf "$OLD_PACKAGE" -C "$TMP"
mv "$TMP/compliance_control_plane" "$TMP/old"
tar -xzf "$NEW_PACKAGE" -C "$TMP"
mv "$TMP/compliance_control_plane" "$TMP/new"

old_version="$(awk -F ' = ' '/^version = / {print $2; exit}' "$TMP/old/default/app.conf")"
new_version="$(awk -F ' = ' '/^version = / {print $2; exit}' "$TMP/new/default/app.conf")"
[[ "$old_version" != "$new_version" ]] || { echo "Lifecycle check requires different package versions" >&2; exit 1; }
for required in default/app.conf default/collections.conf default/transforms.conf metadata/default.meta; do
  test -f "$TMP/new/$required" || { echo "Missing required new file: $required" >&2; exit 1; }
done
if find "$TMP/new" -type f \( -path '*/local/*' -o -name '*.pyc' \) | grep -q .; then
  echo 'New package contains local state or bytecode' >&2
  exit 1
fi
echo "Lifecycle contract passed: $old_version -> $new_version"
echo 'Historical KV Store data must be backed up and verified separately on the target Splunk instance.'

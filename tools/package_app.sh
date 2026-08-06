#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="compliance_control_plane"
APP_DIR="$ROOT/splunk_app/$APP_NAME"
VERSION="$(awk -F ' = ' '/^version = / {print $2; exit}' "$APP_DIR/default/app.conf")"
OUT_DIR="$ROOT/dist"
PACKAGE="$OUT_DIR/${APP_NAME}-${VERSION}.tgz"

mkdir -p "$OUT_DIR"
rm -f "$PACKAGE"

PYTHONDONTWRITEBYTECODE=1 python3 "$ROOT/tools/sync_content.py"

# Package only the Splunk app payload. Repository tooling, tests, and source
# content are intentionally excluded from the distributable app.
tar -czf "$PACKAGE" -C "$ROOT/splunk_app" "$APP_NAME"
PYTHONDONTWRITEBYTECODE=1 python3 "$ROOT/tools/release_manifest.py" "$PACKAGE"
printf '%s\n' "$PACKAGE"

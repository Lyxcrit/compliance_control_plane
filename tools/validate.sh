#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PYTHONDONTWRITEBYTECODE=1 python3 tools/sync_content.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest discover -s tests -v
tools/package_app.sh
PACKAGE="$(PYTHONDONTWRITEBYTECODE=1 python3 - "$ROOT/dist" <<'PY'
from pathlib import Path
import sys

packages = list(Path(sys.argv[1]).glob("compliance_control_plane-*.tgz"))
if not packages:
    raise SystemExit("No packaged compliance_control_plane archive found")
print(max(packages, key=lambda path: path.stat().st_mtime))
PY
)"
tools/check_package.sh "$PACKAGE"
PYTHONDONTWRITEBYTECODE=1 python3 tools/release_manifest.py "$PACKAGE"

if command -v node >/dev/null 2>&1; then
  while IFS= read -r -d '' javascript_file; do
    node --check "$javascript_file"
  done < <(find splunk_app/compliance_control_plane/appserver/static -type f -name '*.js' -print0)
fi

if command -v splunk-appinspect >/dev/null 2>&1; then
  splunk-appinspect inspect "$PACKAGE" --included-tags packaging_standards
  splunk-appinspect inspect "$PACKAGE" --included-tags cloud
else
  printf '%s\n' 'splunk-appinspect not installed; package and repository checks passed.'
fi

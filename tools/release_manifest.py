#!/usr/bin/env python3
"""Create a reproducible release manifest beside a Splunk app package."""

import csv
import hashlib
import json
import re
import sys
import tarfile
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "splunk_app/compliance_control_plane"


def app_version() -> str:
    text = (APP / "default/app.conf").read_text(encoding="utf-8")
    match = re.search(r"^version = (.+)$", text, re.MULTILINE)
    if not match:
        raise SystemExit("app.conf does not declare a version")
    return match.group(1).strip()


def lookup_values(name: str, field: str) -> list[str]:
    with (APP / "lookups" / name).open(newline="", encoding="utf-8") as source:
        return sorted(row[field] for row in csv.DictReader(source) if row.get(field))


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: release_manifest.py path/to/package.tgz")
    package = Path(sys.argv[1]).resolve()
    if not package.is_file():
        raise SystemExit(f"Package does not exist: {package}")
    version = app_version()
    expected_name = f"compliance_control_plane-{version}.tgz"
    if package.name != expected_name:
        raise SystemExit(f"Package name {package.name} does not match app version {version}")
    with tarfile.open(package, "r:gz") as archive:
        entries = sorted(member.name for member in archive.getmembers())
    manifest = {
        "app_id": "compliance_control_plane",
        "app_version": version,
        "package": package.name,
        "package_sha256": hashlib.sha256(package.read_bytes()).hexdigest(),
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "framework_keys": lookup_values("framework_catalog.csv", "framework_key"),
        "framework_content_digests": lookup_values("framework_catalog.csv", "content_digest"),
        "mapping_review_frameworks": lookup_values("mapping_reviews.csv", "framework_key"),
        "kv_collections": [
            "ccp_systems", "ccp_scopes", "ccp_assessments", "ccp_assessment_current",
            "ccp_evidence", "ccp_evidence_current", "ccp_measurements",
            "ccp_measurement_cache", "ccp_integration_health", "ccp_findings",
        ],
        "package_entry_count": len(entries),
    }
    output = package.parent / f"{package.stem}.manifest.json"
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()

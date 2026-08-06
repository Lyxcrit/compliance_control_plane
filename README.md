# Compliance Control Plane

An independent, modular compliance operations platform for Splunk and other telemetry sources.

The project separates the reusable compliance domain from framework content and platform adapters. Frameworks are versioned content packs; the core application owns systems, requirements, evidence, measurements, findings, and assessments. Mapping governance is documented in [docs/mapping-review.md](docs/mapping-review.md) and generated into `mapping_reviews.csv`.

The product direction is documented in [docs/product-vision.md](docs/product-vision.md): the app is designed to make audit decisions defensible for auditors and usable for control owners who do not write SPL.

## Current status

This repository contains the independent Compliance Control Plane foundation and modular framework content packs. It is intentionally not a fork or extension of the legacy Compliance Essentials app. The product roadmap and release gates are documented in [docs/product-roadmap.md](docs/product-roadmap.md).

## Design goals

- Keep framework content independent from UI and search implementation.
- Keep executable check definitions in the technical-check catalog; do not bury evaluation logic in dashboard-only panels.
- Normalize requirements so multiple frameworks can map to shared evidence and measurements.
- Make scoring deterministic, explainable, and versioned.
- Treat telemetry coverage as evidence, not as an unverified compliance assertion.
- Support Splunk adapters without making Splunk the only source of truth.

## Development

```bash
python -m unittest discover -s tests -v
python -m compliance_control_plane.cli content/frameworks/m26-14/framework.json
python3 tools/sync_content.py
tools/validate.sh
```

The package can be run directly from the repository with:

```bash
PYTHONPATH=src python -m compliance_control_plane.cli content/frameworks/m26-14/framework.json
```

## Current phase

Phase 1 is complete and Phase 2 is complete as an operational MVP. The app includes findings, remediation, executable technical checks for supported Splunk data, reusable technical adapters, document evidence references, evidence and assessment review, current-state posture, durable measurements, a package manifest, and audit-package export registers. Commercial release gates remain for content approval, AppInspect, browser testing, scale testing, and upgrade validation.

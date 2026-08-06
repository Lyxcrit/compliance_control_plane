"""Framework content-pack loading and validation."""

import json
from pathlib import Path

from .models import (
    Framework,
    MappingConfidence,
    MappingStatus,
    MappingType,
    Requirement,
    RequirementType,
    VerificationMode,
)


class ContentError(ValueError):
    """Raised when a framework pack is malformed."""


def load_framework(path: str | Path) -> Framework:
    """Load a framework pack from a JSON file and validate its contract."""

    source = Path(path)
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ContentError(f"Unable to load framework pack {source}: {exc}") from exc

    for key in ("key", "name", "version", "authority", "description", "requirements"):
        if key not in payload:
            raise ContentError(f"Framework pack is missing '{key}'")

    requirements: list[Requirement] = []
    seen_keys: set[str] = set()
    for item in payload["requirements"]:
        required = ("key", "title", "description", "type", "category", "source_reference")
        missing = [key for key in required if key not in item]
        if missing:
            raise ContentError(f"Requirement is missing {missing}: {item!r}")
        if item["key"] in seen_keys:
            raise ContentError(f"Duplicate requirement key: {item['key']}")
        seen_keys.add(item["key"])
        try:
            requirement_type = RequirementType(item["type"])
        except ValueError as exc:
            raise ContentError(f"Invalid requirement type: {item['type']}") from exc
        try:
            verification_mode = VerificationMode(item.get("verification_mode", "hybrid"))
        except ValueError as exc:
            raise ContentError(f"Invalid verification mode: {item.get('verification_mode')}") from exc
        try:
            mapping_status = MappingStatus(item.get("mapping_status", "unmapped"))
        except ValueError as exc:
            raise ContentError(f"Invalid mapping status: {item.get('mapping_status')}") from exc
        try:
            mapping_type = MappingType(item.get("mapping_type", "rollup"))
            mapping_confidence = MappingConfidence(item.get("mapping_confidence", "low"))
        except ValueError as exc:
            raise ContentError(f"Invalid mapping metadata in {item['key']}") from exc
        requirements.append(
            Requirement(
                key=item["key"],
                title=item["title"],
                description=item["description"],
                requirement_type=requirement_type,
                category=item["category"],
                source_reference=item["source_reference"],
                maturity_levels=item.get("maturity_levels", {}),
                evidence_types=tuple(item.get("evidence_types", [])),
                measurement_key=item.get("measurement_key"),
                verification_mode=verification_mode,
                verification_guidance=item.get("verification_guidance", ""),
                canonical_control_key=item.get("canonical_control_key", ""),
                canonical_control_name=item.get("canonical_control_name", ""),
                mapping_status=mapping_status,
                mapping_type=mapping_type,
                mapping_confidence=mapping_confidence,
                mapping_basis=item.get("mapping_basis", ""),
            )
        )

    return Framework(
        key=payload["key"],
        name=payload["name"],
        version=payload["version"],
        authority=payload["authority"],
        description=payload["description"],
        requirements=tuple(requirements),
    )

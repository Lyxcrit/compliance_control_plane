#!/usr/bin/env python3
"""Generate Splunk lookup content from versioned framework packs."""

import csv
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "content/frameworks"
LOOKUP_DIR = ROOT / "splunk_app/compliance_control_plane/lookups"
MAPPING_REVIEW_PATH = ROOT / "content/mapping_reviews.json"
TECHNICAL_CHECK_PATH = ROOT / "content/technical_checks.json"
ASSESSMENT_PROFILE_PATH = ROOT / "content/framework_assessment_profiles.json"

VERIFICATION_LABELS = {
    "document": "Document review",
    "technical": "Splunk tracking",
    "hybrid": "Document + Splunk tracking",
}

MAPPING_STATUSES = {"approved", "provisional", "unmapped"}
MAPPING_TYPES = {"direct", "rollup", "contextual"}
MAPPING_CONFIDENCE = {"high", "medium", "low"}

ASSESSMENT_TEMPLATES = {
    "cis-controls-8.1": {
        "objective": "Determine whether the {title} safeguard area is implemented for the defined scope using the applicable CIS Assessment Specification measures.",
        "applicability": "Apply to the safeguards and implementation group in scope; record exclusions and dependencies.",
        "pass": "Applicable CAS measures and operating evidence meet the defined safeguard outcome, with exceptions owned and current.",
        "partial": "Implementation evidence exists but one or more applicable measures, dependencies, or exceptions remain incomplete.",
        "fail": "The safeguard outcome cannot be demonstrated with current evidence or the applicable measures are materially unmet.",
    },
    "nist-csf-2.0": {
        "objective": "Determine the current outcome state for {title} and compare it with the organization’s documented target profile.",
        "applicability": "Apply to the organization profile and the systems, mission, and risk context represented by it.",
        "pass": "The current profile meets the documented target outcome and supporting evidence is current and attributable.",
        "partial": "The outcome is partly implemented or the current profile has a documented gap against the target state.",
        "fail": "The outcome cannot be demonstrated, the profile is not defined, or the gap is unaddressed.",
    },
    "nist-sp-800-53r5": {
        "objective": "Determine whether the {title} control family is implemented according to the applicable baseline, tailoring, ODPs, and SP 800-53A procedures.",
        "applicability": "Apply only to controls and enhancements selected for the system after baseline, tailoring, and ODP decisions.",
        "pass": "Applicable determination statements are satisfied with current examine, interview, or test evidence and documented scope.",
        "partial": "Some determination statements are satisfied, but one or more applicable statements, objects, or evidence items remain incomplete.",
        "fail": "Applicable determination statements are not satisfied or cannot be assessed from current evidence.",
    },
    "cmmc-2.0-level-2": {
        "objective": "Determine whether the {title} domain practices and applicable requirement objectives are MET for the CMMC Assessment Scope.",
        "applicability": "Apply to the CMMC Assessment Scope, SSP version, CUI assets, and applicable external service providers.",
        "pass": "Applicable requirement objectives are MET through Examine, Interview, and Test evidence and the result is documented for the assessor.",
        "partial": "Readiness evidence exists but one or more objectives, scope links, or artifact reviews remain incomplete; do not treat this as certification.",
        "fail": "One or more applicable objectives are NOT MET or cannot be demonstrated for the defined scope.",
    },
    "iso-27001-2022": {
        "objective": "Determine whether the {title} area is implemented within the approved ISMS scope and risk treatment decisions.",
        "applicability": "Apply to the approved ISMS scope, risk treatment plan, Statement of Applicability, and applicable Annex A controls.",
        "pass": "The applicable clause or control is conforming, operating evidence is current, and SoA and risk-treatment decisions are consistent.",
        "partial": "The control is designed or partly operating, but evidence, effectiveness, SoA, or corrective-action records are incomplete.",
        "fail": "The applicable requirement is not implemented, not operating, or cannot be supported by objective audit evidence.",
    },
    "pci-dss-4.0.1": {
        "objective": "Determine whether the {title} requirement theme is satisfied for the defined cardholder data environment and validation path.",
        "applicability": "Apply only after cardholder data environment scope and applicable SAQ or ROC eligibility are documented.",
        "pass": "Applicable testing procedures are completed using appropriate Examine, Observe, or Interview evidence and all sampled gaps are resolved.",
        "partial": "Evidence supports part of the requirement, but sampling, testing, customized approach, or remediation is incomplete.",
        "fail": "The applicable requirement cannot be demonstrated for the defined cardholder data environment.",
    },
    "fisma-rmf": {
        "objective": "Determine whether the {title} RMF/FISMA activity is defined, performed, and supported for the assessed federal information system.",
        "applicability": "Apply to the federal information system and organizational risk context in scope; document system categorization, authorization boundary, and agency-specific policy.",
        "pass": "The applicable RMF activity is approved or operating, current evidence is attributable to the system, and open risks are owned and tracked.",
        "partial": "The activity is documented or partly operating, but approval, evidence freshness, system boundary, or risk tracking is incomplete.",
        "fail": "The activity is absent, materially overdue, or cannot be demonstrated for the defined system boundary.",
    },
    "dfars-cyber-clauses": {
        "objective": "Determine whether the {title} obligation is applicable to the contract and is implemented with current contractual and technical evidence.",
        "applicability": "Apply only when the contract, solicitation, subcontract, or flowdown invokes the applicable DFARS clause; record clause text, contract scope, and covered information system boundary.",
        "pass": "The applicable clause obligation is mapped to an accountable owner, current evidence, required reporting or assessment records, and documented exceptions.",
        "partial": "The obligation is recognized and partly implemented, but clause applicability, flowdown, evidence, reporting, or remediation is incomplete.",
        "fail": "The obligation is applicable but cannot be demonstrated, required reporting or preservation is not operational, or the covered boundary is undefined.",
    },
    "nist-sp-800-171r3": {
        "objective": "Determine whether the {title} requirement family is implemented for the defined CUI system and organizational environment using the applicable assessment objectives.",
        "applicability": "Apply to nonfederal systems that process, store, or transmit CUI and to the defined assessment scope, SSP, system security plan boundary, and organization-defined parameters.",
        "pass": "Applicable Rev. 3 requirements and assessment objectives are satisfied with current examine, interview, or test evidence and documented scope.",
        "partial": "Some objectives are satisfied, but evidence, scope, parameters, implementation, or remediation remains incomplete.",
        "fail": "Applicable requirements are not implemented or cannot be demonstrated for the defined CUI environment.",
    },
}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def canonical_control(item: dict) -> tuple[str, str, str, str, str]:
    """Return a stable control identity without overstating a mapping."""

    explicit_key = item.get("canonical_control_key", "").strip()
    category = item["category"].strip()
    key = explicit_key or f"category.{slug(category)}"
    name = item.get("canonical_control_name", "").strip() or category
    status = item.get("mapping_status", "provisional" if not explicit_key else "approved")
    if status not in MAPPING_STATUSES:
        raise SystemExit(f"Invalid mapping status for {item['key']}: {status}")
    mapping_type = item.get("mapping_type", "rollup")
    confidence = item.get("mapping_confidence", "low")
    if mapping_type not in MAPPING_TYPES or confidence not in MAPPING_CONFIDENCE:
        raise SystemExit(f"Invalid mapping metadata for {item['key']}")
    return key, name, status, mapping_type, confidence


def load_packs() -> list[dict]:
    packs = []
    for path in sorted(PACK_DIR.glob("*/framework.json")):
        packs.append(json.loads(path.read_text(encoding="utf-8")))
    if not packs:
        raise SystemExit("No framework packs found")
    return packs


def write_csv(name: str, fieldnames: list[str], rows: list[dict]) -> None:
    with (LOOKUP_DIR / name).open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def load_playbook() -> dict[tuple[str, str], dict[str, str]]:
    path = LOOKUP_DIR / "policy_playbook.csv"
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as source:
        return {(row["framework_key"], row["requirement_key"]): row for row in csv.DictReader(source)}


def main() -> None:
    packs = load_packs()
    reviews = {row["framework_key"]: row for row in json.loads(MAPPING_REVIEW_PATH.read_text(encoding="utf-8"))}
    technical_checks = json.loads(TECHNICAL_CHECK_PATH.read_text(encoding="utf-8"))
    assessment_profiles = json.loads(ASSESSMENT_PROFILE_PATH.read_text(encoding="utf-8"))
    profiles = {row["framework_key"]: row for row in assessment_profiles}
    framework_fields = ["framework_key", "framework_name", "version", "authority", "summary", "status", "content_status", "default_selected", "source_url", "content_digest"]
    requirement_fields = [
        "framework_key", "framework_name", "requirement_key", "title", "category",
        "requirement_type", "description", "source_reference", "measurement_key",
        "evidence_types", "verification_mode", "verification_label", "verification_guidance",
        "canonical_control_key", "canonical_control_name", "mapping_status",
        "mapping_type", "mapping_confidence", "mapping_basis", "mapping_review_status",
        "mapping_limitation", "mapping_next_step",
        "assessment_granularity", "assessment_methods", "scoring_model",
        "required_artifacts", "audit_boundary", "authority_statement",
        "assessment_method_reference", "assessment_objective", "applicability",
        "pass_criteria", "partial_criteria", "fail_criteria",
        "level_1", "level_2", "level_3", "level_4",
    ]
    control_fields = ["canonical_control_key", "canonical_control_name", "description", "mapping_status", "mapping_type", "mapping_confidence"]
    frameworks = []
    requirements = []
    controls = {}
    playbook = load_playbook()
    for pack in packs:
        content_digest = hashlib.sha256(
            json.dumps(pack, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        frameworks.append({
            "framework_key": pack["key"],
            "framework_name": pack["name"],
            "version": pack["version"],
            "authority": pack["authority"],
            "summary": pack["description"],
            "status": pack.get("status", "active"),
            "content_status": pack.get("content_status", "complete"),
            "default_selected": pack.get("default_selected", 0),
            "source_url": pack.get("source_url", ""),
            "content_digest": content_digest,
        })
        for item in pack["requirements"]:
            levels = item.get("maturity_levels", {})
            template = ASSESSMENT_TEMPLATES.get(pack["key"], {})
            profile = profiles[pack["key"]]
            review = reviews.get(pack["key"], {})
            item = {
                **item,
                "mapping_type": item.get("mapping_type", review.get("mapping_type", "rollup")),
                "mapping_confidence": item.get("mapping_confidence", review.get("confidence", "low")),
            }
            control_key, control_name, mapping_status, mapping_type, mapping_confidence = canonical_control(item)
            mapping_basis = item.get("mapping_basis") or review.get("basis", "")
            controls.setdefault(control_key, {
                "canonical_control_key": control_key,
                "canonical_control_name": control_name,
                "description": f"Shared control area for {control_name} across framework content.",
                "mapping_status": mapping_status,
                "mapping_type": mapping_type,
                "mapping_confidence": mapping_confidence,
            })
            requirements.append({
                "framework_key": pack["key"],
                "framework_name": pack["name"],
                "requirement_key": item["key"],
                "title": item["title"],
                "category": item["category"],
                "requirement_type": item["type"].title(),
                "description": item["description"],
                "source_reference": item["source_reference"],
                "measurement_key": item.get("measurement_key", ""),
                "evidence_types": "; ".join(item.get("evidence_types", [])),
                "verification_mode": item.get("verification_mode", "hybrid"),
                "verification_label": VERIFICATION_LABELS.get(item.get("verification_mode", "hybrid"), "Document + Splunk tracking"),
                "verification_guidance": item.get("verification_guidance", "Use the check detail page to review evidence, record the assessment, and document any exception."),
                "canonical_control_key": control_key,
                "canonical_control_name": control_name,
                "mapping_status": mapping_status,
                "mapping_type": mapping_type,
                "mapping_confidence": mapping_confidence,
                "mapping_basis": mapping_basis,
                "mapping_review_status": review.get("review_status", "not_reviewed"),
                "mapping_limitation": review.get("limitation", ""),
                "mapping_next_step": review.get("next_step", ""),
                "assessment_granularity": profiles[pack["key"]]["assessment_granularity"],
                "assessment_methods": profiles[pack["key"]]["assessment_methods"],
                "scoring_model": profiles[pack["key"]]["scoring_model"],
                "required_artifacts": profiles[pack["key"]]["required_artifacts"],
                "audit_boundary": profiles[pack["key"]]["audit_boundary"],
                "authority_statement": profiles[pack["key"]]["authority_statement"],
                "assessment_method_reference": item.get("assessment_method_reference", profile.get("assessment_method_reference", "")),
                "assessment_objective": item.get("assessment_objective", template.get("objective", "").format(title=item["title"])),
                "applicability": item.get("applicability", template.get("applicability", "")),
                "pass_criteria": item.get("pass_criteria", template.get("pass", "")),
                "partial_criteria": item.get("partial_criteria", template.get("partial", "")),
                "fail_criteria": item.get("fail_criteria", template.get("fail", "")),
                "level_1": levels.get("1", ""),
                "level_2": levels.get("2", ""),
                "level_3": levels.get("3", ""),
                "level_4": levels.get("4", ""),
            })
            mode = item.get("verification_mode", "hybrid")
            if mode == "document":
                implementation_steps = f"1. Publish the current approved policy or procedure for {item['title']}. 2. Assign an accountable owner and review cadence. 3. Define operating steps, scope, exceptions, and required records. 4. Train affected personnel and retain acknowledgement where applicable. 5. Review operating evidence and record remediation for gaps."
                validation_method = "Review the approved document, owner, approval date, review date, scope, exceptions, and operating evidence. A policy document by itself is not a passing result. Record the test performed, assessor, date, and remediation required."
            elif mode == "technical":
                implementation_steps = f"1. Define the in-scope systems and success threshold for {item['title']}. 2. Connect the required telemetry or inventory data. 3. Create a saved search or dashboard panel that shows current status and exceptions. 4. Assign an owner for uncovered items. 5. Review the result on a defined cadence and retain the output as evidence."
                validation_method = "Open the linked tracking view or saved search, confirm the time window and scope, inspect exceptions, and retain the result with its run date. Record the test performed, assessor, date, and remediation required."
            else:
                implementation_steps = f"1. Define the accountable owner and scope for {item['title']}. 2. Publish the governing policy or procedure. 3. Implement the technical or operational safeguards. 4. Create a saved search or dashboard panel for measurable status where data is available. 5. Review evidence, exceptions, and due dates on a defined cadence."
                validation_method = "Review the current approved document and the corresponding implementation evidence or Splunk tracking result. Confirm scope, freshness, exceptions, and owner. A document without operating evidence is not a passing result. Record the test performed, assessor, date, and remediation required."
            generated_playbook = {
                "framework_key": pack["key"],
                "requirement_key": item["key"],
                "implementation_title": f"Implement {item['title']}",
                "implementation_steps": implementation_steps,
                "validation_method": validation_method,
                "owner_role": "Control owner",
                "common_gap": "The requirement is documented but implementation, evidence, or review results are not current.",
            }
            existing = playbook.get((pack["key"], item["key"]))
            if existing is None or existing["implementation_steps"].startswith("1. Define the scope and accountable owner"):
                playbook[(pack["key"], item["key"])] = generated_playbook
    write_csv("framework_catalog.csv", framework_fields, frameworks)
    write_csv("requirements.csv", requirement_fields, requirements)
    write_csv("canonical_controls.csv", control_fields, sorted(controls.values(), key=lambda row: row["canonical_control_key"]))
    playbook_fields = ["framework_key", "requirement_key", "implementation_title", "implementation_steps", "validation_method", "owner_role", "common_gap"]
    write_csv("policy_playbook.csv", playbook_fields, list(playbook.values()))
    write_csv(
        "mapping_reviews.csv",
        ["framework_key", "review_status", "mapping_type", "confidence", "basis", "limitation", "next_step"],
        [reviews[key] for key in sorted(reviews)],
    )
    write_csv(
        "framework_assessment_profiles.csv",
        ["framework_key", "assessment_granularity", "assessment_methods", "assessment_method_reference", "scoring_model", "required_artifacts", "audit_boundary", "authority_statement"],
        assessment_profiles,
    )
    write_csv(
        "technical_checks.csv",
        ["check_key", "display_name", "measurement_key", "adapter_key", "evidence_type", "search", "expected_value", "limitations"],
        technical_checks,
    )
    print(f"Generated {len(frameworks)} frameworks and {len(requirements)} requirements")


if __name__ == "__main__":
    main()

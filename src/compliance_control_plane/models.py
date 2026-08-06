"""Normalized compliance domain objects.

These objects deliberately contain no Splunk-specific behavior. Adapters can
translate Splunk searches, CIM data, or external inventories into these types.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class RequirementType(StrEnum):
    CONTROL = "control"
    OUTCOME = "outcome"
    MEASUREMENT = "measurement"
    EVIDENCE = "evidence"


class VerificationMode(StrEnum):
    DOCUMENT = "document"
    TECHNICAL = "technical"
    HYBRID = "hybrid"


class MappingStatus(StrEnum):
    APPROVED = "approved"
    PROVISIONAL = "provisional"
    UNMAPPED = "unmapped"


class MappingType(StrEnum):
    DIRECT = "direct"
    ROLLUP = "rollup"
    CONTEXTUAL = "contextual"


class MappingConfidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ScopeType(StrEnum):
    ORGANIZATION = "organization"
    ENVIRONMENT = "environment"
    BUSINESS_UNIT = "business_unit"
    SYSTEM = "system"
    ASSET_GROUP = "asset_group"
    DATA_BOUNDARY = "data_boundary"


class MeasurementStatus(StrEnum):
    NOT_ASSESSED = "not_assessed"
    PASS = "pass"
    PARTIAL = "partial"
    FAIL = "fail"
    NOT_APPLICABLE = "not_applicable"


class AdapterStatus(StrEnum):
    READY = "ready"
    NEEDS_DATA = "needs_data"
    NOT_CONFIGURED = "not_configured"


class FindingStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RISK_ACCEPTED = "risk_accepted"
    RESOLVED = "resolved"
    CLOSED = "closed"


@dataclass(frozen=True)
class AssessmentProfile:
    """Framework-specific assessment semantics, separate from check content."""

    framework_key: str
    assessment_granularity: str
    assessment_methods: str
    scoring_model: str
    required_artifacts: str
    audit_boundary: str
    authority_statement: str


@dataclass(frozen=True)
class Framework:
    key: str
    name: str
    version: str
    authority: str
    description: str
    requirements: tuple["Requirement", ...] = ()


@dataclass(frozen=True)
class Requirement:
    key: str
    title: str
    description: str
    requirement_type: RequirementType
    category: str
    source_reference: str
    maturity_levels: dict[str, str] = field(default_factory=dict)
    evidence_types: tuple[str, ...] = ()
    measurement_key: str | None = None
    verification_mode: VerificationMode = VerificationMode.HYBRID
    verification_guidance: str = ""
    canonical_control_key: str = ""
    canonical_control_name: str = ""
    mapping_status: MappingStatus = MappingStatus.UNMAPPED
    mapping_type: MappingType = MappingType.ROLLUP
    mapping_confidence: MappingConfidence = MappingConfidence.LOW
    mapping_basis: str = ""


@dataclass(frozen=True)
class Measurement:
    requirement_key: str
    status: MeasurementStatus
    value: float | None = None
    denominator: float | None = None
    observed_at: str | None = None
    source: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Score:
    total: int
    passed: int
    partial: int
    failed: int
    not_assessed: int
    not_applicable: int

    @property
    def assessed(self) -> int:
        return self.passed + self.partial + self.failed


@dataclass(frozen=True)
class System:
    key: str
    name: str
    owner: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CanonicalControl:
    key: str
    name: str
    description: str
    mapping_status: MappingStatus = MappingStatus.PROVISIONAL
    mapping_type: MappingType = MappingType.ROLLUP
    mapping_confidence: MappingConfidence = MappingConfidence.LOW


@dataclass(frozen=True)
class Scope:
    key: str
    name: str
    scope_type: ScopeType
    owner: str | None = None
    description: str | None = None
    status: str = "active"


@dataclass(frozen=True)
class Assessment:
    system_key: str
    scope_key: str
    framework_key: str
    framework_version: str
    content_digest: str
    requirement_key: str
    status: MeasurementStatus
    assessor: str
    assessed_at: str
    reviewer: str | None = None
    reviewed_at: str | None = None
    valid_until: str | None = None
    exception_reference: str | None = None
    notes: str = ""


@dataclass(frozen=True)
class MeasurementAdapter:
    key: str
    display_name: str
    measurement_key: str
    adapter_type: str
    source: str
    freshness_window: str
    status: AdapterStatus = AdapterStatus.READY
    limitations: str = ""


@dataclass(frozen=True)
class MeasurementResult:
    result_key: str
    scope_key: str
    framework_key: str
    framework_version: str
    requirement_key: str
    measurement_key: str
    adapter_key: str
    status: MeasurementStatus
    observed_value: str
    expected_value: str
    measured_at: str
    source: str
    evidence_key: str | None = None
    limitations: str = ""


@dataclass(frozen=True)
class Finding:
    key: str
    scope_key: str
    framework_key: str
    framework_version: str
    requirement_key: str
    title: str
    severity: str
    status: FindingStatus
    owner: str
    due_at: str | None = None
    remediation: str = ""
    source: str = "manual"
    exception_reference: str | None = None
    retest_at: str | None = None
    closed_at: str | None = None
    notes: str = ""

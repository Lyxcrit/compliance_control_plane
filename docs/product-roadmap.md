# Compliance Control Plane Product Roadmap

This document is the product source of truth for turning Compliance Control Plane into a sellable, auditor-usable Splunk application. The product must help a control owner reach a defensible decision, not merely display framework-themed information.

## Product principles

- One shared workflow for many frameworks; do not create a dashboard per requirement.
- A policy document is evidence of intent, not proof that a control operates.
- Pass, Partial, Fail, Unknown, and Not Applicable are explicit decisions. Unknown never becomes Pass.
- Framework content is versioned, attributable to an authoritative source, and never silently rewrites historical assessments.
- Technical measurements are adapters that report scope, observed values, freshness, source, limitations, and status.
- Every failed or incomplete check should lead to an owner, a remediation action, and a retest.
- Search language and Splunk implementation details stay behind the workflow wherever possible.

## Current foundation

- Ten versioned framework packs and generated lookup content, including federal FISMA/RMF, DFARS, and NIST SP 800-171 Rev. 3 content.
- Framework selection and shared navigation.
- Requirement detail, assessment, evidence, audit review, readiness, and M-26-14 measurement views.
- KV Store persistence for systems, scopes, assessments, evidence, findings, measurements, and framework selections.
- Verification routes for document, technical, and hybrid checks.
- Audit-context system inventory with scope, ownership, environment, criticality, data classification, and regulatory impact.

## Phase 1: Product foundation

### Objectives

Create stable contracts that let future adapters, mappings, and workflows evolve without rewriting historical audit data.

### Scope

- Canonical control registry and requirement-to-control mappings.
- Explicit mapping status so reviewed mappings are distinguishable from provisional mappings.
- Framework version and content digest on assessments and evidence.
- First-class scope records and scope references on systems, assessments, and evidence.
- Evidence lifecycle fields: collected by, review due, expiration, and source type.
- Assessment lifecycle fields: reviewer, review time, validity date, and exception reference.
- Content validation and generated lookup coverage for the new fields.
- Automated tests for mapping, version binding, and required lifecycle metadata.

### Implementation status

Phase 1 is implemented and deployed. The repository now generates canonical control identities, stores framework content digests, supports first-class audit scopes, and captures version and review lifecycle fields for assessments and evidence.

The Phase 1 data model is complete, but content governance is not: the current generated catalog contains 111 requirement mappings and 68 canonical controls, all marked `provisional`. These mappings require framework-by-framework SME review and approval before they can support a commercial claim of authoritative cross-framework equivalence.

### Acceptance criteria

1. A requirement can be traced to its framework version, source reference, canonical control, and mapping status.
2. A saved assessment remains bound to the exact framework version and content digest used when it was created.
3. Evidence can identify its scope, source, collector, review due date, and expiration date.
4. The app can distinguish an unreviewed/provisional mapping from an approved mapping.
5. Existing records remain readable after the schema extension.

## Phase 2: Operational compliance MVP

- Findings and remediation records with owners, due dates, severity, exceptions, and retesting.
- Technical adapter registry and reusable adapters for retention, searchability, freshness, inventory, CIM, ES, and Exposure Analytics.
- Executable technical-check catalog that turns supported Splunk data into normalized Pass, Partial, Fail, or Not assessed results.
- Evidence references for document URLs, Splunk searches/objects, document versions, and optional artifact hashes.
- Evidence freshness and measurement provenance in the readiness workflow.
- Audit Package workflow with a fixed assessment period, scope, framework versions, evidence index, and exportable results.
- Plain-language check workflow that connects failure to remediation and retest.

### Implementation status

The first operational slice is implemented and deployed: findings/remediation storage and workflow, reusable technical adapter metadata, executable checks for supported Splunk signals, evidence and assessment review lifecycle, evidence freshness signals in Readiness, durable normalized measurement results, automatic open-finding creation for failed or partial assessments and measurements, current-state posture materialization with historical fallback, a fixed-period Audit Package view, and a formal package manifest/export contract.

Phase 2 is **complete as an operational MVP**. A non-Splunk compliance owner can identify a failed control, understand the implementation path, record reviewed evidence, create or assign remediation, preserve the retest path, and produce an auditor-readable package without writing SPL.

External release validation remains intentionally outside the Phase 2 implementation milestone: SME approval of provisional mappings, design-partner export validation, AppInspect, browser-level testing, production-scale performance, and upgrade/rollback testing remain release gates in Phase 4.

### Exit condition

A non-Splunk compliance owner can identify a failed control, understand how to fix it, assign it, attach evidence, retest it, and produce an auditor-readable result without writing SPL.

## Phase 3: Enterprise integrations

- ES asset and identity context.
- Exposure Analytics and CIM health adapters.
- Vulnerability, identity, change-management, and ticketing integrations.
- Scheduled measurement collection and cached results for expensive searches.
- REST/API integration contract for external systems.
- Role-aware ownership and review workflows.

### Implementation status

Phase 3 is implemented as an integration foundation: an opt-in scheduled technical-check cache, a normalized cache collection and roll-up, optional integration health results for CIM, Enterprise Security, and Exposure Analytics, connector contracts for vulnerability, identity, change, and ticketing systems, and role-aware finding ownership. The schedulers are disabled by default and current built-in signals are explicitly global-scope; boundary-specific collection remains a future adapter capability rather than an inferred result.

The next Phase 3 increment should add scope-aware scheduled collection, cached results for expensive adapters, and integrations behind the existing contracts rather than adding more dashboards.

Phase 3 work should not start by adding more dashboards. It should add normalized connectors behind the existing system, evidence, measurement, and finding contracts.

## Phase 4: Commercial hardening

- Full AppInspect and Cloud-tag validation in CI.
- Clean install, upgrade, migration, and rollback testing.
- Splunk Enterprise and Splunk Cloud compatibility matrix.
- Performance tests against large lookups, asset populations, and search workloads.
- Administrator, auditor, and control-owner documentation.
- Support diagnostics, release process, licensing, packaging, and design-partner validation.

### Implementation status

Phase 4 engineering and desktop acceptance are complete for `0.3.25`: CI installs pinned AppInspect, packaging and Cloud-tag checks pass, release manifests capture package and content digests, lifecycle checks cover package transitions, performance tests cover the local catalog budget, compatibility and support diagnostics are documented, and administrator/auditor/control-owner/design-partner guides are included. Authenticated Splunk Web desktop acceptance passed at 1440x900 and 1920x1080, including framework filtering, Requirements-to-Check drilldown, Check Detail maturity behavior, technical coverage, and scheduler safety. Mobile is informational smoke coverage only because Splunk Web workflows are designed for desktop and tablet use.

Remaining commercial gates are provisional content mappings, production-scale performance evidence, design-partner validation of the package manifest/export process, and a validated target-environment upgrade/rollback procedure. AppInspect remains a packaging gate for each release.

## Product surface

The target navigation is five workflows: Home, Readiness, Checks, Evidence and Findings, and Audit Package. Framework-specific dashboards are reserved for genuinely unique measurements, such as the M-26-14 retention and logging outcomes.

## Release gate

The application is not production-ready until content provenance, audit packaging, version-safe history, upgrade behavior, AppInspect validation, and production-scale performance are demonstrated. The first commercially credible release is the end of Phase 2, subject to design-partner validation.

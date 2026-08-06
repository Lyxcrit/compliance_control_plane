# Phase 5 Release Hardening

## Current baseline

The 0.3.13 desktop acceptance run passed at 1440x900 and 1920x1080 after the authenticated Splunk Web `_bump` endpoint refreshed appserver assets. All four original catalog defects are fixed, including the native Simple XML dependent Check selector reset. v0.3.19 added FISMA/RMF, DFARS cyber-clause, and NIST SP 800-171 Rev. 3 framework packs plus a shared Technical Coverage dashboard with bounded 24-hour monitoring signals. v0.3.20 corrects the Technical Coverage SPL, normalizes release metadata, and makes Requirements framework-first with a functional Check handoff. The v0.3.18 Phase 5 desktop acceptance run also passed at both required viewports, including maturity-panel behavior, all workflows, scheduler safety, and underscore routes. Mobile is informational smoke coverage only.

The content catalog contains 82 requirement rows across seven framework packs. Every row has a source reference and mapping basis. All rows remain `mapping_status=provisional`; the framework-level review status `approved_for_rollup` authorizes navigation, shared evidence discovery, and posture grouping only. It does not authorize an audit conclusion or claim one-to-one equivalence.

## Commercial release gates

| Gate | Status | Required evidence |
| --- | --- | --- |
| Desktop workflow acceptance | Complete | Phase 5 v0.3.18 authenticated browser report for both required desktop viewports |
| AppInspect packaging and Cloud tags | Complete | v0.3.25 AppInspect 4.3.0: 0 errors, 0 failures, 0 future failures; 2 expected Cloud warnings documented |
| Framework roll-up governance | Complete | Framework review basis and limitations in `docs/mapping-review.md` |
| Audit-level mapping approval | Engineering-ready; SME sign-off pending | Typed mapping-review register plus signed framework-specific decisions at the source item's audit granularity |
| Upgrade and rollback | Package transition contract complete; target backup/restore pending | Lifecycle check, KV Store backup/restore, package transition, `_bump`, and scheduler-state evidence |
| Production-scale performance | Local catalog budget complete; target load pending | Search latency, lookup size, KV Store record volume, and concurrent-user measurements |
| Design-partner acceptance | Pending | Auditor and control-owner workflow completed without developer assistance |

## Mapping approval policy

No framework row may move from `provisional` to `approved` solely because its title appears related to a canonical capability. Promotion requires:

1. An authoritative source identifier at the same granularity as the requirement.
2. The source version, clause/control/paragraph reference, and applicability conditions.
3. A documented mapping rationale and known limitation.
4. A named reviewer with framework expertise and a review date.
5. Evidence that the verification route matches the framework's assessment method.
6. A decision that distinguishes mapping approval from implementation pass/fail.

## Framework approval queue

| Framework | Rows | Current approval boundary | Next approval artifact |
| --- | ---: | --- | --- |
| CIS Controls v8.1 | 18 | Control-level roll-up only | Safeguard-level catalog, implementation groups, and CIS Assessment Specification procedures |
| CMMC 2.0 Level 2 | 14 | Domain-level roll-up only | Practice identifiers, assessment objectives, scoring, and applicability |
| ISO/IEC 27001:2022 | 4 | Annex A theme grouping only | Clauses, Annex A controls, Statement of Applicability, and risk-treatment linkage |
| NIST CSF 2.0 | 6 | Function-level roll-up only | Categories/subcategories, organizational profile, target state, and informative references |
| NIST SP 800-53 Rev. 5 | 20 | Family-level roll-up only | Control/enhancement IDs, baseline, tailoring, and SP 800-53A procedures |
| OMB M-26-14 | 8 | Memo outcome grouping only | Paragraph citations, Logging Reference Architecture version, Agency Logging Plan, and maturity evidence |
| PCI DSS 4.0.1 | 12 | Requirement-theme grouping only | Detailed requirements/subrequirements, testing procedures, scope, and ROC/SAQ path |

## Approval record contract

The approval record should capture at least:

```text
framework_key
framework_version
requirement_key
source_reference
mapping_type
mapping_status
mapping_review_status
reviewer
reviewed_at
approval_basis
approval_limitation
assessment_method_reference
applicability_notes
next_review_at
```

Until those fields are populated by an authorized reviewer, the app must continue to display the mapping as provisional and must not describe a roll-up as an authoritative equivalence.

The `ccp_mapping_reviews` KV Store collection and `transforms.conf` contract are now present in v0.3.18. The application does not seed approval records; an authorized reviewer must create them after reviewing the source material.

## Environment validation sequence

For every deployed package:

1. Install or upgrade the package and record its SHA-256.
2. Open the authenticated Splunk Web `_bump` endpoint and confirm the bump page loads.
3. Hard-refresh the app and confirm the visible workflows use the deployed static assets.
4. Verify framework selections, scopes, systems, and all KV Store registers.
5. Run the desktop acceptance workflow at 1440x900 and 1920x1080.
6. Confirm scheduled searches remain disabled unless explicitly enabled for the test.
7. Capture rollback evidence before declaring the package release-ready.

The repository lifecycle contract was exercised for `0.3.17 -> 0.3.18`. This proves package structure and version-transition safety only; it does not prove target-environment KV Store backup/restore or production load behavior.

# Release Candidate 0.3.26

## Scope

This release improves auditor usability without changing the assessment or scoring model:

- Added consistent hover explanations for framework, system, scope, category, evidence, and assessment controls.
- Added readable custom help tooltips without duplicate native browser title hints.
- Added next-step guidance to Requirement Explorer, Check Detail, and Technical Coverage.
- Clarified scope, evidence freshness, assessment decision, measurement result, and exception fields.
- Added automated coverage checks to keep auditor help present in the primary workflows.

## Verification

- `tools/validate.sh`: 30 tests passed.
- Package hygiene checks passed.
- Desktop browser acceptance remains required after deployment.

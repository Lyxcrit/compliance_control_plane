# Design-Partner Release Checklist

## Before the session

- Install the candidate package, record its SHA-256, open the authenticated `_bump` endpoint, and hard-refresh Splunk Web before testing.
- Select the partner's actual frameworks and record versions.
- Define one real audit scope and at least two systems.
- Confirm whether ES, CIM, Exposure Analytics, ticketing, identity, vulnerability, or change sources are available.
- Prepare one policy URL and one technical evidence source.

## Acceptance workflow

- A non-Splunk user can configure frameworks and scope without writing SPL.
- A document check cannot be marked Pass without current reviewed evidence.
- A technical check returns Pass, Partial, Fail, or Not assessed with observed value, expected value, source, and limitation.
- A failed result creates an owned finding with a due date and retest path.
- Audit Package exports the manifest, assessment, evidence, measurement, and finding registers for a fixed period.
- Upgrade preserves historical records and current-state projections.
- Desktop acceptance passes at 1440x900 and 1920x1080; mobile behavior is recorded separately and is not a release gate.

## Capture

Record elapsed time for setup, first assessment, evidence attachment, remediation assignment, and package export. Record confusing labels, missing data explanations, false-positive concerns, and any workflow that required SPL knowledge.

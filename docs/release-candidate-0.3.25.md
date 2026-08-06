# Release Candidate 0.3.25

## Baseline

v0.3.25 passed authenticated desktop acceptance at 1440x900 and 1920x1080. The acceptance covered framework filtering, Requirements-to-Check drilldown, Check Detail URL population, M-26-14 maturity behavior, Technical Coverage, regression dashboards, and scheduler safety.

The package contains 10 framework packs and 111 requirements. Framework mappings remain provisional unless an authorized framework reviewer approves them at the source framework's assessment granularity.

## Repository gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Unit/content/UI tests | Pass | 29 tests |
| Lookup generation | Pass | 10 frameworks, 111 requirements |
| Package hygiene | Pass | `dist/compliance_control_plane-0.3.25.tgz` |
| Release manifest | Pass | Package SHA-256 and content digests recorded |
| Lifecycle transition | Pass | `0.3.24 -> 0.3.25` |
| JavaScript syntax | Pass | Every shipped `appserver/static/*.js` file |
| Desktop acceptance | Pass | 1440x900 and 1920x1080 |
| AppInspect packaging tag | Pass | AppInspect 4.3.0: 0 errors, 0 failures, 0 future failures |
| AppInspect Cloud tag | Pass with expected warnings | AppInspect 4.3.0: 0 errors, 0 failures, 0 future failures; 2 expected SplunkJS/collections warnings |

## Target-environment gates

Before commercial release, capture evidence for:

1. Fresh install and upgrade with the target Splunk version.
2. KV Store backup, restore, and historical-record readability.
3. Scheduler state before and after upgrade.
4. AppInspect packaging and Cloud tags using the exact release archive.
5. Search latency and concurrent-user behavior against representative data volume.
6. Design-partner workflows for federal, commercial, and SLED use cases.

## Disposition

This is a strong release candidate for design-partner testing. It is not a certification product and does not make an authoritative compliance determination without approved content, defined scope, current evidence, and the applicable assessor or agency decision.

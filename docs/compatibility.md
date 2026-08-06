# Compatibility Matrix

## Supported design target

| Component | Phase 4 target | Validation state |
| --- | --- | --- |
| Splunk Enterprise | Current supported release with KV Store, Simple XML, and standard search commands | Validated on the development Splunk instance at `192.168.30.15`; exact release must be recorded before production deployment. |
| Splunk Cloud | Private app / Victoria-compatible packaging model | AppInspect Cloud tag passes; Cloud tenant deployment remains a release-environment test. |
| Enterprise Security | Optional | Base app does not require ES. REST-based ES health checks are intentionally administrator-owned and default to Not assessed. |
| Exposure Analytics | Optional | Adapter and health contract included; data freshness and scope must be validated in the target tenant. |
| CIM | Optional | CIM data-model health is a capability signal, not a compliance decision. |
| Browser | Supported Splunk Web browser versions | Browser-level workflow testing remains environment-specific and must be run against the target Splunk Web release. |

## Compatibility rules

- Do not enable scheduled collection until the target's owner, schedule, scope behavior, and permissions are recorded.
- Do not use global-scope cache results as system-specific audit evidence.
- Validate KV Store availability before install or upgrade.
- Retain framework content digests with exported assessment and evidence records.
- After installing or upgrading appserver static assets, open the authenticated Splunk Web `/_bump` endpoint and hard-refresh before browser validation.

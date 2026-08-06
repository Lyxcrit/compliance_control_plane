# Integration API Contract

External systems integrate through the existing Splunk KV Store collections and normalized lookup contracts. No framework-specific REST endpoint is required for the first release.

## Write contract

Use Splunk's storage endpoint with `Content-Type: application/json` and a JSON object for a single record or an array for `batch_save`:

`/servicesNS/nobody/compliance_control_plane/storage/collections/data/<collection>`

Supported collections include:

- `ccp_scopes` and `ccp_systems` for boundary and ownership context;
- `ccp_assessments` for immutable assessment history;
- `ccp_assessment_current` for current posture materialization;
- `ccp_evidence` for evidence history;
- `ccp_evidence_current` for current evidence posture;
- `ccp_measurements` for normalized technical results;
- `ccp_measurement_cache` for scheduled, replaceable technical results;
- `ccp_findings` for remediation state.

All writes should include the framework version and content digest when the record relates to a framework requirement. Current-state collections are replaceable projections; historical collections are the audit record.

## Connector rules

1. Never write `Pass` solely because a data source exists. Return `Not assessed` when the source is absent or unusable.
2. Include observed value, expected value, measured time, source, freshness, and limitations with every technical result.
3. Use the existing requirement and scope keys. Do not create a connector-specific framework identifier.
4. Failed or partial results should create or update a finding through the existing remediation workflow.
5. Treat ownership as application data and authorization as Splunk role configuration. Findings should include `owner`, `owner_kind`, and `owner_role`; the connector must not bypass Splunk permissions.

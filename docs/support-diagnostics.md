# Support Diagnostics

Collect the following without exporting sensitive event data:

```spl
| rest /services/apps/local/compliance_control_plane
| table title version label configured
```

```spl
| inputlookup framework_catalog.csv
| table framework_key version content_status content_digest default_selected
```

```spl
| inputlookup ccp_integration_health
| table integration_key status observed_value checked_at source limitations
```

```spl
| inputlookup ccp_measurement_cache
| table check_key scope_key status measured_at source limitations
```

Also record:

- Splunk Enterprise or Cloud release;
- app version and release manifest SHA-256;
- whether KV Store is healthy;
- selected frameworks and audit scope keys;
- whether either scheduled search is enabled;
- AppInspect version and result summary;
- browser and Splunk Web version for UI issues.

Do not include credentials, raw events, policy contents, or full asset inventories in a support bundle unless explicitly requested and approved.

# Release Candidate 0.3.36

- Kept the `Open check` result field name stable from SPL through the table drilldown.
- The field value is the canonical requirement key, so the visible action column carries the exact destination identifier.
- The drilldown uses Splunk's `$click.value2$` cell-value token for `form.requirement_token`.
- Added regression assertions for the stable field name and clicked-cell token.

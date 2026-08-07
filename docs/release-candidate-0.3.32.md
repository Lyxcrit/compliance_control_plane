# Release Candidate 0.3.32

This release keeps Technical Coverage and Measurement Center overview panels responsive when the optional measurement cache is empty or schedulers are disabled.

- Overview panels now read saved measurement results from `ccp_measurement_cache` and return explicit `Not assessed` or `No cached result` states when no cached result exists.
- Removed expensive live metadata and broad `tstats` searches from the overview path. Live technical checks remain available in Measurement Center.
- The host inventory panel uses the same cached result path as the technical measurement register.
- Added bounded-search assertions for the overview dashboards.

These panels indicate technical evidence availability only. They do not establish complete coverage, control effectiveness, or certification.

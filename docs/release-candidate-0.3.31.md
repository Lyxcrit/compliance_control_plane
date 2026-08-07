# Release Candidate 0.3.31

## Scope

- Corrected the tooltip conversion regression in Measurement Center SPL.
- Made Requirements dependent searches read directly from the selected framework catalog.
- Preserved raw framework and requirement keys for governance drilldown links.
- Added regression coverage for the corrupted retention search predicate.

## Verification

- `tools/validate.sh`: 31 tests passed.
- Package hygiene checks passed.
- Desktop browser acceptance is required after deployment at 1440x900 and 1920x1080.

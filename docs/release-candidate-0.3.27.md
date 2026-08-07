# Release Candidate 0.3.27

## Scope

This release corrects the v0.3.26 help affordance implementation:

- Moved native filter explanations into supported HTML guide rows for reliable Splunk rendering.
- Replaced duplicate native-browser and custom tooltip behavior with one app-styled tooltip.
- Added keyboard focus and accessible labels to the visible help icons.

## Verification

- `tools/validate.sh`: 30 tests passed.
- Package hygiene checks passed.
- Desktop browser acceptance is required after deployment at 1440x900 and 1920x1080.

# Release Candidate 0.3.29

## Scope

- Removed the undefined `scope_token` from Check Detail action links.
- Assessment and evidence links now pass only tokens available on Check Detail.
- Findings opens with framework and check context without a literal unresolved token.
- Added regression coverage for unresolved scope-token placeholders.

## Verification

- `tools/validate.sh`: 30 tests passed.
- Package hygiene checks passed.
- Desktop browser acceptance is required after deployment at 1440x900 and 1920x1080.

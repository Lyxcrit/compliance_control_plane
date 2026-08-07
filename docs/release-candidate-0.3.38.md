# Release Candidate 0.3.38

- Fixed Check Detail URL initialization to read `form.framework_token` and `form.requirement_token` parameters.
- Preserved support for unprefixed parameters for direct and older links.
- The delayed dependent-selector restoration now runs for Requirements-to-Check navigation, preventing the framework change handler from leaving the requirement empty.

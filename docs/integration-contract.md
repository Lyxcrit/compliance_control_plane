# Integration Contract

Integrations are optional capability providers. The core app must remain useful when Enterprise Security, Exposure Analytics, or CIM data models are absent.

## Adapter contract

Each adapter is described by a stable catalog row with:

- adapter key and measurement key;
- source or detection search;
- freshness window;
- readiness status;
- limitations that must travel with the result.

An adapter result is evidence about a measured signal. It is not an assessment decision by itself.

## Current optional integrations

`integration_catalog.csv` describes CIM endpoint data, Enterprise Security asset and identity context, and Exposure Analytics discovery data. Detection is deliberately separate from evaluation: an installed product can be present while its data is empty or stale.

## Scheduled cache

`CCP - Refresh technical measurement cache` is installed disabled and runs every 15 minutes when enabled by an administrator. It writes normalized results to `ccp_measurement_cache` with a global scope. The global scope is intentional for this first scheduler slice; scope-aware scheduled collection must be added before using the cache as a system-boundary conclusion.

The scheduler preserves status, observed value, expected value, measured time, source, details, and limitations. It does not create an assessment or silently mark a requirement Pass.

## Future connectors

New connectors should write the existing measurement, evidence, and finding contracts. They should not add framework-specific dashboards or require a product dependency at install time. A connector is ready for release only when it has a detection test, a freshness rule, a limitation statement, a disabled-safe behavior, and a test fixture for both data-present and data-absent states.

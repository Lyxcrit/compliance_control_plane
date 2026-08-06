# Architecture Direction

## Boundaries

The core domain does not know whether evidence came from Splunk, a CMDB, a ticketing system, or a manually uploaded artifact. Each adapter produces normalized systems, measurements, evidence, and findings.

Framework packs are immutable, versioned inputs. Local assessment state must reference the exact framework version used so an updated framework does not silently rewrite historical results.

## Planned Splunk adapter

The first Splunk adapter should consume CIM data models and saved-search results through a narrow interface. It should provide:

- asset inventory coverage;
- source and data-model health;
- searchability and retention measurements;
- baseline logging coverage;
- detection and alert coverage; and
- links back to the originating Splunk search or result set.

Splunk configuration should remain an adapter/deployment concern. The framework pack must not contain embedded KV Store names, dashboard IDs, or brittle UI selectors.

## M-26-14 model

M-26-14 is represented as outcomes and measurements rather than only controls. The content pack captures the initial memo requirements and maturity thresholds. CISA Logging Reference Architecture content should be added as a separate, versioned pack when published and mapped to these stable outcome keys.


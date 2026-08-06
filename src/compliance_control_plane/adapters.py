"""Stable metadata for technical measurement adapters.

Adapters return normalized measurements; this module deliberately does not
execute Splunk searches. Platform-specific execution belongs in the app
adapter layer and is described by the same contract.
"""

from .models import AdapterStatus, MeasurementAdapter


BUILTIN_ADAPTERS: tuple[MeasurementAdapter, ...] = (
    MeasurementAdapter(
        key="splunk.index_retention",
        display_name="Splunk index retention",
        measurement_key="index_retention_configuration",
        adapter_type="rest_configuration",
        source="/services/data/indexes",
        freshness_window="current configuration",
        limitations="Configured retention does not prove historical searchability or a successful restore test.",
    ),
    MeasurementAdapter(
        key="splunk.recent_index_activity",
        display_name="Recent indexed activity",
        measurement_key="recent_index_activity",
        adapter_type="tstats",
        source="index=*",
        freshness_window="24h",
        limitations="Recent activity does not prove complete source coverage or retention.",
    ),
    MeasurementAdapter(
        key="splunk.host_metadata",
        display_name="Splunk host metadata inventory",
        measurement_key="cim_endpoint_inventory",
        adapter_type="metadata",
        source="metadata type=hosts",
        freshness_window="current metadata",
        limitations="Host metadata is an observed inventory signal, not an authoritative system boundary.",
    ),
    MeasurementAdapter(
        key="splunk.exposure_analytics",
        display_name="Exposure Analytics inventory",
        measurement_key="exposure_analytics_inventory",
        adapter_type="event_search",
        source="index=ea_discovery",
        freshness_window="24h",
        limitations="Coverage depends on Exposure Analytics discovery jobs and the approved scope.",
    ),
    MeasurementAdapter(
        key="splunk.exposure_analytics_freshness",
        display_name="Exposure Analytics source freshness",
        measurement_key="exposure_analytics_inventory",
        adapter_type="event_search",
        source="index=ea_discovery",
        freshness_window="24h",
        limitations="Fresh records do not prove that all expected asset classes are represented.",
    ),
)

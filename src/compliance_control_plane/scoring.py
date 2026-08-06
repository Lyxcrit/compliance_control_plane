"""Explainable scoring for requirement measurements."""

from collections.abc import Iterable

from .models import Measurement, MeasurementStatus, Score


def score_measurements(measurements: Iterable[Measurement]) -> Score:
    """Count measurement states without hiding unassessed requirements."""

    counts = {status: 0 for status in MeasurementStatus}
    for measurement in measurements:
        counts[measurement.status] += 1
    return Score(
        total=sum(counts.values()),
        passed=counts[MeasurementStatus.PASS],
        partial=counts[MeasurementStatus.PARTIAL],
        failed=counts[MeasurementStatus.FAIL],
        not_assessed=counts[MeasurementStatus.NOT_ASSESSED],
        not_applicable=counts[MeasurementStatus.NOT_APPLICABLE],
    )


import unittest

from compliance_control_plane.models import Measurement, MeasurementStatus
from compliance_control_plane.scoring import score_measurements


class ScoringTests(unittest.TestCase):
    def test_score_preserves_all_states(self) -> None:
        score = score_measurements(
            [
                Measurement("a", MeasurementStatus.PASS),
                Measurement("b", MeasurementStatus.PARTIAL),
                Measurement("c", MeasurementStatus.FAIL),
                Measurement("d", MeasurementStatus.NOT_ASSESSED),
                Measurement("e", MeasurementStatus.NOT_APPLICABLE),
            ]
        )
        self.assertEqual(score.total, 5)
        self.assertEqual(score.assessed, 3)
        self.assertEqual(score.not_assessed, 1)
        self.assertEqual(score.not_applicable, 1)


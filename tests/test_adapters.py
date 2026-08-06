import unittest

from compliance_control_plane.adapters import BUILTIN_ADAPTERS
from compliance_control_plane.models import AdapterStatus


class AdapterTests(unittest.TestCase):
    def test_builtin_adapters_have_normalized_metadata(self) -> None:
        self.assertGreaterEqual(len(BUILTIN_ADAPTERS), 4)
        keys = {adapter.key for adapter in BUILTIN_ADAPTERS}
        self.assertEqual(len(keys), len(BUILTIN_ADAPTERS))
        for adapter in BUILTIN_ADAPTERS:
            self.assertTrue(adapter.measurement_key)
            self.assertTrue(adapter.source)
            self.assertTrue(adapter.freshness_window)
            self.assertTrue(adapter.limitations)
            self.assertEqual(adapter.status, AdapterStatus.READY)

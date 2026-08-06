import csv
import time
import unittest
from pathlib import Path


APP = Path(__file__).parents[1] / "splunk_app/compliance_control_plane"


class ContentPerformanceTests(unittest.TestCase):
    def test_lookup_catalog_loads_within_local_budget(self) -> None:
        started = time.perf_counter()
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as source:
            rows = list(csv.DictReader(source))
        elapsed = time.perf_counter() - started
        self.assertEqual(len(rows), 111)
        self.assertLess(elapsed, 0.25)

    def test_catalog_keys_are_unique_for_fast_lookup(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as source:
            rows = list(csv.DictReader(source))
        keys = [(row["framework_key"], row["requirement_key"]) for row in rows]
        self.assertEqual(len(keys), len(set(keys)))

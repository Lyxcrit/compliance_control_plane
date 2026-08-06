import unittest
from pathlib import Path

from compliance_control_plane.content import ContentError, load_framework


ROOT = Path(__file__).parents[1]


class ContentTests(unittest.TestCase):
    def test_loads_m26_14_pack(self) -> None:
        framework = load_framework(ROOT / "content/frameworks/m26-14/framework.json")
        self.assertEqual(framework.key, "omb-m-26-14")
        self.assertEqual(framework.version, "2026-05-22")
        self.assertEqual(len(framework.requirements), 8)
        self.assertEqual(framework.requirements[0].maturity_levels["4"], "95")
        self.assertEqual(framework.requirements[0].mapping_status.value, "unmapped")

    def test_additional_framework_packs_load(self) -> None:
        nist = load_framework(ROOT / "content/frameworks/nist-csf-2.0/framework.json")
        cis = load_framework(ROOT / "content/frameworks/cis-controls-8.1/framework.json")
        nist_controls = load_framework(ROOT / "content/frameworks/nist-sp-800-53r5/framework.json")
        pci = load_framework(ROOT / "content/frameworks/pci-dss-4.0.1/framework.json")
        iso = load_framework(ROOT / "content/frameworks/iso-27001-2022/framework.json")
        cmmc = load_framework(ROOT / "content/frameworks/cmmc-2.0-level-2/framework.json")
        self.assertEqual(len(nist.requirements), 6)
        self.assertEqual(len(cis.requirements), 18)
        self.assertEqual(len(nist_controls.requirements), 20)
        self.assertEqual(len(pci.requirements), 12)
        self.assertEqual(len(iso.requirements), 4)
        self.assertEqual(len(cmmc.requirements), 14)
        self.assertEqual(nist_controls.requirements[1].verification_mode.value, "document")

    def test_requirement_mapping_status_is_valid(self) -> None:
        framework = load_framework(ROOT / "content/frameworks/cis-controls-8.1/framework.json")
        self.assertTrue(all(requirement.mapping_status.value in {"unmapped", "provisional", "approved"} for requirement in framework.requirements))

    def test_mapping_metadata_declares_rollup_scope(self) -> None:
        framework = load_framework(ROOT / "content/frameworks/nist-csf-2.0/framework.json")
        self.assertTrue(all(requirement.mapping_type.value == "rollup" for requirement in framework.requirements))

    def test_rejects_duplicate_requirement_keys(self) -> None:
        path = ROOT / "tests/fixtures_duplicate.json"
        path.write_text(
            '{"key":"x","name":"X","version":"1","authority":"a","description":"d",'
            '"requirements":[{"key":"r","title":"t","description":"d","type":"control",'
            '"category":"c","source_reference":"s"},{"key":"r","title":"t","description":"d",'
            '"type":"control","category":"c","source_reference":"s"}]}',
            encoding="utf-8",
        )
        try:
            with self.assertRaises(ContentError):
                load_framework(path)
        finally:
            path.unlink()

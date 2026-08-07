import csv
import re
import unittest
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).parents[1]
APP = ROOT / "splunk_app/compliance_control_plane"


class SplunkAppTests(unittest.TestCase):
    def test_app_payload_has_required_files(self) -> None:
        self.assertTrue((APP / "default/app.conf").is_file())
        self.assertTrue((APP / "metadata/default.meta").is_file())
        self.assertTrue((APP / "default/data/ui/nav/default.xml").is_file())
        self.assertTrue((APP / "default/data/ui/views/setup.xml").is_file())
        self.assertTrue((APP / "default/data/ui/views/audit_review.xml").is_file())
        self.assertTrue((APP / "default/data/ui/views/findings.xml").is_file())
        self.assertTrue((APP / "default/data/ui/views/audit_package.xml").is_file())
        self.assertTrue((APP / "default/data/ui/views/technical_coverage.xml").is_file())
        self.assertTrue((APP / "appserver/static/measurement.js").is_file())

    def test_navigation_is_grouped_by_auditor_workflow(self) -> None:
        navigation = (APP / "default/data/ui/nav/default.xml").read_text(encoding="utf-8")
        self.assertIn('<collection label="Checks">', navigation)
        self.assertIn('<collection label="Posture">', navigation)
        self.assertIn('<collection label="Evidence and remediation">', navigation)
        self.assertIn('<collection label="Framework measurements">', navigation)
        self.assertIn('<view name="technical_coverage" />', navigation)

    def test_app_version_is_semver(self) -> None:
        app_conf = (APP / "default/app.conf").read_text(encoding="utf-8")
        version = re.search(r"^version = (.+)$", app_conf, re.MULTILINE).group(1)
        self.assertRegex(version, r"^\d+\.\d+\.\d+$")

    def test_views_are_well_formed(self) -> None:
        for view in (APP / "default/data/ui/views").glob("*.xml"):
            ElementTree.parse(view)

    def test_auditor_help_is_available_on_filters_and_forms(self) -> None:
        css = (APP / "appserver/static/app.css").read_text(encoding="utf-8")
        self.assertIn(".ccp-help::after", css)
        self.assertIn("content: attr(data-tooltip)", css)
        for name in ("home", "requirements", "check", "readiness", "audit_review", "audit_package", "assessment", "evidence", "setup"):
            view = (APP / f"default/data/ui/views/{name}.xml").read_text(encoding="utf-8")
            self.assertIn("ccp-help", view, f"Missing auditor help in {name}.xml")

    def test_every_requirement_has_actionable_playbook(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as requirements_file:
            requirements = list(csv.DictReader(requirements_file))
        with (APP / "lookups/policy_playbook.csv").open(newline="", encoding="utf-8") as playbook_file:
            playbook = {(row["framework_key"], row["requirement_key"]): row for row in csv.DictReader(playbook_file)}
        self.assertGreater(len(requirements), 0)
        for requirement in requirements:
            row = playbook[(requirement["framework_key"], requirement["requirement_key"])]
            self.assertGreater(len(row["implementation_steps"]), 40)
            self.assertGreater(len(row["validation_method"]), 20)

    def test_requirements_explain_verification_route(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as requirements_file:
            requirements = list(csv.DictReader(requirements_file))
        valid_modes = {"document", "technical", "hybrid"}
        self.assertGreaterEqual(len(requirements), 80)
        self.assertTrue(any(row["verification_mode"] == "document" for row in requirements))
        self.assertTrue(any(row["verification_mode"] == "technical" for row in requirements))
        for requirement in requirements:
            self.assertIn(requirement["verification_mode"], valid_modes)
            self.assertTrue(requirement["verification_label"])
            self.assertGreater(len(requirement["verification_guidance"]), 30)

    def test_m26_checks_have_determination_criteria(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as requirements_file:
            rows = [row for row in csv.DictReader(requirements_file) if row["framework_key"] == "omb-m-26-14"]
        self.assertEqual(len(rows), 8)
        for row in rows:
            for field in ("assessment_method_reference", "assessment_objective", "applicability", "pass_criteria", "partial_criteria", "fail_criteria"):
                self.assertGreater(len(row[field]), 20, f"Missing M-26-14 {field} for {row['requirement_key']}")

    def test_all_framework_checks_have_determination_criteria(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as requirements_file:
            rows = list(csv.DictReader(requirements_file))
        fields = ("assessment_method_reference", "assessment_objective", "applicability", "pass_criteria", "partial_criteria", "fail_criteria")
        self.assertEqual(len(rows), 111)
        for row in rows:
            for field in fields:
                self.assertGreater(len(row[field]), 20, f"Missing {field} for {row['framework_key']}:{row['requirement_key']}")

    def test_framework_assessment_profiles_are_present_and_explicit(self) -> None:
        with (APP / "lookups/framework_assessment_profiles.csv").open(newline="", encoding="utf-8") as profile_file:
            profiles = list(csv.DictReader(profile_file))
        with (APP / "lookups/framework_catalog.csv").open(newline="", encoding="utf-8") as framework_file:
            frameworks = {row["framework_key"] for row in csv.DictReader(framework_file)}
        self.assertEqual({row["framework_key"] for row in profiles}, frameworks)
        for profile in profiles:
            self.assertTrue(profile["assessment_granularity"])
            self.assertTrue(profile["assessment_methods"])
            self.assertTrue(profile["required_artifacts"])
            self.assertTrue(profile["audit_boundary"])

    def test_generated_requirements_have_canonical_control_identity(self) -> None:
        with (APP / "lookups/requirements.csv").open(newline="", encoding="utf-8") as requirements_file:
            requirements = list(csv.DictReader(requirements_file))
        with (APP / "lookups/canonical_controls.csv").open(newline="", encoding="utf-8") as controls_file:
            controls = {row["canonical_control_key"] for row in csv.DictReader(controls_file)}
        self.assertGreater(len(controls), 0)
        for requirement in requirements:
            self.assertIn(requirement["canonical_control_key"], controls)
            self.assertIn(requirement["mapping_status"], {"approved", "provisional", "unmapped"})
            self.assertIn(requirement["mapping_type"], {"direct", "rollup", "contextual"})
            self.assertIn(requirement["mapping_review_status"], {"approved_for_rollup", "not_reviewed"})

    def test_mapping_review_lookup_is_complete(self) -> None:
        with (APP / "lookups/mapping_reviews.csv").open(newline="", encoding="utf-8") as review_file:
            reviews = list(csv.DictReader(review_file))
        self.assertEqual(len(reviews), 10)
        self.assertTrue(all(row["review_status"] == "approved_for_rollup" for row in reviews))

    def test_framework_selection_storage_is_declared(self) -> None:
        collections = (APP / "default/collections.conf").read_text(encoding="utf-8")
        transforms = (APP / "default/transforms.conf").read_text(encoding="utf-8")
        self.assertIn("[ccp_framework_selections]", collections)
        self.assertIn("[ccp_mapping_reviews]", collections)
        self.assertIn("[ccp_scopes]", collections)
        self.assertIn("field.content_digest = string", collections)
        self.assertIn("[ccp_assessment_current]", collections)
        self.assertIn("[ccp_evidence_current]", collections)
        self.assertIn("collection = ccp_framework_selections", transforms)
        self.assertIn("collection = ccp_mapping_reviews", transforms)
        self.assertIn("collection = ccp_scopes", transforms)
        macros = (APP / "default/macros.conf").read_text(encoding="utf-8")
        self.assertIn("[ccp_latest_assessments]", macros)
        self.assertIn("[ccp_evidence_rollup]", macros)
        self.assertIn("ccp_assessment_current", macros)
        self.assertIn("ccp_evidence_current", macros)
        self.assertIn("[ccp_measurement_rollup]", macros)

    def test_findings_storage_and_adapter_catalog_are_declared(self) -> None:
        collections = (APP / "default/collections.conf").read_text(encoding="utf-8")
        transforms = (APP / "default/transforms.conf").read_text(encoding="utf-8")
        self.assertIn("[ccp_findings]", collections)
        self.assertIn("field.owner_role = string", collections)
        self.assertIn("collection = ccp_findings", transforms)
        self.assertIn("[ccp_measurements]", collections)
        self.assertIn("[ccp_measurement_cache]", collections)
        self.assertIn("[ccp_integration_health]", collections)
        self.assertIn("collection = ccp_measurements", transforms)
        self.assertIn("collection = ccp_measurement_cache", transforms)
        self.assertIn("collection = ccp_integration_health", transforms)
        with (APP / "lookups/measurement_adapters.csv").open(newline="", encoding="utf-8") as adapters_file:
            adapters = list(csv.DictReader(adapters_file))
        self.assertGreaterEqual(len(adapters), 4)
        self.assertTrue(all(row["measurement_key"] and row["source"] and row["limitations"] for row in adapters))
        self.assertTrue((APP / "default/savedsearches.conf").is_file())
        self.assertIn("CCP - Refresh technical measurement cache", (APP / "default/savedsearches.conf").read_text(encoding="utf-8"))
        self.assertIn("enableSched = 0", (APP / "default/savedsearches.conf").read_text(encoding="utf-8"))
        self.assertIn("CCP - Refresh optional integration health", (APP / "default/savedsearches.conf").read_text(encoding="utf-8"))
        with (APP / "lookups/integration_catalog.csv").open(newline="", encoding="utf-8") as integrations_file:
            integrations = list(csv.DictReader(integrations_file))
        integration_keys = {row["integration_key"] for row in integrations}
        self.assertTrue({"splunk.cim", "splunk.es", "splunk.exposure_analytics"}.issubset(integration_keys))
        self.assertTrue({"external.vulnerability", "external.identity", "external.change", "external.ticketing"}.issubset(integration_keys))
        with (APP / "lookups/technical_checks.csv").open(newline="", encoding="utf-8") as checks_file:
            checks = list(csv.DictReader(checks_file))
        self.assertGreaterEqual(len(checks), 5)
        self.assertTrue(all(row["search"] and row["expected_value"] for row in checks))

    def test_failed_results_create_remediation_path(self) -> None:
        measurement_js = (APP / "appserver/static/measurement.js").read_text(encoding="utf-8")
        assessment_js = (APP / "appserver/static/assessment.js").read_text(encoding="utf-8")
        self.assertIn("findingFor", measurement_js)
        self.assertIn("batch_save", measurement_js)
        self.assertIn("status !== 'Fail'", measurement_js)
        self.assertIn("findingFor", assessment_js)
        self.assertIn("batch_save", assessment_js)
        self.assertIn("ccp_assessment_current", assessment_js)
        self.assertIn("hasCurrentReviewedEvidence", assessment_js)
        self.assertIn("hasPassingMeasurement", assessment_js)
        self.assertIn("ccp_evidence_current", (APP / "appserver/static/evidence.js").read_text(encoding="utf-8"))
        self.assertIn("ccp-run-check", measurement_js)
        self.assertIn("technical_checks.csv", measurement_js)

    def test_control_owner_forms_use_catalog_selectors(self) -> None:
        assessment_view = (APP / "default/data/ui/views/assessment.xml").read_text(encoding="utf-8")
        evidence_view = (APP / "default/data/ui/views/evidence.xml").read_text(encoding="utf-8")
        assessment_js = (APP / "appserver/static/assessment.js").read_text(encoding="utf-8")
        evidence_js = (APP / "appserver/static/evidence.js").read_text(encoding="utf-8")
        self.assertIn('id="ccp-assessment-framework"', assessment_view)
        self.assertIn('<select id="ccp-assessment-requirement">', assessment_view)
        self.assertIn('<select id="ccp-framework-key">', evidence_view)
        self.assertIn("CCPAssessmentFrameworks", assessment_js)
        self.assertIn("CCPEvidenceFrameworks", evidence_js)
        self.assertIn("content_digest", assessment_js)
        self.assertIn("content_digest", evidence_js)
        self.assertIn("ccp-reviewed-at", evidence_view)
        self.assertIn("reviewed_at", evidence_js)
        self.assertIn("document_url", evidence_js)
        self.assertIn("ccp-document-url", evidence_view)
        self.assertIn("ccp-assessment-reviewed-at", assessment_view)
        self.assertIn("reviewed_at", assessment_js)
        setup_view = (APP / "default/data/ui/views/setup.xml").read_text(encoding="utf-8")
        setup_js = (APP / "appserver/static/setup.js").read_text(encoding="utf-8")
        self.assertIn("Register an assessed system", setup_view)
        self.assertIn("ccp_systems", setup_js)
        self.assertIn('<select id="ccp-system-record-scope">', setup_view)
        self.assertIn("CCPSetupScopes", setup_js)
        self.assertIn("CCPAssessmentSystems", assessment_js)
        self.assertIn("CCPEvidenceSystems", evidence_js)
        self.assertIn("integration_catalog.csv", setup_view)
        measurement_view = (APP / "default/data/ui/views/measurements.xml").read_text(encoding="utf-8")
        measurement_js = (APP / "appserver/static/measurement.js").read_text(encoding="utf-8")
        self.assertIn('<select id="ccp-measurement-scope">', measurement_view)
        self.assertIn('<select id="ccp-measurement-requirement">', measurement_view)
        self.assertIn("CCPMeasurementAdapters", measurement_js)
        self.assertIn("storage/collections/data/ccp_scopes", measurement_js)
        self.assertIn("storage/collections/data/ccp_scopes", assessment_js)
        self.assertIn("storage/collections/data/ccp_scopes", evidence_js)

    def test_framework_dependent_selectors_and_defaults_are_safe(self) -> None:
        requirements_view = (APP / "default/data/ui/views/requirements.xml").read_text(encoding="utf-8")
        check_view = (APP / "default/data/ui/views/check.xml").read_text(encoding="utf-8")
        audit_review_view = (APP / "default/data/ui/views/audit_review.xml").read_text(encoding="utf-8")
        self.assertIn("ccp_selected_requirements", requirements_view)
        self.assertIn('<unset token="category_token"', requirements_view)
        self.assertIn('<set token="requirement_token">$value$</set>', check_view)
        self.assertIn('<unset token="requirement_token"', check_view)
        self.assertIn('<row depends="$m26_maturity$">', check_view)
        self.assertIn("M-26-14 maturity targets", check_view)
        self.assertIn("'value' == &quot;omb-m-26-14&quot;", check_view)
        self.assertIn("'value' != &quot;omb-m-26-14&quot;", check_view)
        self.assertIn('id="ccp_requirements_open_table"', requirements_view)
        self.assertIn("requirement_token=$row.requirement_key$", requirements_view)
        self.assertIn("'value' != &quot;&quot;", requirements_view)
        self.assertGreaterEqual(requirements_view.count('<row depends="$framework_selected$">'), 2)
        self.assertTrue((APP / "appserver/static/check.js").is_file())
        check_js = (APP / "appserver/static/check.js").read_text(encoding="utf-8")
        self.assertIn("form.framework_token", check_js)
        self.assertIn("form.requirement_token", check_js)
        self.assertIn('action as Action', requirements_view)
        self.assertIn('<choice value="__select_framework__">Select a framework first</choice>', requirements_view)
        self.assertIn('<default>__select_framework__</default>', requirements_view)
        self.assertIn('<set token="category_token">*</set>', requirements_view)
        home_view = (APP / "default/data/ui/views/home.xml").read_text(encoding="utf-8")
        self.assertIn("framework_token=$row.framework_key$", home_view)
        self.assertIn("Record remediation finding", check_view)
        technical_coverage = (APP / "default/data/ui/views/technical_coverage.xml").read_text(encoding="utf-8")
        self.assertNotIn("dc(", technical_coverage)
        setup_js = (APP / "appserver/static/setup.js").read_text(encoding="utf-8")
        self.assertIn("loadScopesDirect();", setup_js)
        self.assertIn("directScopeAttempts", setup_js)
        self.assertIn("directScopeLoaded || select.find", setup_js)
        self.assertIn("scopeManager.startSearch", setup_js)
        technical_view = (APP / "default/data/ui/views/technical_coverage.xml").read_text(encoding="utf-8")
        self.assertIn("earliest=-24h", technical_view)
        self.assertNotIn("All-Time", technical_view)
        self.assertNotIn('level_1 as "Level 1"', check_view.split("M-26-14 maturity targets", 1)[0])
        self.assertIn('<default>*</default>', audit_review_view)
        self.assertNotIn('search system_key="$system_token$" OR "$system_token$"="*"', check_view)
        self.assertNotIn('search system_key="$system_token$" OR "$system_token$"="*"', audit_review_view)

    def test_workflow_forms_explain_setup_and_findings_use_catalog_selectors(self) -> None:
        assessment_view = (APP / "default/data/ui/views/assessment.xml").read_text(encoding="utf-8")
        evidence_view = (APP / "default/data/ui/views/evidence.xml").read_text(encoding="utf-8")
        findings_view = (APP / "default/data/ui/views/findings.xml").read_text(encoding="utf-8")
        findings_js = (APP / "appserver/static/findings.js").read_text(encoding="utf-8")
        for view in (assessment_view, evidence_view):
            self.assertIn("Framework Setup", view)
            self.assertIn("ccp-callout-info", view)
        self.assertIn('<select id="ccp-finding-framework">', findings_view)
        self.assertIn('<select id="ccp-finding-requirement">', findings_view)
        self.assertIn("CCPFindingFrameworks", findings_js)
        self.assertIn("CCPFindingScopes", findings_js)
        self.assertIn("ccp-finding-owner-role", findings_view)
        self.assertIn("owner_role", findings_js)
        self.assertIn("storage/collections/data/ccp_scopes", findings_js)

    def test_audit_package_register_is_period_and_scope_aware(self) -> None:
        audit_package_view = (APP / "default/data/ui/views/audit_package.xml").read_text(encoding="utf-8")
        self.assertIn("period_start=relative_time", audit_package_view)
        self.assertIn('where "$scope_token$"="*" OR scope_key="$scope_token$"', audit_package_view)
        self.assertIn("stats latest(scope_key) as assessment_scope", audit_package_view)
        self.assertIn("Package manifest", audit_package_view)
        self.assertIn("export_status=\"Ready for table export\"", audit_package_view)
        self.assertNotIn("lookup ccp_assessments requirement_key OUTPUT", audit_package_view)

    def test_auditor_dashboards_use_catalog_backed_scope_and_system_filters(self) -> None:
        audit_review_view = (APP / "default/data/ui/views/audit_review.xml").read_text(encoding="utf-8")
        readiness_view = (APP / "default/data/ui/views/readiness.xml").read_text(encoding="utf-8")
        audit_package_view = (APP / "default/data/ui/views/audit_package.xml").read_text(encoding="utf-8")
        for view in (audit_review_view, readiness_view):
            self.assertIn('<input type="dropdown" token="system_token"', view)
            self.assertIn("inputlookup ccp_systems", view)
        self.assertIn('<input type="dropdown" token="scope_token"', audit_package_view)
        self.assertIn("inputlookup ccp_scopes", audit_package_view)
        self.assertIn("Assessment basis", audit_review_view)
        self.assertIn("framework_assessment_profiles.csv", audit_review_view)
        self.assertIn("Assessment basis", audit_package_view)
        self.assertIn("framework_assessment_profiles.csv", audit_package_view)

    def test_system_inventory_captures_audit_context(self) -> None:
        collections = (APP / "default/collections.conf").read_text(encoding="utf-8")
        transforms = (APP / "default/transforms.conf").read_text(encoding="utf-8")
        setup_view = (APP / "default/data/ui/views/setup.xml").read_text(encoding="utf-8")
        setup_js = (APP / "appserver/static/setup.js").read_text(encoding="utf-8")
        control_ids = {
            "system_type": "ccp-system-record-type",
            "environment": "ccp-system-record-environment",
            "business_owner": "ccp-system-record-business-owner",
            "technical_owner": "ccp-system-record-technical-owner",
            "data_classification": "ccp-system-record-classification",
            "regulatory_impact": "ccp-system-record-regulatory-impact",
        }
        for field, control_id in control_ids.items():
            self.assertIn("field." + field + " = string", collections)
            self.assertIn(field, transforms)
            self.assertIn(control_id, setup_view)
            self.assertIn(field, setup_js)

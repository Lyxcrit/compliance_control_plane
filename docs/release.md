# Release and Upgrade Runbook

## Build gates

Run repository validation before creating a release package:

```bash
tools/validate.sh
```

The command regenerates framework lookups, runs Python and JavaScript tests, parses every view, builds the app package, and checks that the package contains no hidden files, development artifacts, `local/` content, or bytecode.

Run it from the WSL terminal with `./tools/validate.sh`. When launching from Windows, use `tools\\validate.cmd`; it explicitly invokes WSL so the `.sh` file is not opened by a Windows editor association.

Run the pinned AppInspect CLI against both packaging and Cloud tags:

```bash
/tmp/compliance-appinspect-venv/bin/splunk-appinspect inspect dist/compliance_control_plane-0.3.25.tgz --included-tags packaging_standards
/tmp/compliance-appinspect-venv/bin/splunk-appinspect inspect dist/compliance_control_plane-0.3.25.tgz --included-tags cloud
```

The Cloud-tag result is a release blocker. Re-run it whenever the Splunk platform or AppInspect checks change.

Generate the release manifest and run the package lifecycle contract:

```bash
tools/package_app.sh
tools/lifecycle_check.sh dist/compliance_control_plane-0.3.5.tgz dist/compliance_control_plane-0.3.6.tgz
```

## Install

1. Confirm the target Splunk version and whether Enterprise Security or Exposure Analytics adapters are available.
2. Back up the app directory and the app KV Store collections.
3. Install the `.tgz` package through Splunk Web or the supported deployment process.
4. Open `https://<splunk-host>:8000/en-US/_bump` in an authenticated Splunk Web session to refresh appserver static assets, then hard-refresh the app.
5. Confirm the app is visible and open Framework Setup.
6. Confirm framework selections and configured audit scopes.
7. Open Readiness and verify that the initial state is Not assessed rather than Pass.
8. Run the Measurement Center searches appropriate to the selected frameworks.

## Upgrade

1. Export or back up `ccp_scopes`, `ccp_assessments`, `ccp_assessment_current`, `ccp_evidence`, `ccp_evidence_current`, `ccp_findings`, and `ccp_measurements` before upgrading.
2. Record the current app version, framework content digests, and mapping-review lookup version.
3. Install the new package over the existing app.
4. Open the authenticated Splunk Web `_bump` endpoint and hard-refresh the app; restart Splunk only when required by the deployment method.
5. Verify that existing KV Store records are readable and that new fields are additive.
6. Confirm framework selections, scopes, assessments, current-state records, evidence, current-state evidence records, findings, and measurements remain present.
7. Review changed framework versions, content digests, and mapping-review decisions before using the new content for an audit.
8. If enabling scheduled measurement collection, record the saved-search owner, schedule, scope behavior, and cache freshness in the deployment record.

## Rollback

Rollback means restoring the previous package and the KV Store backup together. Never restore an older package while leaving newer content or assessment records unexplained; historical records must retain the framework version and content digest under which they were created. The lifecycle script validates package transitions; a target-environment rollback must still verify KV Store records and scheduled-search state.

# AppInspect Readiness

The distributable app lives under `splunk_app/compliance_control_plane`. The repository root is not itself the package because development tooling and tests must not ship with the Splunk app.

Package the app with:

```bash
tools/package_app.sh
```

Install the pinned release validator in an isolated environment:

```bash
python3 -m venv /tmp/compliance-appinspect-venv
/tmp/compliance-appinspect-venv/bin/pip install splunk-appinspect==4.3.0
```

Run the local checks:

```bash
/tmp/compliance-appinspect-venv/bin/splunk-appinspect inspect dist/compliance_control_plane-0.3.25.tgz --included-tags packaging_standards
/tmp/compliance-appinspect-venv/bin/splunk-appinspect inspect dist/compliance_control_plane-0.3.25.tgz --included-tags cloud
```

The cloud-tag run is the release gate. The AppInspect API is the authoritative final validation because it includes the current cloud checks and dynamic validation. AppInspect 4.3.0 currently reports zero errors, failures, and future failures for this package. Its two warnings are expected: SplunkJS telemetry and the intentional use of `collections.conf`. Do not include `local/`, credentials, hidden files, development dependencies, or unrelated repository files in the package.

Repository validation also runs automatically in GitHub Actions. The workflow verifies the content contract, tests, JavaScript syntax, XML views, package contents, and package hygiene on every push and pull request. AppInspect remains a separate release gate because its checks are maintained by Splunk and may change independently of the repository.

The app intentionally starts without custom Python, custom REST handlers, scripted inputs, alert actions, or third-party frontend libraries. Those features can be added behind a clear need and independently validated.

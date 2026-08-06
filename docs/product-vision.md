# Product Vision

Compliance Control Plane should be the system of record for an audit decision, not another dashboard collection.

## The auditor's question

For every requirement, an auditor needs to answer five questions quickly:

1. What system, business boundary, or service is in scope?
2. What exactly is the requirement asking the organization to do?
3. What proves the control operates, rather than merely exists on paper?
4. Who reviewed the result, when is it valid, and what exceptions apply?
5. If it does not pass, who owns the fix, what is the due date, and how will it be retested?

The app should make these answers visible without requiring SPL, framework expertise, or knowledge of Splunk's internal data model.

## The compliance owner's workflow

The primary workflow is a small loop:

1. Define the audit boundary and register the systems, services, data, owners, and criticality that make the boundary meaningful.
2. Select the authoritative framework packs that apply to the organization.
3. Review each requirement's implementation path, verification route, expected evidence, and common gaps.
4. Record an assessment decision tied to the exact framework version, content digest, scope, system, reviewer, validity period, and evidence.
5. Attach evidence with a source, owner, collector, review date, expiration, and limitation.
6. Convert every Partial or Fail into owned remediation with a due date and retest.
7. Produce a fixed-period audit package that preserves passing, missing, stale, excepted, and unresolved work.

## What makes a system audit-ready

A system record should answer more than “what is this host called?” It should identify:

- the approved audit scope and inclusion rationale;
- business owner, technical owner, and evidence owner;
- system type and environment;
- criticality, data classification, and regulatory impact;
- the system description, data handled, and services supported;
- the evidence and measurements expected for that system;
- lifecycle status and the date the inventory was last reviewed.

This context lets an auditor distinguish an absent control from an incorrectly scoped system, an unavailable data source from a genuine failure, and an accepted risk from an undocumented gap.

## Product rules

- A policy is evidence of intent. It cannot prove operation by itself.
- Telemetry availability is evidence of measurement capability, not automatic proof of compliance.
- Unknown, Not assessed, stale evidence, and missing evidence remain visible and never become Pass.
- Every result carries provenance: framework version, content digest, scope, system, source, timestamp, and limitations.
- Framework packs are modular content. The workflow, storage, scoring, evidence, and remediation model stay shared.
- Historical audit decisions are immutable in meaning. New framework content must not silently rewrite an old result.
- An auditor can export a defensible package without writing a search.

## The product surface

The app should remain intentionally small:

- **Home:** what needs attention now.
- **Setup:** framework selection, audit boundaries, and system inventory.
- **Checks:** framework-aware requirement documentation and the exact path to pass.
- **Readiness:** current posture by framework, scope, and system.
- **Evidence and Findings:** evidence lifecycle and owned remediation.
- **Audit Package:** fixed-period, exportable results with provenance.
- **Measurements:** only for framework-specific technical adapters that are genuinely useful.

The success metric is not dashboard count. It is the time from “this check is failing” to “the owner understands the fix, the evidence is attached, and the auditor can verify the result.”

# Mapping Review and Approval Basis

## Decision

The current framework catalog is approved for **roll-up navigation and shared evidence discovery**, not as a set of authoritative, one-to-one control equivalences. Every generated relationship now declares its mapping type, confidence, and basis.

`approved_for_rollup` means the framework item can be grouped under the shared canonical capability for posture summaries and workflow routing. It does not mean that the organization passes the framework item, that the canonical capability is an equivalent control, or that the app replaces the framework's assessment method.

The app must keep the requirement mapping `provisional` until the framework pack contains the granularity needed for an audit decision. A reviewer can approve the relationship's scope while the requirement itself remains unapproved for a compliance conclusion.

## Framework decisions

| Framework | Current decision | Mapping scope | Why it is not an audit-level approval yet |
| --- | --- | --- | --- |
| CIS Controls v8.1 | Approved for roll-up | Control to shared capability | v8.1 has 153 safeguards and CAS measurement procedures; the pack currently stops at Control level. |
| CMMC 2.0 Level 2 | Approved for roll-up | Domain to shared capability | A domain is not a practice. Level 2 needs practice identifiers, objectives, scoring, and assessment applicability. |
| ISO/IEC 27001:2022 | Approved for contextual grouping | Annex A theme to shared capability | ISO requires ISMS clauses, risk treatment, and a Statement of Applicability. The current four rows are group summaries. |
| NIST CSF 2.0 | Approved for roll-up | Function to shared capability | CSF Functions are high-level outcomes, not a prescriptive pass/fail checklist. Profiles, tiers, and subcategories are needed. |
| NIST SP 800-53 Rev. 5 | Approved for roll-up | Family to shared capability | Families are groupings. Audit use needs controls, enhancements, baselines, tailoring, and SP 800-53A procedures. |
| OMB M-26-14 | Approved for roll-up | Memo outcome to logging capability | Agency decisions must bind to source paragraphs, the applicable LRA, Agency Logging Plan, and maturity evidence. |
| PCI DSS 4.0.1 | Approved for roll-up | Requirement theme to shared capability | Detailed requirements, subrequirements, testing procedures, scope, and ROC/SAQ path are not yet modeled. |

## Review rules

1. A mapping is **direct** only when the source item and canonical control have the same auditable subject and the source supports that relationship at the same granularity.
2. A mapping is **rollup** when it groups multiple source items or a high-level source item under a capability. Roll-ups are useful for posture and navigation but cannot independently determine pass/fail.
3. A mapping is **contextual** when the relationship depends on organizational scope, risk treatment, applicability, or a profile such as an ISO Statement of Applicability.
4. Source text, source version, and the exact clause or control identifier must be recorded before a mapping is promoted to audit-level approval.
5. Approval of a mapping never approves an organization's implementation. Implementation status requires current evidence, a defined scope, an assessor, and a review decision.

## Authoritative basis

- [CIS Controls v8.1](https://www.cisecurity.org/insights/white-papers/cis-critical-security-controls-v8-1) and the [CIS Controls Assessment Specification](https://www.cisecurity.org/controls/cis-controls-assessment-specification)
- [NIST Cybersecurity Framework 2.0 Resource and Overview Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf)
- [NIST SP 800-53 control downloads](https://csrc.nist.gov/Projects/risk-management/sp800-53-controls/downloads)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [OMB M-26-14](https://www.whitehouse.gov/wp-content/uploads/2026/05/M-26-14-Ensuring-Effective-and-Efficient-Agency-Logging-and-Network-Visibility-to-Defend-Against-Evolving-Cyber-Threats.pdf)
- [PCI DSS document library](https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss)
- [DFARS CMMC subpart](https://www.acq.osd.mil/dpap/dars/dfars/html/current/204_75.htm)

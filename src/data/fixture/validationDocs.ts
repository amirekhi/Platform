import type { Doc } from "@/domain/types";

const node = (id: string) => ({ type: "node" as const, id });

/** A validation document set for Checkout & Payments, at different stages of completion. */
export const VALIDATION_DOCS: Doc[] = [
  {
    id: "doc-val-plan-checkout",
    title: "Validation plan: Checkout & Payments",
    docType: "validation-plan",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-checkout")],
    author: "Jonas Weber",
    revision: 2,
    updatedAt: "2026-09-02T08:00:00Z",
    content: `# Validation plan: Checkout & Payments

## Scope
The Checkout & Payments system: Cart Service, Checkout Service, Payments Service and
their data stores. The payment provider itself is out of scope and is covered by its own
vendor assurance package.

## Approach
Risk-based. Assurance effort follows the risk class set in the risk assessment. High-risk
functions are verified with scripted tests; medium-risk with unscripted and exploratory
testing; low-risk by reuse of vendor and pipeline evidence.

## Deliverables
1. User requirements specification
2. Risk assessment
3. Design qualification (DQ)
4. Installation qualification (IQ)
5. Operational qualification (OQ)
6. Performance qualification (PQ)
7. Validation summary report

## Responsibilities
- **System owner:** Checkout Team
- **Quality:** approves each deliverable
- **Security:** reviews the risk assessment and PCI scope
`,
  },
  {
    id: "doc-val-urs-checkout",
    title: "User requirements specification (URS): Checkout & Payments",
    docType: "urs",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-checkout")],
    author: "Mara Lindqvist",
    revision: 3,
    updatedAt: "2026-09-10T10:30:00Z",
    content: `# User requirements specification: Checkout & Payments

| ID | Requirement | Risk |
|---|---|---|
| URS-001 | The system shall authorise and capture a payment exactly once per order. | High |
| URS-002 | The system shall re-validate prices against the catalog before taking payment. | High |
| URS-003 | Card data shall never leave the Payments Service. | High |
| URS-004 | An order event shall be published only after payment capture succeeds. | Medium |
| URS-005 | A cart shall be locked for the duration of one checkout attempt. | Medium |
| URS-006 | Every payment action shall be written to an audit log with user, time and result. | High |
| URS-007 | The checkout page shall respond within 800 ms at the 95th percentile. | Low |

## Out of scope
Provider-side fraud scoring.
`,
  },
  {
    id: "doc-val-risk-checkout",
    title: "Risk assessment: Checkout & Payments",
    docType: "risk-assessment",
    audience: ["quality", "security"],
    attachedTo: [node("sys-checkout")],
    author: "Tomás Ortega",
    revision: 1,
    updatedAt: "2026-09-12T14:00:00Z",
    content: `# Risk assessment: Checkout & Payments

Each requirement is rated by **impact** (harm if it fails) and **likelihood**, then given a
risk class that sets how much assurance it needs.

| Requirement | Impact | Likelihood | Class | Assurance |
|---|---|---|---|---|
| URS-001 | Severe | Possible | High | Scripted test |
| URS-002 | Major | Possible | High | Scripted test |
| URS-003 | Severe | Unlikely | High | Scripted test + design review |
| URS-004 | Moderate | Possible | Medium | Unscripted test |
| URS-005 | Moderate | Unlikely | Medium | Exploratory test |
| URS-006 | Major | Unlikely | High | Scripted test |
| URS-007 | Minor | Possible | Low | Pipeline evidence |
`,
  },
  {
    id: "doc-val-dq-checkout",
    title: "Design qualification report: Checkout & Payments",
    docType: "test-report",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-checkout")],
    author: "Mara Lindqvist",
    revision: 1,
    updatedAt: "2026-09-20T09:00:00Z",
    content: `# Design qualification report

The architecture overview and the Payments Service design were reviewed against URS-001 to
URS-007.

## Result
All requirements are met by the documented design. One observation: URS-006 relies on the
audit log being append-only, which is enforced by database permissions, not by the application.
This was accepted by Quality and recorded as a control.
`,
  },
  {
    id: "doc-val-iq-protocol-checkout",
    title: "IQ protocol: Checkout & Payments production",
    docType: "protocol",
    audience: ["quality", "devops"],
    attachedTo: [node("sys-checkout")],
    author: "Priya Nair",
    revision: 1,
    updatedAt: "2026-09-25T11:00:00Z",
    content: `# IQ protocol: production environment

Confirms the system is installed as designed.

| Step | Check | Expected |
|---|---|---|
| IQ-1 | Deployed image digest | Matches the approved release |
| IQ-2 | Kubernetes namespace and resource limits | As in the deployment spec |
| IQ-3 | Network policy | Only the Payments Service reaches the provider |
| IQ-4 | Secrets source | Read from the secret manager, none in the image |
| IQ-5 | Database permissions | Audit log table is insert-only |
`,
  },
  {
    id: "doc-val-iq-report-checkout",
    title: "IQ report: Checkout & Payments production",
    docType: "test-report",
    audience: ["quality", "devops"],
    attachedTo: [node("sys-checkout")],
    author: "Priya Nair",
    revision: 1,
    updatedAt: "2026-10-03T16:20:00Z",
    content: `# IQ report: production environment

Executed on 3 October 2026 against release 4.12.0.

| Step | Result | Evidence |
|---|---|---|
| IQ-1 | Pass | Image digest recorded from the cluster |
| IQ-2 | Pass | Namespace export |
| IQ-3 | Pass | Network policy export |
| IQ-4 | Pass | Secret manager access log |
| IQ-5 | Pass | Grants listing from the database |

No deviations.
`,
  },
  {
    id: "doc-val-oq-protocol-checkout",
    title: "OQ protocol: Checkout & Payments",
    docType: "protocol",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-checkout")],
    author: "Mara Lindqvist",
    revision: 2,
    updatedAt: "2026-10-22T13:10:00Z",
    content: `# OQ protocol

Confirms each function works as required across its operating range.

| Test | Requirement | Approach | Expected |
|---|---|---|---|
| OQ-1 | URS-001 | Scripted | A repeated request with the same key charges once |
| OQ-2 | URS-002 | Scripted | A changed price blocks payment |
| OQ-3 | URS-003 | Scripted | No card data in any log or event |
| OQ-4 | URS-004 | Unscripted | No event is published on a failed capture |
| OQ-5 | URS-005 | Exploratory | Two concurrent checkouts cannot both proceed |
| OQ-6 | URS-006 | Scripted | Every payment action has an audit row |
`,
  },
  {
    id: "doc-val-pq-protocol-checkout",
    title: "PQ protocol: Checkout & Payments",
    docType: "protocol",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-checkout")],
    author: "Mara Lindqvist",
    revision: 1,
    updatedAt: "2026-11-02T09:40:00Z",
    content: `# PQ protocol (draft)

Confirms the system performs reliably under real conditions.

- Run a full day of production-like load.
- Check URS-007 against the 95th percentile response time.
- Reconcile payments against the provider's settlement report.

*Acceptance criteria to be agreed with Quality.*
`,
  },
  {
    id: "doc-val-urs-catalog",
    title: "User requirements specification (URS): Product Catalog",
    docType: "urs",
    audience: ["quality", "developer"],
    attachedTo: [node("sys-catalog")],
    author: "Elena Rossi",
    revision: 1,
    updatedAt: "2026-11-05T10:00:00Z",
    content: `# User requirements specification: Product Catalog

*Early draft.*

- URS-001: Product data shall be searchable within 5 seconds of a change.
- URS-002: Prices shall be exact to two decimals.
`,
  },
];

const sys = [node("sys-checkout")];
const child = (
  id: string,
  title: string,
  author: string,
  updatedAt: string,
  content: string,
  docType: Doc["docType"] = "protocol",
): Doc => ({
  id,
  title,
  docType,
  audience: ["quality", "developer"],
  attachedTo: sys,
  author,
  revision: 1,
  updatedAt,
  content,
});

/** Documents nested under others, deviations, and a document born from a comment. */
export const NESTED_DOCS: Doc[] = [
  child(
    "doc-val-oq1-checkout",
    "OQ-1 test case: repeated request charges once",
    "Mara Lindqvist",
    "2026-10-21T10:00:00Z",
    `# OQ-1: repeated request charges once

**Requirement:** URS-001 (High risk, scripted)

1. Send a checkout request with idempotency key K.
2. Send the identical request again with key K.
3. Confirm one authorisation and one capture exist at the provider, and both responses return the same order.

**Acceptance:** exactly one charge.
`,
  ),
  child(
    "doc-val-oq3-checkout",
    "OQ-3 test case: no card data in logs or events",
    "Tomás Ortega",
    "2026-10-21T11:00:00Z",
    `# OQ-3: no card data in logs or events

**Requirement:** URS-003 (High risk, scripted)

1. Run a checkout with a test card.
2. Search all service logs and the order-events topic for the card number and CVC.

**Acceptance:** no match anywhere.

*Test data and who runs this are still to be agreed (see the open comment on the OQ protocol).*
`,
  ),
  child(
    "doc-val-oq6-checkout",
    "OQ-6 test case: every payment action has an audit row",
    "Mara Lindqvist",
    "2026-10-21T12:00:00Z",
    `# OQ-6: every payment action has an audit row

**Requirement:** URS-006 (High risk, scripted)

1. Perform authorise, capture and refund.
2. Read the audit log table.

**Acceptance:** three rows, each with user, time and result; no row can be updated or deleted.
`,
  ),
  child(
    "doc-checkout-arch-audit",
    "Checkout architecture: audit log addendum",
    "Mara Lindqvist",
    "2026-11-06T09:00:00Z",
    `# Audit log addendum

Raised from a review comment on the architecture overview (v7, Flow).

Every payment action writes one row to the audit log: user, time, action and result. The
table is insert-only, enforced by database permissions. The flow diagram will show this write
in the next revision of the overview.
`,
    "architecture",
  ),
  child(
    "doc-dev-0003-iq-evidence",
    "DEV-0003: IQ-5 evidence captured from staging",
    "Priya Nair",
    "2026-10-06T08:30:00Z",
    `# DEV-0003: IQ-5 evidence captured from staging

**Found in:** IQ report, step IQ-5 (database permissions).

The grants listing attached as evidence was taken from the staging database, not production.
The result was recorded as a pass.

## Impact
The insert-only audit log control (URS-006) is not yet shown to hold in production.

## Corrective action
Re-run IQ-5 against production, replace the evidence, and issue a new revision of the IQ
report. Owner: Platform Team. Due: 20 November 2026.
`,
    "deviation",
  ),
  child(
    "doc-dev-0001-urs-late",
    "DEV-0001: URS-006 added after DQ started",
    "Mara Lindqvist",
    "2026-09-09T09:00:00Z",
    `# DEV-0001: URS-006 added after DQ started

The audit log requirement was added during design review, after the URS had been approved.

## Resolution
URS revision 3 was issued and re-approved before DQ was signed. No other document was
affected. Closed.
`,
    "deviation",
  ),
];

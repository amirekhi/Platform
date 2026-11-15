import type {
  Control,
  DocSupport,
  Framework,
  Programme,
  Requirement,
  SupportRole,
} from "@/domain/compliance";

export const FRAMEWORKS: Framework[] = [
  {
    id: "fw-part11",
    short: "21 CFR Part 11",
    name: "Electronic records and electronic signatures",
    kind: "regulation",
    authority: "US FDA",
    version: "2003 rule",
    precedence: 100,
    summary:
      "Rules for trustworthy electronic records and signatures: validation, audit trails, and signatures bound to their record.",
  },
  {
    id: "fw-annex11",
    short: "EU Annex 11",
    name: "Computerised systems",
    kind: "regulation",
    authority: "EudraLex Vol. 4",
    version: "2011",
    precedence: 100,
    summary:
      "European expectations for validation, data integrity, audit trails and electronic signatures in regulated systems.",
  },
  {
    id: "fw-pci",
    short: "PCI DSS",
    name: "Payment Card Industry Data Security Standard",
    kind: "standard",
    authority: "PCI SSC",
    version: "4.0",
    precedence: 90,
    summary:
      "Protecting cardholder data wherever it is stored, processed or sent.",
  },
  {
    id: "fw-sox",
    short: "SOX ITGC",
    name: "Sarbanes-Oxley IT general controls",
    kind: "regulation",
    authority: "US SEC",
    version: "2002 act",
    precedence: 100,
    summary:
      "Controls over change, access and operations for systems that feed financial reporting.",
  },
  {
    id: "fw-pol",
    short: "NW-POL-001",
    name: "Northwind Software Assurance Policy",
    kind: "corporate-policy",
    authority: "Northwind Quality",
    version: "3.0",
    precedence: 50,
    summary:
      "Our own minimum for every system in scope: how we decide the level of assurance and what must exist before and after go-live.",
    derivedFrom: ["fw-part11", "fw-annex11", "fw-sox"],
  },
];

const r = (
  id: string,
  frameworkId: string,
  ref: string,
  title: string,
  needs?: SupportRole[],
  enforced = false,
): Requirement => ({ id, frameworkId, ref, title, needs, enforced });

export const REQUIREMENTS: Requirement[] = [
  r("pol-1", "fw-pol", "1", "Intended use and risk are assessed"),
  r("pol-2", "fw-pol", "2", "Requirements are specified and approved"),
  r("pol-3", "fw-pol", "3", "Design is reviewed against the requirements"),
  r("pol-4", "fw-pol", "4", "Installation is verified", [
    "defines",
    "evidences",
  ]),
  r("pol-5", "fw-pol", "5", "Functions are tested according to risk", [
    "defines",
    "evidences",
  ]),
  r("pol-6", "fw-pol", "6", "Performance is confirmed in real use", [
    "defines",
    "evidences",
  ]),
  r(
    "pol-7",
    "fw-pol",
    "7",
    "Changes are controlled and their impact assessed",
    undefined,
    true,
  ),
  r(
    "pol-8",
    "fw-pol",
    "8",
    "Access is restricted and actions are audited",
    undefined,
    true,
  ),
  r(
    "pol-9",
    "fw-pol",
    "9",
    "The validated state is reviewed periodically",
    undefined,
    true,
  ),
  r(
    "pci-35",
    "fw-pci",
    "3.5",
    "Stored card data is unreadable",
    undefined,
    true,
  ),
  r(
    "pci-64",
    "fw-pci",
    "6.4",
    "Changes to payment components are reviewed",
    undefined,
    true,
  ),
  r(
    "pci-72",
    "fw-pci",
    "7.2",
    "Access to card systems is limited",
    undefined,
    true,
  ),
  r(
    "pci-102",
    "fw-pci",
    "10.2",
    "Audit logs capture payment actions",
    undefined,
    true,
  ),
  r("sox-1", "fw-sox", "ITGC-1", "Change management", undefined, true),
  r("sox-2", "fw-sox", "ITGC-2", "Logical access", undefined, true),
  r("sox-3", "fw-sox", "ITGC-3", "Operations and backup", undefined, true),
  r("p11-a", "fw-part11", "11.10(a)", "Systems are validated", undefined, true),
  r(
    "p11-e",
    "fw-part11",
    "11.10(e)",
    "Secure, time-stamped audit trails",
    undefined,
    true,
  ),
  r(
    "p11-50",
    "fw-part11",
    "11.50",
    "Signatures show name, date and meaning",
    undefined,
    true,
  ),
  r("a11-4", "fw-annex11", "4", "Validation", undefined, true),
  r("a11-9", "fw-annex11", "9", "Audit trails", undefined, true),
  r("a11-14", "fw-annex11", "14", "Electronic signature", undefined, true),
];

export const CONTROLS: Control[] = [
  {
    id: "ctl-change-gate",
    title: "Deploy only from the pipeline after an approved test run",
    how: "The pipeline blocks a release unless tests passed and the change is linked to an approved record.",
    type: "technical",
    requirementIds: ["pol-7", "pci-64", "sox-1"],
    enforcedAt: ["pipe-checkout", "pipe-catalog"],
  },
  {
    id: "ctl-audit-log",
    title: "Insert-only audit table for payment actions",
    how: "Database permissions allow inserts only. Every payment action writes user, time and result.",
    type: "technical",
    requirementIds: ["pol-8", "pci-102", "p11-e", "a11-9"],
    enforcedAt: ["svc-payments", "env-prod"],
  },
  {
    id: "ctl-card-isolation",
    title: "Card data stays inside the Payments Service",
    how: "Only the Payments Service holds a route to the provider; card data is tokenised at the edge.",
    type: "technical",
    requirementIds: ["pci-35"],
    enforcedAt: ["svc-payments"],
  },
  {
    id: "ctl-sso",
    title: "Access only through the Identity system, by role",
    how: "No local accounts. Roles come from the directory and are reviewed each quarter.",
    type: "technical",
    requirementIds: ["pol-8", "pci-72", "sox-2"],
    enforcedAt: ["sys-identity"],
  },
  {
    id: "ctl-esign",
    title: "Signatures re-authenticate and bind to the content hash",
    how: "Signing needs a fresh credential check; the signature stores the hash of what was signed.",
    type: "technical",
    requirementIds: ["p11-50", "a11-14"],
    enforcedAt: [],
  },
  {
    id: "ctl-periodic",
    title: "Annual periodic review of each validated system",
    how: "The system owner and Quality confirm the validated state still holds.",
    type: "procedural",
    requirementIds: ["pol-9", "p11-a", "a11-4"],
    enforcedAt: [],
  },
];

export const PROGRAMMES: Programme[] = [
  {
    id: "prog-checkout",
    nodeId: "sys-checkout",
    approach: "CSA",
    risk: "high",
    frameworkIds: ["fw-pol", "fw-pci"],
    planDocId: "doc-val-plan-checkout",
  },
  {
    id: "prog-catalog",
    nodeId: "sys-catalog",
    approach: "CSA",
    risk: "medium",
    frameworkIds: ["fw-pol"],
  },
  {
    id: "prog-erp",
    nodeId: "sys-erp",
    approach: "CSV",
    risk: "high",
    frameworkIds: ["fw-pol", "fw-sox"],
  },
  {
    id: "prog-wms",
    nodeId: "sys-wms",
    approach: "CSV",
    risk: "medium",
    frameworkIds: ["fw-pol", "fw-annex11"],
  },
];

const s = (
  requirementId: string,
  docId: string,
  role: SupportRole = "defines",
): DocSupport => ({ programmeId: "prog-checkout", requirementId, docId, role });

export const SUPPORTS: DocSupport[] = [
  s("pol-1", "doc-val-risk-checkout"),
  s("pol-2", "doc-val-urs-checkout"),
  s("pol-3", "doc-val-dq-checkout"),
  s("pol-4", "doc-val-iq-protocol-checkout"),
  s("pol-4", "doc-val-iq-report-checkout", "evidences"),
  s("pol-5", "doc-val-oq-protocol-checkout"),
  s("pol-6", "doc-val-pq-protocol-checkout"),
  s("pol-8", "doc-checkout-arch-audit"),
  s("pci-35", "doc-pci-scope"),
  s("pci-102", "doc-checkout-arch-audit"),
  {
    programmeId: "prog-catalog",
    requirementId: "pol-2",
    docId: "doc-val-urs-catalog",
    role: "defines",
  },
];

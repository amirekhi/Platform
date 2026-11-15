import type {
  DeviationInfo,
  DocComment,
  DocLink,
  DocRecord,
  DocSignature,
  DocStatus,
  DocVersion,
  QualificationStage,
  SignatureMeaning,
} from "@/domain/documents";
import type { Doc, Id } from "@/domain/types";
import { sha256 } from "@/lib/sha256";
import { DOCS } from "./docs";
import { NESTED_DOCS, VALIDATION_DOCS } from "./validationDocs";

/** [meaning, name, role, ISO time, options] */
type Sign = [
  SignatureMeaning,
  string,
  string,
  string,
  { weak?: boolean; signedOther?: string }?,
];

interface VersionSpec {
  revision: number;
  status?: DocStatus;
  author: string;
  at: string;
  summary: string;
  /** Text of this version when it is not the current one. */
  content?: string;
  sign?: Sign[];
}

interface Spec {
  key: string;
  status: DocStatus;
  stage?: QualificationStage;
  /** Newest first. */
  versions: VersionSpec[];
  comments?: (Omit<DocComment, "resolved"> & { resolved?: boolean })[];
  links?: DocLink[];
  parentId?: Id;
  order?: number;
  deviation?: DeviationInfo;
}

const SPECS: Record<string, Spec> = {
  "doc-checkout-arch": {
    key: "ARCH-0007",
    status: "effective",
    versions: [
      {
        revision: 7,
        author: "Mara Lindqvist",
        at: "2026-10-28T09:14:00Z",
        summary: "Added the lock-for-the-duration rule for carts.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-10-28T09:14:00Z"],
          [
            "reviewer",
            "Priya Nair",
            "Platform engineer",
            "2026-10-28T15:02:00Z",
          ],
          [
            "approver",
            "Elena Rossi",
            "Head of engineering",
            "2026-10-29T08:30:00Z",
          ],
        ],
      },
      {
        revision: 6,
        author: "Mara Lindqvist",
        at: "2026-08-14T12:00:00Z",
        summary:
          "Payments Service is now the only component with provider access.",
        content: `# Checkout architecture overview

The checkout system turns a cart into a paid order.

## Components

- **Cart Service** keeps carts in Redis.
- **Checkout Service** orchestrates validation, payment and order creation.
- **Payments Service** talks to the payment provider.

## Rules

1. Prices are always re-validated against the catalog before payment.
2. \`OrderPlaced\` is only published after payment capture succeeds.
`,
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-08-14T12:00:00Z"],
          [
            "approver",
            "Elena Rossi",
            "Head of engineering",
            "2026-08-15T09:00:00Z",
          ],
        ],
      },
      {
        revision: 5,
        author: "Jonas Weber",
        at: "2026-06-02T10:00:00Z",
        summary: "First version with the flow diagram.",
      },
    ],
    comments: [
      {
        id: "c1",
        revision: 7,
        section: "Rules",
        author: "Priya Nair",
        at: "2026-10-28T14:40:00Z",
        text: "Rule 1 should say how long a lock lasts. Is it the TTL in the cart service?",
        resolved: true,
      },
      {
        id: "c2",
        revision: 7,
        section: "Rules",
        parentId: "c1",
        author: "Mara Lindqvist",
        at: "2026-10-28T14:55:00Z",
        text: "Yes, 10 minutes. Added to the runbook; kept out of here on purpose.",
        resolved: true,
      },
      {
        id: "c3",
        revision: 7,
        section: "Flow",
        author: "Tomás Ortega",
        at: "2026-11-04T09:12:00Z",
        text: "The diagram does not show the audit log write (URS-006). Please add it in the next revision.",
        resolved: false,
        needsDoc: true,
        documentedBy: "doc-checkout-arch-audit",
      },
    ],
    links: [
      { type: "references", targetDocId: "doc-val-urs-checkout" },
      { type: "references", targetDocId: "doc-adr-idempotent-payments" },
    ],
  },
  "doc-adr-idempotent-payments": {
    key: "ADR-0014",
    status: "effective",
    versions: [
      {
        revision: 3,
        author: "Mara Lindqvist",
        at: "2026-09-30T11:00:00Z",
        summary: "Clarified key lifetime. Edited after approval.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-09-30T11:00:00Z"],
          [
            "reviewer",
            "Priya Nair",
            "Platform engineer",
            "2026-09-30T13:00:00Z",
            { weak: true },
          ],
          [
            "approver",
            "Elena Rossi",
            "Head of engineering",
            "2026-09-18T09:00:00Z",
            { signedOther: "an earlier text of this decision" },
          ],
        ],
      },
      {
        revision: 2,
        author: "Mara Lindqvist",
        at: "2026-09-16T10:00:00Z",
        summary: "Accepted.",
      },
    ],
    comments: [],
    links: [{ type: "satisfies", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-plan-checkout": {
    key: "VAL-VP-0001",
    status: "effective",
    versions: [
      {
        revision: 2,
        author: "Jonas Weber",
        at: "2026-09-02T08:00:00Z",
        summary: "Added PQ. Provider is out of scope.",
        sign: [
          ["author", "Jonas Weber", "Quality engineer", "2026-09-02T08:00:00Z"],
          ["reviewer", "Tomás Ortega", "Security lead", "2026-09-02T14:20:00Z"],
          [
            "approver",
            "Elena Rossi",
            "Head of engineering",
            "2026-09-03T09:10:00Z",
          ],
          ["qa", "Dana Whitfield", "Head of quality", "2026-09-03T16:00:00Z"],
        ],
      },
      {
        revision: 1,
        author: "Jonas Weber",
        at: "2026-08-20T08:00:00Z",
        summary: "First version.",
      },
    ],
    comments: [],
    links: [],
  },
  "doc-val-urs-checkout": {
    key: "VAL-URS-0003",
    status: "effective",
    versions: [
      {
        revision: 3,
        author: "Mara Lindqvist",
        at: "2026-09-10T10:30:00Z",
        summary: "Added URS-006 (audit log) after DQ review.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-09-10T10:30:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-09-10T15:00:00Z",
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-09-11T09:00:00Z",
          ],
        ],
      },
      {
        revision: 2,
        author: "Mara Lindqvist",
        at: "2026-08-28T10:00:00Z",
        summary: "Split URS-001 into authorise and capture.",
      },
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-08-22T10:00:00Z",
        summary: "First version.",
      },
    ],
    comments: [
      {
        id: "c1",
        revision: 3,
        author: "Jonas Weber",
        at: "2026-09-10T12:00:00Z",
        text: "URS-007 is a performance target, not a function. Fine to keep as Low, but PQ needs to cover it.",
        resolved: true,
      },
    ],
    links: [],
  },
  "doc-val-risk-checkout": {
    key: "VAL-RA-0001",
    status: "effective",
    versions: [
      {
        revision: 1,
        author: "Tomás Ortega",
        at: "2026-09-12T14:00:00Z",
        summary: "First version.",
        sign: [
          ["author", "Tomás Ortega", "Security lead", "2026-09-12T14:00:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-09-13T09:30:00Z",
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-09-13T16:45:00Z",
          ],
        ],
      },
    ],
    comments: [],
    links: [{ type: "references", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-dq-checkout": {
    key: "VAL-DQ-0001",
    status: "effective",
    stage: "DQ",
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-09-20T09:00:00Z",
        summary: "First version.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-09-20T09:00:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-09-20T14:00:00Z",
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-09-21T09:20:00Z",
          ],
        ],
      },
    ],
    comments: [],
    links: [
      { type: "satisfies", targetDocId: "doc-val-urs-checkout" },
      { type: "references", targetDocId: "doc-checkout-arch" },
    ],
  },
  "doc-val-iq-protocol-checkout": {
    key: "VAL-IQP-0001",
    status: "effective",
    stage: "IQ",
    versions: [
      {
        revision: 1,
        author: "Priya Nair",
        at: "2026-09-25T11:00:00Z",
        summary: "First version.",
        sign: [
          ["author", "Priya Nair", "Platform engineer", "2026-09-25T11:00:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-09-25T15:00:00Z",
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-09-26T08:50:00Z",
          ],
        ],
      },
    ],
    comments: [],
    links: [{ type: "satisfies", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-iq-report-checkout": {
    key: "VAL-IQR-0001",
    status: "effective",
    stage: "IQ",
    versions: [
      {
        revision: 1,
        author: "Priya Nair",
        at: "2026-10-03T16:20:00Z",
        summary: "Executed against release 4.12.0.",
        sign: [
          ["author", "Priya Nair", "Platform engineer", "2026-10-03T16:20:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-10-04T09:00:00Z",
            { weak: true },
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-10-05T10:10:00Z",
          ],
        ],
      },
    ],
    comments: [],
    links: [{ type: "evidences", targetDocId: "doc-val-iq-protocol-checkout" }],
  },
  "doc-val-oq-protocol-checkout": {
    key: "VAL-OQP-0001",
    status: "in_review",
    stage: "OQ",
    versions: [
      {
        revision: 2,
        author: "Mara Lindqvist",
        at: "2026-10-22T13:10:00Z",
        summary: "Moved OQ-5 to exploratory testing, per the risk class.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-10-22T13:10:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-10-23T10:00:00Z",
          ],
        ],
      },
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-10-10T09:00:00Z",
        summary: "First version. All tests scripted.",
      },
    ],
    comments: [
      {
        id: "c1",
        revision: 2,
        author: "Dana Whitfield",
        at: "2026-10-24T08:40:00Z",
        text: "Please state who runs OQ-3 and with what test data before I approve.",
        resolved: false,
        needsDoc: true,
      },
    ],
    links: [{ type: "satisfies", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-pq-protocol-checkout": {
    key: "VAL-PQP-0001",
    status: "draft",
    stage: "PQ",
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-11-02T09:40:00Z",
        summary: "First draft.",
      },
    ],
    comments: [],
    links: [{ type: "satisfies", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-urs-catalog": {
    key: "VAL-URS-0007",
    status: "draft",
    versions: [
      {
        revision: 1,
        author: "Elena Rossi",
        at: "2026-11-05T10:00:00Z",
        summary: "Early draft.",
      },
    ],
    comments: [],
    links: [],
  },
  "doc-val-oq1-checkout": {
    key: "VAL-OQP-0001-01",
    status: "in_review",
    stage: "OQ",
    parentId: "doc-val-oq-protocol-checkout",
    order: 1,
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-10-21T10:00:00Z",
        summary: "First version.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-10-21T10:00:00Z"],
        ],
      },
    ],
    links: [{ type: "satisfies", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-val-oq3-checkout": {
    key: "VAL-OQP-0001-03",
    status: "draft",
    stage: "OQ",
    parentId: "doc-val-oq-protocol-checkout",
    order: 3,
    versions: [
      {
        revision: 1,
        author: "Tomás Ortega",
        at: "2026-10-21T11:00:00Z",
        summary: "First draft. Test data to be agreed.",
      },
    ],
  },
  "doc-val-oq6-checkout": {
    key: "VAL-OQP-0001-06",
    status: "in_review",
    stage: "OQ",
    parentId: "doc-val-oq-protocol-checkout",
    order: 6,
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-10-21T12:00:00Z",
        summary: "First version.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-10-21T12:00:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-10-23T10:05:00Z",
          ],
        ],
      },
    ],
  },
  "doc-checkout-arch-audit": {
    key: "ARCH-0007-A1",
    status: "draft",
    parentId: "doc-checkout-arch",
    order: 1,
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-11-06T09:00:00Z",
        summary: "Created from a review comment.",
      },
    ],
  },
  "doc-dev-0003-iq-evidence": {
    key: "DEV-0003",
    status: "in_review",
    stage: "IQ",
    versions: [
      {
        revision: 1,
        author: "Priya Nair",
        at: "2026-10-06T08:30:00Z",
        summary: "Raised.",
        sign: [
          ["author", "Priya Nair", "Platform engineer", "2026-10-06T08:30:00Z"],
        ],
      },
    ],
    deviation: {
      raisedAgainst: {
        docId: "doc-val-iq-report-checkout",
        revision: 1,
        section: "IQ-5",
      },
      severity: "major",
      status: "capa",
      openedAt: "2026-10-06T08:30:00Z",
    },
    links: [{ type: "references", targetDocId: "doc-val-urs-checkout" }],
  },
  "doc-dev-0001-urs-late": {
    key: "DEV-0001",
    status: "effective",
    versions: [
      {
        revision: 1,
        author: "Mara Lindqvist",
        at: "2026-09-09T09:00:00Z",
        summary: "Raised and closed.",
        sign: [
          ["author", "Mara Lindqvist", "Tech lead", "2026-09-09T09:00:00Z"],
          [
            "reviewer",
            "Jonas Weber",
            "Quality engineer",
            "2026-09-10T08:00:00Z",
          ],
          [
            "approver",
            "Dana Whitfield",
            "Head of quality",
            "2026-09-11T09:30:00Z",
          ],
        ],
      },
    ],
    deviation: {
      raisedAgainst: {
        docId: "doc-val-urs-checkout",
        revision: 2,
        section: "URS-006",
      },
      severity: "minor",
      status: "closed",
      openedAt: "2026-09-09T09:00:00Z",
      closedAt: "2026-09-11T09:30:00Z",
    },
  },
};

function build(doc: Doc, spec: Spec): DocRecord {
  const versions: DocVersion[] = spec.versions.map((v, i) => {
    const current = i === 0;
    const text = current ? doc.content : v.content;
    const contentHash = text ? sha256(text) : sha256(`${doc.id}@${v.revision}`);
    const signatures: DocSignature[] = (v.sign ?? []).map(
      ([meaning, signerName, role, at, o]) => ({
        meaning,
        signerName,
        role,
        at,
        reauthenticated: !o?.weak,
        signedHash: o?.signedOther ? sha256(o.signedOther) : contentHash,
      }),
    );
    return {
      revision: v.revision,
      status: current ? spec.status : (v.status ?? "superseded"),
      author: v.author,
      at: v.at,
      summary: v.summary,
      contentHash,
      content: current ? undefined : v.content,
      signatures,
    };
  });
  return {
    key: spec.key,
    status: spec.status,
    stage: spec.stage,
    versions,
    comments: (spec.comments ?? []).map((c): DocComment => ({
      ...c,
      resolved: c.resolved ?? false,
    })),
    links: spec.links ?? [],
    parentId: spec.parentId,
    order: spec.order,
    deviation: spec.deviation,
  };
}

/** All fixture documents, with their records attached. */
export const ALL_DOCS: Doc[] = [
  ...DOCS,
  ...VALIDATION_DOCS,
  ...NESTED_DOCS,
].map((d) => {
  const spec = SPECS[d.id];
  return spec ? { ...d, record: build(d, spec) } : d;
});

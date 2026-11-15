import type { Id } from "./types";

/**
 * Controlled-document model.
 *
 * A document has one identity and many immutable versions. Only the status and the
 * signatures of a version change over its life; its content never does. Editing means a new
 * version. Signatures are bound to the exact content hash of the version they were made on,
 * so a change after signing is detectable.
 */

export type DocStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "effective"
  | "superseded"
  | "obsolete";

export const DOC_STATUS: Record<
  DocStatus,
  { label: string; color: string; hint: string }
> = {
  draft: {
    label: "Draft",
    color: "#94a3b8",
    hint: "Being written. Not yet reviewed.",
  },
  in_review: {
    label: "In review",
    color: "#f59e0b",
    hint: "Waiting for reviewers or approvers to sign.",
  },
  approved: {
    label: "Approved",
    color: "#38bdf8",
    hint: "Signed off, but not yet in force.",
  },
  effective: {
    label: "Effective",
    color: "#22c55e",
    hint: "Approved and in force. This is the version to follow.",
  },
  superseded: {
    label: "Superseded",
    color: "#a78bfa",
    hint: "Replaced by a newer version. Kept for history.",
  },
  obsolete: {
    label: "Obsolete",
    color: "#64748b",
    hint: "Withdrawn. Do not use.",
  },
};

/** What a signer is saying when they sign. */
export type SignatureMeaning = "author" | "reviewer" | "approver" | "qa";

export const SIGNATURE_MEANING: Record<SignatureMeaning, string> = {
  author: "Authored",
  reviewer: "Reviewed",
  approver: "Approved",
  qa: "Quality assured",
};

export interface DocSignature {
  meaning: SignatureMeaning;
  signerName: string;
  /** The signer's role at the time of signing. */
  role: string;
  at: string; // ISO
  /** The signer re-entered their credentials to sign (not just a logged-in session). */
  reauthenticated: boolean;
  /** SHA-256 of the content that was signed. */
  signedHash: string;
}

export interface DocVersion {
  revision: number;
  status: DocStatus;
  author: string;
  at: string; // ISO
  summary: string;
  /** SHA-256 of this version's content. */
  contentHash: string;
  /** Present only where the old text is available (the current text is on the Doc itself). */
  content?: string;
  signatures: DocSignature[];
}

export interface DocComment {
  id: Id;
  /** The revision the comment was made on. */
  revision: number;
  /** Heading the comment is anchored to, when it is about one section. */
  section?: string;
  parentId?: Id;
  author: string;
  at: string; // ISO
  text: string;
  resolved: boolean;
  /** The note raises something that must itself be documented. */
  needsDoc?: boolean;
  /** The document that now covers it. Once set, the note is no longer open work. */
  documentedBy?: Id;
}

/** How one document relates to another. Documents about documents are first-class. */
export type DocLinkType =
  | "references"
  | "satisfies"
  | "evidences"
  | "supersedes"
  | "reviews";

export const DOC_LINK: Record<DocLinkType, { label: string; inverse: string }> =
  {
    references: { label: "References", inverse: "Referenced by" },
    satisfies: { label: "Satisfies", inverse: "Satisfied by" },
    evidences: { label: "Provides evidence for", inverse: "Evidenced by" },
    supersedes: { label: "Supersedes", inverse: "Superseded by" },
    reviews: { label: "Reviews", inverse: "Reviewed in" },
  };

export interface DocLink {
  type: DocLinkType;
  targetDocId: Id;
}

/** Which qualification stage a protocol or report belongs to. */
export type QualificationStage = "DQ" | "IQ" | "OQ" | "PQ";

export type DeviationSeverity = "minor" | "major" | "critical";
export type DeviationStatus = "open" | "investigating" | "capa" | "closed";

export const DEVIATION_STATUS: Record<
  DeviationStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "#ef4444" },
  investigating: { label: "Investigating", color: "#f59e0b" },
  capa: { label: "Corrective action", color: "#f59e0b" },
  closed: { label: "Closed", color: "#22c55e" },
};

/** A deviation is itself a document. This is what ties it to the one it was found against. */
export interface DeviationInfo {
  raisedAgainst: { docId: Id; revision: number; section?: string };
  severity: DeviationSeverity;
  status: DeviationStatus;
  openedAt: string; // ISO
  closedAt?: string; // ISO
}

/** Everything about a document that is not its text. */
export interface DocRecord {
  /** Controlled identifier, such as VAL-URS-0003. */
  key: string;
  status: DocStatus;
  stage?: QualificationStage;
  /** Newest first. The first entry is the current version. */
  versions: DocVersion[];
  comments: DocComment[];
  links: DocLink[];
  /** Nested under another document of the same topic. */
  parentId?: Id;
  /** Position among its siblings. */
  order?: number;
  /** Present when this document is a deviation report. */
  deviation?: DeviationInfo;
}

export type SignatureCheck = "valid" | "changed" | "weak";

/** Is this signature still good for this version? */
export function checkSignature(
  sig: DocSignature,
  v: DocVersion,
): SignatureCheck {
  if (sig.signedHash !== v.contentHash) return "changed";
  return sig.reauthenticated ? "valid" : "weak";
}

/** The roles a version still needs before it can take effect. */
export function missingSignatures(v: DocVersion): SignatureMeaning[] {
  const have = new Set(
    v.signatures
      .filter((s) => s.signedHash === v.contentHash)
      .map((s) => s.meaning),
  );
  return (["author", "reviewer", "approver"] as SignatureMeaning[]).filter(
    (m) => !have.has(m),
  );
}

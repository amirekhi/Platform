import {
  checkSignature,
  type DocSignature,
  missingSignatures,
} from "./documents";
import type { Doc, Id } from "./types";

/**
 * The compliance layer: what we must satisfy, how we meet it, where it is enforced,
 * and what proves it for each system.
 *
 *   Framework    a regulation, standard or corporate policy
 *   Requirement  one clause of a framework
 *   Control      how we meet one or more requirements, and the components that enforce it
 *   Programme    one system's assurance stance (CSV or CSA) against some frameworks
 *   DocSupport   a document that defines or evidences a requirement for a programme
 *
 * Requirements belong to frameworks, so they are the same for every system. What differs per
 * system is its programme and the documents it has gathered for each requirement.
 */

export type FrameworkKind = "regulation" | "standard" | "corporate-policy";

export const FRAMEWORK_KIND: Record<FrameworkKind, string> = {
  regulation: "Regulation",
  standard: "Standard",
  "corporate-policy": "Corporate policy",
};

export interface Framework {
  id: Id;
  short: string;
  name: string;
  kind: FrameworkKind;
  authority: string;
  version: string;
  /** Higher wins when two frameworks disagree. Used later by reconciliation. */
  precedence: number;
  summary: string;
  /** Frameworks this one is derived from, such as a policy built on regulations. */
  derivedFrom?: Id[];
}

export interface Requirement {
  id: Id;
  frameworkId: Id;
  ref: string;
  title: string;
  /** Needs a control that is enforced somewhere (not just documents). */
  enforced?: boolean;
  /** Roles a document must play for this requirement to count as met. Default: defines. */
  needs?: SupportRole[];
}

export type SupportRole = "defines" | "evidences";

export const SUPPORT_ROLE: Record<SupportRole, string> = {
  defines: "Defines the approach",
  evidences: "Shows it was done",
};

export interface Control {
  id: Id;
  title: string;
  how: string;
  type: "technical" | "procedural";
  requirementIds: Id[];
  /** Components that enforce it. Empty means nothing enforces it yet. */
  enforcedAt: Id[];
}

export type Approach = "CSV" | "CSA";

export interface Programme {
  id: Id;
  /** The system this stance applies to. */
  nodeId: Id;
  approach: Approach;
  risk: "high" | "medium" | "low";
  frameworkIds: Id[];
  planDocId?: Id;
}

export interface DocSupport {
  programmeId: Id;
  requirementId: Id;
  docId: Id;
  role: SupportRole;
}

export interface ComplianceModel {
  frameworks: Framework[];
  requirements: Requirement[];
  controls: Control[];
  programmes: Programme[];
  supports: DocSupport[];
  /** Every document referenced by a support, so solidity can be worked out. */
  docs: Doc[];
}

/* ---------------- How solid is it? ---------------- */

/** The ladder. A higher level needs more of the right evidence. */
export type Solidity = 0 | 1 | 2 | 3;

export const SOLIDITY: Record<
  Solidity,
  { label: string; color: string; hint: string }
> = {
  0: {
    label: "None",
    color: "#ef4444",
    hint: "No document supports this yet.",
  },
  1: {
    label: "Claimed",
    color: "#f59e0b",
    hint: "A document exists but it is a draft, or its signatures are not good.",
  },
  2: {
    label: "In review",
    color: "#38bdf8",
    hint: "Written and being reviewed, or held back by an open deviation.",
  },
  3: {
    label: "Approved",
    color: "#22c55e",
    hint: "Approved and in force, with every signature valid.",
  },
};

export interface DocAssessment {
  docId: Id;
  role: SupportRole;
  level: Solidity;
  reasons: string[];
}

export interface RequirementAssessment {
  requirementId: Id;
  level: Solidity;
  docs: DocAssessment[];
  /** Roles still without any document. */
  missing: SupportRole[];
  /** Plain-language reasons the level is not higher. */
  reasons: string[];
}

function sigProblems(
  sigs: DocSignature[],
  v: Parameters<typeof checkSignature>[1],
) {
  return {
    changed: sigs.filter((s) => checkSignature(s, v) === "changed").length,
    weak: sigs.filter((s) => checkSignature(s, v) === "weak").length,
  };
}

/** One document's contribution. Explains every step down from "Approved". */
export function assessDoc(
  doc: Doc,
  role: SupportRole,
  deviationsOpen: number,
): DocAssessment {
  const rec = doc.record;
  const reasons: string[] = [];
  if (!rec) {
    return {
      docId: doc.id,
      role,
      level: 1,
      reasons: ["Not a controlled document: no status or signatures."],
    };
  }
  const v = rec.versions[0];
  const { changed, weak } = sigProblems(v.signatures, v);
  const missing = missingSignatures(v);
  let level: Solidity;
  if (rec.status === "draft") {
    level = 1;
    reasons.push("Still a draft.");
  } else if (rec.status === "in_review") {
    level = 2;
    if (missing.length) reasons.push(`Awaiting: ${missing.join(", ")}.`);
  } else if (rec.status === "effective" || rec.status === "approved") {
    level = 3;
  } else {
    level = 0;
    reasons.push(`The document is ${rec.status}.`);
  }
  if (changed) {
    level = Math.min(level, 1) as Solidity;
    reasons.push("Text changed after it was signed.");
  }
  if (level === 3 && missing.length) {
    level = 1;
    reasons.push(`Marked effective but missing: ${missing.join(", ")}.`);
  }
  if (weak) reasons.push("A signer did not re-authenticate.");
  if (deviationsOpen) {
    level = Math.min(level, 2) as Solidity;
    reasons.push(
      `${deviationsOpen} open deviation${deviationsOpen > 1 ? "s" : ""}.`,
    );
  }
  return { docId: doc.id, role, level, reasons };
}

/** A requirement for one programme: the weakest of what it needs. */
export function assessRequirement(
  req: Requirement,
  programmeId: Id,
  model: ComplianceModel,
  openDeviations: (docId: Id) => number,
): RequirementAssessment {
  const docsById = new Map(model.docs.map((d) => [d.id, d]));
  const here = model.supports.filter(
    (s) => s.programmeId === programmeId && s.requirementId === req.id,
  );
  const docs = here
    .map((s) => {
      const d = docsById.get(s.docId);
      return d ? assessDoc(d, s.role, openDeviations(d.id)) : null;
    })
    .filter((x): x is DocAssessment => x !== null);
  const needs = req.needs ?? ["defines"];
  const missing: SupportRole[] = [];
  let level: Solidity = 3;
  const reasons: string[] = [];
  for (const role of needs) {
    const best = docs
      .filter((d) => d.role === role)
      .sort((a, b) => b.level - a.level)[0];
    if (!best) {
      missing.push(role);
      level = 0;
      reasons.push(`No document ${SUPPORT_ROLE[role].toLowerCase()}.`);
    } else {
      level = Math.min(level, best.level) as Solidity;
      if (best.level < 3) reasons.push(...best.reasons);
    }
  }
  return { requirementId: req.id, level, docs, missing, reasons };
}

export interface ProgrammeAssessment {
  programmeId: Id;
  items: { req: Requirement; a: RequirementAssessment }[];
  counts: Record<Solidity, number>;
  total: number;
}

export function assessProgramme(
  p: Programme,
  model: ComplianceModel,
  openDeviations: (docId: Id) => number,
): ProgrammeAssessment {
  const items = model.requirements
    .filter((r) => p.frameworkIds.includes(r.frameworkId))
    .map((req) => ({
      req,
      a: assessRequirement(req, p.id, model, openDeviations),
    }));
  const counts: Record<Solidity, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const i of items) counts[i.a.level]++;
  return { programmeId: p.id, items, counts, total: items.length };
}

/** Number of open deviations raised against a document. */
export function deviationCounter(docs: Doc[]): (docId: Id) => number {
  const m = new Map<Id, number>();
  for (const d of docs) {
    const dev = d.record?.deviation;
    if (dev && dev.status !== "closed")
      m.set(dev.raisedAgainst.docId, (m.get(dev.raisedAgainst.docId) ?? 0) + 1);
  }
  return (id) => m.get(id) ?? 0;
}

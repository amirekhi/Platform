import {
  ancestorsOf,
  type GraphSnapshot,
  withDescendants,
} from "./analysis/snapshot";
import type { ComplianceModel, Programme } from "./compliance";
import type { Id } from "./types";

/**
 * Which systems are in scope for CSV or CSA, and why.
 *
 * Validation exists because a business process is computerised. A process is regulated when it
 * says so (props.regulated, a "; " separated list of frameworks) or sits inside a regulated
 * process. Whatever supports a regulated process is in scope: the target of the `supported_by`
 * relation, everything inside it, and everything that contains it.
 */

export interface InScope {
  /** The regulated processes that put it in scope. */
  processIds: Id[];
  /** The frameworks those processes answer to. */
  frameworks: string[];
}

const frameworksOf = (raw: unknown): string[] =>
  typeof raw === "string"
    ? raw
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** Frameworks a process answers to: its own plus those of the processes around it. */
export function processFrameworks(snap: GraphSnapshot, procId: Id): string[] {
  const out = new Set<string>();
  for (const id of [procId, ...ancestorsOf(snap, procId)]) {
    const n = snap.nodes.get(id);
    if (n?.kind === "process")
      for (const f of frameworksOf(n.props.regulated)) out.add(f);
  }
  return [...out];
}

const cache = new WeakMap<GraphSnapshot, Map<Id, InScope>>();

export function computeScope(snap: GraphSnapshot): Map<Id, InScope> {
  const hit = cache.get(snap);
  if (hit) return hit;
  const out = new Map<Id, InScope>();
  for (const p of snap.nodes.values()) {
    if (p.kind !== "process") continue;
    const fws = processFrameworks(snap, p.id);
    if (!fws.length) continue;
    for (const rel of snap.outgoing.get(p.id) ?? []) {
      if (rel.type !== "supported_by") continue;
      const touched = new Set([
        ...withDescendants(snap, rel.targetId),
        ...ancestorsOf(snap, rel.targetId),
      ]);
      for (const id of touched) {
        const e = out.get(id) ?? { processIds: [], frameworks: [] };
        if (!e.processIds.includes(p.id)) e.processIds.push(p.id);
        for (const f of fws)
          if (!e.frameworks.includes(f)) e.frameworks.push(f);
        out.set(id, e);
      }
    }
  }
  cache.set(snap, out);
  return out;
}

/** The programme that covers a node: its own, or the nearest one on the way up. */
export function programmeFor(
  snap: GraphSnapshot,
  model: ComplianceModel,
  id: Id,
): Programme | undefined {
  for (const x of [id, ...ancestorsOf(snap, id)]) {
    const p = model.programmes.find((q) => q.nodeId === x);
    if (p) return p;
  }
  return undefined;
}

/** Everything that runs something: used by the business map. */
export function supportingNodes(snap: GraphSnapshot): Set<Id> {
  const out = new Set<Id>();
  for (const r of snap.relations.values()) {
    if (r.type !== "supported_by") continue;
    for (const id of withDescendants(snap, r.targetId)) out.add(id);
    for (const id of ancestorsOf(snap, r.targetId)) out.add(id);
  }
  return out;
}

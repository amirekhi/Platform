import type { GraphNode, Id, Relation } from "../types";

/**
 * An immutable, indexed copy of the graph at one moment.
 *
 * All analysis (blast radius, path trace, and later the governance checks) is written as
 * pure functions over a snapshot, never over the live data source or the UI. That is what
 * lets a proposal be evaluated before it exists: build a snapshot, apply the proposed
 * ChangeSet to get a second snapshot, run the same analysis on both and compare.
 */
export interface GraphSnapshot {
  /** Identifies the state this was built from (a revision, a timestamp, or "proposal:<id>"). */
  version: string;
  nodes: ReadonlyMap<Id, GraphNode>;
  relations: ReadonlyMap<Id, Relation>;
  /** Relations by the node they start at / end at. */
  outgoing: ReadonlyMap<Id, readonly Relation[]>;
  incoming: ReadonlyMap<Id, readonly Relation[]>;
  children: ReadonlyMap<Id, readonly Id[]>;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const l = m.get(k);
  if (l) l.push(v);
  else m.set(k, [v]);
}

export function buildSnapshot(
  nodes: Iterable<GraphNode>,
  relations: Iterable<Relation>,
  version: string,
): GraphSnapshot {
  const n = new Map<Id, GraphNode>();
  const r = new Map<Id, Relation>();
  const outgoing = new Map<Id, Relation[]>();
  const incoming = new Map<Id, Relation[]>();
  const children = new Map<Id, Id[]>();
  for (const x of nodes) n.set(x.id, x);
  for (const x of n.values()) if (x.parentId) push(children, x.parentId, x.id);
  for (const x of relations) {
    // A relation to a node that is not there (for example removed by a proposal) is dropped.
    if (!n.has(x.sourceId) || !n.has(x.targetId)) continue;
    r.set(x.id, x);
    push(outgoing, x.sourceId, x);
    push(incoming, x.targetId, x);
  }
  return { version, nodes: n, relations: r, outgoing, incoming, children };
}

/** A proposed edit to the graph. Small on purpose; governance will grow it. */
export interface ChangeSet {
  addNodes?: GraphNode[];
  removeNodeIds?: Id[];
  addRelations?: Relation[];
  removeRelationIds?: Id[];
}

/** A new snapshot with the changes applied. The original is untouched. */
export function applyChanges(
  base: GraphSnapshot,
  changes: ChangeSet,
  version: string,
): GraphSnapshot {
  const gone = new Set(changes.removeNodeIds ?? []);
  const goneRel = new Set(changes.removeRelationIds ?? []);
  const nodes = [...base.nodes.values()].filter((x) => !gone.has(x.id));
  nodes.push(...(changes.addNodes ?? []));
  const relations = [...base.relations.values()].filter(
    (x) => !goneRel.has(x.id),
  );
  relations.push(...(changes.addRelations ?? []));
  return buildSnapshot(nodes, relations, version);
}

export function ancestorsOf(snap: GraphSnapshot, id: Id): Id[] {
  const out: Id[] = [];
  let cur = snap.nodes.get(id);
  while (cur?.parentId) {
    out.push(cur.parentId);
    cur = snap.nodes.get(cur.parentId);
  }
  return out;
}

/** The node and everything inside it. */
export function withDescendants(snap: GraphSnapshot, id: Id): Set<Id> {
  const out = new Set<Id>();
  const stack = [id];
  while (stack.length) {
    const x = stack.pop()!;
    if (out.has(x)) continue;
    out.add(x);
    for (const c of snap.children.get(x) ?? []) stack.push(c);
  }
  return out;
}

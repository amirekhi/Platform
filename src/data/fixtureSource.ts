import MiniSearch, { type SearchResult } from "minisearch";
import { NODE_KINDS, RELATION_TYPES } from "@/domain/registry";
import type {
  Diagram,
  Doc,
  DocTarget,
  GraphNode,
  GraphView,
  Health,
  Id,
  MonitoringSnapshot,
  NodeDetails,
  NodeKind,
  NodeView,
  Relation,
  RelationView,
  SearchHit,
  SearchOptions,
} from "@/domain/types";
import { type DataSource, type ScopeQuery, targetKey } from "./datasource";
import { DIAGRAMS } from "./fixture/diagrams";
import { DOCS } from "./fixture/docs";
import { buildMonitoring } from "./fixture/monitoring";
import { NODES } from "./fixture/nodes";
import { RELATIONS } from "./fixture/relations";

const HEALTH_RANK: Record<Health, number> = { unknown: 0, healthy: 1, degraded: 2, down: 3 };

interface IndexDoc {
  key: string;
  type: "node" | "relation" | "doc";
  refId: string;
  title: string;
  body: string;
  tags: string;
  meta: string;
  kind?: string;
}

/** In-memory implementation backed by static fixtures. */
export class FixtureDataSource implements DataSource {
  private nodes = new Map<Id, GraphNode>();
  private relations = new Map<Id, Relation>();
  private children = new Map<Id, Id[]>();
  private relsBySource = new Map<Id, Relation[]>();
  private relsByTarget = new Map<Id, Relation[]>();
  private docs = new Map<Id, Doc>();
  private docsByTarget = new Map<string, Doc[]>();
  private diagramsByTarget = new Map<string, Diagram[]>();
  private monitoring = new Map<Id, MonitoringSnapshot | null>();
  private index: MiniSearch<IndexDoc>;
  private indexDocs = new Map<string, IndexDoc>();

  constructor() {
    for (const n of NODES) this.nodes.set(n.id, n);
    for (const n of NODES) {
      if (n.parentId) {
        const list = this.children.get(n.parentId) ?? [];
        list.push(n.id);
        this.children.set(n.parentId, list);
      }
    }
    for (const r of RELATIONS) {
      this.relations.set(r.id, r);
      push(this.relsBySource, r.sourceId, r);
      push(this.relsByTarget, r.targetId, r);
    }
    for (const d of DOCS) {
      this.docs.set(d.id, d);
      for (const t of d.attachedTo) push(this.docsByTarget, targetKey(t), d);
    }
    for (const dg of DIAGRAMS) {
      for (const t of dg.attachedTo) push(this.diagramsByTarget, targetKey(t), dg);
    }
    for (const n of NODES) this.monitoring.set(n.id, buildMonitoring(n));

    this.index = new MiniSearch<IndexDoc>({
      idField: "key",
      fields: ["title", "body", "tags", "meta"],
      storeFields: ["type", "refId", "title", "kind"],
      searchOptions: {
        boost: { title: 4, tags: 2, meta: 1.5 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
    this.buildIndex();
  }

  /* ---------------- Nodes ---------------- */

  async getNode(id: Id) {
    return this.nodes.get(id);
  }

  async getRootNodes() {
    return NODES.filter((n) => n.parentId === null);
  }

  async getNodesByKind(kind: NodeKind) {
    return NODES.filter((n) => n.kind === kind);
  }

  async getChildren(id: Id) {
    return (this.children.get(id) ?? []).map((c) => this.nodes.get(c)!).filter(Boolean);
  }

  async getAncestors(id: Id) {
    const chain: GraphNode[] = [];
    let cur = this.nodes.get(id);
    while (cur?.parentId) {
      const p = this.nodes.get(cur.parentId);
      if (!p) break;
      chain.unshift(p);
      cur = p;
    }
    return chain;
  }

  /* ---------------- Relations ---------------- */

  async getRelation(id: Id) {
    return this.relations.get(id);
  }

  async getRelationsOf(nodeId: Id) {
    return [...(this.relsBySource.get(nodeId) ?? []), ...(this.relsByTarget.get(nodeId) ?? [])];
  }

  /* ---------------- Scoped views ---------------- */

  async getContents(id: Id | null) {
    return this.contentsOf(id);
  }

  private contentsOf(id: Id | null): GraphNode[] {
    if (id === null) return NODES.filter((n) => n.parentId === null);
    const node = this.nodes.get(id);
    if (!node) return [];
    if (node.kind === "team") {
      // A team "contains" what it owns, at the highest level it owns it.
      return NODES.filter((n) => {
        if (n.ownerId !== id) return false;
        const parent = n.parentId ? this.nodes.get(n.parentId) : undefined;
        return !parent || parent.ownerId !== id;
      });
    }
    return (this.children.get(id) ?? []).map((c) => this.nodes.get(c)!).filter(Boolean);
  }

  /** Ids connected to a node by a relation, in either direction. */
  private relationNeighbours(id: Id, hidden: Set<string>): Id[] {
    const out = new Set<Id>();
    for (const r of this.relsBySource.get(id) ?? []) if (!hidden.has(r.type)) out.add(r.targetId);
    for (const r of this.relsByTarget.get(id) ?? []) if (!hidden.has(r.type)) out.add(r.sourceId);
    out.delete(id);
    return [...out];
  }

  private subtreeCache = new Map<Id, Set<Id>>();
  /** A node and everything contained in it, at any depth. */
  private subtree(id: Id): Set<Id> {
    let set = this.subtreeCache.get(id);
    if (set) return set;
    set = new Set<Id>([id]);
    for (const c of this.children.get(id) ?? []) for (const d of this.subtree(c)) set.add(d);
    this.subtreeCache.set(id, set);
    return set;
  }

  /**
   * Nodes related to `id` only through what it contains. The counterpart is the ancestor of
   * the far node at the same depth as `id` (or the far node itself if it is shallower), so a
   * system is matched with systems and a service with services.
   */
  private liftedCounterparts(id: Id, hidden: Set<string>): Id[] {
    const sub = this.subtree(id);
    const own = this.chainOf(id);
    const depth = own.length - 1;
    const out = new Set<Id>();
    for (const d of sub) {
      if (d === id) continue;
      for (const r of [...(this.relsBySource.get(d) ?? []), ...(this.relsByTarget.get(d) ?? [])]) {
        if (hidden.has(r.type)) continue;
        const other = r.sourceId === d ? r.targetId : r.sourceId;
        if (sub.has(other)) continue;
        const oc = this.chainOf(other);
        const cp = oc[Math.min(depth, oc.length - 1)];
        if (!cp || own.includes(cp) || sub.has(cp)) continue;
        out.add(cp);
      }
    }
    return [...out];
  }

  /** Direct neighbours, plus (optionally) those reached through contents. */
  private neighboursOf(id: Id, hidden: Set<string>, lifted: boolean): Id[] {
    const direct = this.relationNeighbours(id, hidden);
    if (!lifted) return direct;
    return [...new Set([...direct, ...this.liftedCounterparts(id, hidden)])];
  }

  /** Containment chain from the top-most ancestor down to the node itself. */
  private chainOf(id: Id): Id[] {
    const chain: Id[] = [];
    let cur = this.nodes.get(id);
    while (cur) {
      chain.unshift(cur.id);
      cur = cur.parentId ? this.nodes.get(cur.parentId) : undefined;
    }
    return chain;
  }

  async getScopeView(q: ScopeQuery): Promise<GraphView> {
    const MAX_AROUND = 60;
    const MAX_GHOSTS = 14;
    const hidden = new Set<string>(q.hiddenRelationTypes ?? []);
    const showContainment = q.showContainment ?? true;
    const showLifted = q.showLifted ?? true;
    const rootId = q.rootId;

    /* 1. Decide which nodes are "members" of this view. */
    let members: Id[] = [];
    let truncated = 0;
    if (q.mode === "inside") {
      members = this.contentsOf(rootId).map((n) => n.id);
    } else if (rootId && this.nodes.has(rootId)) {
      const dist = new Map<Id, number>([[rootId, 0]]);
      const queue: Id[] = [rootId];
      while (queue.length) {
        const cur = queue.shift()!;
        const d = dist.get(cur)!;
        if (d >= Math.max(1, q.radius)) continue;
        for (const nb of this.neighboursOf(cur, hidden, showLifted)) {
          if (!dist.has(nb)) {
            dist.set(nb, d + 1);
            queue.push(nb);
          }
        }
      }
      // Stacked expansions: each expanded node pulls in its own neighbours.
      for (const ex of q.expandedIds ?? []) {
        if (!dist.has(ex)) continue;
        for (const nb of this.neighboursOf(ex, hidden, showLifted)) if (!dist.has(nb)) dist.set(nb, (dist.get(ex) ?? 0) + 1);
      }
      members = [...dist.keys()];
      const cap = MAX_AROUND + 12 * (q.expandedIds?.length ?? 0);
      if (members.length > cap) {
        truncated = members.length - cap;
        members = members.slice(0, cap);
      }
    }
    // Nodes opened in place bring their contents into the same view, nested inside them.
    const openSet = new Set<Id>(q.openIds ?? []);
    const containerOf = new Map<Id, Id>();
    const have = new Set<Id>(members);
    const addContents = (id: Id, depth: number) => {
      if (depth > 3) return;
      for (const c of this.contentsOf(id)) {
        if (have.has(c.id)) continue;
        have.add(c.id);
        members.push(c.id);
        containerOf.set(c.id, id);
        if (openSet.has(c.id)) addContents(c.id, depth + 1);
      }
    };
    for (const id of [...members]) if (openSet.has(id)) addContents(id, 1);
    const memberSet = new Set(members);

    /* 2. Ghosts: outside nodes the contents connect to (inside mode only). */
    const ghostSet = new Set<Id>();
    const expanded = new Set<Id>((q.expandedIds ?? []).filter((id) => memberSet.has(id)));
    if (q.mode === "inside" && (q.showExternal || expanded.size > 0) && rootId && this.nodes.get(rootId)?.kind !== "team") {
      const rootChain = this.chainOf(rootId);
      const maxGhosts = MAX_GHOSTS + 8 * expanded.size;
      for (const r of RELATIONS) {
        if (hidden.has(r.type)) continue;
        const ls = this.liftTo(r.sourceId, memberSet);
        const lt = this.liftTo(r.targetId, memberSet);
        const sIn = ls !== undefined;
        const tIn = lt !== undefined;
        if (sIn === tIn) continue;
        // Without "Outside links", only expanded nodes reveal their outside neighbours.
        if (!q.showExternal && !expanded.has((sIn ? ls : lt) as Id)) continue;
        const outside = sIn ? r.targetId : r.sourceId;
        const oc = this.chainOf(outside);
        let i = 0;
        while (i < rootChain.length && i < oc.length && rootChain[i] === oc[i]) i++;
        if (i >= oc.length) continue; // outside endpoint is an ancestor of the root
        if (i >= rootChain.length) continue; // endpoint lives inside the root
        const ghost = oc[i];
        if (ghost !== rootId && !memberSet.has(ghost) && ghostSet.size < maxGhosts) ghostSet.add(ghost);
      }
    }
    const visible = new Set<Id>([...memberSet, ...ghostSet]);

    /* 3. Direct relations between visible nodes. */
    const relations: RelationView[] = [];
    const directPairs = new Set<string>();
    const seen = new Set<Id>();
    for (const id of visible) {
      for (const r of this.relsBySource.get(id) ?? []) {
        if (seen.has(r.id) || hidden.has(r.type) || !visible.has(r.targetId)) continue;
        if (ghostSet.has(r.sourceId) && ghostSet.has(r.targetId)) continue;
        seen.add(r.id);
        directPairs.add(`${r.sourceId}>${r.targetId}`);
        relations.push({ ...r, docCount: (this.docsByTarget.get(`relation:${r.id}`) ?? []).length });
      }
    }

    /* 4. Lift relations between deeper nodes up to the visible level (inside mode). */
    if (q.mode === "inside" || showLifted) {
      const lifted = new Map<string, { s: Id; t: Id; via: Relation[] }>();
      for (const r of RELATIONS) {
        if (hidden.has(r.type) || seen.has(r.id)) continue;
        const ls = this.liftTo(r.sourceId, visible);
        const lt = this.liftTo(r.targetId, visible);
        if (!ls || !lt || ls === lt) continue;
        if (ghostSet.has(ls) && ghostSet.has(lt)) continue;
        if (directPairs.has(`${ls}>${lt}`)) continue;
        const key = `${ls}>${lt}`;
        const entry = lifted.get(key) ?? { s: ls, t: lt, via: [] };
        entry.via.push(r);
        lifted.set(key, entry);
      }
      for (const { s, t, via } of lifted.values()) {
        const types = new Set(via.map((v) => v.type));
        const type = types.size === 1 ? via[0].type : "depends_on";
        relations.push({
          id: `derived|${s}|${t}|${via.map((v) => v.id).join(",")}`,
          type,
          sourceId: s,
          targetId: t,
          name: via.length === 1 ? via[0].name : `${via.length} relations`,
          description: "Lifted from relations between nodes inside these components.",
          lifecycle: "active",
          props: {},
          docCount: 0,
          derived: true,
          viaIds: via.map((v) => v.id),
        });
      }
    }

    /* 5. Containment lines between visible members. */
    const containment: GraphView["containment"] = [];
    if (showContainment) {
      for (const id of memberSet) {
        const n = this.nodes.get(id)!;
        if (n.parentId && memberSet.has(n.parentId) && containerOf.get(id) !== n.parentId) containment.push({ parentId: n.parentId, childId: id });
      }
    }

    /* 6. Node view models. */
    const covered = (nbId: Id) =>
      q.mode === "inside" ? this.liftTo(nbId, visible) !== undefined : visible.has(nbId);
    const ordered = [...members, ...ghostSet];
    const nodes: NodeView[] = ordered.map((id) => {
      const n = this.nodes.get(id)!;
      let externalCount = 0;
      for (const nb of this.neighboursOf(id, hidden, showLifted && q.mode === "around")) if (!covered(nb)) externalCount++;
      return {
        ...n,
        role: ghostSet.has(id) ? "ghost" : q.mode === "around" && id === rootId ? "root" : "member",
        health: this.healthOf(n),
        childCount: this.contentsOf(id).length,
        externalCount: ghostSet.has(id) ? 0 : externalCount,
        details: this.detailsOf(n),
        containerId: containerOf.get(id) ?? null,
        open: openSet.has(id) && memberSet.has(id) && this.contentsOf(id).length > 0,
      };
    });
    return { nodes, relations, containment, truncated };
  }

  /** Nearest ancestor-or-self of `id` that is in `set`. */
  private liftTo(id: Id, set: Set<Id>): Id | undefined {
    let cur = this.nodes.get(id);
    while (cur) {
      if (set.has(cur.id)) return cur.id;
      cur = cur.parentId ? this.nodes.get(cur.parentId) : undefined;
    }
    return undefined;
  }

  private detailsOf(n: GraphNode): NodeDetails {
    const mon = this.monitoring.get(n.id) ?? null;
    const head = mon?.metrics[0];
    const owner = n.ownerId ? this.nodes.get(n.ownerId) : undefined;
    return {
      properties: Object.keys(n.props).length,
      docs: (this.docsByTarget.get(`node:${n.id}`) ?? []).length,
      diagrams: (this.diagramsByTarget.get(`node:${n.id}`) ?? []).length,
      relations: (this.relsBySource.get(n.id)?.length ?? 0) + (this.relsByTarget.get(n.id)?.length ?? 0),
      monitoring: mon
        ? {
            health: mon.health,
            alerts: mon.alerts.length,
            headline: head ? { label: head.label, value: head.current, unit: head.unit } : undefined,
          }
        : null,
      owner: owner ? { id: owner.id, name: owner.name } : null,
    };
  }

  private healthOf(n: GraphNode): Health {
    const snap = this.monitoring.get(n.id);
    if (snap) return snap.health;
    // Anything that contains other nodes rolls up the worst health inside it.
    let worst: Health = "unknown";
    const stack = [...(this.children.get(n.id) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      const s = this.monitoring.get(id);
      if (s && HEALTH_RANK[s.health] > HEALTH_RANK[worst]) worst = s.health;
      stack.push(...(this.children.get(id) ?? []));
    }
    return worst;
  }

  /* ---------------- Docs, diagrams, monitoring ---------------- */

  async getDocsFor(target: DocTarget) {
    return [...(this.docsByTarget.get(targetKey(target)) ?? [])].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async getDoc(id: Id) {
    return this.docs.get(id);
  }

  async getDiagramsFor(target: DocTarget) {
    return this.diagramsByTarget.get(targetKey(target)) ?? [];
  }

  async getDocCounts(targets: DocTarget[]) {
    const out: Record<string, number> = {};
    for (const t of targets) out[targetKey(t)] = (this.docsByTarget.get(targetKey(t)) ?? []).length;
    return out;
  }

  async getMonitoring(nodeId: Id) {
    return this.monitoring.get(nodeId) ?? null;
  }

  /* ---------------- Search ---------------- */

  private buildIndex() {
    const docs: IndexDoc[] = [];
    const nameOf = (id: Id) => this.nodes.get(id)?.name ?? id;

    for (const n of NODES) {
      const kind = NODE_KINDS[n.kind];
      const path = this.pathOf(n).join(" ");
      docs.push({
        key: `node:${n.id}`,
        type: "node",
        refId: n.id,
        title: n.name,
        body: `${n.summary} ${Object.values(n.props).join(" ")}`,
        tags: n.tags.join(" "),
        meta: `${kind.label} ${path} ${n.ownerId ? nameOf(n.ownerId) : ""} ${n.lifecycle} ${n.external ? "external" : ""}`,
        kind: n.kind,
      });
    }
    for (const r of RELATIONS) {
      const def = RELATION_TYPES[r.type];
      docs.push({
        key: `relation:${r.id}`,
        type: "relation",
        refId: r.id,
        title: r.name ?? `${nameOf(r.sourceId)} ${def.label} ${nameOf(r.targetId)}`,
        body: `${r.description ?? ""} ${Object.values(r.props).join(" ")}`,
        tags: r.type.replace(/_/g, " "),
        meta: `${nameOf(r.sourceId)} ${def.label} ${nameOf(r.targetId)} relation`,
      });
    }
    for (const d of DOCS) {
      docs.push({
        key: `doc:${d.id}`,
        type: "doc",
        refId: d.id,
        title: d.title,
        body: d.content.replace(/[#*`|>_-]/g, " "),
        tags: `${d.docType} ${d.audience.join(" ")}`,
        meta: d.attachedTo.map((t) => this.targetName(t)).join(" ") + ` ${d.author}`,
      });
    }
    for (const d of docs) this.indexDocs.set(d.key, d);
    this.index.addAll(docs);
  }

  private pathOf(n: GraphNode): string[] {
    const out: string[] = [];
    let cur: GraphNode | undefined = n;
    while (cur) {
      out.unshift(cur.name);
      cur = cur.parentId ? this.nodes.get(cur.parentId) : undefined;
    }
    return out;
  }

  private targetName(t: DocTarget): string {
    if (t.type === "node") return this.nodes.get(t.id)?.name ?? t.id;
    const r = this.relations.get(t.id);
    if (!r) return t.id;
    return r.name ?? `${this.nodes.get(r.sourceId)?.name} ${RELATION_TYPES[r.type].label} ${this.nodes.get(r.targetId)?.name}`;
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const types = opts.types?.length ? new Set(opts.types) : null;
    const kinds = opts.kinds?.length ? new Set<string>(opts.kinds) : null;
    // Choosing a node kind narrows the results to nodes of that kind.
    const filter = (r: SearchResult) => {
      if (types && !types.has(r.type)) return false;
      if (kinds && !(r.type === "node" && kinds.has(r.kind as string))) return false;
      return true;
    };

    let results = this.index.search(q, { combineWith: "AND", filter });
    if (results.length === 0) results = this.index.search(q, { combineWith: "OR", filter });

    const limit = opts.limit ?? 30;
    const hits: SearchHit[] = [];
    for (const res of results.slice(0, limit)) {
      const idx = this.indexDocs.get(res.id as string)!;
      hits.push(this.toHit(idx, res.score, res.terms));
    }
    return hits;
  }

  private toHit(idx: IndexDoc, score: number, terms: string[]): SearchHit {
    if (idx.type === "node") {
      const n = this.nodes.get(idx.refId)!;
      const kind = NODE_KINDS[n.kind];
      const anc = this.pathOf(n).slice(0, -1);
      return {
        key: idx.key,
        type: "node",
        id: n.id,
        title: n.name,
        subtitle: [kind.label, ...(anc.length ? [anc.join(" › ")] : [])].join(" · "),
        snippet: n.summary,
        kind: n.kind,
        anchorNodeId: n.id,
        score,
        terms,
      };
    }
    if (idx.type === "relation") {
      const r = this.relations.get(idx.refId)!;
      const def = RELATION_TYPES[r.type];
      const s = this.nodes.get(r.sourceId)?.name;
      const t = this.nodes.get(r.targetId)?.name;
      return {
        key: idx.key,
        type: "relation",
        id: r.id,
        title: r.name ?? `${s} ${def.label} ${t}`,
        subtitle: `Relation · ${s} ${def.label} ${t}`,
        snippet: r.description,
        relationType: r.type,
        anchorNodeId: r.sourceId,
        score,
        terms,
      };
    }
    const d = this.docs.get(idx.refId)!;
    const first = d.attachedTo[0];
    const anchor = first.type === "node" ? first.id : this.relations.get(first.id)!.sourceId;
    return {
      key: idx.key,
      type: "doc",
      id: d.id,
      title: d.title,
      subtitle: `Document · ${d.docType} · ${d.attachedTo.map((t) => this.targetName(t)).join(", ")}`,
      snippet: snippetFor(d.content, terms),
      docType: d.docType,
      anchorNodeId: anchor,
      score,
      terms,
    };
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function snippetFor(content: string, terms: string[]): string {
  const plain = content.replace(/```[\s\S]*?```/g, " ").replace(/[#*`>|]/g, " ").replace(/\s+/g, " ").trim();
  const lower = plain.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    pos = lower.indexOf(t.toLowerCase());
    if (pos >= 0) break;
  }
  if (pos < 0) return plain.slice(0, 140);
  const start = Math.max(0, pos - 50);
  return (start > 0 ? "…" : "") + plain.slice(start, start + 150) + "…";
}

import type {
  Diagram,
  Doc,
  DocTarget,
  GraphNode,
  GraphView,
  Id,
  MonitoringSnapshot,
  NodeKind,
  Relation,
  RelationType,
  SearchHit,
  ScopeMode,
  SearchOptions,
} from "@/domain/types";

export interface ScopeQuery {
  /** Null with mode "inside" is the landscape (everything at the top of the enterprise). */
  rootId: Id | null;
  mode: ScopeMode;
  /** Relation hops to include in "around" mode. */
  radius: number;
  hiddenRelationTypes?: RelationType[];
  showContainment?: boolean;
  /** Also follow relations that only exist between what nodes contain (default true). */
  showLifted?: boolean;
  /** In "inside" mode, also draw the outside nodes the contents connect to. */
  showExternal?: boolean;
  /**
   * Nodes the user expanded in place. Each adds its relation neighbours to the
   * view. Expansions stack: opening one never closes another.
   */
  expandedIds?: Id[];
  /** Nodes opened in place: they show their contents inside themselves, without changing level. */
  openIds?: Id[];
}

/**
 * The single seam between the UI and wherever the data lives.
 *
 * The prototype ships a fixture implementation. Replacing it with a MongoDB
 * backed implementation (via route handlers / server actions) must not
 * require changes in any component. Everything is async on purpose.
 */
export interface DataSource {
  getNode(id: Id): Promise<GraphNode | undefined>;
  getRootNodes(): Promise<GraphNode[]>;
  getNodesByKind(kind: NodeKind): Promise<GraphNode[]>;
  getChildren(id: Id): Promise<GraphNode[]>;
  getAncestors(id: Id): Promise<GraphNode[]>;

  getRelation(id: Id): Promise<Relation | undefined>;
  /** All relations touching a node, in either direction. */
  getRelationsOf(nodeId: Id): Promise<Relation[]>;

  /** What "going inside" a node shows: its children (owned nodes for a team). */
  getContents(id: Id | null): Promise<GraphNode[]>;
  /** Everything the canvas needs to draw one scoped view. */
  getScopeView(query: ScopeQuery): Promise<GraphView>;

  getDocsFor(target: DocTarget): Promise<Doc[]>;
  getDoc(id: Id): Promise<Doc | undefined>;
  getDiagramsFor(target: DocTarget): Promise<Diagram[]>;
  getDocCounts(targets: DocTarget[]): Promise<Record<string, number>>;

  getMonitoring(nodeId: Id): Promise<MonitoringSnapshot | null>;

  search(query: string, opts?: SearchOptions): Promise<SearchHit[]>;
}

export function targetKey(t: DocTarget): string {
  return `${t.type}:${t.id}`;
}

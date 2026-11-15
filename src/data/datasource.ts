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

import type {
  ComplianceModel,
  Control,
  Framework,
  Programme,
  Requirement,
  SupportRole,
} from "@/domain/compliance";
import type { DocLinkType } from "@/domain/documents";
import type { GraphSnapshot } from "@/domain/analysis";

/** Where a document sits among others of the same topic. */
export interface DocSupportView {
  programme: Programme;
  system?: GraphNode;
  framework: Framework;
  requirement: Requirement;
  role: SupportRole;
  /** Controls that meet this requirement, with the components that enforce each. */
  controls: { control: Control; nodes: GraphNode[] }[];
}

export interface DocFamily {
  parent?: Doc;
  /** Nested under this document, in order. */
  children: Doc[];
  /** Deviation reports raised against this document. */
  deviations: Doc[];
}

export interface LinkedDoc {
  type: DocLinkType;
  /** "out": this document links to it. "in": it links to this document. */
  direction: "out" | "in";
  doc: Doc;
}

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
  /** Documents this one links to and documents that link to it, with the direction. */
  getLinkedDocs(id: Id): Promise<LinkedDoc[]>;
  /** Parent, nested documents and deviations of a document. */
  getDocFamily(id: Id): Promise<DocFamily>;
  /** Frameworks, requirements, controls, programmes and the documents that support them. */
  getCompliance(): Promise<ComplianceModel>;
  /** What a document is gathered for: programme, requirement, and where it is enforced. */
  getDocSupports(docId: Id): Promise<DocSupportView[]>;
  getDiagramsFor(target: DocTarget): Promise<Diagram[]>;
  getDocCounts(targets: DocTarget[]): Promise<Record<string, number>>;

  /**
   * The whole graph as an immutable, indexed snapshot, for analysis that is not about one view
   * (blast radius, path trace, and later proposal validation). Cheap to call repeatedly.
   */
  getSnapshot(): Promise<GraphSnapshot>;

  getMonitoring(nodeId: Id): Promise<MonitoringSnapshot | null>;

  search(query: string, opts?: SearchOptions): Promise<SearchHit[]>;
}

export function targetKey(t: DocTarget): string {
  return `${t.type}:${t.id}`;
}

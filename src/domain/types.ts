/**
 * Core domain types for the graph-first model.
 *
 * Everything modelled is a GraphNode. Nodes are connected by Relations
 * (one big relations collection) and nested by containment (parentId).
 * Documents and diagrams attach to nodes OR relations.
 */

export type Id = string;

export type NodeKind =
  | "system"
  | "ui-app"
  | "service"
  | "api"
  | "library"
  | "database"
  | "table"
  | "cache"
  | "queue"
  | "repository"
  | "pipeline"
  | "image"
  | "deployment"
  | "environment"
  | "cluster"
  | "server"
  | "observability"
  | "dashboard"
  | "external"
  | "team"
  | "company"
  | "department"
  | "building"
  | "store"
  | "warehouse"
  | "stock"
  | "datacenter"
  | "rack"
  | "hardware"
  | "network";

export type RelationType =
  | "depends_on"
  | "calls"
  | "exposes"
  | "reads_from"
  | "writes_to"
  | "publishes_to"
  | "consumes_from"
  | "integrates_with"
  | "references"
  | "implemented_in"
  | "triggers"
  | "produces"
  | "runs"
  | "deployment_of"
  | "deployed_to"
  | "runs_on"
  | "hosted_on"
  | "monitors"
  | "serves"
  | "supplies"
  | "tracks"
  | "connects_to";

export type Lifecycle =
  | "proposed"
  | "registered"
  | "provisioned"
  | "active"
  | "deprecated"
  | "retired";

export type Health = "healthy" | "degraded" | "down" | "unknown";

export type PropValue = string | number | boolean;

export interface GraphNode {
  id: Id;
  kind: NodeKind;
  name: string;
  summary: string;
  /** Containment (ownership tree). Null for top-level nodes. */
  parentId: Id | null;
  lifecycle: Lifecycle;
  external: boolean;
  ownerId?: Id; // a team node
  tags: string[];
  props: Record<string, PropValue>;
}

/** A first-class edge. Lives in a single relations collection. */
export interface Relation {
  id: Id;
  type: RelationType;
  sourceId: Id;
  targetId: Id;
  /** Optional human name, e.g. "Payment authorisation". */
  name?: string;
  description?: string;
  lifecycle: Lifecycle;
  props: Record<string, PropValue>;
}

export type TargetType = "node" | "relation";

export interface DocTarget {
  type: TargetType;
  id: Id;
}

export type DocType =
  | "architecture"
  | "adr"
  | "runbook"
  | "user-guide"
  | "contract"
  | "onboarding"
  | "reference";

export interface Doc {
  id: Id;
  title: string;
  docType: DocType;
  audience: string[];
  /** Markdown. ```mermaid fences are rendered as diagrams. */
  content: string;
  /**
   * What the document is attached to. A document owned by a relation is only
   * surfaced from that relation (and from search), not from the two nodes.
   */
  attachedTo: DocTarget[];
  author: string;
  revision: number;
  updatedAt: string; // ISO
}

export interface Diagram {
  id: Id;
  title: string;
  mermaid: string;
  attachedTo: DocTarget[];
}

export interface Metric {
  key: string;
  label: string;
  unit: string;
  current: number;
  /** Thirty most recent points, oldest first. */
  series: number[];
  /** Value above (or below, if `invert`) which the metric is unhealthy. */
  threshold?: number;
  invert?: boolean;
}

export interface Alert {
  id: Id;
  severity: "info" | "warning" | "critical";
  title: string;
  since: string; // ISO
}

export interface MonitoringSnapshot {
  nodeId: Id;
  health: Health;
  metrics: Metric[];
  alerts: Alert[];
  links: { label: string; url: string }[];
  observedAt: string; // ISO
}

/* ---------- View models returned by the data source ---------- */

/**
 * How a view is scoped.
 * - around: a node and the nodes within `radius` relation hops of it (same level).
 * - inside: the contents of a node (one level down). A null root is the landscape.
 */
export type ScopeMode = "around" | "inside";

/** The role a node plays in the current view. */
export type ViewRole = "root" | "member" | "ghost";

/** Everything a node can show in place without changing level. */
export interface NodeDetails {
  properties: number;
  docs: number;
  diagrams: number;
  relations: number;
  monitoring: {
    health: Health;
    alerts: number;
    headline?: { label: string; value: number; unit: string };
  } | null;
  owner: { id: Id; name: string } | null;
}

export interface NodeView extends GraphNode {
  role: ViewRole;
  health: Health;
  /** Number of nodes inside this one (children, or owned nodes for a team). */
  childCount: number;
  /** Nodes with a problem (degraded or down) in this node, itself included. */
  alertCount: number;
  /** Connections to nodes that are not represented in this view. */
  externalCount: number;
  details: NodeDetails;
  /** When opened in place, the node whose box this node sits inside. */
  containerId: Id | null;
  /** True when this node is opened in place and shows its contents inside itself. */
  open: boolean;
}

export interface RelationView extends Relation {
  docCount: number;
  /** True for an edge lifted from relations between deeper nodes. */
  derived?: boolean;
  /** Underlying relation ids when derived or merged. */
  viaIds?: Id[];
  /** How many underlying relations this line stands for (1 when it is a single relation). */
  count?: number;
  /** Merged line whose relations are of different kinds. */
  mixed?: boolean;
  /** Relation ids folded into a merged line. */
  memberIds?: Id[];
}

export interface GraphView {
  nodes: NodeView[];
  relations: RelationView[];
  containment: { parentId: Id; childId: Id }[];
  /** Nodes left out because the view hit its size cap. */
  truncated: number;
}

export type SearchResultType = "node" | "relation" | "doc";

export interface SearchHit {
  key: string;
  type: SearchResultType;
  id: Id;
  title: string;
  subtitle: string;
  snippet?: string;
  kind?: NodeKind;
  relationType?: RelationType;
  docType?: DocType;
  /** Node to centre a tab on when the hit is opened. */
  anchorNodeId: Id;
  score: number;
  terms: string[];
}

export interface SearchOptions {
  types?: SearchResultType[];
  kinds?: NodeKind[];
  limit?: number;
}

import type { Lifecycle, NodeKind, RelationType } from "./types";

/**
 * Layers give every kind a vertical position. The 2D canvas ignores them
 * (it may group by them); the optional 3D mode will use them as the Z axis.
 */
export type Layer =
  | "organisation"
  | "party"
  | "process"
  | "business"
  | "application"
  | "data"
  | "delivery"
  | "infrastructure"
  | "physical"
  | "external";

export const LAYERS: { id: Layer; label: string; order: number }[] = [
  { id: "organisation", label: "Organisation", order: 0 },
  { id: "party", label: "Clients & roles", order: 1 },
  { id: "process", label: "Business processes", order: 2 },
  { id: "business", label: "Business systems", order: 3 },
  { id: "application", label: "Applications & services", order: 4 },
  { id: "data", label: "Data", order: 5 },
  { id: "delivery", label: "Delivery", order: 6 },
  { id: "infrastructure", label: "Infrastructure", order: 7 },
  { id: "physical", label: "Physical & hardware", order: 8 },
  { id: "external", label: "External", order: 9 },
];

/** Silhouette drawn for a kind (see components/shapes.tsx). */
export type ShapeId =
  | "square"
  | "window"
  | "hexagon"
  | "ticket"
  | "book"
  | "cylinder"
  | "grid"
  | "diamond"
  | "homeplate"
  | "folder"
  | "chevron"
  | "box"
  | "trapezoid"
  | "cloud"
  | "stack"
  | "rackunit"
  | "arch"
  | "tiles"
  | "octagon"
  | "shield"
  | "tower"
  | "notched"
  | "house"
  | "awning"
  | "barn"
  | "crate"
  | "datacenter"
  | "rack"
  | "chassis"
  | "switch"
  | "process"
  | "person"
  | "badge"
  | "vm";

export interface KindDef {
  label: string;
  plural: string;
  color: string;
  layer: Layer;
  icon: string; // key into icon map (components/icons.tsx)
  monitorable: boolean;
  shape: ShapeId;
}

export const NODE_KINDS: Record<NodeKind, KindDef> = {
  system: {
    label: "System",
    plural: "Systems",
    color: "#8b7cf6",
    layer: "business",
    icon: "layers",
    monitorable: false,
    shape: "square",
  },
  "ui-app": {
    label: "UI app",
    plural: "UI apps",
    color: "#38bdf8",
    layer: "application",
    icon: "app",
    monitorable: true,
    shape: "window",
  },
  service: {
    label: "Service",
    plural: "Services",
    color: "#34d399",
    layer: "application",
    icon: "box",
    monitorable: true,
    shape: "hexagon",
  },
  api: {
    label: "API",
    plural: "APIs",
    color: "#2dd4bf",
    layer: "application",
    icon: "plug",
    monitorable: true,
    shape: "ticket",
  },
  library: {
    label: "Library",
    plural: "Libraries",
    color: "#a3e635",
    layer: "application",
    icon: "library",
    monitorable: false,
    shape: "book",
  },
  database: {
    label: "Database",
    plural: "Databases",
    color: "#fbbf24",
    layer: "data",
    icon: "database",
    monitorable: true,
    shape: "cylinder",
  },
  table: {
    label: "Table / collection",
    plural: "Tables",
    color: "#fcd34d",
    layer: "data",
    icon: "table",
    monitorable: false,
    shape: "grid",
  },
  cache: {
    label: "Cache",
    plural: "Caches",
    color: "#fb923c",
    layer: "data",
    icon: "zap",
    monitorable: true,
    shape: "diamond",
  },
  queue: {
    label: "Queue / topic",
    plural: "Queues",
    color: "#f472b6",
    layer: "data",
    icon: "queue",
    monitorable: true,
    shape: "homeplate",
  },
  repository: {
    label: "Repository",
    plural: "Repositories",
    color: "#94a3b8",
    layer: "delivery",
    icon: "git",
    monitorable: false,
    shape: "folder",
  },
  pipeline: {
    label: "Pipeline",
    plural: "Pipelines",
    color: "#60a5fa",
    layer: "delivery",
    icon: "workflow",
    monitorable: true,
    shape: "chevron",
  },
  image: {
    label: "Container image",
    plural: "Images",
    color: "#818cf8",
    layer: "delivery",
    icon: "package",
    monitorable: false,
    shape: "box",
  },
  deployment: {
    label: "Deployment",
    plural: "Deployments",
    color: "#c084fc",
    layer: "infrastructure",
    icon: "rocket",
    monitorable: true,
    shape: "trapezoid",
  },
  environment: {
    label: "Environment",
    plural: "Environments",
    color: "#e879f9",
    layer: "infrastructure",
    icon: "globe",
    monitorable: false,
    shape: "cloud",
  },
  cluster: {
    label: "Cluster",
    plural: "Clusters",
    color: "#f87171",
    layer: "infrastructure",
    icon: "boxes",
    monitorable: true,
    shape: "stack",
  },
  server: {
    label: "Server",
    plural: "Servers",
    color: "#fb7185",
    layer: "infrastructure",
    icon: "server",
    monitorable: true,
    shape: "rackunit",
  },
  vm: {
    label: "Virtual machine",
    plural: "Virtual machines",
    color: "#ff9e80",
    layer: "infrastructure",
    icon: "vm",
    monitorable: true,
    shape: "vm",
  },
  observability: {
    label: "Observability tool",
    plural: "Observability",
    color: "#facc15",
    layer: "infrastructure",
    icon: "activity",
    monitorable: false,
    shape: "arch",
  },
  dashboard: {
    label: "Dashboard",
    plural: "Dashboards",
    color: "#5eead4",
    layer: "business",
    icon: "dashboard",
    monitorable: false,
    shape: "tiles",
  },
  external: {
    label: "External system",
    plural: "External",
    color: "#cbd5e1",
    layer: "external",
    icon: "external",
    monitorable: false,
    shape: "octagon",
  },
  team: {
    label: "Team",
    plural: "Teams",
    color: "#f0abfc",
    layer: "organisation",
    icon: "users",
    monitorable: false,
    shape: "shield",
  },
  company: {
    label: "Company",
    plural: "Companies",
    color: "#38bdf8",
    layer: "organisation",
    icon: "company",
    monitorable: false,
    shape: "tower",
  },
  department: {
    label: "Department",
    plural: "Departments",
    color: "#c4b5fd",
    layer: "organisation",
    icon: "department",
    monitorable: false,
    shape: "notched",
  },
  building: {
    label: "Building",
    plural: "Buildings",
    color: "#fdba74",
    layer: "physical",
    icon: "building",
    monitorable: false,
    shape: "house",
  },
  store: {
    label: "Store",
    plural: "Stores",
    color: "#f9a8d4",
    layer: "physical",
    icon: "store",
    monitorable: false,
    shape: "awning",
  },
  warehouse: {
    label: "Warehouse",
    plural: "Warehouses",
    color: "#fcd34d",
    layer: "physical",
    icon: "warehouse",
    monitorable: false,
    shape: "barn",
  },
  stock: {
    label: "Stock",
    plural: "Stock lines",
    color: "#86efac",
    layer: "physical",
    icon: "stock",
    monitorable: false,
    shape: "crate",
  },
  datacenter: {
    label: "Data centre",
    plural: "Data centres",
    color: "#67e8f9",
    layer: "physical",
    icon: "datacenter",
    monitorable: true,
    shape: "datacenter",
  },
  rack: {
    label: "Rack",
    plural: "Racks",
    color: "#a5b4fc",
    layer: "physical",
    icon: "rack",
    monitorable: false,
    shape: "rack",
  },
  hardware: {
    label: "Physical host",
    plural: "Physical hosts",
    color: "#fda4af",
    layer: "physical",
    icon: "hardware",
    monitorable: true,
    shape: "chassis",
  },
  network: {
    label: "Network device",
    plural: "Network devices",
    color: "#7dd3fc",
    layer: "physical",
    icon: "network",
    monitorable: true,
    shape: "switch",
  },
  process: {
    label: "Process",
    plural: "Processes",
    color: "#f472b6",
    layer: "process",
    icon: "process",
    monitorable: false,
    shape: "process",
  },
  role: {
    label: "Role",
    plural: "Roles",
    color: "#fb923c",
    layer: "party",
    icon: "role",
    monitorable: false,
    shape: "person",
  },
  client: {
    label: "Client",
    plural: "Clients",
    color: "#22d3ee",
    layer: "party",
    icon: "client",
    monitorable: false,
    shape: "badge",
  },
};

export interface RelationDef {
  label: string; // source -> target reading, e.g. "calls"
  inverse: string; // target -> source reading, e.g. "called by"
  color: string;
  /** Asynchronous / indirect relations draw dashed. */
  async: boolean;
}

export const RELATION_TYPES: Record<RelationType, RelationDef> = {
  depends_on: {
    label: "depends on",
    inverse: "depended on by",
    color: "#a78bfa",
    async: false,
  },
  calls: {
    label: "calls",
    inverse: "called by",
    color: "#34d399",
    async: false,
  },
  exposes: {
    label: "exposes",
    inverse: "exposed by",
    color: "#2dd4bf",
    async: false,
  },
  reads_from: {
    label: "reads from",
    inverse: "read by",
    color: "#fbbf24",
    async: false,
  },
  writes_to: {
    label: "writes to",
    inverse: "written by",
    color: "#f59e0b",
    async: false,
  },
  publishes_to: {
    label: "publishes to",
    inverse: "published to by",
    color: "#f472b6",
    async: true,
  },
  consumes_from: {
    label: "consumes from",
    inverse: "consumed by",
    color: "#ec4899",
    async: true,
  },
  integrates_with: {
    label: "integrates with",
    inverse: "integrated by",
    color: "#cbd5e1",
    async: false,
  },
  references: {
    label: "references",
    inverse: "referenced by",
    color: "#facc15",
    async: true,
  },
  implemented_in: {
    label: "implemented in",
    inverse: "implements",
    color: "#94a3b8",
    async: true,
  },
  triggers: {
    label: "triggers",
    inverse: "triggered by",
    color: "#60a5fa",
    async: true,
  },
  produces: {
    label: "produces",
    inverse: "produced by",
    color: "#818cf8",
    async: false,
  },
  runs: { label: "runs", inverse: "run by", color: "#c084fc", async: false },
  deployment_of: {
    label: "is a deployment of",
    inverse: "deployed as",
    color: "#d8b4fe",
    async: true,
  },
  deployed_to: {
    label: "deployed to",
    inverse: "hosts deployment",
    color: "#e879f9",
    async: false,
  },
  runs_on: {
    label: "runs on",
    inverse: "hosts",
    color: "#f87171",
    async: false,
  },
  hosted_on: {
    label: "hosted on",
    inverse: "hosts",
    color: "#fb7185",
    async: false,
  },
  monitors: {
    label: "monitors",
    inverse: "monitored by",
    color: "#facc15",
    async: true,
  },
  serves: {
    label: "serves",
    inverse: "served by",
    color: "#38bdf8",
    async: false,
  },
  supplies: {
    label: "supplies",
    inverse: "supplied by",
    color: "#fb923c",
    async: false,
  },
  tracks: {
    label: "tracks",
    inverse: "tracked by",
    color: "#a3e635",
    async: true,
  },
  connects_to: {
    label: "connects to",
    inverse: "connects to",
    color: "#94a3b8",
    async: false,
  },
  supported_by: {
    label: "is supported by",
    inverse: "supports",
    color: "#e879f9",
    async: false,
  },
  performed_by: {
    label: "is performed by",
    inverse: "performs",
    color: "#fdba74",
    async: false,
  },
  involves: {
    label: "involves",
    inverse: "is involved in",
    color: "#7dd3fc",
    async: false,
  },
  has_node: {
    label: "has node",
    inverse: "is a node of",
    color: "#fda4af",
    async: false,
  },
  replicates_to: {
    label: "replicates to",
    inverse: "replicated from",
    color: "#06b6d4",
    async: true,
  },
};

export const HEALTH_COLOR = {
  healthy: "#34d399",
  degraded: "#fbbf24",
  down: "#f87171",
  unknown: "#94a3b8",
} as const;

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  proposed: "Proposed",
  registered: "Registered",
  provisioned: "Provisioned",
  active: "Active",
  deprecated: "Deprecated",
  retired: "Retired",
};

import type { Lifecycle, NodeKind, RelationType } from "./types";

/**
 * Layers give every kind a vertical position. The 2D canvas ignores them
 * (it may group by them); the optional 3D mode will use them as the Z axis.
 */
export type Layer =
  | "organisation"
  | "business"
  | "application"
  | "data"
  | "delivery"
  | "infrastructure"
  | "external";

export const LAYERS: { id: Layer; label: string; order: number }[] = [
  { id: "organisation", label: "Organisation", order: 0 },
  { id: "business", label: "Business systems", order: 1 },
  { id: "application", label: "Applications & services", order: 2 },
  { id: "data", label: "Data", order: 3 },
  { id: "delivery", label: "Delivery", order: 4 },
  { id: "infrastructure", label: "Infrastructure", order: 5 },
  { id: "external", label: "External", order: 6 },
];

export interface KindDef {
  label: string;
  plural: string;
  color: string;
  layer: Layer;
  icon: string; // key into icon map (components/icons.tsx)
  monitorable: boolean;
}

export const NODE_KINDS: Record<NodeKind, KindDef> = {
  system: { label: "System", plural: "Systems", color: "#8b7cf6", layer: "business", icon: "layers", monitorable: false },
  "ui-app": { label: "UI app", plural: "UI apps", color: "#38bdf8", layer: "application", icon: "app", monitorable: true },
  service: { label: "Service", plural: "Services", color: "#34d399", layer: "application", icon: "box", monitorable: true },
  api: { label: "API", plural: "APIs", color: "#2dd4bf", layer: "application", icon: "plug", monitorable: true },
  library: { label: "Library", plural: "Libraries", color: "#a3e635", layer: "application", icon: "library", monitorable: false },
  database: { label: "Database", plural: "Databases", color: "#fbbf24", layer: "data", icon: "database", monitorable: true },
  table: { label: "Table / collection", plural: "Tables", color: "#fcd34d", layer: "data", icon: "table", monitorable: false },
  cache: { label: "Cache", plural: "Caches", color: "#fb923c", layer: "data", icon: "zap", monitorable: true },
  queue: { label: "Queue / topic", plural: "Queues", color: "#f472b6", layer: "data", icon: "queue", monitorable: true },
  repository: { label: "Repository", plural: "Repositories", color: "#94a3b8", layer: "delivery", icon: "git", monitorable: false },
  pipeline: { label: "Pipeline", plural: "Pipelines", color: "#60a5fa", layer: "delivery", icon: "workflow", monitorable: true },
  image: { label: "Container image", plural: "Images", color: "#818cf8", layer: "delivery", icon: "package", monitorable: false },
  deployment: { label: "Deployment", plural: "Deployments", color: "#c084fc", layer: "infrastructure", icon: "rocket", monitorable: true },
  environment: { label: "Environment", plural: "Environments", color: "#e879f9", layer: "infrastructure", icon: "globe", monitorable: false },
  cluster: { label: "Cluster", plural: "Clusters", color: "#f87171", layer: "infrastructure", icon: "boxes", monitorable: true },
  server: { label: "Server", plural: "Servers", color: "#fb7185", layer: "infrastructure", icon: "server", monitorable: true },
  observability: { label: "Observability tool", plural: "Observability", color: "#facc15", layer: "infrastructure", icon: "activity", monitorable: false },
  dashboard: { label: "Dashboard", plural: "Dashboards", color: "#5eead4", layer: "business", icon: "dashboard", monitorable: false },
  external: { label: "External system", plural: "External", color: "#cbd5e1", layer: "external", icon: "external", monitorable: false },
  team: { label: "Team", plural: "Teams", color: "#f0abfc", layer: "organisation", icon: "users", monitorable: false },
};

export interface RelationDef {
  label: string; // source -> target reading, e.g. "calls"
  inverse: string; // target -> source reading, e.g. "called by"
  color: string;
  /** Asynchronous / indirect relations draw dashed. */
  async: boolean;
}

export const RELATION_TYPES: Record<RelationType, RelationDef> = {
  depends_on: { label: "depends on", inverse: "depended on by", color: "#a78bfa", async: false },
  calls: { label: "calls", inverse: "called by", color: "#34d399", async: false },
  exposes: { label: "exposes", inverse: "exposed by", color: "#2dd4bf", async: false },
  reads_from: { label: "reads from", inverse: "read by", color: "#fbbf24", async: false },
  writes_to: { label: "writes to", inverse: "written by", color: "#f59e0b", async: false },
  publishes_to: { label: "publishes to", inverse: "published to by", color: "#f472b6", async: true },
  consumes_from: { label: "consumes from", inverse: "consumed by", color: "#ec4899", async: true },
  integrates_with: { label: "integrates with", inverse: "integrated by", color: "#cbd5e1", async: false },
  references: { label: "references", inverse: "referenced by", color: "#facc15", async: true },
  implemented_in: { label: "implemented in", inverse: "implements", color: "#94a3b8", async: true },
  triggers: { label: "triggers", inverse: "triggered by", color: "#60a5fa", async: true },
  produces: { label: "produces", inverse: "produced by", color: "#818cf8", async: false },
  runs: { label: "runs", inverse: "run by", color: "#c084fc", async: false },
  deployment_of: { label: "is a deployment of", inverse: "deployed as", color: "#d8b4fe", async: true },
  deployed_to: { label: "deployed to", inverse: "hosts deployment", color: "#e879f9", async: false },
  runs_on: { label: "runs on", inverse: "hosts", color: "#f87171", async: false },
  hosted_on: { label: "hosted on", inverse: "hosts", color: "#fb7185", async: false },
  monitors: { label: "monitors", inverse: "monitored by", color: "#facc15", async: true },
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

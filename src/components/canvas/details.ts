import { HEALTH_COLOR } from "@/domain/registry";
import type { NodeView } from "@/domain/types";
import type { NodeDetailTab } from "@/state/store";

export type DetailKey =
  "properties" | "docs" | "diagrams" | "monitoring" | "relations" | "owner";

export interface DetailCategory {
  key: DetailKey;
  /** Detail-panel tab this circle opens. */
  tab: NodeDetailTab;
  label: string;
  /** Number shown inside the circle, when the category is countable. */
  count?: number;
  /** Shown instead of a count (e.g. a health word). */
  text?: string;
  color: string;
  empty: boolean;
}

/** The in-place details a node can expand into. Never other components. */
export function detailCategories(v: NodeView): DetailCategory[] {
  const d = v.details;
  const out: DetailCategory[] = [
    {
      key: "properties",
      tab: "overview",
      label: "Properties",
      count: d.properties,
      color: "#94a3b8",
      empty: d.properties === 0,
    },
    {
      key: "docs",
      tab: "docs",
      label: "Docs",
      count: d.docs,
      color: "#a78bfa",
      empty: d.docs === 0,
    },
    {
      key: "diagrams",
      tab: "diagrams",
      label: "Diagrams",
      count: d.diagrams,
      color: "#38bdf8",
      empty: d.diagrams === 0,
    },
  ];
  if (d.monitoring) {
    out.push({
      key: "monitoring",
      tab: "monitoring",
      label: "Health",
      text:
        d.monitoring.alerts > 0
          ? `${d.monitoring.alerts} alert${d.monitoring.alerts > 1 ? "s" : ""}`
          : d.monitoring.health,
      color: HEALTH_COLOR[d.monitoring.health],
      empty: false,
    });
  }
  out.push({
    key: "relations",
    tab: "relations",
    label: "Relations",
    count: d.relations,
    color: "#34d399",
    empty: d.relations === 0,
  });
  if (d.owner) {
    out.push({
      key: "owner",
      tab: "overview",
      label: d.owner.name.replace(/ Team$/, ""),
      text: "owner",
      color: "#f0abfc",
      empty: false,
    });
  }
  return out;
}

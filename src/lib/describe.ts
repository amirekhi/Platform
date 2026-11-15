import { LIFECYCLE_LABEL, NODE_KINDS } from "@/domain/registry";
import type { NodeView } from "@/domain/types";

/** One plain sentence about a node, for screen readers and live announcements. */
export function describeNode(v: NodeView): string {
  const parts = [v.name, NODE_KINDS[v.kind].label];
  if (v.lifecycle !== "active") parts.push(LIFECYCLE_LABEL[v.lifecycle]);
  if (v.health !== "unknown") parts.push(`health ${v.health}`);
  if (v.alertCount > 0)
    parts.push(
      `${v.alertCount} ${v.alertCount === 1 ? "problem" : "problems"}`,
    );
  if (v.childCount > 0) parts.push(`${v.childCount} inside`);
  return parts.join(", ");
}

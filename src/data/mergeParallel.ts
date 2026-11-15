import type { Id, RelationView } from "@/domain/types";

/**
 * Several relations that run the same way between the same two nodes are drawn as one line.
 * The merged line remembers how many it stands for (`count`) and which ones (`viaIds`),
 * so thickness and the count badge can show it and the details panel can list them.
 */
export function mergeParallel(relations: RelationView[]): RelationView[] {
  const groups = new Map<string, RelationView[]>();
  const order: string[] = [];
  for (const r of relations) {
    const k = `${r.sourceId}>${r.targetId}`;
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k)!.push(r);
  }
  const out: RelationView[] = [];
  for (const k of order) {
    const g = groups.get(k)!;
    const ids: Id[] = g.flatMap((r) => r.viaIds ?? [r.id]);
    if (g.length === 1) {
      out.push({ ...g[0], count: ids.length });
      continue;
    }
    const kinds = [...new Set(g.flatMap((r) => r.kinds ?? [r.type]))];
    const types = new Set(kinds);
    out.push({
      ...g[0],
      id: `bundle|${g[0].sourceId}|${g[0].targetId}|${ids.join(",")}`,
      type: types.size === 1 ? g[0].type : "depends_on",
      name: types.size === 1 ? undefined : "Mixed relations",
      description: `${ids.length} relations between the same two nodes, drawn as one line.`,
      props: {},
      docCount: g.reduce((n, r) => n + r.docCount, 0),
      derived: g.every((r) => r.derived),
      viaIds: ids,
      count: ids.length,
      kinds,
      mixed: types.size > 1,
      memberIds: ids,
    });
  }
  return out;
}

import { graphlib, layout } from "@dagrejs/dagre";
import type { GraphView, NodeView } from "@/domain/types";
import { detailCategories } from "./details";

/** Components are squares. Details are circles that orbit a square in two rows. */
export const SQ = 128;
export const CIRCLE = 50;
/** Width of a detail node (the circle plus room for its label). */
export const DETAIL_W = 66;
export const DETAIL_H = CIRCLE + 18;
const GAP = 10;
const ROW_GAP = 6;
/** Vertical space a detail row needs above or below a square. */
export const RING = GAP + DETAIL_H;

export type DetailSlot = { x: number; y: number; side: "top" | "bottom" };

/** Positions of detail circles relative to their square's top-left corner. */
export function detailSlots(count: number): DetailSlot[] {
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;
  const slots: DetailSlot[] = [];
  const row = (n: number, side: "top" | "bottom") => {
    const width = n * DETAIL_W + (n - 1) * ROW_GAP;
    for (let i = 0; i < n; i++) {
      slots.push({
        x: SQ / 2 - width / 2 + i * (DETAIL_W + ROW_GAP),
        y: side === "top" ? -(GAP + DETAIL_H) : SQ + GAP,
        side,
      });
    }
  };
  row(topCount, "top");
  row(bottomCount, "bottom");
  return slots;
}

function boxFor(v: NodeView, open: boolean): { w: number; h: number } {
  if (!open) return { w: SQ, h: SQ };
  const n = detailCategories(v).length;
  const widest = Math.ceil(n / 2) * DETAIL_W + (Math.ceil(n / 2) - 1) * ROW_GAP;
  return { w: Math.max(SQ, widest), h: SQ + 2 * RING };
}

/**
 * Left-to-right layered layout of the squares. Nodes with expanded details
 * reserve extra room so their circles never collide with neighbours.
 * Returns the top-left corner of each square.
 */
export function computeLayout(view: GraphView, open: Set<string>): Record<string, { x: number; y: number }> {
  const g = new graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 96, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const boxes = new Map<string, { w: number; h: number }>();
  for (const n of view.nodes) {
    const b = boxFor(n, open.has(n.id));
    boxes.set(n.id, b);
    g.setNode(n.id, { width: b.w, height: b.h });
  }
  for (const r of view.relations) g.setEdge(r.sourceId, r.targetId, {}, r.id);
  for (const c of view.containment) g.setEdge(c.parentId, c.childId, {}, `c:${c.parentId}:${c.childId}`);

  layout(g);

  const out: Record<string, { x: number; y: number }> = {};
  for (const id of g.nodes()) {
    const p = g.node(id);
    if (p) out[id] = { x: p.x - SQ / 2, y: p.y - SQ / 2 }; // the box is centred on the square
  }
  return out;
}

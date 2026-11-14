import { graphlib, layout } from "@dagrejs/dagre";
import type { GraphView, NodeView } from "@/domain/types";
import { detailCategories } from "./details";

/** A node is a silhouette with its label beneath. Details are circles in two rows around it. */
export const SHAPE = 86;
export const NODE_W = 132;
export const NODE_H = 142;
export const CIRCLE = 50;
/** Width of a detail node (the circle plus room for its label). */
export const DETAIL_W = 66;
export const DETAIL_H = CIRCLE + 18;
const GAP = 10;
const ROW_GAP = 6;
/** Vertical space a detail row needs above or below a square. */
export const RING = GAP + DETAIL_H;

export type DetailSlot = { x: number; y: number; side: "top" | "bottom" };

/** Positions of detail circles relative to their node's top-left corner. */
export function detailSlots(count: number): DetailSlot[] {
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;
  const slots: DetailSlot[] = [];
  const row = (n: number, side: "top" | "bottom") => {
    const width = n * DETAIL_W + (n - 1) * ROW_GAP;
    for (let i = 0; i < n; i++) {
      slots.push({
        x: NODE_W / 2 - width / 2 + i * (DETAIL_W + ROW_GAP),
        y: side === "top" ? -(GAP + DETAIL_H) : NODE_H + GAP,
        side,
      });
    }
  };
  row(topCount, "top");
  row(bottomCount, "bottom");
  return slots;
}

function boxFor(v: NodeView, open: boolean): { w: number; h: number } {
  if (!open) return { w: NODE_W, h: NODE_H };
  const n = detailCategories(v).length;
  const widest = Math.ceil(n / 2) * DETAIL_W + (Math.ceil(n / 2) - 1) * ROW_GAP;
  return { w: Math.max(NODE_W, widest), h: NODE_H + 2 * RING };
}

/** Room a node opened in place keeps for its header and its margin around the contents. */
export const BOX_HEAD = 46;
export const BOX_PAD = 18;

export interface LayoutResult {
  /** Top-left of every node. Nodes inside an opened node are relative to that node. */
  pos: Record<string, { x: number; y: number }>;
  /** Width and height of every node that is opened in place. */
  size: Record<string, { w: number; h: number }>;
}

/**
 * Left-to-right layered layout (dagre). Nodes opened in place are laid out from the inside
 * out: their contents are arranged first, which fixes the size of the box, and the box is
 * then placed as one node among its siblings. Nodes with expanded details reserve extra
 * room so their circles never collide with neighbours.
 */
export function computeLayout(
  view: GraphView,
  openDetails: Set<string>,
  vertical = false,
): LayoutResult {
  const byId = new Map(view.nodes.map((n) => [n.id, n]));
  const kids = new Map<string | null, string[]>();
  for (const n of view.nodes) {
    const key = n.containerId && byId.has(n.containerId) ? n.containerId : null;
    kids.set(key, [...(kids.get(key) ?? []), n.id]);
  }
  const pos: LayoutResult["pos"] = {};
  const size: LayoutResult["size"] = {};

  /** The member of `group` that contains (or is) `id`, or undefined if it is not in the group. */
  const memberOf = (id: string, group: Set<string>): string | undefined => {
    let cur: string | null | undefined = id;
    while (cur) {
      if (group.has(cur)) return cur;
      cur = byId.get(cur)?.containerId;
    }
    return undefined;
  };

  /** Lays out one group of siblings. Returns the extent of what it placed. */
  const layoutGroup = (ids: string[]): { w: number; h: number } => {
    const group = new Set(ids);
    const g = new graphlib.Graph({ multigraph: true });
    g.setGraph({
      rankdir: vertical ? "TB" : "LR",
      nodesep: 28,
      ranksep: vertical ? 84 : 96,
      marginx: 0,
      marginy: 0,
    });
    g.setDefaultEdgeLabel(() => ({}));
    const boxes = new Map<string, { w: number; h: number }>();
    for (const id of ids) {
      const n = byId.get(id)!;
      let b: { w: number; h: number };
      if (n.open && (kids.get(id)?.length ?? 0) > 0) {
        const inner = layoutGroup(kids.get(id)!);
        b = { w: inner.w + 2 * BOX_PAD, h: inner.h + BOX_HEAD + BOX_PAD };
        size[id] = b;
      } else {
        b = boxFor(n, openDetails.has(id));
      }
      boxes.set(id, b);
      g.setNode(id, { width: b.w, height: b.h });
    }
    for (const r of view.relations) {
      const a = memberOf(r.sourceId, group);
      const b = memberOf(r.targetId, group);
      if (a && b && a !== b) g.setEdge(a, b, {}, r.id);
    }
    for (const c of view.containment) {
      if (group.has(c.parentId) && group.has(c.childId))
        g.setEdge(c.parentId, c.childId, {}, `c:${c.parentId}:${c.childId}`);
    }
    layout(g);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const p = g.node(id);
      const b = boxes.get(id)!;
      minX = Math.min(minX, p.x - b.w / 2);
      minY = Math.min(minY, p.y - b.h / 2);
      maxX = Math.max(maxX, p.x + b.w / 2);
      maxY = Math.max(maxY, p.y + b.h / 2);
    }
    for (const id of ids) {
      const p = g.node(id);
      const b = boxes.get(id)!;
      const isBox = Boolean(size[id]);
      // A plain node is centred in its (possibly detail-padded) box; an opened one fills it.
      const w = isBox ? b.w : NODE_W;
      const h = isBox ? b.h : NODE_H;
      pos[id] = { x: p.x - w / 2 - minX, y: p.y - h / 2 - minY };
    }
    return { w: maxX - minX, h: maxY - minY };
  };

  const top = kids.get(null) ?? [];
  if (top.length) {
    layoutGroup(top);
    // Nodes inside a box sit below its header, inset by the margin.
    for (const [parent, ids] of kids) {
      if (parent === null) continue;
      for (const id of ids)
        pos[id] = { x: pos[id].x + BOX_PAD, y: pos[id].y + BOX_HEAD };
    }
    // Nudge the whole top level so it starts at a small margin.
    for (const id of top) pos[id] = { x: pos[id].x + 20, y: pos[id].y + 20 };
  }
  return { pos, size };
}

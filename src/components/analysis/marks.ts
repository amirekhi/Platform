import {
  ancestorsOf,
  blastRadius,
  type BlastResult,
  type GraphSnapshot,
  type PathResult,
  tracePaths,
  withDescendants,
} from "@/domain/analysis";
import type { Id } from "@/domain/types";
import type { AnalysisState } from "@/state/store";

export type MarkRole = "origin" | "hard" | "soft" | "path" | "start" | "end";
export interface Mark {
  role: MarkRole;
  /** Hops from the origin, or the step number along a route. */
  n?: number;
}

/** What to draw on the canvas for the current analysis. */
export interface Marks {
  kind: "blast" | "path";
  node: ReadonlyMap<Id, Mark>;
  /** Pairs of visible nodes whose connecting line belongs to the analysis. */
  pairs: ReadonlySet<string>;
  edgeLit: (a: Id, b: Id) => boolean;
}

export type AnalysisResult = BlastResult | PathResult;

export const ANALYSIS_COLOR = {
  origin: "#e11d48",
  hard: "#f97316",
  soft: "#f59e0b",
  path: "#0ea5e9",
} as const;

export function runAnalysis(
  snap: GraphSnapshot,
  a: AnalysisState,
): AnalysisResult | null {
  if (a.kind === "blast")
    return blastRadius(snap, a.rootId, {
      maxDepth: a.maxDepth,
      includeSoft: a.includeSoft,
    });
  if (a.toId) return tracePaths(snap, a.fromId, a.toId, 3);
  return null;
}

const pairKey = (a: Id, b: Id) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Lift the analysis onto the nodes that are actually on screen. */
export function buildMarks(
  snap: GraphSnapshot,
  a: AnalysisState,
  result: AnalysisResult | null,
  visible: readonly Id[],
): Marks {
  const vis = new Set(visible);
  const lift = (id: Id): Id | undefined => {
    if (vis.has(id)) return id;
    for (const anc of ancestorsOf(snap, id)) if (vis.has(anc)) return anc;
    return undefined;
  };
  const node = new Map<Id, Mark>();
  const pairs = new Set<string>();
  const link = (x: Id, y: Id) => {
    const lx = lift(x);
    const ly = lift(y);
    if (lx && ly && lx !== ly) pairs.add(pairKey(lx, ly));
  };

  if (a.kind === "blast" && result?.kind === "blast") {
    const items = new Map(result.items.map((i) => [i.id, i]));
    const rootAncestors = new Set(ancestorsOf(snap, a.rootId));
    for (const v of visible) {
      if (result.origin.has(v) || rootAncestors.has(v)) {
        node.set(v, { role: "origin" });
        continue;
      }
      // A shape stands for itself, what is inside it, and what contains it.
      const family = [...withDescendants(snap, v), ...ancestorsOf(snap, v)];
      let best: { depth: number; hard: boolean } | null = null;
      for (const f of family) {
        const it = items.get(f);
        if (!it) continue;
        const hard = it.strength === "hard";
        if (
          !best ||
          it.depth < best.depth ||
          (it.depth === best.depth && hard && !best.hard)
        )
          best = { depth: it.depth, hard };
      }
      if (best)
        node.set(v, { role: best.hard ? "hard" : "soft", n: best.depth });
    }
    for (const it of result.items)
      if (it.reason === "relation") link(it.fromId, it.id);
  } else if (a.kind === "path") {
    if (result?.kind === "path" && result.routes.length) {
      const route = result.routes[Math.min(a.route, result.routes.length - 1)];
      let prev: Id | undefined;
      let step = 0;
      for (const s of route.steps) {
        const l = lift(s.nodeId);
        if (!l) continue;
        if (l !== prev) {
          step++;
          if (!node.has(l)) node.set(l, { role: "path", n: step });
          if (prev) pairs.add(pairKey(prev, l));
        }
        prev = l;
      }
    }
    const from = lift(a.fromId);
    if (from) node.set(from, { role: "start" });
    const to = a.toId ? lift(a.toId) : undefined;
    if (to) node.set(to, { role: "end" });
  }
  return {
    kind: a.kind,
    node,
    pairs,
    edgeLit: (x, y) => pairs.has(pairKey(x, y)),
  };
}

import type { Id } from "../types";
import { type GraphSnapshot, withDescendants } from "./snapshot";

export interface RouteStep {
  /** The node reached by this step. */
  nodeId: Id;
  /** The relation travelled to get here. Absent on the first step. */
  relationId?: Id;
  /** "forward" follows the arrow, "backward" goes against it. */
  direction?: "forward" | "backward";
}

export interface Route {
  steps: RouteStep[];
  /** True when every step follows an arrow. */
  directed: boolean;
}

export interface PathResult {
  kind: "path";
  snapshotVersion: string;
  fromId: Id;
  toId: Id;
  /** Shortest first. Empty when the two are not connected. */
  routes: Route[];
  /** True when no route follows the arrows and the ones found ignore direction. */
  ignoredDirection: boolean;
}

interface Edge {
  relationId: Id;
  to: Id;
  direction: "forward" | "backward";
}

/** Links that say "watched by" or "recorded by", not "reachable through". */
const NOT_A_ROUTE = new Set(["monitors", "tracks"]);

function search(
  snap: GraphSnapshot,
  starts: Set<Id>,
  goals: Set<Id>,
  directed: boolean,
  banned: Set<Id>,
): RouteStep[] | null {
  const prev = new Map<Id, { from: Id; edge: Edge } | null>();
  const queue: Id[] = [];
  for (const s of starts) {
    prev.set(s, null);
    queue.push(s);
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (goals.has(cur) && !starts.has(cur)) {
      const steps: RouteStep[] = [];
      let at: Id = cur;
      for (;;) {
        const p = prev.get(at) ?? null;
        steps.push({
          nodeId: at,
          relationId: p?.edge.relationId,
          direction: p?.edge.direction,
        });
        if (!p) break;
        at = p.from;
      }
      return steps.reverse();
    }
    const edges: Edge[] = [];
    for (const r of snap.outgoing.get(cur) ?? [])
      if (!banned.has(r.id) && !NOT_A_ROUTE.has(r.type))
        edges.push({ relationId: r.id, to: r.targetId, direction: "forward" });
    if (!directed)
      for (const r of snap.incoming.get(cur) ?? [])
        if (!banned.has(r.id) && !NOT_A_ROUTE.has(r.type))
          edges.push({
            relationId: r.id,
            to: r.sourceId,
            direction: "backward",
          });
    for (const e of edges) {
      if (prev.has(e.to)) continue;
      prev.set(e.to, { from: cur, edge: e });
      queue.push(e.to);
    }
  }
  return null;
}

const keyOf = (steps: RouteStep[]) =>
  steps.map((s) => s.relationId ?? "").join("|");

/**
 * The routes from A to B, shortest first (up to `max`).
 * A container stands for everything inside it, so a route between two systems may start and
 * end deep inside them. Routes follow the arrows when they can; only if none does, direction
 * is ignored and the result says so.
 */
export function tracePaths(
  snap: GraphSnapshot,
  fromId: Id,
  toId: Id,
  max = 3,
): PathResult {
  const starts = withDescendants(snap, fromId);
  const goals = withDescendants(snap, toId);
  let directed = true;
  let first = fromId === toId ? null : search(snap, starts, goals, true, new Set());
  if (!first && fromId !== toId) {
    directed = false;
    first = search(snap, starts, goals, false, new Set());
  }
  const routes: Route[] = [];
  const seen = new Set<string>();
  const add = (steps: RouteStep[]) => {
    const k = keyOf(steps);
    if (seen.has(k)) return;
    seen.add(k);
    routes.push({
      steps,
      directed: steps.every((s) => s.direction !== "backward"),
    });
  };
  if (first) {
    add(first);
    // Alternatives: forbid each relation of the best route in turn.
    for (const step of first) {
      if (!step.relationId || routes.length >= max + 2) continue;
      const alt = search(
        snap,
        starts,
        goals,
        directed,
        new Set([step.relationId]),
      );
      if (alt) add(alt);
    }
    routes.sort((a, b) => a.steps.length - b.steps.length);
    routes.length = Math.min(routes.length, max);
  }
  return {
    kind: "path",
    snapshotVersion: snap.version,
    fromId,
    toId,
    routes,
    ignoredDirection: routes.length > 0 && !directed,
  };
}

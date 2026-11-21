import type { Id } from "../types";
import { IMPACT_RULES } from "./rules";
import { ancestorsOf, type GraphSnapshot, withDescendants } from "./snapshot";

export interface BlastItem {
  id: Id;
  /** Hops from the origin. 1 = directly connected. */
  depth: number;
  /** "hard" only if every step is a hard dependency. */
  strength: "hard" | "soft";
  /** The node the failure came from, and the relation it travelled along (absent for part-of). */
  fromId: Id;
  viaRelationId?: Id;
  /** "part-of": it contains something that is affected, so it is partly affected. */
  reason: "relation" | "part-of";
}

export interface BlastOptions {
  /** Stop after this many hops. 0 or undefined = no limit. */
  maxDepth?: number;
  /** Follow soft links too (async, informational-but-flowing). Default true. */
  includeSoft?: boolean;
}

export interface BlastResult {
  kind: "blast";
  snapshotVersion: string;
  rootId: Id;
  /** The root and everything inside it: where the failure starts. */
  origin: ReadonlySet<Id>;
  items: BlastItem[];
  byDepth: Record<number, number>;
  hardCount: number;
  softCount: number;
  /** Owning team id to the number of affected things it owns. */
  owners: Record<Id, number>;
  maxDepthReached: number;
}

/**
 * A deployment that serves no traffic (staging, a standby) does not degrade the service it
 * deploys: that service is alive in production without it. An environment says so with the
 * property `servesTraffic: false`.
 */
function servesTraffic(snap: GraphSnapshot, deploymentId: Id): boolean {
  for (const r of snap.outgoing.get(deploymentId) ?? [])
    if (
      r.type === "deployed_to" &&
      snap.nodes.get(r.targetId)?.props.servesTraffic === false
    )
      return false;
  return true;
}

/**
 * What breaks if this node goes down.
 * The origin is the node plus everything inside it. A failure then flows along relations
 * according to IMPACT_RULES. A container of an affected node is partly affected ("part-of").
 *
 * Because a physical host contains its virtual machines, losing a host or a whole data centre
 * starts the failure at everything inside it, and the clusters, deployments, services and
 * databases that depend on those machines follow.
 */
export function blastRadius(
  snap: GraphSnapshot,
  rootId: Id,
  opts: BlastOptions = {},
): BlastResult {
  const includeSoft = opts.includeSoft ?? true;
  const limit = opts.maxDepth && opts.maxDepth > 0 ? opts.maxDepth : Infinity;
  const origin = withDescendants(snap, rootId);
  const seen = new Map<Id, BlastItem>();
  const queue: Id[] = [];
  const level = new Map<Id, number>();
  const strengthOf = new Map<Id, "hard" | "soft">();
  for (const o of origin) {
    level.set(o, 0);
    strengthOf.set(o, "hard");
    queue.push(o);
  }

  const reach = (
    to: Id,
    from: Id,
    depth: number,
    strength: "hard" | "soft",
    relationId: Id | undefined,
    reason: BlastItem["reason"],
  ) => {
    if (origin.has(to) || seen.has(to)) return;
    const item: BlastItem = {
      id: to,
      depth,
      strength,
      fromId: from,
      viaRelationId: relationId,
      reason,
    };
    seen.set(to, item);
    level.set(to, depth);
    strengthOf.set(to, strength);
    queue.push(to);
    // Its containers lose part of themselves; they sit at the same depth, always soft.
    for (const a of ancestorsOf(snap, to)) {
      if (origin.has(a) || seen.has(a)) continue;
      if (withDescendants(snap, a).has(rootId)) continue; // an ancestor of the origin
      seen.set(a, {
        id: a,
        depth,
        strength: "soft",
        fromId: to,
        reason: "part-of",
      });
    }
  };

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const d = level.get(cur)!;
    if (d >= limit) continue;
    const s = strengthOf.get(cur)!;
    for (const r of snap.incoming.get(cur) ?? []) {
      const rule = IMPACT_RULES[r.type];
      if (rule.flows !== "to-source" && rule.flows !== "both") continue;
      if (rule.strength === "soft" && !includeSoft) continue;
      reach(
        r.sourceId,
        cur,
        d + 1,
        s === "hard" && rule.strength === "hard" ? "hard" : "soft",
        r.id,
        "relation",
      );
    }
    for (const r of snap.outgoing.get(cur) ?? []) {
      const rule = IMPACT_RULES[r.type];
      if (rule.flows !== "to-target" && rule.flows !== "both") continue;
      if (rule.strength === "soft" && !includeSoft) continue;
      if (r.type === "deployment_of" && !servesTraffic(snap, r.sourceId))
        continue;
      reach(
        r.targetId,
        cur,
        d + 1,
        s === "hard" && rule.strength === "hard" ? "hard" : "soft",
        r.id,
        "relation",
      );
    }
  }

  const items = [...seen.values()].sort(
    (a, b) =>
      a.depth - b.depth ||
      (a.strength === b.strength ? 0 : a.strength === "hard" ? -1 : 1) ||
      (snap.nodes.get(a.id)?.name ?? "").localeCompare(
        snap.nodes.get(b.id)?.name ?? "",
      ),
  );
  const byDepth: Record<number, number> = {};
  const owners: Record<Id, number> = {};
  let hardCount = 0;
  for (const it of items) {
    byDepth[it.depth] = (byDepth[it.depth] ?? 0) + 1;
    if (it.strength === "hard") hardCount++;
    const owner = snap.nodes.get(it.id)?.ownerId;
    if (owner) owners[owner] = (owners[owner] ?? 0) + 1;
  }
  return {
    kind: "blast",
    snapshotVersion: snap.version,
    rootId,
    origin,
    items,
    byDepth,
    hardCount,
    softCount: items.length - hardCount,
    owners,
    maxDepthReached: items.reduce((m, i) => Math.max(m, i.depth), 0),
  };
}

import { ancestorsOf, type GraphSnapshot } from "./analysis/snapshot";
import type { Id, NodeKind } from "./types";

/**
 * Where things run: from a service down to the hardware and the data centre it sits in.
 *
 * The infrastructure hierarchy has two kinds of link, and placement follows both:
 *
 *  - Containment is physical. A data centre contains racks, a rack contains physical hosts,
 *    a host contains the virtual machines (or the bare-metal server) running on it.
 *  - Relations are logical. A deployment runs on a cluster, a cluster has nodes (virtual
 *    machines or servers), a database is hosted on a server or a machine, a service is
 *    deployed as one or more deployments.
 *
 * A route from a service to its data centre therefore reads, for example:
 *   Checkout Service > checkout @ production > k8s-prod > k8s-prod-w01 >
 *   dell-r760-a12-05 > Rack FRA1-A12 > Frankfurt DC FRA1
 */

/** Kinds whose place in the infrastructure is worth tracking. */
export const PLACED_KINDS = new Set<NodeKind>([
  "service",
  "api",
  "database",
  "table",
  "cache",
  "queue",
  "deployment",
  "environment",
  "observability",
  "cluster",
  "vm",
  "server",
  "hardware",
  "rack",
  "network",
  "datacenter",
]);

/** The infrastructure itself, as opposed to what runs on it. */
export const INFRA_KINDS = new Set<NodeKind>([
  "datacenter",
  "rack",
  "hardware",
  "network",
  "vm",
  "server",
  "cluster",
]);

/** Relations that say "this lives or runs on that" (the target is the host). */
const HOSTING = new Set<string>(["hosted_on", "runs_on", "has_node"]);

/** The data centre a node is physically inside (or is), if any. */
export function siteOf(snap: GraphSnapshot, id: Id): Id | undefined {
  if (snap.nodes.get(id)?.kind === "datacenter") return id;
  for (const a of ancestorsOf(snap, id))
    if (snap.nodes.get(a)?.kind === "datacenter") return a;
  return undefined;
}

/**
 * What a node runs on, one step down.
 *  1. Its own hosting relations (a deployment runs on a cluster, a database is hosted on a server,
 *     a cluster has nodes).
 *  2. For a service: its deployments.
 *  3. Otherwise what contains it, for parts of something placed (an API of a service, a table of a
 *     database), but never a whole system.
 */
function hostsOf(snap: GraphSnapshot, id: Id): Id[] {
  const out: Id[] = [];
  for (const r of snap.outgoing.get(id) ?? [])
    if (HOSTING.has(r.type)) out.push(r.targetId);
  if (out.length === 0)
    for (const r of snap.incoming.get(id) ?? [])
      if (r.type === "deployment_of") out.push(r.sourceId);
  if (out.length === 0) {
    const parent = snap.nodes.get(id)?.parentId;
    const kind = parent ? snap.nodes.get(parent)?.kind : undefined;
    if (parent && kind && PLACED_KINDS.has(kind)) out.push(parent);
  }
  return out;
}

export interface HostingChain {
  /** From the node itself down to its data centre, both included. */
  ids: Id[];
  /** The data centre the chain ends in. */
  site: Id;
}

/**
 * Every route from a node down to a data centre (up to `max`).
 * A node that sits inside a data centre ends its route by climbing its containment
 * (machine, host, rack, data centre). Anything else follows its hosting relations first.
 */
export function hostingChains(
  snap: GraphSnapshot,
  id: Id,
  max = 24,
): HostingChain[] {
  const out: HostingChain[] = [];
  const seen = new Set<string>();
  const walk = (cur: Id, path: Id[]) => {
    if (out.length >= max || path.length > 12) return;
    const site = siteOf(snap, cur);
    if (site) {
      const ancestors = ancestorsOf(snap, cur);
      const upTo = ancestors.indexOf(site);
      const up = cur === site ? [cur] : [cur, ...ancestors.slice(0, upTo + 1)];
      const ids = [...path, ...up];
      const key = ids.join(">");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ ids, site });
      }
      return;
    }
    for (const h of hostsOf(snap, cur))
      if (h !== cur && !path.includes(h)) walk(h, [...path, cur]);
  };
  walk(id, []);
  return out;
}

const siteCache = new WeakMap<GraphSnapshot, Map<Id, Id[]>>();

/** The data centres a node runs in. Empty when no placement is recorded. */
export function sitesOf(snap: GraphSnapshot, id: Id): Id[] {
  let m = siteCache.get(snap);
  if (!m) {
    m = new Map();
    siteCache.set(snap, m);
  }
  let hit = m.get(id);
  if (!hit) {
    hit = [...new Set(hostingChains(snap, id, 64).map((c) => c.site))];
    m.set(id, hit);
  }
  return hit;
}

import type { RelationType } from "../types";

/**
 * How a failure travels along each kind of relation.
 *
 *  - "to-source": if the TARGET fails, the SOURCE is affected (it needs the target).
 *  - "to-target": if the SOURCE fails, the TARGET is affected (the target needs it).
 *  - "both":      either side failing affects the other.
 *  - "none":      informational; nothing breaks.
 *
 * "hard" means it stops working. "soft" means it degrades or loses a nice-to-have
 * (async buffers, monitoring, references, redundancy).
 *
 * This table is data on purpose: governance rules (per-organisation overrides, criticality
 * weights) can replace it without touching the algorithm.
 */
export interface ImpactRule {
  flows: "to-source" | "to-target" | "both" | "none";
  strength: "hard" | "soft";
}

export const IMPACT_RULES: Record<RelationType, ImpactRule> = {
  depends_on: { flows: "to-source", strength: "hard" },
  calls: { flows: "to-source", strength: "hard" },
  reads_from: { flows: "to-source", strength: "hard" },
  writes_to: { flows: "to-source", strength: "hard" },
  runs_on: { flows: "to-source", strength: "hard" },
  hosted_on: { flows: "to-source", strength: "hard" },
  deployed_to: { flows: "to-source", strength: "hard" },
  consumes_from: { flows: "to-source", strength: "soft" },
  publishes_to: { flows: "to-source", strength: "soft" },
  integrates_with: { flows: "both", strength: "soft" },
  // A link points up from the device that depends on it: a host connects to its switch, a switch
  // to the core. Losing the switch cuts the host off; losing the host does not harm the switch,
  // so failures must not flow back down the link and across to every other host.
  connects_to: { flows: "to-source", strength: "soft" },
  exposes: { flows: "to-target", strength: "hard" },
  // A deployment runs an image. Losing the image stops new copies starting, so it degrades the
  // deployment; a deployment failing does not harm the image it was built from.
  runs: { flows: "to-source", strength: "soft" },
  produces: { flows: "to-target", strength: "hard" },
  serves: { flows: "to-target", strength: "hard" },
  supplies: { flows: "to-target", strength: "hard" },
  triggers: { flows: "to-target", strength: "soft" },
  // A service usually has several deployments (other environments, a standby), so losing one
  // degrades it rather than stopping it. A deployment that serves no traffic (staging, a
  // standby) is skipped altogether: see blast.ts.
  deployment_of: { flows: "to-target", strength: "soft" },
  implemented_in: { flows: "none", strength: "soft" },
  references: { flows: "none", strength: "soft" },
  monitors: { flows: "none", strength: "soft" },
  tracks: { flows: "none", strength: "soft" },
  supported_by: { flows: "to-source", strength: "hard" },
  performed_by: { flows: "to-target", strength: "soft" },
  involves: { flows: "to-target", strength: "soft" },
  // A cluster survives the loss of one node, so a node failing degrades the cluster.
  has_node: { flows: "to-source", strength: "soft" },
  // When the source is lost its replica goes stale, but keeps running.
  replicates_to: { flows: "to-target", strength: "soft" },
};

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
 * (async buffers, monitoring, references).
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
  connects_to: { flows: "both", strength: "soft" },
  exposes: { flows: "to-target", strength: "hard" },
  runs: { flows: "to-target", strength: "hard" },
  produces: { flows: "to-target", strength: "hard" },
  serves: { flows: "to-target", strength: "hard" },
  supplies: { flows: "to-target", strength: "hard" },
  triggers: { flows: "to-target", strength: "soft" },
  deployment_of: { flows: "none", strength: "soft" },
  implemented_in: { flows: "none", strength: "soft" },
  references: { flows: "none", strength: "soft" },
  monitors: { flows: "none", strength: "soft" },
  tracks: { flows: "none", strength: "soft" },
  supported_by: { flows: "to-source", strength: "hard" },
  performed_by: { flows: "to-target", strength: "soft" },
  involves: { flows: "to-target", strength: "soft" },
};

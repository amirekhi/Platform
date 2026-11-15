import type { RelationType } from "./types";

/** One plain sentence per relation type: what it means and why you would care. */
export const RELATION_HELP: Record<RelationType, string> = {
  depends_on: "Needs the target to work. If the target fails, this is affected.",
  calls: "Makes live requests to the target and waits for the answer.",
  exposes: "Offers the target (an API or interface) for others to use.",
  reads_from: "Takes data from the target without changing it.",
  writes_to: "Changes or stores data in the target.",
  publishes_to: "Sends messages or events to the target without waiting.",
  consumes_from: "Receives messages or events from the target when ready.",
  integrates_with: "Exchanges information with the target, in both directions.",
  references: "Mentions or points at the target. Nothing breaks if it changes.",
  implemented_in: "The code or design of this lives in the target.",
  triggers: "Starts the target, usually from an event or a schedule.",
  produces: "Creates the target as its output, such as a build or a report.",
  runs: "Executes the target while it is operating.",
  deployment_of: "Is one running copy of the target.",
  deployed_to: "Is installed on the target environment.",
  runs_on: "Uses the target's computing power. If the target is down, so is this.",
  hosted_on: "Physically or virtually lives on the target.",
  monitors: "Watches the target and raises alerts about its health.",
  serves: "Provides its service to the target, such as a store or a team.",
  supplies: "Delivers goods or data to the target.",
  tracks: "Keeps a record of what happens to the target.",
  connects_to: "A plain network or physical link.",
};

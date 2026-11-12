import type { DataSource } from "./datasource";
import { FixtureDataSource } from "./fixtureSource";

let instance: DataSource | null = null;

/**
 * The one place that decides where data comes from. Swap the fixture for a
 * MongoDB-backed implementation here and nothing else in the UI changes.
 */
export function getDataSource(): DataSource {
  if (!instance) instance = new FixtureDataSource();
  return instance;
}

export type { DataSource } from "./datasource";

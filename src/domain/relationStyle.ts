import { RELATION_TYPES } from "./registry";
import type { RelationType, RelationView } from "./types";

/** Colour of a line that stands for relations of different kinds. A neutral stone, used by nothing else. */
export const MIXED_COLOR = "#78716c";

export interface LineStyle {
  color: string;
  label: string;
  /** Dashed only when every relation it stands for is asynchronous. */
  async: boolean;
  /** The kinds it stands for; more than one means a mixed line. */
  kinds: RelationType[];
  mixed: boolean;
}

/**
 * One rule for how any line is coloured:
 *  - all the same kind: that kind's colour,
 *  - different kinds: neutral stone, striped with each kind's colour.
 */
export function lineStyle(rel: RelationView): LineStyle {
  const kinds = rel.kinds?.length ? rel.kinds : [rel.type];
  const mixed = kinds.length > 1;
  const first = RELATION_TYPES[kinds[0]];
  return {
    color: mixed ? MIXED_COLOR : first.color,
    label: mixed ? "Mixed relations" : first.label,
    async: kinds.every((k) => RELATION_TYPES[k].async),
    kinds,
    mixed,
  };
}

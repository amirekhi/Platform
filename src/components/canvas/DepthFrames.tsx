"use client";

import type { ReactNode } from "react";
import { NODE_KINDS } from "@/domain/registry";
import type { Id, NodeKind } from "@/domain/types";
import { useDevice } from "@/lib/useDevice";
import { useLite } from "@/state/store";

/** One level of containment the canvas is currently inside. */
export interface DepthFrame {
  id: Id;
  name: string;
  kind: NodeKind;
}

/**
 * The most nested levels that are drawn (the innermost ones if there are more).
 * The wrappers below always exist: a level that is not in use has no border and no padding,
 * so it takes no room and draws nothing. Because the structure never changes, the canvas
 * inside is never remounted when you go deeper or come back up.
 */
const MAX = 6;

/**
 * A coloured frame around the canvas for every level you are inside, outermost first, each in
 * the colour of the node it stands for. Going deeper adds a frame inside the others; going
 * back up removes the innermost one.
 *
 * The frames are real wrappers (not an overlay), so the canvas simply gets a little smaller:
 * nothing is painted over nodes, the toolbar, the legend or the menus, and nothing is clipped.
 */
export function DepthFrames({
  frames,
  children,
}: {
  frames: DepthFrame[];
  children: ReactNode;
}) {
  const compact = useDevice() !== "desktop";
  const lite = useLite();
  const shown = frames.slice(-MAX);
  const border = compact ? 2 : 3;
  const gap = compact ? 1 : 2;
  const label = shown.length
    ? `Inside ${shown.map((f) => f.name).join(", then ")}`
    : undefined;

  let tree: ReactNode = children;
  for (let i = MAX - 1; i >= 0; i--) {
    const f = shown[i];
    const color = f ? NODE_KINDS[f.kind].color : null;
    tree = (
      <div
        role={i === 0 && label ? "group" : undefined}
        aria-label={i === 0 ? label : undefined}
        data-depth={i === 0 ? shown.length : undefined}
        className="flex min-h-0 w-full flex-1 flex-col"
        style={
          color
            ? {
                borderStyle: "solid",
                borderWidth: border,
                borderColor: `color-mix(in srgb, ${color} 80%, transparent)`,
                borderRadius: 7,
                padding: gap,
                background: `color-mix(in srgb, ${color} 9%, var(--bg))`,
                transition: lite
                  ? undefined
                  : "border-color 450ms ease, background-color 450ms ease",
              }
            : {
                borderStyle: "solid",
                borderWidth: 0,
                borderColor: "transparent",
                padding: 0,
              }
        }
      >
        {tree}
      </div>
    );
  }
  return <>{tree}</>;
}

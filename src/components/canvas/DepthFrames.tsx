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
 *
 * Each frame is named by a small tab hanging from the top edge at the top right. The tabs sit
 * side by side, outermost to innermost, so they never overlap each other. They add no
 * thickness to the frames: they sit on the top edge, and they are short enough to stay clear
 * of the toolbar (top left) and the focus card (top right, below them), whatever the depth.
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
        className={`flex min-h-0 w-full flex-1 flex-col ${i === 0 ? "relative" : ""}`}
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
        {i === 0 && shown.length > 0 && (
          <Tabs frames={shown} border={border} compact={compact} />
        )}
      </div>
    );
  }
  return <>{tree}</>;
}

/**
 * The names of the levels, as tabs hanging from the top edge of the outermost frame.
 *
 * Clearance (measured from the outer top edge): the tabs are 15px tall on desktop (11px on
 * phones and tablets). The toolbar starts 12px (8px) below the innermost frame's top edge and
 * the focus card the same, and every frame adds at least 5px (3px), so there is always room.
 * They sit under the toolbar (z-index) so a tiny overlap would never cover a control, and they
 * ignore the pointer, so panning and dragging work right through them.
 */
function Tabs({
  frames,
  border,
  compact,
}: {
  frames: DepthFrame[];
  border: number;
  compact: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[8] flex min-w-0 items-start justify-end"
      style={{
        // Flush with the outer edge of the frame, which is the border width above the padding box.
        top: -border,
        right: compact ? 8 : 12,
        maxWidth: `calc(100% - ${compact ? 16 : 24}px)`,
        gap: 3,
      }}
    >
      {frames.map((f) => {
        const color = NODE_KINDS[f.kind].color;
        return (
          <span
            key={f.id}
            className="flex min-w-0 items-center gap-1 truncate text-ink"
            style={{
              height: compact ? 11 : 15,
              padding: compact ? "0 5px" : "0 7px",
              fontSize: compact ? 9 : 10.5,
              fontWeight: 600,
              lineHeight: 1,
              maxWidth: compact ? "5.5rem" : "11rem",
              borderStyle: "solid",
              borderWidth: 1,
              borderTopWidth: 0,
              borderColor: `color-mix(in srgb, ${color} 75%, transparent)`,
              borderRadius: "0 0 6px 6px",
              background: `color-mix(in srgb, ${color} 18%, var(--panel))`,
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: compact ? 5 : 6,
                height: compact ? 5 : 6,
                background: color,
              }}
            />
            <span className="truncate">{f.name}</span>
          </span>
        );
      })}
    </div>
  );
}

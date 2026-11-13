"use client";

import { useStore } from "@xyflow/react";
import { useApp, type DetailMode } from "@/state/store";

/** 0 = overview (shapes only), 1 = standard, 2 = full. */
export type LodLevel = 0 | 1 | 2;

export const LOD_OPTIONS: { id: DetailMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Follows your zoom: zoom out for the big picture, in for detail" },
  { id: "overview", label: "Overview", hint: "Shapes and health only, whatever the zoom" },
  { id: "standard", label: "Standard", hint: "Names and relation labels, whatever the zoom" },
  { id: "full", label: "Full", hint: "Adds owner and live figures, whatever the zoom" },
];

/**
 * Auto detail is relative to the zoom that fits the whole view on screen, because that
 * zoom depends on how many nodes there are and how big the canvas is. The fitted view is
 * always the overview; names appear after zooming in ~1.3x and owner/figures after ~2.4x.
 */
export const levelOfZoom = (z: number, fit: number | null): LodLevel => {
  if (fit === null) return 0;
  const ratio = z / fit;
  return ratio < 1.3 ? 0 : ratio < 2.4 ? 1 : 2;
};
const FIXED: Record<Exclude<DetailMode, "auto">, LodLevel> = { overview: 0, standard: 1, full: 2 };

/** The level of detail in force: the tab's choice, or the zoom when set to Auto. */
export function useLevel(): LodLevel {
  const mode = useApp((s) => s.tabs.find((t) => t.id === s.activeTabId)?.detailMode ?? "auto");
  // Selecting the bucket (not the raw zoom) means nothing re-renders while zooming within a band.
  const fit = useApp((s) => s.fitZoom);
  const fromZoom = useStore((s) => levelOfZoom(s.transform[2], fit));
  return mode === "auto" ? fromZoom : FIXED[mode];
}

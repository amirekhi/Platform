"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { useEffect } from "react";

/**
 * Wheel and trackpad zoom that glides toward its target instead of jumping a step
 * per notch. The point under the cursor stays put. Replaces the built-in scroll zoom.
 */
export function useSmoothWheelZoom(opts: {
  minZoom: number;
  maxZoom: number;
  instant: boolean;
}) {
  const { getViewport, setViewport } = useReactFlow();
  const dom = useStore((s) => s.domNode);
  const { minZoom, maxZoom, instant } = opts;

  useEffect(() => {
    if (!dom) return;
    let target = 1;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const step = () => {
      const vp = getViewport();
      const diff = target - vp.zoom;
      const done = Math.abs(diff) < 0.0008 * target;
      const z = done || instant ? target : vp.zoom + diff * 0.2;
      const k = z / vp.zoom;
      void setViewport({
        x: cx - (cx - vp.x) * k,
        y: cy - (cy - vp.y) * k,
        zoom: z,
      });
      raf = done || instant ? 0 : requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.closest(
          ".nowheel, .react-flow__minimap, .react-flow__controls, .react-flow__panel",
        )
      )
        return;
      e.preventDefault();
      const r = dom.getBoundingClientRect();
      cx = e.clientX - r.left;
      cy = e.clientY - r.top;
      if (!raf) target = getViewport().zoom;
      const d =
        -e.deltaY *
        (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) *
        (e.ctrlKey ? 10 : 1);
      target = Math.min(maxZoom, Math.max(minZoom, target * Math.pow(2, d)));
      if (!raf) raf = requestAnimationFrame(step);
    };

    dom.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      dom.removeEventListener("wheel", onWheel, { capture: true });
      cancelAnimationFrame(raf);
    };
  }, [dom, getViewport, setViewport, minZoom, maxZoom, instant]);
}

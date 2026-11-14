"use client";

import { useEffect, useState } from "react";

/**
 * Lets something animate out before it leaves the page.
 * `mounted`: render it. `visible`: show it in its open position (flip your CSS on this).
 * It stays mounted for `ms` after `open` turns false so the closing motion can play.
 */
export function useExitable(open: boolean, ms = 300) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      const r = requestAnimationFrame(() =>
        requestAnimationFrame(() => setEntered(true)),
      );
      return () => cancelAnimationFrame(r);
    }
    const t = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, ms);
    return () => clearTimeout(t);
  }, [open, ms]);

  return { mounted, visible: open && entered };
}

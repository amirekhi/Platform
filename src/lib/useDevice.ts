"use client";

import { useSyncExternalStore } from "react";

/**
 * mobile: phones. tablet: tablets and small windows. desktop: the full layout with docked panels.
 * The server and the first render assume desktop, which is also the layout that never changes.
 */
export type Device = "mobile" | "tablet" | "desktop";

const MOBILE = "(max-width: 767px)";
const DESKTOP = "(min-width: 1200px)";

function subscribe(cb: () => void) {
  const a = window.matchMedia(MOBILE);
  const b = window.matchMedia(DESKTOP);
  a.addEventListener("change", cb);
  b.addEventListener("change", cb);
  return () => {
    a.removeEventListener("change", cb);
    b.removeEventListener("change", cb);
  };
}

const snapshot = (): Device =>
  window.matchMedia(MOBILE).matches ? "mobile" : window.matchMedia(DESKTOP).matches ? "desktop" : "tablet";

export function useDevice(): Device {
  return useSyncExternalStore(subscribe, snapshot, () => "desktop");
}

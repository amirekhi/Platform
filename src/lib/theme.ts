"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./themeInit";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function systemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** The theme actually showing right now (explicit choice, otherwise the system's). */
function current(): Theme {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return systemDark() ? "dark" : "light";
}

export function setTheme(t: Theme) {
  const root = document.documentElement;
  // Colours glide for a moment instead of flipping.
  root.classList.add("theme-anim");
  window.setTimeout(() => root.classList.remove("theme-anim"), 420);
  root.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", cb);
      return () => {
        listeners.delete(cb);
        mq.removeEventListener("change", cb);
      };
    },
    current,
    () => "light",
  );
}

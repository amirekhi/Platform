"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

/** Light / dark switch. The icon turns as it changes. */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-panel2 hover:text-ink"
    >
      <Sun
        size={16}
        className="absolute transition-all duration-300 ease-out"
        style={{
          opacity: dark ? 1 : 0,
          transform: dark ? "rotate(0) scale(1)" : "rotate(-90deg) scale(0.4)",
        }}
      />
      <Moon
        size={16}
        className="absolute transition-all duration-300 ease-out"
        style={{
          opacity: dark ? 0 : 1,
          transform: dark ? "rotate(90deg) scale(0.4)" : "rotate(0) scale(1)",
        }}
      />
    </button>
  );
}

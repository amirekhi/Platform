"use client";

import { createContext } from "react";
import type { LensState } from "@/domain/lenses";

/** The active lens for the canvas: who stands out, and what colour each node gets. */
export const LensContext = createContext<LensState | null>(null);

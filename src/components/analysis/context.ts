"use client";

import { createContext } from "react";
import type { Marks } from "./marks";

/** The analysis drawn on the canvas, or null when there is none. */
export const AnalysisContext = createContext<Marks | null>(null);

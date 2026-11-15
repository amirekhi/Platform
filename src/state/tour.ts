import { create } from "zustand";

/** First-run tour + the short coaching line shown after a "try this". */
type TourState = {
  active: boolean;
  step: number;
  coach: string | null;
  start: () => void;
  stop: () => void;
  setStep: (n: number) => void;
  say: (msg: string | null) => void;
};

let coachTimer: ReturnType<typeof setTimeout> | undefined;

export const useTour = create<TourState>((set) => ({
  active: false,
  step: 0,
  coach: null,
  start: () => set({ active: true, step: 0, coach: null }),
  stop: () => set({ active: false }),
  setStep: (step) => set({ step }),
  say: (coach) => {
    clearTimeout(coachTimer);
    set({ coach });
    if (coach) coachTimer = setTimeout(() => set({ coach: null }), 9000);
  },
}));

export const TOUR_KEY = "eco.tour";

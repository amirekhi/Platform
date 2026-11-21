import { useApp } from "@/state/store";
import { useTour } from "@/state/tour";

export type Try = {
  id: string;
  title: string;
  why: string;
  run: () => Promise<void>;
};

const app = () => useApp.getState();
const say = (m: string) => useTour.getState().say(m);

/** Short guided starting points. Each one moves the view, then says what to do next. */
export const TRIES: Try[] = [
  {
    id: "pos",
    title: "Open Point of Sale and follow it to a store",
    why: "See how a system reaches the shops that use it.",
    run: async () => {
      await app().focusNode("sys-pos");
      say(
        "Point of Sale is in focus. Press E to expand it, then follow its lines down to a store.",
      );
    },
  },
  {
    id: "problems",
    title: "Find what is broken right now",
    why: "Healthy things fade. Amber is degraded, red is down.",
    run: async () => {
      app().setLens("problems");
      say("Problems lens on. Only things that need attention stay bright.");
    },
  },
  {
    id: "hardware",
    title: "Follow checkout down to the hardware",
    why: "See every route from a service to its rack and data centre.",
    run: async () => {
      await app().focusNode("svc-checkout");
      say(
        "Checkout Service is selected. Under Where it runs, every route goes service, deployment, cluster, machine, host, rack, data centre. Click any step to jump to it.",
      );
    },
  },
  {
    id: "hosting",
    title: "See which data centre everything runs in",
    why: "Colour by site. Red marks anything with no recorded placement.",
    run: async () => {
      app().setLens("hosting");
      say(
        "Where it runs lens on. Colour is the data centre. Click a row in the legend to isolate it, or the red row to see what is not placed yet.",
      );
    },
  },
  {
    id: "datacenter",
    title: "Go from a datacenter to a single machine",
    why: "Drill down with Enter, climb back with Backspace.",
    run: async () => {
      await app().focusNode("dc-fra1");
      say(
        "Frankfurt datacenter selected. Press Enter to go inside, then again on a rack and a host.",
      );
    },
  },
  {
    id: "blast",
    title: "See what breaks if the catalog database goes down",
    why: "Blast radius lights up everything that depends on it.",
    run: async () => {
      await app().focusNode("db-catalog");
      app().startBlast("db-catalog");
      say(
        "Orange rings are affected, numbered by hops. Use Reach to narrow it. Esc closes.",
      );
    },
  },
  {
    id: "owner",
    title: "See who owns what",
    why: "Colour everything by owning team.",
    run: async () => {
      app().setLens("owner");
      say("Owner lens on. Click a team in the legend to spotlight its things.");
    },
  },
  {
    id: "docs",
    title: "Spot what has no documentation",
    why: "Gaps in docs stand out at a glance.",
    run: async () => {
      app().setLens("docs");
      say("Docs lens on. Dim means documented; bright means a gap.");
    },
  },
];

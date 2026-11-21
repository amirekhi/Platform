import type { GraphSnapshot } from "./analysis/snapshot";
import {
  assessProgramme,
  type ComplianceModel,
  deviationCounter,
} from "./compliance";
import { HEALTH_COLOR, LAYERS, NODE_KINDS } from "./registry";
import { PLACED_KINDS, sitesOf } from "./placement";
import {
  computeScope,
  processFrameworks,
  programmeFor,
  supportingNodes,
} from "./scope";
import type { Id, NodeView } from "./types";

/**
 * A lens changes what colour means. One lens at a time: the shapes keep their silhouette,
 * the colour (and what stands out) answers one question for one kind of person.
 */
export type LensId =
  | "kind"
  | "problems"
  | "business"
  | "scope"
  | "assurance"
  | "layer"
  | "hosting"
  | "owner"
  | "lifecycle"
  | "criticality"
  | "security"
  | "docs"
  | "monitoring"
  | "coupling"
  | "external";

/** What the lenses that look beyond one node need: the whole graph and the compliance model. */
export interface LensData {
  snap: GraphSnapshot;
  compliance: ComplianceModel;
}

export interface LensCategory {
  key: string;
  label: string;
  color: string;
  /** Stands out when the lens dims the rest. */
  attention?: boolean;
}

export interface LensDef {
  id: LensId;
  label: string;
  icon: string;
  /** Who tends to reach for it. */
  audience: string;
  /** The question it answers. */
  question: string;
  /** Recolour shapes by category (false: keep kind colours). */
  tints: boolean;
  /** Dim everything that is not "attention" (heat-vision style). */
  dims: boolean;
  classify?: (n: NodeView, data?: LensData) => LensCategory | null;
  /** Fixed order of categories in the legend (others appended as found). */
  order?: LensCategory[];
}

const C = {
  red: "#f87171",
  orange: "#fb923c",
  amber: "#fbbf24",
  green: "#34d399",
  teal: "#2dd4bf",
  blue: "#60a5fa",
  indigo: "#818cf8",
  violet: "#a78bfa",
  pink: "#f472b6",
  slate: "#94a3b8",
};

const cat = (
  key: string,
  label: string,
  color: string,
  attention = false,
): LensCategory => ({ key, label, color, attention });

const LAYER_COLORS: Record<string, string> = {
  organisation: C.indigo,
  party: "#22d3ee",
  process: C.pink,
  business: C.violet,
  application: C.blue,
  data: C.teal,
  delivery: C.green,
  infrastructure: C.amber,
  physical: C.orange,
  external: C.slate,
};

const OWNER_PALETTE = [
  C.blue,
  C.green,
  C.violet,
  C.orange,
  C.pink,
  C.teal,
  C.indigo,
  C.amber,
];
const ownerColor = (id: Id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return OWNER_PALETTE[h % OWNER_PALETTE.length];
};

/** Layers where "who owns it" and "is it monitored" make sense. */
const TECH = new Set([
  "application",
  "data",
  "delivery",
  "infrastructure",
  "physical",
]);
const layerOf = (n: NodeView) => NODE_KINDS[n.kind].layer;

const NO_PROBLEM = cat("healthy", "Healthy", C.green);

/* ---- Where it runs ---- */

const NOT_PLACED = cat("noplace", "No placement recorded", C.red, true);
const MULTI_SITE = cat("multisite", "More than one site", C.violet, true);
const SITE_PALETTE = [C.blue, C.amber, C.teal, C.pink, C.green, C.orange];
const siteColor = (id: Id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SITE_PALETTE[h % SITE_PALETTE.length];
};

/* ---- Lenses that look across the graph and the compliance model ---- */

const PARTY = cat("client", "Clients", "#22d3ee", true);
const ROLE = cat("role", "Roles", C.orange, true);
const PROC = cat("process", "Business processes", C.pink, true);
const RUNS = cat("runs", "Runs a process", C.violet, true);
const OTHER_TECH = cat("tech", "Other technology", C.slate);

/** Parts of the enterprise that are technology, as opposed to organisation, people and process. */
const isTech = (n: NodeView) => {
  const layer = layerOf(n);
  return layer === "business" || TECH.has(layer) || layer === "external";
};

const SCOPE_PROC = cat("regproc", "Regulated process", C.amber, true);
const SCOPE_OK = cat("scopeok", "In scope, has a programme", C.green, true);
const SCOPE_GAP = cat("scopegap", "In scope, no programme", C.red, true);
const SCOPE_NOT = cat("scopenot", "Not in scope", C.slate);

const A_APPROVED = cat("a-ok", "All approved", C.green, true);
const A_REVIEW = cat("a-review", "In review", C.blue, true);
const A_WEAK = cat("a-weak", "Weak evidence", C.amber, true);
const A_GAPS = cat("a-gaps", "Has gaps", C.red, true);
const A_NONE = cat("a-none", "In scope, no programme", "#c084fc", true);
const A_RANK = [A_NONE, A_GAPS, A_WEAK, A_REVIEW, A_APPROVED];

const assuranceCache = new WeakMap<
  ComplianceModel,
  Map<string, LensCategory>
>();
/** One category per programme, from how its requirements stand. */
function programmeCategory(
  model: ComplianceModel,
  programmeId: string,
): LensCategory {
  let m = assuranceCache.get(model);
  if (!m) {
    m = new Map();
    const dev = deviationCounter(model.docs);
    for (const p of model.programmes) {
      const a = assessProgramme(p, model, dev);
      m.set(
        p.id,
        a.counts[0] > 0
          ? A_GAPS
          : a.counts[1] > 0
            ? A_WEAK
            : a.counts[2] > 0
              ? A_REVIEW
              : A_APPROVED,
      );
    }
    assuranceCache.set(model, m);
  }
  return m.get(programmeId) ?? A_NONE;
}

/** The assurance category of a technology node: its programme's, or "no programme" if in scope. */
function assuranceOf(n: { id: string }, d: LensData): LensCategory | null {
  if (!computeScope(d.snap).has(n.id)) return null;
  const p = programmeFor(d.snap, d.compliance, n.id);
  return p ? programmeCategory(d.compliance, p.id) : A_NONE;
}

export const LENSES: LensDef[] = [
  {
    id: "kind",
    label: "What it is",
    icon: "shapes",
    audience: "Everyone",
    question: "What kind of thing is each node?",
    tints: false,
    dims: false,
  },
  {
    id: "problems",
    label: "Problems",
    icon: "alert",
    audience: "On-call, SRE, support, managers",
    question: "What is broken or degraded right now?",
    tints: false,
    dims: true,
    classify: (n) =>
      n.health === "down"
        ? cat("down", "Down", HEALTH_COLOR.down, true)
        : n.health === "degraded"
          ? cat("degraded", "Degraded", HEALTH_COLOR.degraded, true)
          : n.alertCount > 0
            ? cat("inside", "Problem inside", C.orange, true)
            : NO_PROBLEM,
    order: [
      cat("down", "Down", HEALTH_COLOR.down, true),
      cat("degraded", "Degraded", HEALTH_COLOR.degraded, true),
      cat("inside", "Problem inside", C.orange, true),
      NO_PROBLEM,
    ],
  },
  {
    id: "business",
    label: "Business map",
    icon: "briefcase",
    audience: "Business analysts, process owners, product",
    question: "Who needs what, and which systems run which processes?",
    tints: true,
    dims: true,
    classify: (n, d) => {
      if (n.kind === "client") return PARTY;
      if (n.kind === "role") return ROLE;
      if (n.kind === "process") return PROC;
      if (d && supportingNodes(d.snap).has(n.id)) return RUNS;
      return isTech(n) ? OTHER_TECH : null;
    },
    order: [PARTY, ROLE, PROC, RUNS, OTHER_TECH],
  },
  {
    id: "scope",
    label: "Regulated scope",
    icon: "crosshair",
    audience: "Quality, compliance, auditors",
    question:
      "Which systems must be validated, and which of those have no programme?",
    tints: true,
    dims: true,
    classify: (n, d) => {
      if (!d) return null;
      if (n.kind === "process")
        return processFrameworks(d.snap, n.id).length ? SCOPE_PROC : null;
      if (!isTech(n)) return null;
      if (!computeScope(d.snap).has(n.id)) return SCOPE_NOT;
      return programmeFor(d.snap, d.compliance, n.id) ? SCOPE_OK : SCOPE_GAP;
    },
    order: [SCOPE_GAP, SCOPE_PROC, SCOPE_OK, SCOPE_NOT],
  },
  {
    id: "assurance",
    label: "Assurance",
    icon: "shield",
    audience: "Quality, system owners, auditors",
    question: "How solid is the evidence for each in-scope system and process?",
    tints: true,
    dims: true,
    classify: (n, d) => {
      if (!d) return null;
      if (n.kind === "process") {
        if (!processFrameworks(d.snap, n.id).length) return null;
        // A process is only as assured as the weakest thing that runs it.
        let worst: LensCategory | null = null;
        for (const r of d.snap.outgoing.get(n.id) ?? []) {
          if (r.type !== "supported_by") continue;
          const c = assuranceOf({ id: r.targetId }, d);
          if (c && (!worst || A_RANK.indexOf(c) < A_RANK.indexOf(worst)))
            worst = c;
        }
        return worst;
      }
      return isTech(n) ? assuranceOf(n, d) : null;
    },
    order: [A_NONE, A_GAPS, A_WEAK, A_REVIEW, A_APPROVED],
  },
  {
    id: "layer",
    label: "Layers",
    icon: "layers",
    audience: "Architects, new joiners",
    question:
      "Which layer of the enterprise is this: business, application, data, infrastructure?",
    tints: true,
    dims: false,
    classify: (n) => {
      const id = layerOf(n);
      return cat(
        id,
        LAYERS.find((l) => l.id === id)?.label ?? id,
        LAYER_COLORS[id] ?? C.slate,
      );
    },
    order: LAYERS.map((l) => cat(l.id, l.label, LAYER_COLORS[l.id] ?? C.slate)),
  },
  {
    id: "hosting",
    label: "Where it runs",
    icon: "server",
    audience: "Platform, SRE, capacity and disaster-recovery planning",
    question:
      "Which data centre does it run in, and what has no recorded placement?",
    tints: true,
    dims: false,
    classify: (n, d) => {
      if (!d || !PLACED_KINDS.has(n.kind)) return null;
      const sites = sitesOf(d.snap, n.id);
      if (sites.length === 0) return NOT_PLACED;
      if (sites.length > 1) return MULTI_SITE;
      const s = sites[0];
      return cat(`site:${s}`, d.snap.nodes.get(s)?.name ?? s, siteColor(s));
    },
    order: [NOT_PLACED, MULTI_SITE],
  },
  {
    id: "owner",
    label: "Ownership",
    icon: "users",
    audience: "Team leads, managers, incident response",
    question: "Which team owns this, and what has no owner?",
    tints: true,
    dims: false,
    classify: (n) => {
      const o = n.details.owner;
      if (o) return cat(o.id, o.name, ownerColor(o.id));
      if (n.kind === "team" || !TECH.has(layerOf(n))) return null;
      return cat("none", "No owner", C.red, true);
    },
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    icon: "hourglass",
    audience: "Product owners, architects, planners",
    question: "What is new, live, on its way out, or already retired?",
    tints: true,
    dims: false,
    classify: (n) =>
      n.lifecycle === "proposed"
        ? cat("proposed", "Proposed", C.violet)
        : n.lifecycle === "active"
          ? cat("active", "Active", C.green)
          : n.lifecycle === "deprecated"
            ? cat("deprecated", "Deprecated", C.amber, true)
            : cat("retired", "Retired", C.slate),
    order: [
      cat("proposed", "Proposed", C.violet),
      cat("active", "Active", C.green),
      cat("deprecated", "Deprecated", C.amber, true),
      cat("retired", "Retired", C.slate),
    ],
  },
  {
    id: "criticality",
    label: "Criticality",
    icon: "flame",
    audience: "Business owners, risk, incident commanders",
    question: "How much does the business depend on this?",
    tints: true,
    dims: false,
    classify: (n) =>
      n.tags.includes("tier-1")
        ? cat("t1", "Tier 1", C.red, true)
        : n.tags.includes("revenue-critical")
          ? cat("rev", "Revenue critical", C.orange, true)
          : n.tags.includes("tier-2")
            ? cat("t2", "Tier 2", C.amber)
            : n.tags.includes("tier-3")
              ? cat("t3", "Tier 3", C.blue)
              : null,
    order: [
      cat("t1", "Tier 1", C.red, true),
      cat("rev", "Revenue critical", C.orange, true),
      cat("t2", "Tier 2", C.amber),
      cat("t3", "Tier 3", C.blue),
    ],
  },
  {
    id: "security",
    label: "Data & security",
    icon: "shield",
    audience: "Security, compliance, auditors, privacy",
    question: "Where does card data, personal data or security tooling live?",
    tints: true,
    dims: true,
    classify: (n) =>
      n.tags.includes("pci")
        ? cat("pci", "Card data (PCI)", C.red, true)
        : n.tags.includes("pii")
          ? cat("pii", "Personal data", C.violet, true)
          : n.tags.includes("security")
            ? cat("sec", "Security system", C.teal, true)
            : null,
    order: [
      cat("pci", "Card data (PCI)", C.red, true),
      cat("pii", "Personal data", C.violet, true),
      cat("sec", "Security system", C.teal, true),
    ],
  },
  {
    id: "docs",
    label: "Documentation",
    icon: "book",
    audience: "Tech writers, onboarding, auditors, team leads",
    question: "What is well documented, and where are the gaps?",
    tints: true,
    dims: true,
    classify: (n) =>
      n.details.docs === 0 && n.details.diagrams === 0
        ? cat("none", "No docs or diagrams", C.red, true)
        : n.details.docs > 0 && n.details.diagrams > 0
          ? cat("full", "Docs and diagrams", C.green)
          : cat("some", "Partly documented", C.amber),
    order: [
      cat("none", "No docs or diagrams", C.red, true),
      cat("some", "Partly documented", C.amber),
      cat("full", "Docs and diagrams", C.green),
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: "activity",
    audience: "SRE, platform, operations",
    question: "What is watched, and where are the blind spots?",
    tints: true,
    dims: true,
    classify: (n) => {
      if (!TECH.has(layerOf(n))) return null;
      return n.details.monitoring || n.health !== "unknown"
        ? cat("on", "Monitored", C.green)
        : cat("off", "Not monitored", C.amber, true);
    },
    order: [
      cat("off", "Not monitored", C.amber, true),
      cat("on", "Monitored", C.green),
    ],
  },
  {
    id: "coupling",
    label: "Connectedness",
    icon: "network",
    audience: "Architects, developers, change managers",
    question: "Which nodes are hubs that many things depend on?",
    tints: true,
    dims: false,
    classify: (n) => {
      const r = n.details.relations;
      return r >= 8
        ? cat("hub", "Hub (8+ links)", C.red, true)
        : r >= 4
          ? cat("busy", "Busy (4–7)", C.amber)
          : r >= 1
            ? cat("light", "Light (1–3)", C.blue)
            : cat("alone", "Isolated", C.slate);
    },
    order: [
      cat("hub", "Hub (8+ links)", C.red, true),
      cat("busy", "Busy (4–7)", C.amber),
      cat("light", "Light (1–3)", C.blue),
      cat("alone", "Isolated", C.slate),
    ],
  },
  {
    id: "external",
    label: "Third parties",
    icon: "building",
    audience: "Procurement, legal, vendor managers, security",
    question: "What do we depend on that someone else runs?",
    tints: true,
    dims: true,
    classify: (n) =>
      n.external || n.tags.includes("vendor")
        ? cat("third", "Third party", C.pink, true)
        : null,
    order: [cat("third", "Third party", C.pink, true)],
  },
];

export const LENS_BY_ID = Object.fromEntries(
  LENSES.map((l) => [l.id, l]),
) as Record<LensId, LensDef>;

export interface LensState {
  id: LensId;
  /** Category per node (null: not part of this lens). */
  cat: Map<Id, LensCategory | null>;
  /** Nodes that stand out; everything else dims. Null when nothing dims. */
  hot: Set<Id> | null;
  /** Legend rows with counts. */
  legend: { cat: LensCategory; count: number }[];
  focus: string | null;
}

export function buildLensState(
  nodes: NodeView[],
  id: LensId,
  focus: string | null,
  data?: LensData,
): LensState {
  const def = LENS_BY_ID[id];
  const map = new Map<Id, LensCategory | null>();
  const counts = new Map<string, { cat: LensCategory; count: number }>();
  if (def.classify) {
    // Outside nodes are classified like any other node.
    for (const n of nodes) {
      const c = def.classify(n, data);
      map.set(n.id, c);
      if (c) {
        const e = counts.get(c.key) ?? { cat: c, count: 0 };
        e.count++;
        counts.set(c.key, e);
      }
    }
  }
  const legend: LensState["legend"] = [];
  for (const o of def.order ?? []) {
    const e = counts.get(o.key);
    if (e) legend.push(e);
    else if (o.attention) legend.push({ cat: o, count: 0 });
    counts.delete(o.key);
  }
  legend.push(...[...counts.values()].sort((a, b) => b.count - a.count));

  let hot: Set<Id> | null = null;
  const valid = focus && legend.some((l) => l.cat.key === focus) ? focus : null;
  if (valid) {
    hot = new Set([...map].filter(([, c]) => c?.key === valid).map(([k]) => k));
  } else if (def.dims) {
    const h = new Set([...map].filter(([, c]) => c?.attention).map(([k]) => k));
    hot = h.size > 0 ? h : null;
  }
  if (hot && hot.size === 0) hot = null;
  return { id, cat: map, hot, legend, focus: valid };
}

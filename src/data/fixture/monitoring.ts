import { NODE_KINDS } from "@/domain/registry";
import type {
  Alert,
  GraphNode,
  Health,
  Metric,
  MonitoringSnapshot,
} from "@/domain/types";

/** Deterministic pseudo-random generator so fake data is stable between renders. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(
  rand: () => number,
  base: number,
  noise: number,
  spikeAtEnd = 0,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 30; i++) {
    const wave = Math.sin(i / 4) * noise * 0.5;
    const jitter = (rand() - 0.5) * noise;
    const spike = i > 22 ? spikeAtEnd * ((i - 22) / 7) : 0;
    pts.push(Math.max(0, +(base + wave + jitter + spike).toFixed(2)));
  }
  return pts;
}

function metric(
  rand: () => number,
  key: string,
  label: string,
  unit: string,
  base: number,
  noise: number,
  opts: { threshold?: number; invert?: boolean; spike?: number } = {},
): Metric {
  const s = series(rand, base, noise, opts.spike ?? 0);
  return {
    key,
    label,
    unit,
    current: s[s.length - 1],
    series: s,
    threshold: opts.threshold,
    invert: opts.invert,
  };
}

/** Hand-picked overrides so the prototype has interesting states to explore. */
const OVERRIDES: Record<
  string,
  { health: Health; alerts?: Alert[]; spike?: number }
> = {
  "svc-payments": {
    health: "degraded",
    spike: 3.4,
    alerts: [
      {
        id: "al-1",
        severity: "warning",
        title: "Authorisation error rate above 2% for 5 min",
        since: "2026-11-10T19:12:00Z",
      },
    ],
  },
  "svc-shipping": {
    health: "down",
    spike: 6,
    alerts: [
      {
        id: "al-2",
        severity: "critical",
        title: "Carrier API unreachable, shipment creation failing",
        since: "2026-11-10T18:40:00Z",
      },
      {
        id: "al-3",
        severity: "warning",
        title: "Consumer lag above 10 000 on order-events",
        since: "2026-11-10T18:55:00Z",
      },
    ],
  },
  "q-order-events": {
    health: "degraded",
    alerts: [
      {
        id: "al-4",
        severity: "warning",
        title: "Consumer group shipping-v2 lagging",
        since: "2026-11-10T18:55:00Z",
      },
    ],
  },
  "hw-fra-a12-07": {
    health: "degraded",
    spike: 14,
    alerts: [
      {
        id: "al-6",
        severity: "warning",
        title: "CPU package temperature above 82C, fan 3 degraded",
        since: "2026-11-10T17:20:00Z",
      },
    ],
  },
  "pipe-checkout": {
    health: "healthy",
  },
  "db-orders": { health: "healthy" },
  "svc-legacy-notify": {
    health: "degraded",
    alerts: [
      {
        id: "al-5",
        severity: "info",
        title: "Deprecated service still receiving traffic",
        since: "2026-10-14T10:00:00Z",
      },
    ],
  },
};

const NODE_HEALTH_FALLBACK: Health = "healthy";

export function buildMonitoring(node: GraphNode): MonitoringSnapshot | null {
  const def = NODE_KINDS[node.kind];
  if (!def.monitorable) return null;
  if (node.lifecycle === "proposed") return null;
  const rand = rng(node.id);
  const ov = OVERRIDES[node.id];
  const spike = ov?.spike ?? 0;
  let metrics: Metric[] = [];

  switch (node.kind) {
    case "service":
    case "api":
    case "ui-app":
    case "deployment":
      metrics = [
        metric(rand, "p95", "p95 latency", "ms", 80 + rand() * 120, 30, {
          threshold: 400,
          spike: spike * 80,
        }),
        metric(rand, "errors", "Error rate", "%", 0.2 + rand() * 0.4, 0.2, {
          threshold: 2,
          spike,
        }),
        metric(rand, "rps", "Requests", "req/s", 40 + rand() * 400, 60),
      ];
      break;
    case "database":
      metrics = [
        metric(rand, "conns", "Connections", "", 60 + rand() * 120, 20, {
          threshold: 400,
        }),
        metric(rand, "ops", "Operations", "ops/s", 800 + rand() * 2000, 200),
        metric(rand, "lag", "Replication lag", "s", 0.3 + rand(), 0.4, {
          threshold: 5,
        }),
      ];
      break;
    case "cache":
      metrics = [
        metric(rand, "hit", "Hit rate", "%", 92 + rand() * 5, 2, {
          threshold: 80,
          invert: true,
        }),
        metric(rand, "mem", "Memory", "%", 55 + rand() * 20, 4, {
          threshold: 90,
        }),
      ];
      break;
    case "queue":
      metrics = [
        metric(rand, "lag", "Consumer lag", "msgs", 40 + rand() * 120, 40, {
          threshold: 10000,
          spike: ov ? 6000 : 0,
        }),
        metric(rand, "rate", "Throughput", "msg/s", 100 + rand() * 300, 50),
      ];
      break;
    case "cluster":
    case "server":
      metrics = [
        metric(rand, "cpu", "CPU", "%", 35 + rand() * 25, 8, { threshold: 85 }),
        metric(rand, "mem", "Memory", "%", 50 + rand() * 20, 6, {
          threshold: 90,
        }),
      ];
      break;
    case "hardware":
      metrics = [
        metric(rand, "temp", "CPU temperature", "C", 58 + rand() * 6, 3, {
          threshold: 82,
          spike,
        }),
        metric(rand, "power", "Power draw", "W", 380 + rand() * 80, 25, {
          threshold: 700,
        }),
        metric(rand, "disk", "NVMe wear", "%", 12 + rand() * 6, 0.4),
      ];
      break;
    case "network":
      metrics = [
        metric(rand, "tput", "Throughput", "Gbit/s", 6 + rand() * 6, 2, {
          threshold: 90,
        }),
        metric(rand, "loss", "Packet loss", "%", 0.01 + rand() * 0.03, 0.02, {
          threshold: 1,
        }),
      ];
      break;
    case "datacenter":
      metrics = [
        metric(rand, "pwr", "IT load", "kW", 310 + rand() * 40, 12, {
          threshold: 440,
        }),
        metric(
          rand,
          "inlet",
          "Inlet temperature",
          "C",
          22 + rand() * 1.5,
          0.6,
          { threshold: 27 },
        ),
      ];
      break;
    case "pipeline":
      metrics = [
        metric(rand, "success", "Success rate", "%", 90 + rand() * 8, 3, {
          threshold: 80,
          invert: true,
        }),
        metric(rand, "duration", "Duration", "min", 8 + rand() * 6, 2, {
          threshold: 25,
        }),
      ];
      break;
    default:
      return null;
  }

  const health = ov?.health ?? NODE_HEALTH_FALLBACK;
  return {
    nodeId: node.id,
    health,
    metrics,
    alerts: ov?.alerts ?? [],
    links: [
      {
        label: "Grafana dashboard",
        url: `https://grafana.example.internal/d/${node.id}`,
      },
      {
        label: "Logs",
        url: `https://logs.example.internal/search?service=${node.id}`,
      },
    ],
    observedAt: "2026-11-10T20:55:00Z",
  };
}

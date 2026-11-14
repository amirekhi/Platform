"use client";

import { AlertTriangle, ExternalLink, Info, OctagonAlert } from "lucide-react";
import { getDataSource } from "@/data";
import { HEALTH_COLOR } from "@/domain/registry";
import type { Alert, Id, Metric } from "@/domain/types";
import { useAsync } from "@/lib/useAsync";
import { Empty, SectionTitle } from "./parts";
import { Sparkline } from "./Sparkline";

function metricState(m: Metric): "ok" | "warn" {
  if (m.threshold === undefined) return "ok";
  return (m.invert ? m.current < m.threshold : m.current > m.threshold)
    ? "warn"
    : "ok";
}

const SEVERITY = {
  info: { icon: Info, color: "#60a5fa" },
  warning: { icon: AlertTriangle, color: "#fbbf24" },
  critical: { icon: OctagonAlert, color: "#f87171" },
} as const;

export function MonitoringPane({ nodeId }: { nodeId: Id }) {
  const { data } = useAsync(`mon:${nodeId}`, () =>
    getDataSource().getMonitoring(nodeId),
  );
  if (data === undefined) return <p className="text-sm text-muted">Loading…</p>;
  if (data === null) return <Empty>This node is not monitored.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize"
          style={{
            background: `${HEALTH_COLOR[data.health]}22`,
            color: HEALTH_COLOR[data.health],
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: HEALTH_COLOR[data.health] }}
          />
          {data.health}
        </span>
        <span className="text-[11.5px] text-muted">
          Observed {new Date(data.observedAt).toLocaleString()} ·{" "}
          <em>demo data</em>
        </span>
      </div>

      {data.alerts.length > 0 && (
        <>
          <SectionTitle>Active alerts</SectionTitle>
          <ul className="space-y-1.5">
            {data.alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Metrics (last 30 intervals)</SectionTitle>
      <div className="grid gap-2">
        {data.metrics.map((m) => {
          const warn = metricState(m) === "warn";
          const color = warn ? "#fbbf24" : "var(--accent)";
          return (
            <div
              key={m.key}
              className="rounded-lg border border-line bg-panel p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted">{m.label}</span>
                <span
                  className="font-mono text-[15px] font-semibold"
                  style={{ color: warn ? "#fbbf24" : undefined }}
                >
                  {m.current >= 100
                    ? Math.round(m.current)
                    : m.current.toFixed(1)}
                  <span className="ml-0.5 text-[11px] font-normal text-muted">
                    {m.unit}
                  </span>
                </span>
              </div>
              <Sparkline
                values={m.series}
                color={color}
                threshold={m.threshold}
              />
            </div>
          );
        })}
      </div>

      <SectionTitle>Links</SectionTitle>
      <ul className="space-y-1">
        {data.links.map((l) => (
          <li
            key={l.label}
            className="flex items-center gap-1.5 text-[12.5px] text-muted"
            title={`${l.url} (placeholder link)`}
          >
            <ExternalLink size={12} /> {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const s = SEVERITY[alert.severity];
  const Icon = s.icon;
  return (
    <li className="flex items-start gap-2 rounded-lg border border-line bg-panel p-2.5">
      <span style={{ color: s.color }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-ink">{alert.title}</div>
        <div className="text-[11px] text-muted">
          {alert.severity} · since {new Date(alert.since).toLocaleString()}
        </div>
      </div>
    </li>
  );
}

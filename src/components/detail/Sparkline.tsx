"use client";

export function Sparkline({
  values,
  color,
  threshold,
  width = 220,
  height = 44,
}: {
  values: number[];
  color: string;
  threshold?: number;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values, threshold ?? Infinity);
  const max = Math.max(...values, threshold ?? -Infinity);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2);
  const line = values
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-11 w-full"
      role="img"
      aria-label="Trend over the last 30 intervals"
    >
      <path d={area} fill={color} opacity={0.12} />
      {threshold !== undefined && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="var(--muted)"
          strokeDasharray="3 3"
          strokeWidth={1}
          opacity={0.7}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={2.6}
        fill={color}
      />
    </svg>
  );
}

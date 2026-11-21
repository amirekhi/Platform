import type { CSSProperties, ReactNode, SVGProps } from "react";
import { NODE_KINDS, type ShapeId } from "@/domain/registry";
import type { NodeKind } from "@/domain/types";

/**
 * One silhouette per kind of node. All are drawn in a 100 x 100 box so they
 * can be scaled freely. `body` props style the filled outline, `line` props
 * style the interior detail strokes.
 */
type Ctx = {
  body: SVGProps<SVGElement>;
  line: SVGProps<SVGElement>;
  fill: CSSProperties;
  color: string;
};

const R = (c: Ctx, p: SVGProps<SVGRectElement>) => (
  <rect {...(c.body as SVGProps<SVGRectElement>)} style={c.fill} {...p} />
);
const P = (c: Ctx, d: string) => (
  <path {...(c.body as SVGProps<SVGPathElement>)} style={c.fill} d={d} />
);
const Poly = (c: Ctx, points: string) => (
  <polygon
    {...(c.body as SVGProps<SVGPolygonElement>)}
    style={c.fill}
    points={points}
  />
);
const L = (c: Ctx, d: string) => (
  <path {...(c.line as SVGProps<SVGPathElement>)} d={d} fill="none" />
);

const SHAPES: Record<ShapeId, (c: Ctx) => ReactNode> = {
  square: (c) => (
    <>
      {R(c, { x: 6, y: 6, width: 88, height: 88, rx: 15 })}
      {L(c, "M6 27 H94")}
    </>
  ),
  window: (c) => (
    <>
      {R(c, { x: 6, y: 14, width: 88, height: 72, rx: 9 })}
      {L(c, "M6 33 H94")}
      <circle cx="17" cy="23.5" r="2.4" fill={c.color} />
      <circle cx="26" cy="23.5" r="2.4" fill={c.color} />
      <circle cx="35" cy="23.5" r="2.4" fill={c.color} />
    </>
  ),
  hexagon: (c) => Poly(c, "50,4 92,27 92,73 50,96 8,73 8,27"),
  ticket: (c) => (
    <>
      {P(c, "M6 20 H94 V40 A10 10 0 0 0 94 60 V80 H6 V60 A10 10 0 0 0 6 40 Z")}
      <path
        {...(c.line as SVGProps<SVGPathElement>)}
        d="M74 26 V74"
        strokeDasharray="3 4"
        fill="none"
      />
    </>
  ),
  book: (c) => (
    <>
      {R(c, { x: 14, y: 6, width: 74, height: 88, rx: 7 })}
      {L(c, "M28 6 V94")}
      {L(c, "M40 78 H76")}
    </>
  ),
  cylinder: (c) => (
    <>
      {P(c, "M10 20 V80 A40 13 0 0 0 90 80 V20 A40 13 0 0 1 10 20 Z")}
      <ellipse
        {...(c.body as SVGProps<SVGEllipseElement>)}
        style={c.fill}
        cx="50"
        cy="20"
        rx="40"
        ry="13"
      />
      {L(c, "M10 48 A40 13 0 0 0 90 48")}
      {L(c, "M10 66 A40 13 0 0 0 90 66")}
    </>
  ),
  grid: (c) => (
    <>
      {R(c, { x: 8, y: 14, width: 84, height: 72, rx: 7 })}
      {L(c, "M8 36 H92 M8 61 H92 M36 14 V86 M64 14 V86")}
    </>
  ),
  diamond: (c) => (
    <>
      {Poly(c, "50,3 97,50 50,97 3,50")}
      {L(c, "M50 3 V97 M3 50 H97")}
    </>
  ),
  homeplate: (c) => (
    <>
      {Poly(c, "6,22 68,22 94,50 68,78 6,78")}
      {L(c, "M20 34 V66 M32 34 V66")}
    </>
  ),
  folder: (c) =>
    P(
      c,
      "M6 24 Q6 15 15 15 H38 L47 26 H85 Q94 26 94 35 V80 Q94 89 85 89 H15 Q6 89 6 80 Z",
    ),
  chevron: (c) => Poly(c, "6,22 64,22 94,50 64,78 6,78 34,50"),
  box: (c) => (
    <>
      {Poly(c, "50,5 92,27 92,73 50,95 8,73 8,27")}
      {L(c, "M8 27 L50 50 L92 27 M50 50 V95")}
    </>
  ),
  trapezoid: (c) => (
    <>
      {Poly(c, "24,18 76,18 95,82 5,82")}
      {L(c, "M30 36 H70")}
    </>
  ),
  cloud: (c) =>
    P(
      c,
      "M27 80 C8 80 4 56 24 52 C22 30 48 20 60 36 C76 26 96 42 86 60 C100 64 94 80 78 80 Z",
    ),
  stack: (c) => (
    <>
      <rect
        {...(c.line as SVGProps<SVGRectElement>)}
        x="24"
        y="6"
        width="70"
        height="46"
        rx="8"
        fill="none"
      />
      <rect
        {...(c.line as SVGProps<SVGRectElement>)}
        x="15"
        y="15"
        width="70"
        height="46"
        rx="8"
        fill="none"
      />
      {R(c, { x: 6, y: 26, width: 70, height: 66, rx: 9 })}
    </>
  ),
  rackunit: (c) => (
    <>
      {R(c, { x: 6, y: 24, width: 88, height: 52, rx: 7 })}
      <circle cx="19" cy="38" r="3" fill={c.color} />
      <circle cx="19" cy="50" r="3" fill={c.color} opacity=".5" />
      {L(c, "M30 62 H84 M30 38 H84")}
    </>
  ),
  /**
   * A machine inside a machine: an outer frame (the host) holding a dashed inner frame (the
   * virtual machine) with a few lines of content. Distinct from the solid, flat server unit.
   */
  vm: (c) => (
    <>
      {R(c, { x: 6, y: 10, width: 88, height: 80, rx: 11 })}
      <rect
        {...(c.line as SVGProps<SVGRectElement>)}
        x="22"
        y="27"
        width="56"
        height="46"
        rx="6"
        fill="none"
        strokeDasharray="5 4"
      />
      {L(c, "M34 42 H66 M34 52 H58 M34 62 H48")}
      <circle cx="17" cy="20" r="2.4" fill={c.color} />
      <circle cx="26" cy="20" r="2.4" fill={c.color} opacity=".5" />
    </>
  ),
  arch: (c) => (
    <>
      {P(c, "M6 90 V50 A44 44 0 0 1 94 50 V90 Z")}
      {L(c, "M20 90 V54 A30 30 0 0 1 80 54 V90")}
    </>
  ),
  tiles: (c) => (
    <>
      {R(c, { x: 6, y: 8, width: 52, height: 40, rx: 7 })}
      {R(c, { x: 64, y: 8, width: 30, height: 40, rx: 7 })}
      {R(c, { x: 6, y: 54, width: 30, height: 38, rx: 7 })}
      {R(c, { x: 42, y: 54, width: 52, height: 38, rx: 7 })}
    </>
  ),
  process: (c) => (
    <>
      {R(c, { x: 5, y: 18, width: 90, height: 64, rx: 18 })}
      {L(c, "M20 50 H64 M56 40 L66 50 L56 60")}
      {L(c, "M76 40 V60")}
    </>
  ),
  person: (c) => (
    <>
      <circle
        {...(c.body as SVGProps<SVGCircleElement>)}
        style={c.fill}
        cx="50"
        cy="29"
        r="19"
      />
      {P(c, "M10 94 C10 66 28 56 50 56 C72 56 90 66 90 94 Z")}
    </>
  ),
  badge: (c) => (
    <>
      {R(c, { x: 6, y: 12, width: 88, height: 76, rx: 12 })}
      <circle cx="30" cy="42" r="9" fill={c.color} opacity=".55" />
      {L(c, "M16 72 C16 60 44 60 44 72")}
      {L(c, "M56 36 H82 M56 50 H82 M56 64 H74")}
    </>
  ),
  octagon: (c) => Poly(c, "31,5 69,5 95,31 95,69 69,95 31,95 5,69 5,31"),
  shield: (c) =>
    P(c, "M50 4 L91 17 V50 C91 75 72 89 50 97 C28 89 9 75 9 50 V17 Z"),
  tower: (c) => (
    <>
      {P(c, "M18 94 V28 H28 V15 H41 V28 H59 V15 H72 V28 H82 V94 Z")}
      {L(c, "M18 94 H82")}
    </>
  ),
  notched: (c) => (
    <>
      {P(c, "M6 12 H70 L94 36 V88 H6 Z")}
      {L(c, "M70 12 V36 H94")}
    </>
  ),
  house: (c) => (
    <>
      {P(c, "M5 46 L50 8 L95 46 V92 H5 Z")}
      {L(c, "M5 46 H95")}
    </>
  ),
  awning: (c) => (
    <>
      {R(c, { x: 12, y: 44, width: 76, height: 48, rx: 4 })}
      {P(c, "M5 20 H95 L89 46 H11 Z")}
      {L(c, "M27 20 L25 46 M42 20 L41 46 M58 20 L59 46 M73 20 L75 46")}
    </>
  ),
  barn: (c) => (
    <>
      {P(c, "M6 92 V40 L50 7 L94 40 V92 Z")}
      {L(c, "M26 92 V58 H74 V92 M26 70 H74 M26 80 H74")}
    </>
  ),
  crate: (c) => (
    <>
      {R(c, { x: 8, y: 18, width: 84, height: 72, rx: 6 })}
      {L(c, "M8 42 H92 M8 66 H92 M8 18 L92 90")}
    </>
  ),
  datacenter: (c) => (
    <>
      {R(c, { x: 5, y: 18, width: 90, height: 72, rx: 6 })}
      {L(c, "M5 36 H95 M30 36 V90 M50 36 V90 M70 36 V90")}
      <circle cx="14" cy="27" r="2.4" fill={c.color} />
      <circle cx="23" cy="27" r="2.4" fill={c.color} opacity=".5" />
    </>
  ),
  rack: (c) => (
    <>
      {R(c, { x: 22, y: 5, width: 56, height: 90, rx: 5 })}
      {L(c, "M30 24 H70 M30 42 H70 M30 60 H70 M30 78 H70")}
    </>
  ),
  chassis: (c) => (
    <>
      {R(c, { x: 5, y: 30, width: 90, height: 42, rx: 5 })}
      {L(c, "M62 38 V64 M70 38 V64 M78 38 V64 M86 38 V64")}
      <circle cx="14" cy="40" r="2.4" fill={c.color} />
    </>
  ),
  switch: (c) => (
    <>
      {R(c, { x: 4, y: 33, width: 92, height: 34, rx: 6 })}
      {[14, 28, 42, 56, 70].map((x) => (
        <rect
          key={x}
          x={x}
          y={46}
          width="9"
          height="9"
          rx="1.5"
          fill={c.color}
          opacity=".55"
        />
      ))}
    </>
  ),
};

export interface KindShapeProps {
  kind: NodeKind;
  size?: number;
  dashed?: boolean;
  /** Draw the outline in the accent colour instead of the kind colour. */
  accent?: boolean;
  /** Colour override (used by lenses) in place of the kind colour. */
  tint?: string;
  className?: string;
}

export function KindShape({
  kind,
  size = 86,
  dashed,
  accent,
  tint,
  className,
}: KindShapeProps) {
  const def = { ...NODE_KINDS[kind], color: tint ?? NODE_KINDS[kind].color };
  const stroke = accent ? "var(--accent)" : def.color;
  const dash = dashed || def.shape === "octagon" ? "6 4" : undefined;
  const ctx: Ctx = {
    color: def.color,
    body: {
      stroke,
      strokeWidth: 3,
      strokeLinejoin: "round",
      strokeDasharray: dash,
    },
    line: {
      stroke: def.color,
      strokeWidth: 2,
      strokeLinecap: "round",
      opacity: 0.55,
    },
    fill: { fill: `color-mix(in srgb, ${def.color} 16%, var(--panel))` },
  };
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
      overflow="visible"
    >
      {SHAPES[def.shape](ctx)}
    </svg>
  );
}

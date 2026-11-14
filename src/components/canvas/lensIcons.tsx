import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  Flame,
  Hourglass,
  Layers,
  Network,
  Shapes,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const ICONS: Record<string, (s: number) => ReactNode> = {
  shapes: (s) => <Shapes size={s} />,
  alert: (s) => <AlertTriangle size={s} />,
  layers: (s) => <Layers size={s} />,
  users: (s) => <Users size={s} />,
  hourglass: (s) => <Hourglass size={s} />,
  flame: (s) => <Flame size={s} />,
  shield: (s) => <ShieldCheck size={s} />,
  book: (s) => <BookOpen size={s} />,
  activity: (s) => <Activity size={s} />,
  network: (s) => <Network size={s} />,
  building: (s) => <Building2 size={s} />,
};

export function LensIcon({ name, size = 14 }: { name: string; size?: number }) {
  return <>{(ICONS[name] ?? ICONS.shapes)(size)}</>;
}

"use client";

import {
  Activity,
  AppWindow,
  Box,
  Boxes,
  Database,
  ExternalLink,
  GitBranch,
  Globe,
  LayoutDashboard,
  Layers,
  Library,
  MessageSquare,
  Package,
  Plug,
  Rocket,
  Server,
  Table2,
  Users,
  Workflow,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { NODE_KINDS } from "@/domain/registry";
import type { NodeKind } from "@/domain/types";

const MAP: Record<string, ComponentType<LucideProps>> = {
  layers: Layers,
  app: AppWindow,
  box: Box,
  plug: Plug,
  library: Library,
  database: Database,
  table: Table2,
  zap: Zap,
  queue: MessageSquare,
  git: GitBranch,
  workflow: Workflow,
  package: Package,
  rocket: Rocket,
  globe: Globe,
  boxes: Boxes,
  server: Server,
  activity: Activity,
  dashboard: LayoutDashboard,
  external: ExternalLink,
  users: Users,
};

export function KindIcon({ kind, size = 16, className }: { kind: NodeKind; size?: number; className?: string }) {
  const Icon = MAP[NODE_KINDS[kind].icon] ?? Box;
  return <Icon size={size} className={className} aria-hidden />;
}

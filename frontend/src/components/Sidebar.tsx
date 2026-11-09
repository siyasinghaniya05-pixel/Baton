"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  FileStack,
  Layers,
  SearchCode,
  Clock,
  HelpCircle,
  CheckSquare,
  FileSpreadsheet,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  Network,
  Compass,
  Radar,
  Gauge,
  Sparkles,
  Target,
  Terminal,
  UserX,
  GitCompare,
  Fingerprint,
  MessagesSquare
} from "lucide-react";

const CORE_NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
  { name: "Sources", href: "/dashboard/sources", icon: FileStack },
  { name: "Claim Ledger", href: "/dashboard/claims", icon: Layers },
  { name: "Evidence Viewer", href: "/dashboard/evidence", icon: SearchCode },
  { name: "Timeline", href: "/dashboard/timeline", icon: Clock },
  { name: "Gap Interview", href: "/dashboard/gap-interview", icon: HelpCircle },
  { name: "Review Workspace", href: "/dashboard/review", icon: CheckSquare },
  { name: "Handovers", href: "/dashboard/handovers", icon: FileSpreadsheet },
  { name: "Audit Log", href: "/dashboard/audit", icon: History },
];

const CONTINUITY_NAV_ITEMS = [
  { name: "Knowledge Graph", href: "/dashboard/graph", icon: Network, highlight: true },
  { name: "Decision Archaeology", href: "/dashboard/decisions", icon: Compass },
  { name: "Project Risk Radar", href: "/dashboard/risks", icon: Radar },
  { name: "Readiness Score", href: "/dashboard/readiness", icon: Gauge, badge: "Live" },
  { name: "Ask Your Project AI", href: "/dashboard/assistant", icon: Sparkles, highlight: true },
  { name: "Successor Missions", href: "/dashboard/missions", icon: Target },
  { name: "Living Runbooks", href: "/dashboard/runbooks", icon: Terminal },
  { name: "Bus-Factor Matrix", href: "/dashboard/bus-factor", icon: UserX },
  { name: "Knowledge Drift", href: "/dashboard/drift", icon: GitCompare },
  { name: "Security & Canary Lab", href: "/dashboard/security-lab", icon: Fingerprint },
  { name: "Collaboration Room", href: "/dashboard/collaboration", icon: MessagesSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-navy-950 text-slate-200 border-r border-navy-800 flex flex-col flex-shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-navy-800 gap-3 bg-navy-900/60">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-accent flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-white tracking-tight">BATON</span>
            <span className="text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">
              2.0 PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Continuity Intelligence</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto max-h-[calc(100vh-135px)] custom-scrollbar">
        {/* Core Handover Section */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Core Handover</span>
          </div>
          <div className="space-y-0.5">
            {CORE_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-brand-blue text-white shadow-sm shadow-blue-500/20 font-semibold"
                      : "text-slate-300 hover:bg-navy-850 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-blue-200" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Continuity Intelligence 2.0 Section */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>Continuity 2.0</span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-mono">
              AI ENGINE
            </span>
          </div>
          <div className="space-y-0.5">
            {CONTINUITY_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold"
                      : item.highlight
                      ? "text-blue-300 hover:bg-navy-850 hover:text-white"
                      : "text-slate-300 hover:bg-navy-850 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : item.highlight ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.badge && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3 h-3 text-blue-200" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Synthetic Dataset Notice Footer */}
      <div className="p-3 border-t border-navy-800 bg-navy-900/60">
        <div className="p-2.5 rounded-lg bg-navy-850 border border-navy-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-200">Project Aether</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ROS2 Humble</span>
        </div>
      </div>
    </aside>
  );
}

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
  ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
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
            <span className="text-[10px] font-semibold bg-brand-blue/30 text-brand-light px-1.5 py-0.5 rounded border border-brand-blue/40">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Evidence-Linked Handover</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Application Modules
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue text-white shadow-sm shadow-blue-500/20 font-semibold"
                  : "text-slate-300 hover:bg-navy-850 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
            </Link>
          );
        })}
      </div>

      {/* Synthetic Dataset Notice Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-900/40">
        <div className="p-3 rounded-lg bg-navy-850 border border-navy-700/60">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-slate-200">Active Test Context</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Project Aether synthetic dataset preloaded. Zero hallucinations rule enforced.
          </p>
        </div>
      </div>
    </aside>
  );
}


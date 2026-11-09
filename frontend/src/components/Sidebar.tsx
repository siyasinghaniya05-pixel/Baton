"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  FolderGit2,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  LogOut,
  User as UserIcon,
  RefreshCw
} from "lucide-react";

const PRIMARY_MODULES = [
  { 
    name: "Overview", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Summary, risks & knowledge coverage"
  },
  { 
    name: "Projects", 
    href: "/dashboard/projects", 
    icon: FolderGit2,
    description: "Sources, timeline & knowledge graph"
  },
  { 
    name: "Knowledge Ledger", 
    href: "/dashboard/ledger", 
    icon: Layers,
    description: "Claims, evidence & verification pipeline"
  },
  { 
    name: "Handover Center", 
    href: "/dashboard/handovers", 
    icon: FileSpreadsheet,
    description: "Review, gap interview & missions"
  },
  { 
    name: "Trust & Security", 
    href: "/dashboard/security", 
    icon: ShieldCheck,
    description: "RBAC, Presidio privacy & test runner"
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string; role: UserRole } | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) {
      setUser(stored);
    } else {
      api.getMe().then(setUser).catch(() => null);
    }
  }, [pathname]);

  const handleRoleSwitch = async (role: UserRole) => {
    setSwitching(true);
    try {
      const updated = await api.switchRole(role);
      setUser(updated);
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 bg-slate-900/50">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
          B
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white tracking-tight">BATON</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Enterprise
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Knowledge Continuity</p>
        </div>
      </div>

      {/* 5 Primary Modules Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Core Platform
        </div>
        
        {PRIMARY_MODULES.map((item) => {
          const isOverview = item.href === "/dashboard";
          const isActive = isOverview 
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href) || (item.name === "Knowledge Ledger" && pathname.startsWith("/dashboard/claims"));
          
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <div>
                  <span className="block text-xs leading-none">{item.name}</span>
                </div>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
            </Link>
          );
        })}
      </div>

      {/* User Context & Role Switcher */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/40 space-y-2.5">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate pr-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 flex-shrink-0">
                {user?.full_name ? user.full_name.charAt(0) : "U"}
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-200 block truncate leading-tight">
                  {user?.full_name || "Active Member"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block truncate">
                  {user?.email || "user@baton.local"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Active Role Selector for Testing */}
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-[10px]">
            <span className="text-slate-400 font-medium">Role:</span>
            <select
              value={user?.role || "successor"}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              disabled={switching}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold rounded px-1.5 py-0.5 focus:outline-none capitalize cursor-pointer disabled:opacity-50"
            >
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="leaver">Leaver</option>
              <option value="successor">Successor</option>
              <option value="restricted_viewer">Restricted Viewer</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}

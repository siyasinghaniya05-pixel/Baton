"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UserRole } from "@/lib/types";
import { 
  UserCheck, 
  RotateCcw, 
  LogOut, 
  Shield, 
  ChevronDown, 
  Check, 
  Sparkles,
  Bot
} from "lucide-react";

const ROLES: { id: UserRole; label: string; name: string; color: string }[] = [
  { id: "admin", label: "Admin", name: "Sarah Chen", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "leaver", label: "Leaver", name: "Alex Mercer", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "reviewer", label: "Reviewer", name: "Elena Rostova", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "successor", label: "Successor", name: "Sam Taylor", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "restricted_viewer", label: "Restricted Viewer", name: "Jordan Lee", color: "bg-slate-100 text-slate-800 border-slate-200" },
];

export function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const user = api.getStoredUser();
    if (user) {
      setCurrentUser(user);
    } else {
      // Auto login as admin for initial exploration if unauthenticated
      api.switchRole("admin").then((u) => setCurrentUser(u));
    }
  }, []);

  const handleRoleChange = async (targetRole: UserRole) => {
    try {
      const u = await api.switchRole(targetRole);
      setCurrentUser(u);
      setRoleDropdownOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Failed to switch role");
    }
  };

  const handleResetDemo = async () => {
    if (confirm("Reset Project Aether demonstration dataset to clean original state?")) {
      setResetting(true);
      try {
        await api.resetDemo();
        alert("Project Aether dataset successfully reset!");
        window.location.reload();
      } catch (err: any) {
        alert("Reset failed: " + err.message);
      } finally {
        setResetting(false);
      }
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  const currentRoleInfo = ROLES.find((r) => r.id === currentUser?.role) || ROLES[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Project Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Workspace</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <Bot className="w-4 h-4 text-brand-blue" />
          <span className="text-sm font-semibold text-slate-800">Project Aether (Robotics AMR)</span>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
            SYNTHETIC DEMO
          </span>
        </div>
      </div>

      {/* Right: Role Switcher & Controls */}
      <div className="flex items-center gap-3">
        {/* Reset Demo Button */}
        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          title="Reset Project Aether to initial synthetic state"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
          <span>{resetting ? "Resetting..." : "Reset Demo"}</span>
        </button>

        {/* Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 text-brand-blue" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current View Role</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{currentRoleInfo.name}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${currentRoleInfo.color}`}>
                  {currentRoleInfo.label}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-800">Simulate User Perspective</div>
                <p className="text-[11px] text-slate-500">
                  Switch roles to verify permission partitions & canary shielding in real time.
                </p>
              </div>
              <div className="p-1 space-y-1">
                {ROLES.map((r) => {
                  const isSelected = r.id === currentUser?.role;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRoleChange(r.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        isSelected ? "bg-blue-50 font-semibold text-brand-blue" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-[11px] text-slate-400">{r.label} Clearance</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${r.color}`}>
                          {r.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-blue" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User profile & logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}


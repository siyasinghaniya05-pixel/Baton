"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  UserX, 
  ShieldAlert, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  Search
} from "lucide-react";

interface BusFactorItem {
  id: string;
  project_id: string;
  person_name: string;
  role_title: string;
  critical_area: string;
  contributor_count: number;
  backup_owner?: string;
  documentation_health: string;
  urgency_level: string;
  risk_impact: string;
  recommended_handoff: string;
}

export default function BusFactorPage() {
  const [items, setItems] = useState<BusFactorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getBusFactor(pid).then((data) => {
          setItems(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const singlePointsOfFailure = items.filter((i) => i.contributor_count === 1 && !i.backup_owner);
  const criticalUrgency = items.filter((i) => i.urgency_level === "critical");

  const filteredItems = items.filter((i) => {
    return i.person_name.toLowerCase().includes(search.toLowerCase()) ||
           i.critical_area.toLowerCase().includes(search.toLowerCase()) ||
           i.role_title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bus-Factor Intelligence</h1>
            <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full border border-rose-200">
              Single-Person Risk Analysis
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quantifying organizational exposure to team member departure, undocumented knowledge silos, and missing backups.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team member, component..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
          />
        </div>
      </div>

      {/* Top Threat Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Total Tracked Silos</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{items.length}</span>
            <span className="text-xs text-blue-600 font-medium">Critical Components</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-rose-700">Zero-Backup Bottlenecks (Bus Factor = 1)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{singlePointsOfFailure.length}</span>
            <span className="text-xs text-rose-600 font-bold">Immediate Risk</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-amber-800">Critical Urgency Transitions</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800">{criticalUrgency.length}</span>
            <span className="text-xs text-amber-700 font-bold">Priority Handoff</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Analyzing bus-factor dependencies and knowledge silos...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No bus factor records match your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between ${
                item.urgency_level === "critical"
                  ? "border-rose-300 ring-1 ring-rose-200"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {item.person_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {item.role_title}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                    item.urgency_level === "critical"
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}>
                    {item.urgency_level} urgency
                  </span>
                </div>

                {/* Critical Area */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Critical System / Sole Responsibility
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.critical_area}
                  </span>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Contributors</span>
                    <span className="font-bold text-slate-800">{item.contributor_count} Person</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Backup Owner</span>
                    <span className={`font-bold ${item.backup_owner ? "text-emerald-600" : "text-rose-600"}`}>
                      {item.backup_owner || "None"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Doc Health</span>
                    <span className={`font-bold capitalize ${
                      item.documentation_health === "good" ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      {item.documentation_health}
                    </span>
                  </div>
                </div>

                {/* Risk Impact */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                    Departure Impact
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.risk_impact}
                  </p>
                </div>
              </div>

              {/* Recommended Handover Action */}
              <div className="pt-3 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                  <span className="font-bold text-blue-900 block">Handoff Action Plan:</span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {item.recommended_handoff}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

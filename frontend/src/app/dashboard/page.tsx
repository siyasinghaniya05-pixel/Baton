"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AnalyticsData } from "@/lib/types";
import { 
  FolderGit2, 
  FileSpreadsheet, 
  CheckSquare, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Activity,
  FileStack,
  CheckCircle2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Verified: "#10b981",
  "Evidence-backed": "#3b82f6",
  Inferred: "#f59e0b",
  Conflict: "#ef4444",
  Missing: "#8b5cf6",
};

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading platform analytics...</p>
        </div>
      </div>
    );
  }

  const claimStatusData = [
    { name: "Verified", value: data?.verified_claims || 0, color: "#10b981" },
    { name: "Evidence-backed", value: data?.evidence_backed_claims || 0, color: "#3b82f6" },
    { name: "Conflicts", value: data?.conflicting_claims || 0, color: "#ef4444" },
    { name: "Missing Gaps", value: data?.missing_information || 0, color: "#8b5cf6" },
    { name: "Inferred", value: data?.inferred_claims || 0, color: "#f59e0b" },
  ];

  const categoryBarData = Object.entries(data?.category_distribution || {}).map(([key, val]) => ({
    name: key.replace("Decision Reasoning", "Reasoning").replace("Timeline Milestone", "Milestone").replace("Recurring Problem", "Recurring"),
    count: val,
  }));

  const totalClaims = (data?.verified_claims || 0) + (data?.evidence_backed_claims || 0) + (data?.conflicting_claims || 0) + (data?.missing_information || 0) + (data?.inferred_claims || 0);
  const completionPercentage = totalClaims > 0 ? Math.round(((data?.verified_claims || 0) / totalClaims) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-850 text-white rounded-2xl p-6 lg:p-8 shadow-xl border border-navy-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Evidence-Linked Handover Intelligence</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Project Aether Knowledge Transition
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Knowledge reconstructed from 9 verified sources. Traceable claims, zero hallucinations,
              permission-aware role partitioning, and human-verified continuation plans.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-navy-800/80 p-4 rounded-xl border border-navy-700/80">
            <div>
              <div className="text-xs text-slate-400 font-medium">Handover Readiness</div>
              <div className="text-3xl font-extrabold text-white mt-0.5">{completionPercentage}%</div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {data?.verified_claims} of {totalClaims} claims verified
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-navy-900 flex items-center justify-center border-4 border-emerald-500 text-emerald-400 font-bold text-sm">
              Ready
            </div>
          </div>
        </div>
      </div>

      {/* 8 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{data?.total_projects}</div>
          <div className="text-xs text-slate-500 mt-1">Active workspaces</div>
        </div>

        {/* Active Handovers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Handovers</span>
            <FileSpreadsheet className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{data?.active_handovers}</div>
          <div className="text-xs text-slate-500 mt-1">In progress / compilation</div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Reviews</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{data?.pending_reviews}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting reviewer sign-off</div>
        </div>

        {/* Conflicting Claims */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Conflicts Detected</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{data?.conflicting_claims}</div>
          <div className="text-xs text-rose-500 font-medium mt-1">Opposing evidence logged</div>
        </div>

        {/* Missing Information Gaps */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Information Gaps</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{data?.missing_information}</div>
          <div className="text-xs text-slate-500 mt-1">In Gap Interview queue</div>
        </div>

        {/* Verified Claims */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Claims</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{data?.verified_claims}</div>
          <div className="text-xs text-slate-500 mt-1">100% quotation grounded</div>
        </div>

        {/* Total Sources Ingested */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Sources Ingested</span>
            <FileStack className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{data?.total_sources}</div>
          <div className="text-xs text-slate-500 mt-1">Repo, Notes, Board, Chat</div>
        </div>

        {/* Total Reconstructed Claims */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Claims</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalClaims}</div>
          <div className="text-xs text-slate-500 mt-1">Independent ledger records</div>
        </div>
      </div>

      {/* Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Claim Status Distribution (Pie / Legend) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Claim Grounding Status</h3>
              <p className="text-xs text-slate-500">Distribution across verification categories</p>
            </div>
            <Link href="/dashboard/claims" className="text-xs font-semibold text-brand-blue flex items-center gap-1 hover:underline">
              View Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={claimStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {claimStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Claims`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {claimStatusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600">{s.name}:</span>
                <span className="font-bold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Knowledge Categories Breakdown (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Knowledge Reconstruction Categories</h3>
              <p className="text-xs text-slate-500">Extracted domain items per category</p>
            </div>
            <Link href="/dashboard/evidence" className="text-xs font-semibold text-brand-blue flex items-center gap-1 hover:underline">
              Inspect Evidence <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-blue" />
            <h3 className="font-bold text-slate-900">Live Append-Only Audit Trail</h3>
          </div>
          <Link href="/dashboard/audit" className="text-xs font-semibold text-brand-blue hover:underline">
            View All Audit Logs →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {(data?.recent_activity || []).map((act) => (
            <div key={act.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-blue" />
                <div>
                  <span className="font-semibold text-slate-800 capitalize">
                    {act.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span className="text-slate-600">{act.user}</span>
                </div>
              </div>
              <div className="text-slate-400">{act.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


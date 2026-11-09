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
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  Compass,
  FileText
} from "lucide-react";

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [risks, setRisks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalytics(),
      api.getProjects()
    ])
      .then(([analyticsRes, projs]) => {
        setData(analyticsRes);
        const pid = projs[0]?.id;
        if (pid) {
          Promise.all([
            api.getReadiness(pid).catch(() => null),
            api.getRiskRadar(pid).catch(() => null)
          ]).then(([rData, riskData]) => {
            setReadiness(rData);
            setRisks(riskData);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
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
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading platform overview...</p>
        </div>
      </div>
    );
  }

  const totalClaims = (data?.verified_claims || 0) + (data?.evidence_backed_claims || 0) + (data?.conflicting_claims || 0) + (data?.missing_information || 0) + (data?.inferred_claims || 0);
  const coveragePercent = totalClaims > 0 ? Math.round(((data?.verified_claims || 0) / totalClaims) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Handover Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of project knowledge continuity, risk mitigation, and verification readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/handovers"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Handover Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Active Project Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Active Handover
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Outgoing: Alex Mercer → Incoming: Sam Taylor</span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Project Aether – Autonomous Robotics Platform
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Autonomous ground vehicle initiative migrating from ROS1 Noetic to ROS2 Humble with Cartographer 3D SLAM.
          </p>
        </div>

        {/* Readiness Score Pill */}
        <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex-shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Readiness Score</span>
            <span className="text-2xl font-extrabold text-slate-900">
              {readiness?.overall_score || 53.6}<span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
            readiness?.readiness_grade === "Ready"
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : readiness?.readiness_grade === "Blocked"
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : "bg-amber-50 text-amber-700 border-amber-300"
          }`}>
            {readiness?.readiness_grade || "Blocked"}
          </div>
        </div>
      </div>

      {/* 4 Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Knowledge Coverage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Coverage</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{coveragePercent}%</span>
            <span className="text-xs text-slate-500 font-medium">{data?.verified_claims} / {totalClaims} claims</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${coveragePercent}%` }} />
          </div>
        </div>

        {/* 2. Critical Risks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Risks</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{risks?.critical_count || 2}</span>
            <span className="text-xs text-slate-500 font-medium">{risks?.total_risks || 8} total tracked</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">Kafka broker & Vault root token silos</p>
        </div>

        {/* 3. Pending Reviews */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Reviews</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{data?.pending_reviews || 0}</span>
            <span className="text-xs text-slate-500 font-medium">Awaiting reviewer</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">Requires Elena Rostova sign-off</p>
        </div>

        {/* 4. Active Handovers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Handovers</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{data?.active_handovers || 1}</span>
            <span className="text-xs text-emerald-600 font-medium">Version 1.0</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">Role views generated & secured</p>
        </div>
      </div>

      {/* Two Column Layout: Readiness Breakdown & Critical Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 6-Pillar Readiness Score Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Handover Readiness Pillars</h3>
              <p className="text-xs text-slate-500">Deterministic 6-factor continuity evaluation</p>
            </div>
            <Link href="/dashboard/handovers" className="text-xs text-blue-600 hover:underline font-medium">
              View Handover →
            </Link>
          </div>

          <div className="space-y-3">
            {readiness?.categories?.map((cat: any, idx: number) => {
              const pct = Math.round((cat.score / cat.max_score) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-semibold text-slate-900">
                      {cat.score} / {cat.max_score} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Critical Continuity Risks & Priority Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Critical Continuity Risks</h3>
              <p className="text-xs text-slate-500">Must be addressed prior to leaver departure</p>
            </div>
            <Link href="/dashboard/ledger" className="text-xs text-blue-600 hover:underline font-medium">
              View Ledger →
            </Link>
          </div>

          <div className="space-y-3">
            {risks?.findings?.slice(0, 3).map((r: any) => (
              <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 leading-snug">{r.title}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                    r.severity === "critical"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                  {r.description}
                </p>
                <div className="text-[11px] text-blue-700 font-medium">
                  <span className="font-semibold">Mitigation: </span>{r.mitigation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Trail Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Audit Trail</h3>
          </div>
          <Link href="/dashboard/security" className="text-xs font-semibold text-blue-600 hover:underline">
            Security & Audit Center →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {(data?.recent_activity || []).slice(0, 5).map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span className="font-semibold text-slate-800 capitalize">
                  {act.action.replace(/_/g, " ")}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">{act.user}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

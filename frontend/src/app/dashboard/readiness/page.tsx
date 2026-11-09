"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Gauge, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Sparkles, 
  FileCheck, 
  Users, 
  Terminal, 
  HelpCircle,
  Layers,
  ChevronRight
} from "lucide-react";

interface CategoryScore {
  category: string;
  weight: number;
  score: number;
  max_score: number;
  status: string;
  rationale: string;
}

interface DeductionDetail {
  category: string;
  points_deducted: number;
  reason: string;
  remediation_action: string;
}

interface ReadinessData {
  project_id: string;
  overall_score: number;
  readiness_grade: string;
  is_deployable: boolean;
  critical_blockers_count: number;
  unresolved_conflicts_count: number;
  missing_gaps_count: number;
  categories: CategoryScore[];
  deductions: DeductionDetail[];
  recommended_actions: string[];
}

export default function ReadinessScorePage() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getReadiness(pid).then((res) => {
          setData(res);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Handover Readiness Score</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Deterministic 0–100 Formula
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auditable, evidence-backed evaluation computing whether incoming successors can assume operational control safely.
          </p>
        </div>

        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <span>Successor Missions</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading || !data ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Calculating transparent readiness score...
        </div>
      ) : (
        <>
          {/* Top Banner: Score Display & Critical Blockers Alert */}
          <div className={`p-6 rounded-2xl border shadow-sm ${
            data.readiness_grade === "Blocked"
              ? "bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-950 border-rose-500/40 text-white"
              : data.overall_score >= 80
              ? "bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-500/40 text-white"
              : "bg-slate-900 border-slate-800 text-white"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Circular / Large Score Badge */}
                <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col items-center justify-center shadow-inner flex-shrink-0">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {data.overall_score}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">out of 100</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      data.readiness_grade === "Ready"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : data.readiness_grade === "High Confidence"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        : data.readiness_grade === "Blocked"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}>
                      Status: {data.readiness_grade}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {data.is_deployable ? "Deployable to Incoming Team" : "Action Required Before Sign-off"}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-white">
                    {data.readiness_grade === "Blocked" 
                      ? "Handover Blocked: Unresolved Critical Threats Detected" 
                      : data.overall_score >= 80
                      ? "High-Confidence Knowledge Handover Verified"
                      : "Handover In Progress: Key Gaps Pending"}
                  </h2>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    {data.readiness_grade === "Blocked"
                      ? "A score must never imply false certainty. Even with moderate numerical score, active contradictions or unassigned root credentials prevent safe handover sign-off."
                      : "All 6 weighted pillars are dynamically evaluated against database claims, living runbooks, and source chunks."}
                  </p>
                </div>
              </div>

              {/* Critical Threat Badges */}
              <div className="flex flex-col gap-2 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex-shrink-0">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">Critical Blockers:</span>
                  <span className={`font-bold ${data.critical_blockers_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {data.critical_blockers_count}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">Unresolved Conflicts:</span>
                  <span className={`font-bold ${data.unresolved_conflicts_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {data.unresolved_conflicts_count}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">Open Knowledge Gaps:</span>
                  <span className={`font-bold ${data.missing_gaps_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {data.missing_gaps_count}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Weighted Category Pillar Cards */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Weighted Evaluation Pillars (Total 100%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.categories.map((cat, idx) => {
                const percent = Math.round((cat.score / cat.max_score) * 100);
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Weight: {cat.weight}%
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{cat.category}</h4>
                      </div>
                      <span className="text-base font-extrabold text-slate-900">
                        {cat.score} <span className="text-xs text-slate-400 font-normal">/ {cat.max_score}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          percent >= 80 ? "bg-emerald-500" : percent >= 60 ? "bg-blue-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {cat.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transparent Deductions Breakdown */}
          {data.deductions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Transparent Deductions Breakdown ({data.deductions.length} Deductions)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">All point deductions are fully auditable</span>
              </div>

              <div className="space-y-3">
                {data.deductions.map((d, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          -{d.points_deducted} pts
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{d.category}</span>
                      </div>
                      <p className="text-xs text-slate-600">{d.reason}</p>
                    </div>

                    <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 md:max-w-xs font-medium">
                      <span className="font-bold">Fix: </span>{d.remediation_action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Checklist to Reach 100% Readiness */}
          <div className="bg-gradient-to-br from-slate-900 to-navy-950 rounded-2xl border border-slate-800 p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Recommended Actions to Boost Readiness</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.recommended_actions.map((act, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { HandoverVersion, UserRole } from "@/lib/types";
import { 
  FileSpreadsheet, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  Share2, 
  Lock, 
  Award, 
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function HandoversPage() {
  const [handovers, setHandovers] = useState<HandoverVersion[]>([]);
  const [selectedHandover, setSelectedHandover] = useState<HandoverVersion | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<UserRole>("successor");
  const [roleViewData, setRoleViewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getHandovers(pid).then((hos) => {
          setHandovers(hos);
          if (hos.length > 0) {
            setSelectedHandover(hos[0]);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedHandover) {
      setViewLoading(true);
      api.getHandoverRoleView(selectedHandover.id, activeRoleView)
        .then((data) => {
          setRoleViewData(data);
          setViewLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setViewLoading(false);
        });
    }
  }, [selectedHandover, activeRoleView]);

  const handlePublish = async () => {
    if (!selectedHandover) return;
    setPublishing(true);
    try {
      const res = await api.publishHandover(selectedHandover.id);
      alert("Handover published! Generated secure expiring link.");
      setShareLink(`${window.location.origin}/share/${res.share_token}`);
      setSelectedHandover({ ...selectedHandover, status: "published" });
    } catch (err: any) {
      alert("Publish failed: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert("Expiring share link copied to clipboard!");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading handovers and role compiler...</div>;
  }

  const actions = selectedHandover?.actions || [];
  const day1Actions = actions.filter((a) => a.timeframe === "Day 1");
  const week1Actions = actions.filter((a) => a.timeframe === "Week 1");
  const day30Actions = actions.filter((a) => a.timeframe === "Day 30");

  const claimsByCategory = roleViewData?.content?.claims_by_category || {};

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role-Based Handover & Continuation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Permission-partitioned knowledge compilation. Generated strictly from role-authorized evidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Comprehension Quiz CTA */}
          {selectedHandover && (
            <Link
              href={`/dashboard/handovers/${selectedHandover.id}/quiz`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Award className="w-4 h-4" />
              <span>Take Comprehension Quiz & Receipt</span>
            </Link>
          )}

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={publishing || selectedHandover?.status === "published"}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{selectedHandover?.status === "published" ? "Published" : publishing ? "Publishing..." : "Publish Handover"}</span>
          </button>
        </div>
      </div>

      {/* Share Link Banner (if published) */}
      {shareLink && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Active Expiring Share Link:</span> Handover published securely with 14-day token.
            </div>
          </div>
          <button
            onClick={handleCopyShareLink}
            className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 font-semibold rounded-md hover:bg-emerald-100 transition-colors"
          >
            Copy Link
          </button>
        </div>
      )}

      {/* Security Partitioning Role Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Clearance View:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(["successor", "reviewer", "restricted_viewer"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRoleView(role)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  activeRoleView === role
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {role.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Security Diagnostics Counter */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accessible: <strong>{roleViewData?.content?.accessible_items || 0}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Shielded / Redacted: <strong>{roleViewData?.redacted_placeholders_count || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Continuation Action Plan (Day 1 / Week 1 / Day 30) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5" /> Actionable Roadmap
            </div>
            <h2 className="text-lg font-bold text-slate-900">Successor Continuation Plan</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Linked to verified claims</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DAY 1: Immediate Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-rose-500 pb-2">
              <span className="font-extrabold text-sm text-slate-900">DAY 1: IMMEDIATE</span>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Critical</span>
            </div>
            <div className="space-y-2">
              {day1Actions.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-900">{act.title}</div>
                  <p className="text-slate-600 text-[11px]">{act.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Assignee: {act.assigned_to}</span>
                    <span className="text-emerald-600 font-semibold">Evidence Grounded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WEEK 1: Stabilization & Decisions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-amber-500 pb-2">
              <span className="font-extrabold text-sm text-slate-900">WEEK 1: PRIORITIES</span>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">High</span>
            </div>
            <div className="space-y-2">
              {week1Actions.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-900">{act.title}</div>
                  <p className="text-slate-600 text-[11px]">{act.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Assignee: {act.assigned_to}</span>
                    <span className="text-emerald-600 font-semibold">Evidence Grounded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DAY 30: Long-Term Ownership */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-blue-500 pb-2">
              <span className="font-extrabold text-sm text-slate-900">DAY 30: STRATEGIC</span>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Medium</span>
            </div>
            <div className="space-y-2">
              {day30Actions.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-900">{act.title}</div>
                  <p className="text-slate-600 text-[11px]">{act.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Assignee: {act.assigned_to}</span>
                    <span className="text-emerald-600 font-semibold">Evidence Grounded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Role-Partitioned Knowledge Sections */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">
            Reconstructed Knowledge Package ({activeRoleView.replace("_", " ").toUpperCase()} VIEW)
          </h2>
          <p className="text-xs text-slate-500">
            Rendered using only evidence accessible to {activeRoleView}. Confidential canary secrets are masked.
          </p>
        </div>

        {viewLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Compiling role view...</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(claimsByCategory).map(([category, items]: [string, any]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  {category} ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                        item.is_restricted
                          ? "bg-rose-50/50 border-rose-200 text-rose-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">{item.description}</div>
                        {!item.is_restricted && item.exact_quote && (
                          <div className="font-mono text-[11px] text-slate-500 italic">
                            "{item.exact_quote}"
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {item.is_restricted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                            <Lock className="w-3 h-3" /> RESTRICTED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.evidence_location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


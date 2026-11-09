"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Claim, HandoverVersion } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ExternalLink, 
  ShieldCheck, 
  FileSpreadsheet,
  AlertTriangle,
  History,
  Lock
} from "lucide-react";

export default function ReviewWorkspacePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [handovers, setHandovers] = useState<HandoverVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>("pending");
  const [projectId, setProjectId] = useState<string>("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        Promise.all([api.getClaims(pid), api.getHandovers(pid)])
          .then(([cls, hos]) => {
            setClaims(cls);
            setHandovers(hos);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleReviewAction = async (claimId: string, action: "accepted" | "rejected") => {
    try {
      await api.reviewClaim(claimId, action);
      setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, review_state: action } : c));
    } catch (err: any) {
      alert("Review action failed: " + err.message);
    }
  };

  const handleApproveHandover = async (handoverId: string) => {
    if (confirm("Formally approve this handover version? This human sign-off unlocks version publication.")) {
      setApproving(true);
      try {
        await api.approveHandover(handoverId);
        alert("Handover version formally approved! Stamped with cryptographic approval in audit log.");
        const projs = await api.getProjects();
        const hos = await api.getHandovers(projs[0].id);
        setHandovers(hos);
      } catch (err: any) {
        alert("Approval failed: " + err.message);
      } finally {
        setApproving(false);
      }
    }
  };

  const filtered = claims.filter((c) => {
    if (filterState === "all") return true;
    return c.review_state === filterState;
  });

  const latestHandover = handovers[0];

  return (
    <div className="space-y-6">
      {/* Page Title & Human Sign-off Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Human Review Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Human approval gate: Accept, edit, or reject reconstructed claims. Every decision is committed to an append-only audit trail.
          </p>
        </div>

        {/* Handover Approval Action Bar */}
        {latestHandover && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Handover Status</div>
              <div className="text-xs font-bold text-slate-800 capitalize flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${latestHandover.status === "approved" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {latestHandover.status} (v{latestHandover.version_number})
              </div>
            </div>
            {latestHandover.status !== "approved" ? (
              <button
                onClick={() => handleApproveHandover(latestHandover.id)}
                disabled={approving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{approving ? "Approving..." : "Approve Handover"}</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Human Approved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {["pending", "accepted", "rejected", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterState(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              filterState === tab
                ? "bg-brand-blue text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab} ({claims.filter((c) => tab === "all" ? true : c.review_state === tab).length})
          </button>
        ))}
      </div>

      {/* Review Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading claims for review...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No claims found under `{filterState}` review state.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <div
              key={claim.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {claim.category}
                  </span>
                  <StatusBadge status={claim.status} />
                  <SensitivityBadge level={claim.sensitivity} />
                  {claim.review_state === "accepted" && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Approved by Reviewer
                    </span>
                  )}
                </div>

                <div className="font-semibold text-slate-900 text-sm">
                  {claim.description}
                </div>

                <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 font-sans mr-1">Exact Citation:</span>
                  "{claim.exact_quote || "Inferred / No direct quote"}"
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Location: {claim.evidence_location}</span>
                  <span>Confidence: {Math.round(claim.confidence * 100)}%</span>
                  {claim.reviewer_notes && (
                    <span className="text-amber-600 font-medium">Notes: {claim.reviewer_notes}</span>
                  )}
                </div>
              </div>

              {/* Reviewer Action Buttons */}
              <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 flex-shrink-0">
                <Link
                  href={`/dashboard/evidence?claim_id=${claim.id}`}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Evidence
                </Link>

                <button
                  onClick={() => handleReviewAction(claim.id, "accepted")}
                  disabled={claim.review_state === "accepted"}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                </button>

                <button
                  onClick={() => handleReviewAction(claim.id, "rejected")}
                  disabled={claim.review_state === "rejected"}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-40"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


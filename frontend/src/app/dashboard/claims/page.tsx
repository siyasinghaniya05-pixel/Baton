"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Claim, ClaimStatus, ClaimCategory, ReviewState } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText
} from "lucide-react";

export default function ClaimLedgerPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    // Project Aether hardcoded id or dynamic lookup
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getClaims(pid).then((cls) => {
          setClaims(cls);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const filteredClaims = claims.filter((c) => {
    const matchesSearch = c.description.toLowerCase().includes(search.toLowerCase()) || 
                          (c.exact_quote && c.exact_quote.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header and Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central Claim Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">
            Independent verifiable units of project knowledge extracted from authorized sources with exact quotation grounding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/evidence"
            className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            Open Split-Screen Evidence Viewer
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search claims, exact quotes, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none"
            >
              <option value="all">All ({claims.length})</option>
              <option value="Verified">Verified</option>
              <option value="Evidence-backed">Evidence-backed</option>
              <option value="Inferred">Inferred</option>
              <option value="Conflict">Conflict</option>
              <option value="Missing">Missing</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none max-w-[180px]"
            >
              <option value="all">All Categories</option>
              <option value="Decision">Decision</option>
              <option value="Task Ownership">Task Ownership</option>
              <option value="Pending Task">Pending Task</option>
              <option value="Blocker">Blocker</option>
              <option value="Risk">Risk</option>
              <option value="Recurring Problem">Recurring Problem</option>
              <option value="Important Contact">Important Contact</option>
              <option value="Deployment & Access">Deployment & Access</option>
              <option value="Timeline Milestone">Timeline Milestone</option>
              <option value="Open Question">Open Question</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading Claim Ledger...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No claims match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Claim & Category</th>
                  <th className="py-3 px-4">Verbatim Source Quote</th>
                  <th className="py-3 px-4">Evidence Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sensitivity</th>
                  <th className="py-3 px-4">Review</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Description & Category */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        {claim.category}
                      </div>
                      <div className="font-medium text-slate-900 leading-snug">
                        {claim.description}
                      </div>
                      {claim.conflict_claim_id && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Contradicts Opposing Claim
                        </div>
                      )}
                    </td>

                    {/* Exact Quote */}
                    <td className="py-3 px-4 max-w-xs text-xs text-slate-600 font-mono bg-slate-50/50 rounded p-2">
                      {claim.exact_quote ? (
                        <span className="italic">"{claim.exact_quote}"</span>
                      ) : (
                        <span className="text-slate-400 italic">No direct quote (inferred/gap)</span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <FileText className="w-3 h-3 text-slate-400" />
                        {claim.evidence_location || "Source Attached"}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={claim.status} />
                    </td>

                    {/* Sensitivity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <SensitivityBadge level={claim.sensitivity} />
                    </td>

                    {/* Review State */}
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      {claim.review_state === "accepted" ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : claim.review_state === "rejected" ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>

                    {/* Inspect Link */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/evidence?claim_id=${claim.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-dark bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Inspect <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


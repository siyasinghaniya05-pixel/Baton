"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Claim, ClaimStatus, ClaimCategory } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { 
  Layers, 
  SearchCode, 
  AlertTriangle, 
  HelpCircle, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ShieldCheck, 
  FileText,
  Search,
  Filter,
  Check,
  RefreshCw,
  X
} from "lucide-react";

const TABS = [
  { id: "ledger", name: "Claims Ledger", icon: Layers },
  { id: "evidence", name: "Split Evidence Viewer", icon: SearchCode },
  { id: "conflicts", name: "Conflicts & Gaps", icon: AlertTriangle },
  { id: "decisions", name: "Decision Archaeology", icon: Compass },
];

export default function KnowledgeLedgerPage() {
  const [activeTab, setActiveTab] = useState("ledger");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Split-screen evidence selection
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // 6-Stage Verification Modal State
  const [verificationModalClaim, setVerificationModalClaim] = useState<Claim | null>(null);
  const [verificationReport, setVerificationReport] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        Promise.all([
          api.getClaims(pid),
          api.getDecisions(pid).catch(() => [])
        ]).then(([cls, decs]) => {
          setClaims(cls);
          setDecisions(decs);
          if (cls.length > 0) setSelectedClaim(cls[0]);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleOpenVerification = async (claim: Claim) => {
    setVerificationModalClaim(claim);
    setVerifying(true);
    setVerificationReport(null);
    try {
      const report = await api.getClaimVerificationDetail(claim.id);
      setVerificationReport(report);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleReverify = async () => {
    if (!verificationModalClaim) return;
    setVerifying(true);
    try {
      const report = await api.reverifyClaim(verificationModalClaim.id);
      setVerificationReport(report);
      // Update claim in list
      setClaims((prev) => prev.map((c) => c.id === verificationModalClaim.id ? { ...c, status: report.final_recommended_status } : c));
    } catch (err) {
      console.error("Re-verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    const matchesSearch = c.description.toLowerCase().includes(search.toLowerCase()) || 
                          (c.exact_quote && c.exact_quote.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const conflictsAndGaps = claims.filter((c) => c.status === "Conflict" || c.status === "Missing");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Central Knowledge Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified knowledge claims grounded in exact verbatim citations, multi-stage pipelines & decision logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading Knowledge Ledger...
        </div>
      ) : (
        <>
          {/* TAB 1: Claims Ledger */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              {/* Filter Strip */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search claims or exact quotation text..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-xs font-medium text-slate-700"
                  >
                    <option value="all">All Statuses ({claims.length})</option>
                    <option value="Verified">Verified</option>
                    <option value="Evidence-backed">Evidence-backed</option>
                    <option value="Inferred">Inferred</option>
                    <option value="Conflict">Conflict</option>
                    <option value="Missing">Missing</option>
                    <option value="Unverified">Unverified</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-xs font-medium text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    <option value="Decision">Decisions</option>
                    <option value="Task Ownership">Task Ownership</option>
                    <option value="Pending Task">Pending Tasks</option>
                    <option value="Dependency">Dependencies</option>
                    <option value="Blocker">Blockers</option>
                    <option value="Risk">Risks</option>
                    <option value="Deployment & Access">Deployment & Access</option>
                  </select>
                </div>
              </div>

              {/* Claims Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="p-3.5">Category & Claim</th>
                        <th className="p-3.5">Exact Source Quotation</th>
                        <th className="p-3.5">Grounding Location</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Sensitivity</th>
                        <th className="p-3.5 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClaims.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 max-w-xs space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {c.category}
                            </span>
                            <p className="font-semibold text-slate-900 leading-snug">
                              {c.description}
                            </p>
                          </td>

                          <td className="p-3.5 max-w-sm">
                            {c.exact_quote ? (
                              <blockquote className="text-[11px] text-slate-700 italic border-l-2 border-blue-400 pl-2 line-clamp-2">
                                "{c.exact_quote}"
                              </blockquote>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No exact quotation (Inferred/Missing)</span>
                            )}
                          </td>

                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                            {c.evidence_location || "Ledger record"}
                          </td>

                          <td className="p-3.5">
                            <StatusBadge status={c.status} />
                          </td>

                          <td className="p-3.5">
                            <SensitivityBadge level={c.sensitivity} />
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleOpenVerification(c)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors"
                            >
                              Verify Pipeline
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Split Evidence Viewer */}
          {activeTab === "evidence" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
              {/* Left Column: Claim Selector */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800">Select Claim to Trace Evidence</h3>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                  {claims.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClaim(c)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedClaim?.id === c.id
                          ? "bg-blue-50 border border-blue-200 shadow-xs"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{c.category}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs font-medium text-slate-800 line-clamp-2">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Source Document Viewer & Exact Span Highlight */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Grounded Evidence Inspector
                    </span>
                  </div>
                  {selectedClaim && (
                    <button
                      onClick={() => handleOpenVerification(selectedClaim)}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      View 6-Stage Proof →
                    </button>
                  )}
                </div>

                {selectedClaim ? (
                  <div className="p-5 flex-1 overflow-y-auto space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Selected Claim:</span>
                      <h4 className="text-sm font-bold text-slate-900">{selectedClaim.description}</h4>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Evidence Location:</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedClaim.evidence_location || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Confidence Score:</span>
                        <span className="font-mono font-bold text-emerald-600">{Math.round(selectedClaim.confidence * 100)}% Grounded</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Verbatim Source Span (Exact Match):
                      </span>
                      {selectedClaim.exact_quote ? (
                        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-slate-900 leading-relaxed font-mono">
                          <span className="bg-amber-200 font-semibold px-1 rounded">
                            "{selectedClaim.exact_quote}"
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No exact source quote available for this claim.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400">Select a claim from the left panel.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Conflicts & Knowledge Gaps */}
          {activeTab === "conflicts" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Principle of Preserved Uncertainty: </span>
                BATON never silently averages contradictory claims. Opposing evidence and missing information remain visibly flagged until explicitly reconciled.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conflictsAndGaps.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.description}</h4>

                    {item.exact_quote && (
                      <blockquote className="text-xs text-slate-700 italic border-l-2 border-rose-400 pl-2">
                        "{item.exact_quote}"
                      </blockquote>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">{item.evidence_location || "Ledger record"}</span>
                      <button
                        onClick={() => handleOpenVerification(item)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Run Verification →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Decision Archaeology */}
          {activeTab === "decisions" && (
            <div className="space-y-4">
              {decisions.map((dec) => (
                <div key={dec.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{dec.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {dec.reversal_status}
                      </span>
                    </div>
                    {dec.decided_date && <span className="text-xs text-slate-400 font-mono">{dec.decided_date}</span>}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    <span className="text-slate-500 font-normal">What was decided: </span>{dec.what_decided}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">Rationale: </span>{dec.why_selected}
                  </div>

                  {dec.alternatives_considered && dec.alternatives_considered.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">Alternatives Considered:</span>
                      <div className="flex flex-wrap gap-1">
                        {dec.alternatives_considered.map((alt: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 6-STAGE CLAIM VERIFICATION MODAL */}
      {verificationModalClaim && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    Claim ID: {verificationModalClaim.id.substring(0, 8)}
                  </span>
                  <StatusBadge status={verificationModalClaim.status} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Multi-Stage Verification Diagnostic
                </h3>
              </div>

              <button
                onClick={() => setVerificationModalClaim(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Claim Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
              <span className="font-semibold text-slate-500">Claim Description:</span>
              <p className="font-bold text-slate-900">{verificationModalClaim.description}</p>
            </div>

            {/* 6 Diagnostic Stages */}
            {verifying ? (
              <div className="text-center py-10 text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Executing 6-stage deterministic verification pipeline...
              </div>
            ) : verificationReport?.stages ? (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Pipeline Diagnostic Results
                </span>

                {Object.entries(verificationReport.stages).map(([stageKey, stage]: [string, any], idx) => (
                  <div key={stageKey} className="p-3 rounded-xl border bg-slate-50/50 flex items-start gap-3 text-xs">
                    <div className="mt-0.5">
                      {stage.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          Stage {idx + 1}: {stage.name}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded ${
                          stage.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {stage.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-snug">{stage.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Modal Footer Controls */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Recommended Status: <strong className="text-slate-900">{verificationReport?.final_recommended_status || "Evaluating..."}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReverify}
                  disabled={verifying}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Re-Execute Pipeline"}
                </button>
                <button
                  onClick={() => setVerificationModalClaim(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


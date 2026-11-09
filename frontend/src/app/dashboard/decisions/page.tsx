"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Compass, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag
} from "lucide-react";

interface DecisionRecord {
  id: string;
  project_id: string;
  title: string;
  what_decided: string;
  participants: string[];
  decided_date?: string;
  why_selected: string;
  alternatives_considered: string[];
  concerns_raised: string[];
  evidence_quote?: string;
  evidence_location?: string;
  reversal_status: string;
  reasoning_missing: boolean;
  source_id?: string;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getDecisions(pid).then((data) => {
          setDecisions(data);
          if (data.length > 0) setExpandedId(data[0].id);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                          d.what_decided.toLowerCase().includes(search.toLowerCase()) ||
                          d.why_selected.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.reversal_status === statusFilter || (statusFilter === "missing_reasoning" && d.reasoning_missing);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Decision Archaeology</h1>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              {decisions.length} Historical Decisions
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reconstructed technical rationales, discarded alternatives, participant debate logs, and reversal statuses.
          </p>
        </div>

        {/* Filter Strip */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Decisions</option>
            <option value="modified">Modified / Contradictions</option>
            <option value="missing_reasoning">Missing Reasoning</option>
          </select>
        </div>
      </div>

      {/* Decision Cards List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Reconstructing archaeological decision records...
        </div>
      ) : filteredDecisions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No decisions match your search filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((dec) => {
            const isExpanded = expandedId === dec.id;
            return (
              <div
                key={dec.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                  dec.reasoning_missing
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : dec.reversal_status === "modified"
                    ? "border-rose-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Summary */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : dec.id)}
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none bg-slate-50/40 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        dec.reversal_status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {dec.reversal_status}
                      </span>

                      {dec.reasoning_missing && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Missing Reasoning In Sources
                        </span>
                      )}

                      {dec.decided_date && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dec.decided_date}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {dec.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-800">What was decided: </span>
                      {dec.what_decided}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Archaeology Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 space-y-5 bg-white">
                    {/* Why Selected (Rationale) */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Decision Rationale & Trade-offs
                      </h4>
                      <p className={`text-xs leading-relaxed p-3.5 rounded-xl border ${
                        dec.reasoning_missing
                          ? "bg-amber-50/70 border-amber-200 text-amber-900 font-medium"
                          : "bg-slate-50 border-slate-100 text-slate-700"
                      }`}>
                        {dec.why_selected}
                      </p>
                    </div>

                    {/* Alternatives vs Concerns Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Alternatives Considered */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Alternatives Considered ({dec.alternatives_considered?.length || 0})
                        </span>
                        <ul className="space-y-1.5">
                          {dec.alternatives_considered?.length ? (
                            dec.alternatives_considered.map((alt, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-slate-400 font-mono">•</span>
                                <span>{alt}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-slate-400 italic">No alternative documented in sources.</li>
                          )}
                        </ul>
                      </div>

                      {/* Concerns & Risks Raised */}
                      <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
                          Concerns Raised ({dec.concerns_raised?.length || 0})
                        </span>
                        <ul className="space-y-1.5">
                          {dec.concerns_raised?.length ? (
                            dec.concerns_raised.map((con, idx) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                                <span>{con}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-slate-400 italic">No dissenting concerns documented.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Participants */}
                    {dec.participants && dec.participants.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Participants:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {dec.participants.map((p, idx) => (
                            <span key={idx} className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Citation */}
                    {dec.evidence_quote && (
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-blue-800 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-blue-600" />
                            Grounded Source Evidence
                          </span>
                          {dec.evidence_location && (
                            <span className="font-mono text-[10px] text-blue-700">{dec.evidence_location}</span>
                          )}
                        </div>
                        <blockquote className="text-xs text-slate-800 italic border-l-2 border-blue-400 pl-2">
                          "{dec.evidence_quote}"
                        </blockquote>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

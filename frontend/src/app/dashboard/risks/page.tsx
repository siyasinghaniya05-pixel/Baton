"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Radar, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ExternalLink,
  Layers,
  ArrowRight
} from "lucide-react";

interface RiskFinding {
  id: string;
  project_id: string;
  category: string;
  title: string;
  severity: string;
  description: string;
  affected_entity?: string;
  mitigation: string;
  resolution_status: string;
  evidence_reference?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  knowledge_concentration: "Knowledge Concentration",
  ownership_risk: "Ownership Risk",
  deadline_risk: "Deadline Risk",
  dependency_risk: "Dependency Risk",
  documentation_risk: "Documentation Risk",
  security_risk: "Security Risk",
  technical_debt: "Technical Debt",
  unresolved_decisions: "Unresolved Decisions",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
  high: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  medium: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  low: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-300" },
};

export default function RiskRadarPage() {
  const [findings, setFindings] = useState<RiskFinding[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        api.getRiskRadar(pid).then((data) => {
          setFindings(data.findings);
          setStats({
            total: data.total_risks,
            critical: data.critical_count,
            high: data.high_count,
            medium: data.medium_count,
            low: data.low_count,
          });
          setCategoryCounts(data.by_category || {});
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleStatusChange = async (riskId: string, newStatus: string) => {
    if (!projectId) return;
    try {
      const updated = await api.updateRiskStatus(projectId, riskId, newStatus);
      setFindings((prev) => prev.map((f) => (f.id === riskId ? updated : f)));
    } catch (err) {
      console.error("Failed to update risk status:", err);
    }
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
                          f.description.toLowerCase().includes(search.toLowerCase()) ||
                          (f.affected_entity && f.affected_entity.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || f.category === selectedCategory;
    const matchesSeverity = selectedSeverity === "all" || f.severity === selectedSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Risk Radar</h1>
            <span className="text-xs bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full border border-rose-200">
              Continuity Threat Matrix
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Explainable departure risk analysis detecting single-person bottlenecks, orphan credentials, and unresolved blockers.
          </p>
        </div>

        {/* Severity Heatmap Indicators */}
        <div className="flex items-center gap-2">
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-800">
            {stats.critical} Critical
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800">
            {stats.high} High
          </div>
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-800">
            {stats.medium} Medium
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            {stats.low} Low
          </div>
        </div>
      </div>

      {/* 8-Category Radar Heatmap Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = categoryCounts[key] || 0;
          const isSelected = selectedCategory === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(isSelected ? "all" : key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/30"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${
                isSelected ? "text-blue-300" : "text-slate-400"
              }`}>
                {label}
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-bold">{count}</span>
                <span className={`text-[10px] ${count > 0 ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
                  {count > 0 ? "Active" : "Clear"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Severity Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search risk title, component, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm font-medium text-slate-700"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Reset Category
            </button>
          )}
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Computing Project Risk Radar metrics...
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No continuity risks match your filter parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFindings.map((risk) => {
            const sev = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.medium;
            return (
              <div
                key={risk.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                      {risk.severity} Severity
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                      {CATEGORY_LABELS[risk.category] || risk.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {risk.title}
                  </h3>

                  {risk.affected_entity && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="font-semibold text-slate-700">Affected Component:</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {risk.affected_entity}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {risk.description}
                  </p>
                </div>

                {/* Mitigation & Resolution Controls */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Recommended Mitigation
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {risk.mitigation}
                    </p>
                  </div>

                  {risk.evidence_reference && (
                    <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-slate-600 not-italic">Grounded In:</span>
                      <span className="truncate">{risk.evidence_reference}</span>
                    </div>
                  )}

                  {/* Resolution Status Dropdown */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 font-medium">Resolution Status:</span>
                    <select
                      value={risk.resolution_status}
                      onChange={(e) => handleStatusChange(risk.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-sm ${
                        risk.resolution_status === "resolved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : risk.resolution_status === "mitigating"
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      <option value="open">Open Threat</option>
                      <option value="mitigating">Mitigation In Progress</option>
                      <option value="resolved">Resolved & Signed-off</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

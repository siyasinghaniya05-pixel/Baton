"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Search, 
  ExternalLink,
  BookOpen,
  Plus
} from "lucide-react";

interface Runbook {
  id: string;
  project_id: string;
  title: string;
  category: string;
  description?: string;
  content_markdown: string;
  prerequisites: string[];
  commands: string[];
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

const CATEGORY_TABS = [
  { id: "all", name: "All Runbooks" },
  { id: "setup", name: "Setup" },
  { id: "deployment", name: "Deployment" },
  { id: "troubleshooting", name: "Troubleshooting" },
  { id: "recurring", name: "Recurring" },
  { id: "emergency", name: "Emergency DR" },
];

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        api.getRunbooks(pid).then((data) => {
          setRunbooks(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleToggleVerify = async (rb: Runbook) => {
    if (!projectId) return;
    try {
      const updated = await api.verifyRunbook(projectId, rb.id, !rb.is_verified);
      setRunbooks((prev) => prev.map((item) => (item.id === rb.id ? updated : item)));
    } catch (err) {
      console.error("Failed to toggle verify runbook:", err);
    }
  };

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredRunbooks = runbooks.filter((rb) => {
    const matchesCategory = selectedCategory === "all" || rb.category === selectedCategory;
    const matchesSearch = rb.title.toLowerCase().includes(search.toLowerCase()) || 
                          rb.content_markdown.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Living Runbook Generator</h1>
            <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-2.5 py-0.5 rounded-full border border-cyan-200">
              Verified Procedures
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic, evidence-linked operational guides replacing obsolete documentation with peer-verified runbooks.
          </p>
        </div>

        {/* Verification Summary */}
        <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 shadow-sm flex items-center gap-2">
          <span className="font-bold text-emerald-600">
            {runbooks.filter((r) => r.is_verified).length} / {runbooks.length}
          </span>
          <span>Runbooks Verified</span>
        </div>
      </div>

      {/* Categories & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search runbook content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-60"
          />
        </div>
      </div>

      {/* Runbook Cards */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading living runbooks...
        </div>
      ) : filteredRunbooks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No runbooks match your category or search query.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRunbooks.map((rb) => (
            <div
              key={rb.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                rb.is_verified ? "border-slate-200" : "border-amber-300 ring-1 ring-amber-200"
              }`}
            >
              {/* Header Bar */}
              <div className="p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {rb.category}
                    </span>
                    {rb.is_verified ? (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified by {rb.verified_by || "Reviewer"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Pending Peer Verification
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {rb.title}
                  </h3>
                  {rb.description && (
                    <p className="text-xs text-slate-500">
                      {rb.description}
                    </p>
                  )}
                </div>

                {/* Sign-off Action */}
                <button
                  onClick={() => handleToggleVerify(rb)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border shadow-sm transition-colors flex items-center gap-1.5 ${
                    rb.is_verified
                      ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{rb.is_verified ? "Revoke Verification" : "Sign Off & Verify ✓"}</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Prerequisites Strip */}
                {rb.prerequisites && rb.prerequisites.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Required Prerequisites
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rb.prerequisites.map((p, idx) => (
                        <span key={idx} className="text-xs bg-white text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Runnable Snippets */}
                {rb.commands && rb.commands.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Quick Execution Commands
                    </span>
                    <div className="space-y-1.5">
                      {rb.commands.map((cmd, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs border border-slate-800 shadow-inner"
                        >
                          <span className="truncate pr-3">$ {cmd}</span>
                          <button
                            onClick={() => copyToClipboard(cmd)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
                            title="Copy command"
                          >
                            {copiedCmd === cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Markdown Runbook Content */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800">
                      {rb.content_markdown}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Claim } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  AlertTriangle,
  ArrowRight,
  Search,
  Code,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

function EvidenceViewerContent() {
  const searchParams = useSearchParams();
  const initialClaimId = searchParams.get("claim_id");

  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(initialClaimId);
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getClaims(pid).then((cls) => {
          setClaims(cls);
          setLoading(false);
          if (!selectedClaimId && cls.length > 0) {
            setSelectedClaimId(cls[0].id);
          }
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedClaimId) {
      setInspectLoading(true);
      setIsEditing(false);
      api.getEvidenceInspection(selectedClaimId)
        .then((data) => {
          setEvidenceData(data);
          setEditedDesc(data.claim.description);
          setInspectLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setInspectLoading(false);
        });
    }
  }, [selectedClaimId]);

  const handleReviewAction = async (action: "accepted" | "edited" | "rejected") => {
    if (!selectedClaimId) return;
    try {
      await api.reviewClaim(selectedClaimId, action, reviewNote, action === "edited" ? editedDesc : undefined);
      alert(`Claim marked as ${action}! Recorded to append-only audit trail.`);
      const refreshed = await api.getEvidenceInspection(selectedClaimId);
      setEvidenceData(refreshed);
      setReviewNote("");
      setIsEditing(false);
      setClaims((prev) => prev.map((c) => c.id === selectedClaimId ? { ...c, review_state: action, description: editedDesc } : c));
    } catch (err: any) {
      alert("Review action failed: " + err.message);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading Evidence Viewer...</div>;
  }

  const claim = evidenceData?.claim;
  const source = evidenceData?.source;
  const chunk = evidenceData?.chunk;
  const verification = evidenceData?.verification;

  const renderHighlightedDocument = () => {
    if (!chunk || !chunk.content) {
      return <div className="text-slate-400 italic">No source chunk text available for this claim.</div>;
    }

    const rawText = chunk.content;
    const quote = claim?.exact_quote || "";

    if (!quote || !rawText.includes(quote)) {
      return (
        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed">
          {rawText}
        </pre>
      );
    }

    const parts = rawText.split(quote);

    return (
      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 leading-relaxed">
        {parts.map((part: string, idx: number) => (
          <React.Fragment key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <mark className="bg-amber-200 text-slate-900 font-semibold px-1 py-0.5 rounded shadow-xs border border-amber-300">
                {quote}
              </mark>
            )}
          </React.Fragment>
        ))}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Evidence Viewer</h1>
          <p className="text-xs text-slate-500">
            Split-screen verification: deterministic quote matching and original document inspection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Select Claim:</span>
          <select
            value={selectedClaimId || ""}
            onChange={(e) => setSelectedClaimId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-medium max-w-md focus:outline-none"
          >
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.category}] {c.description.slice(0, 60)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* LEFT PANEL */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {claim?.category || "Category"}
              </span>
              <div className="flex items-center gap-2">
                {claim && <StatusBadge status={claim.status} />}
                {claim && <SensitivityBadge level={claim.sensitivity} />}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Reconstructed Claim</label>
              {isEditing ? (
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue/20"
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 text-sm">
                  {claim?.description}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Cited Supporting Quotation</label>
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs font-mono text-slate-800 italic">
                "{claim?.exact_quote || "No quotation extracted"}"
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Deterministic Verification Engine</span>
                {verification?.is_verified_deterministic ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED 100%
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> UNVERIFIED QUOTE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                {verification?.status_rationale}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Semantic Support:</span>
                  <div className="font-bold text-slate-800">{Math.round((verification?.support_score || 0) * 100)}%</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Evidence Location:</span>
                  <div className="font-mono text-[11px] text-slate-800 truncate">{claim?.evidence_location}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Review State:</span>
              <span className="font-bold capitalize text-slate-800">{claim?.review_state}</span>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700">Reviewer Actions</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Reviewer notes (optional)..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
              />
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                title="Edit description"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? "Done" : "Edit"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleReviewAction("accepted")}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
              </button>
              <button
                onClick={() => handleReviewAction("edited")}
                disabled={!isEditing && editedDesc === claim?.description}
                className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5" /> Save Edit
              </button>
              <button
                onClick={() => handleReviewAction("rejected")}
                className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-blue" />
              <span className="font-semibold text-sm text-slate-800">{source?.filename || "Source Document"}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="bg-slate-200/70 px-2 py-0.5 rounded font-mono text-[10px]">
                {chunk?.id || "chunk_000"}
              </span>
              <span>L{chunk?.line_start || 1} - L{chunk?.line_end || 30}</span>
            </div>
          </div>

          <div className="bg-amber-50 px-5 py-2 border-b border-amber-100 flex items-center justify-between text-xs text-amber-800 font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Exact supporting citation highlighted below in yellow</span>
            </div>
            <span className="font-mono text-[11px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
              Verified Span
            </span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
            {inspectLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading source document passage...</div>
            ) : (
              renderHighlightedDocument()
            )}
          </div>

          <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Deterministic chunk ID: {chunk?.id}</span>
            <span>PII Redactions Applied: {chunk?.pii_redacted_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EvidenceViewerPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Evidence Viewer...</div>}>
      <EvidenceViewerContent />
    </Suspense>
  );
}

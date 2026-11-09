"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Source, SensitivityLevel } from "@/lib/types";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { 
  FileStack, 
  UploadCloud, 
  FileText, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  ChevronDown,
  Sparkles
} from "lucide-react";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>("internal");
  const [consent, setConsent] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        api.getSources(pid).then((srcs) => {
          setSources(srcs);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !projectId) return;

    if (!consent) {
      alert("You must confirm consent before ingesting organizational sources.");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("sensitivity", sensitivity);
    formData.append("consent_confirmed", consent.toString());
    formData.append("file", selectedFile);

    try {
      const res = await api.uploadSource(formData);
      setUploadResult(res);
      alert(`Source '${selectedFile.name}' parsed, chunked, and reconstructed into ${res.chunks_created} addressable chunks!`);
      setSelectedFile(null);
      // Refresh sources
      const updated = await api.getSources(projectId);
      setSources(updated);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Source Ingestion & Provenance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Authorized project sources. Every chunk receives a permanent deterministic chunk ID and undergoes privacy scanning before knowledge extraction.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-brand-blue" />
          <span>Ingest New Project Source</span>
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-brand-blue rounded-xl p-8 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              accept=".md,.txt,.pdf,.csv,.json,.zip"
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <FileStack className="w-10 h-10 text-slate-400 mb-2" />
              <span className="text-sm font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : "Click to select or drag and drop source file"}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supported: GitHub export (.zip), Meeting notes (.pdf, .md), Task boards (.csv, .json), Chat logs (.txt)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sensitivity Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Source Classification (Sensitivity Label)
              </label>
              <select
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value as SensitivityLevel)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="public">Public (Open source / external)</option>
                <option value="internal">Internal (Default club/team members)</option>
                <option value="confidential">Confidential (Leadership / Restricted clearance)</option>
                <option value="restricted">Restricted / Canary (Secrets & Credentials)</option>
              </select>
            </div>

            {/* Consent Confirmation */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="rounded text-brand-blue focus:ring-brand-blue/20 w-4 h-4"
                />
                <span>Confirm authorization and consent to ingest this document into project knowledge base</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-5 py-2.5 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-40"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? "Parsing & Reconstructing..." : "Ingest & Reconstruct Claims"}</span>
            </button>
          </div>
        </form>

        {uploadResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Ingestion and AI Extraction Complete
            </div>
            <div>Chunks created: {uploadResult.chunks_created}</div>
            <div>PII/Secret entities redacted: {uploadResult.redacted_items_count}</div>
          </div>
        )}
      </div>

      {/* List of Ingested Sources */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Ingested Sources ({sources.length})</h2>
          <span className="text-xs text-slate-400">All chunks maintain cryptographic hashes</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading sources...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sources.map((src) => (
              <div key={src.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center font-bold text-xs uppercase">
                    {src.file_type}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{src.filename}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{src.total_chunks} Chunks</span>
                      <span>•</span>
                      <span>SHA256: {src.sha256_hash ? src.sha256_hash.slice(0, 16) : "Calculated"}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <SensitivityBadge level={src.sensitivity} />
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(src.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


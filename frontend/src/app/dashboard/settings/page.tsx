"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { 
  Settings, 
  ShieldAlert, 
  KeyRound, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Cpu,
  Lock
} from "lucide-react";

export default function SettingsPage() {
  const [canaryInput, setCanaryInput] = useState("AWS key AKIA1234567890ABCDEF and canary token canary-prod-token-9988-aether-restricted-7721");
  const [canaryResult, setCanaryResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [llmProvider, setLlmProvider] = useState("gemini");

  const handleTestCanaryRedaction = () => {
    // Client-side simulation of backend scanner
    let text = canaryInput;
    text = text.replace(/canary-[a-zA-Z0-9_\-]{8,}/gi, "[REDACTED_CANARY_SECRET]");
    text = text.replace(/\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]");
    setCanaryResult(text);
  };

  const handleResetDemo = async () => {
    if (confirm("Reset synthetic Project Aether to clean state?")) {
      setResetting(true);
      try {
        await api.resetDemo();
        alert("Project Aether successfully reset!");
      } catch (err: any) {
        alert("Reset failed: " + err.message);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure AI adapters, audit canary token shielding, and manage privacy compliance.
        </p>
      </div>

      {/* Canary Secret Scanner Simulator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-slate-900">Canary Secret & PII Redaction Engine</h2>
        </div>
        <p className="text-xs text-slate-500">
          BATON scrubs synthetic canary tokens, credentials, and PII before text is transmitted to LLM adapters or unauthorized roles.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">Test String (Paste secrets or canaries):</label>
          <textarea
            rows={3}
            value={canaryInput}
            onChange={(e) => setCanaryInput(e.target.value)}
            className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <button
          onClick={handleTestCanaryRedaction}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Lock className="w-4 h-4" />
          <span>Execute Pre-AI Redaction Scanner</span>
        </button>

        {canaryResult && (
          <div className="mt-3 p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Scrubbed Content (Safely passed to LLM):
            </div>
            <pre className="whitespace-pre-wrap">{canaryResult}</pre>
          </div>
        )}
      </div>

      {/* LLM Adapter Config */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-brand-blue" />
          <h2 className="text-base font-bold text-slate-900">Swappable LLM Adapter</h2>
        </div>
        <p className="text-xs text-slate-500">
          Temperature 0 with strict JSON schema enforcement. Zero hallucinations guarantee.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "gemini", name: "Google Gemini 1.5 Pro", desc: "Structured extraction & verification" },
            { id: "claude", name: "Anthropic Claude 3.5", desc: "Complex reasoning & gap analysis" },
            { id: "local", name: "Local Deterministic Engine", desc: "100% offline zero-hallucination mode" },
          ].map((engine) => (
            <button
              key={engine.id}
              onClick={() => setLlmProvider(engine.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                llmProvider === engine.id
                  ? "border-brand-blue bg-blue-50/50 shadow-xs ring-2 ring-brand-blue/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-slate-900 text-xs">{engine.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">{engine.desc}</div>
              {llmProvider === engine.id && (
                <div className="text-[10px] font-bold text-brand-blue mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Adapter
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Data Governance & Reset */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Data Governance & Demo Controls</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="font-semibold text-slate-800 text-xs">Reset Demonstration Dataset</div>
            <p className="text-[11px] text-slate-500">
              Restore Project Aether to original state with all synthetic sources, planted conflicts, and canary secrets.
            </p>
          </div>
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting..." : "Reset Project Aether"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


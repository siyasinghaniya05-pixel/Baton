"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  GitCompare, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Activity,
  Layers
} from "lucide-react";

interface DriftItem {
  id: string;
  drift_type: string;
  title: string;
  baseline_value: string;
  current_value: string;
  severity: string;
  detected_source: string;
  impact: string;
  recommended_action: string;
}

interface DriftData {
  project_id: string;
  drift_score: number;
  total_drifts: number;
  items: DriftItem[];
}

export default function DriftDetectorPage() {
  const [data, setData] = useState<DriftData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getDrift(pid).then((res) => {
          setData(res);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Knowledge Drift Detector</h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Temporal Divergence
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Detecting architectural contradictions, outdated instructions, and unannounced ownership transitions across source versions.
          </p>
        </div>

        {data && (
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Stability Metric</span>
              <span className="text-base font-extrabold text-blue-600">{data.drift_score}% Consistent</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Analyzing temporal drift across sources...
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {item.drift_type.replace("_", " ")}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      item.severity === "critical"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : item.severity === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : "bg-blue-50 text-blue-700 border-blue-300"
                    }`}>
                      {item.severity} severity
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {item.detected_source}
                </span>
              </div>

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Baseline (Earlier Sources)
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono">
                    {item.baseline_value}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Current Divergence (Recent Evidence)
                  </span>
                  <p className="text-xs text-amber-950 leading-relaxed font-mono font-medium">
                    {item.current_value}
                  </p>
                </div>
              </div>

              {/* Impact & Recommended Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="font-bold text-rose-700 block mb-1">Operational Impact:</span>
                  <p className="text-slate-600 leading-relaxed">{item.impact}</p>
                </div>
                <div>
                  <span className="font-bold text-blue-700 block mb-1">Reconciliation Action:</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{item.recommended_action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

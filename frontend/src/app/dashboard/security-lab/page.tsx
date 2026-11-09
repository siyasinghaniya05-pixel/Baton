"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Fingerprint, 
  ShieldCheck, 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock,
  Terminal,
  Activity
} from "lucide-react";

interface TestCase {
  test_id: string;
  attack_type: string;
  canary_id: string;
  target_role: string;
  prompt_payload: string;
  canary_token_expected: boolean;
  canary_token_leaked: boolean;
  passed: boolean;
  status_explanation: string;
}

interface SimulationResponse {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  leak_rate_percentage: number;
  shield_status: string;
  results: TestCase[];
}

export default function SecurityLabPage() {
  const [data, setData] = useState<SimulationResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        // Run initial simulation
        api.runSecuritySimulation(pid).then((res) => setData(res));
      }
    });
  }, []);

  const handleRunSimulation = async () => {
    if (!projectId || running) return;
    setRunning(true);
    try {
      const res = await api.runSecuritySimulation(projectId);
      setData(res);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy & Canary Leak Simulator</h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Active Defense Lab
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time adversary penetration testing verifying that sensitive canary strings and credentials never leak across role boundaries.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          {running ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Simulating Attack Vectors...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Automated Leak Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Metric Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500">Shield Status</span>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>{data.shield_status}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500">Canary Leak Rate</span>
            <div className="text-2xl font-extrabold text-slate-900">
              {data.leak_rate_percentage}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500">Tests Evaluated</span>
            <div className="text-2xl font-extrabold text-indigo-600">
              {data.total_tests} Vectors
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-emerald-800">Passed Verifications</span>
            <div className="text-2xl font-extrabold text-emerald-700">
              {data.passed_tests} / {data.total_tests}
            </div>
          </div>
        </div>
      )}

      {/* Test Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Automated Penetration Test Vectors
          </h3>
          <span className="text-xs text-slate-400">Microsoft Presidio + Canary Shield Policy Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Test ID & Vector</th>
                <th className="p-4">Target Role</th>
                <th className="p-4">Adversary Prompt Payload</th>
                <th className="p-4">Canary Token</th>
                <th className="p-4">Result & Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Running canary leak simulator...
                  </td>
                </tr>
              ) : (
                data.results.map((test) => (
                  <tr key={test.test_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-mono">
                      <span className="font-bold text-slate-900 block">{test.test_id}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{test.attack_type.replace(/_/g, " ")}</span>
                    </td>

                    <td className="p-4">
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                        {test.target_role.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="p-4 max-w-xs font-mono text-[11px] text-slate-700 truncate" title={test.prompt_payload}>
                      "{test.prompt_payload}"
                    </td>

                    <td className="p-4 font-mono text-[11px] text-indigo-700">
                      {test.canary_id}
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          test.passed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-rose-50 text-rose-700 border-rose-300"
                        }`}>
                          {test.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {test.passed ? "CONTAINED / PASSED" : "LEAK DETECTED"}
                        </span>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {test.status_explanation}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


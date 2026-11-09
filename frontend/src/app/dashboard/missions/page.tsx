"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  Circle, 
  FileEdit, 
  Save, 
  ArrowRight, 
  Compass, 
  Terminal, 
  ShieldCheck,
  Sparkles
} from "lucide-react";

interface Mission {
  id: string;
  project_id: string;
  mission_number: number;
  title: string;
  objective: string;
  estimated_minutes: number;
  instructions_markdown: string;
  completion_criteria: string[];
  status: string; // pending, in_progress, completed
  successor_notes?: string;
  completed_at?: string;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        api.getMissions(pid).then((data) => {
          setMissions(data);
          const initialNotes: Record<string, string> = {};
          data.forEach((m: Mission) => {
            initialNotes[m.id] = m.successor_notes || "";
          });
          setNotesState(initialNotes);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleStatusToggle = async (mission: Mission) => {
    if (!projectId) return;
    const nextStatus = mission.status === "completed" 
      ? "pending" 
      : mission.status === "pending" 
      ? "in_progress" 
      : "completed";

    try {
      const updated = await api.updateMission(projectId, mission.id, {
        status: nextStatus,
        successor_notes: notesState[mission.id]
      });
      setMissions((prev) => prev.map((m) => (m.id === mission.id ? updated : m)));
    } catch (err) {
      console.error("Failed to update mission status:", err);
    }
  };

  const handleSaveNotes = async (missionId: string) => {
    if (!projectId) return;
    setSavingId(missionId);
    try {
      const updated = await api.updateMission(projectId, missionId, {
        successor_notes: notesState[missionId]
      });
      setMissions((prev) => prev.map((m) => (m.id === missionId ? updated : m)));
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingId(null);
    }
  };

  const completedCount = missions.filter((m) => m.status === "completed").length;
  const progressPercent = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Successor Mission Mode</h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Interactive Onboarding
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Turn passive handover reading into 6 guided operational missions to assume command of Project Aether safely.
          </p>
        </div>

        {/* Progress Metric Banner */}
        <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-500 font-medium">Onboarding Velocity</span>
              <span className="font-bold text-slate-900">{completedCount} of {missions.length} Missions</span>
            </div>
            <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-extrabold text-emerald-600">{progressPercent}%</span>
        </div>
      </div>

      {/* Missions Accordion / List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading guided successor missions...
        </div>
      ) : (
        <div className="space-y-4">
          {missions.map((m) => {
            const isCompleted = m.status === "completed";
            const isInProgress = m.status === "in_progress";

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                  isCompleted 
                    ? "border-emerald-300 ring-1 ring-emerald-200" 
                    : isInProgress
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-slate-200"
                }`}
              >
                {/* Top Mission Strip */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => handleStatusToggle(m)}
                      title="Click to cycle status"
                      className="transition-transform hover:scale-110 flex-shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 fill-emerald-100" />
                      ) : isInProgress ? (
                        <Clock className="w-7 h-7 text-amber-500 animate-spin" style={{ animationDuration: "10s" }} />
                      ) : (
                        <Circle className="w-7 h-7 text-slate-300" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Mission 0{m.mission_number}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded border ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isInProgress
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {m.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ~{m.estimated_minutes} min
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {m.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStatusToggle(m)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm transition-colors ${
                      isCompleted
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : isInProgress
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                        : "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    {isCompleted ? "Mark Incomplete" : isInProgress ? "Mark Completed ✓" : "Start Mission →"}
                  </button>
                </div>

                {/* Mission Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Mission Objective
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {m.objective}
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Instructions & Walkthrough
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {m.instructions_markdown}
                    </p>
                  </div>

                  {/* Completion Criteria Checklist */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Verification Criteria
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {m.completion_criteria.map((crit, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                            isCompleted ? "text-emerald-500" : "text-slate-400"
                          }`} />
                          <span>{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Successor Notes & Findings Field */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <FileEdit className="w-3.5 h-3.5 text-blue-600" />
                        Successor Log & Observations
                      </span>
                      <button
                        onClick={() => handleSaveNotes(m.id)}
                        disabled={savingId === m.id}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>{savingId === m.id ? "Saving..." : "Save Notes"}</span>
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Record your test results, branch names verified, or questions for Alex / Elena..."
                      value={notesState[m.id] || ""}
                      onChange={(e) => setNotesState({ ...notesState, [m.id]: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
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

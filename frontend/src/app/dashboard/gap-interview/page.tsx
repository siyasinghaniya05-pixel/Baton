"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GapQuestion } from "@/lib/types";
import { 
  HelpCircle, 
  Send, 
  SkipForward, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Bot
} from "lucide-react";

export default function GapInterviewPage() {
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getGapQuestions(pid).then((qs) => {
          setQuestions(qs);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleAnswerSubmit = async (questionId: string) => {
    const text = answers[questionId];
    if (!text || !text.trim()) {
      alert("Please enter your answer before submitting.");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [questionId]: true }));
    try {
      await api.answerGapQuestion(questionId, text);
      alert("Answer saved as new labelled evidence and added to project sources!");
      // Refresh questions
      const projs = await api.getProjects();
      const updated = await api.getGapQuestions(projs[0].id);
      setQuestions(updated);
    } catch (err: any) {
      alert("Failed to submit answer: " + err.message);
    } finally {
      setSubmitting((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSkip = async (questionId: string) => {
    try {
      await api.skipGapQuestion(questionId);
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, status: "skipped" } : q));
    } catch (err: any) {
      alert("Failed to skip question: " + err.message);
    }
  };

  const handleMarkUnknown = async (questionId: string) => {
    try {
      await api.markUnknownGapQuestion(questionId);
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, status: "marked_unknown" } : q));
    } catch (err: any) {
      alert("Failed to mark unknown: " + err.message);
    }
  };

  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const answeredCount = questions.filter((q) => q.status === "answered").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 to-navy-850 text-white rounded-2xl p-6 lg:p-8 shadow-xl border border-navy-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold mb-3">
              <Bot className="w-3.5 h-3.5" />
              <span>AI-Powered Gap Interview Agent</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Targeted Leaver Inquiries
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Instead of filling a blank handover form, BATON identifies missing credentials, unassigned roles,
              and contradictory decisions—asking precise questions to extract critical institutional memory.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-navy-800 p-4 rounded-xl border border-navy-700 text-center">
              <div className="text-2xl font-bold text-purple-400">{pendingCount}</div>
              <div className="text-[11px] text-slate-400">Questions Pending</div>
            </div>
            <div className="bg-navy-800 p-4 rounded-xl border border-navy-700 text-center">
              <div className="text-2xl font-bold text-emerald-400">{answeredCount}</div>
              <div className="text-[11px] text-slate-400">Answered & Grounded</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Requirement Notice */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-brand-blue flex-shrink-0" />
        <div>
          <span className="font-bold">Evidence Linking Guarantee:</span> Responses submitted here become new
          labelled evidence documents (`Gap-Interview-Response.txt`) and undergo quotation grounding. They are
          never accepted as unverified facts.
        </div>
      </div>

      {/* Question Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading interview queue...</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`bg-white rounded-xl border p-6 shadow-xs transition-all ${
                q.status === "answered"
                  ? "border-emerald-200 bg-emerald-50/20"
                  : q.status === "marked_unknown"
                  ? "border-amber-200 bg-amber-50/20 opacity-80"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {q.context_category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Gap: {q.detected_gap_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                      Priority {q.priority}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base pt-1">
                    {idx + 1}. {q.question_text}
                  </h3>
                </div>

                {/* Status Indicator */}
                <div>
                  {q.status === "answered" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Answered & Grounded
                    </span>
                  ) : q.status === "marked_unknown" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" /> Marked Unknown
                    </span>
                  ) : q.status === "skipped" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      <SkipForward className="w-3.5 h-3.5" /> Skipped
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Action Required
                    </span>
                  )}
                </div>
              </div>

              {/* Already Answered View */}
              {q.answers && q.answers.length > 0 ? (
                <div className="mt-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-sm text-slate-800">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Recorded Leaver Response:
                  </div>
                  <div className="italic">"{q.answers[0].answer_text}"</div>
                  <div className="text-[11px] text-emerald-700 mt-2 font-medium">
                    Tagged as new evidence record. Awaiting reviewer acceptance.
                  </div>
                </div>
              ) : (
                /* Response Input Field */
                <div className="mt-4 space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Provide specific details, instructions, contacts, or access steps..."
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkUnknown(q.id)}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Mark Information Unknown
                      </button>
                      <button
                        onClick={() => handleSkip(q.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                      </button>
                    </div>

                    <button
                      onClick={() => handleAnswerSubmit(q.id)}
                      disabled={submitting[q.id]}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting[q.id] ? "Ingesting..." : "Submit as Evidence"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


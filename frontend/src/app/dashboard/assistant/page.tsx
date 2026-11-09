"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  HelpCircle,
  CornerDownLeft,
  RotateCcw
} from "lucide-react";

interface Citation {
  source_id: string;
  source_name: string;
  chunk_id?: string;
  location: string;
  exact_quote: string;
  confidence: number;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  confidence?: number;
  groundingStatus?: string;
  citations?: Citation[];
  followUps?: string[];
  missingEvidenceNote?: string;
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  "Why did we select the Livox Mid-360 LiDAR?",
  "Who owns the Kafka telemetry pipeline?",
  "What are the biggest project risks?",
  "What should I complete on Day 1?",
  "Which decisions are still unresolved?",
  "What is the secret CANARY_PROD_HSM_KEY_994X?"
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello Sam Taylor! I am BATON's **Continuity Project Assistant**.\n\nEvery claim I provide is strictly grounded in authorized project sources with exact verbatim citations. I will never hallucinate or invent unverified facts, and restricted canary tokens are strictly shielded from unapproved roles.\n\nHow can I help you take over **Project Aether**?",
      confidence: 1.0,
      groundingStatus: "grounded",
      citations: [],
      followUps: [
        "Why did we select the Livox Mid-360 LiDAR?",
        "Who owns the deployment process?",
        "What are the biggest project risks?"
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) setProjectId(pid);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || !projectId || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.askAssistant(projectId, q);
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: "assistant",
        text: res.answer,
        confidence: res.confidence,
        groundingStatus: res.grounding_status,
        citations: res.citations || [],
        followUps: res.follow_up_suggestions || [],
        missingEvidenceNote: res.missing_evidence_note,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: "assistant",
          text: `Error retrieving grounded evidence: ${err.message || "Failed to communicate with RAG engine"}`,
          groundingStatus: "ungrounded_refusal",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ask Your Project AI</h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Zero-Hallucination RAG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Permission-filtered conversational intelligence strictly grounded in verbatim project evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Clearance:</span>
          <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200">
            Successor (Internal + Confidential)
          </span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-y-auto space-y-5 custom-scrollbar">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm ${
                isUser ? "bg-slate-900" : "bg-gradient-to-tr from-blue-600 to-indigo-600"
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2.5 shadow-sm ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-none"
                    : m.groundingStatus === "ungrounded_refusal"
                    ? "bg-rose-50/80 border border-rose-200 text-rose-950 rounded-tl-none"
                    : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none"
                }`}>
                  <div className="whitespace-pre-line font-normal">
                    {m.text}
                  </div>

                  {/* Grounding & Confidence Badges for Assistant */}
                  {!isUser && m.confidence !== undefined && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                      <span className={`font-bold uppercase px-2 py-0.5 rounded border ${
                        m.groundingStatus === "grounded"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : m.groundingStatus === "ungrounded_refusal"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {m.groundingStatus}
                      </span>
                      <span className="text-slate-500 font-mono">
                        Confidence: {Math.round(m.confidence * 100)}%
                      </span>
                      <span className="text-slate-400 ml-auto">{m.timestamp}</span>
                    </div>
                  )}

                  {/* Citations Box */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600" />
                        Grounded Citations ({m.citations.length})
                      </span>
                      <div className="space-y-1">
                        {m.citations.map((c, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-blue-700">{c.source_name}</span>
                              <span className="text-slate-400 font-mono">{c.location}</span>
                            </div>
                            <blockquote className="text-[11px] text-slate-700 italic border-l border-blue-400 pl-1.5">
                              "{c.exact_quote}"
                            </blockquote>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Follow-up question chips */}
                {!isUser && m.followUps && m.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.followUps.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q)}
                        className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Retrieving authorized project chunks and verifying citations...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">Try asking:</span>
        {SAMPLE_QUESTIONS.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sq)}
            className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap shadow-sm transition-colors"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex-shrink-0"
      >
        <input
          type="text"
          placeholder="Ask a technical, architectural, or ownership question about Project Aether..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="w-full pl-4 pr-12 py-3 text-xs bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}


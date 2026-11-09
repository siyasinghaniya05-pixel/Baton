"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  MessagesSquare, 
  Send, 
  User, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Clock,
  ShieldCheck
} from "lucide-react";

interface Comment {
  id: string;
  project_id: string;
  claim_id?: string;
  runbook_id?: string;
  author_name: string;
  author_role: string;
  comment_text: string;
  status_tag: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "bg-purple-100", text: "text-purple-800" },
  reviewer: { bg: "bg-blue-100", text: "text-blue-800" },
  leaver: { bg: "bg-amber-100", text: "text-amber-800" },
  successor: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  clarification: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  blocker: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  resolved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  general: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export default function CollaborationPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [newText, setNewText] = useState("");
  const [selectedTag, setSelectedTag] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        setProjectId(pid);
        api.getComments(pid).then((data) => {
          setComments(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !projectId || submitting) return;
    setSubmitting(true);
    try {
      const created = await api.postComment(projectId, {
        comment_text: newText,
        status_tag: selectedTag,
      });
      setComments((prev) => [...prev, created]);
      setNewText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collaboration Room</h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Multi-Role Workspace
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Structured deliberation channel for outgoing leads, technical reviewers, and incoming successors.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Total Discussions:</span>
          <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-900">
            {comments.length} Comments
          </span>
        </div>
      </div>

      {/* Discussion Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Active Deliberations & Alignment Log
        </h3>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading team thread comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No deliberations recorded yet. Start a discussion below!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const roleStyle = ROLE_COLORS[c.author_role] || ROLE_COLORS.reviewer;
              const tagStyle = TAG_COLORS[c.status_tag] || TAG_COLORS.general;

              return (
                <div key={c.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[11px]">
                        {c.author_name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{c.author_name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded ${roleStyle.bg} ${roleStyle.text}`}>
                        {c.author_role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`}>
                        {c.status_tag}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pl-8">
                    {c.comment_text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Comment Form */}
      <form onSubmit={handlePostComment} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-800 block">Post to Deliberation Thread</span>

        <textarea
          rows={3}
          placeholder="Share context on conflicting claims, ask a technical question, or propose resolution..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tag:</span>
            {["general", "clarification", "blocker", "resolved"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`text-xs capitalize px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  selectedTag === tag
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!newText.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Posting..." : "Post Comment"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

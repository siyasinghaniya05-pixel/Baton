"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  FileText,
  Milestone,
  ArrowRight
} from "lucide-react";

export default function TimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getTimeline(pid).then((evs) => {
          setEvents(evs);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading chronological timeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Evolution Timeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chronological reconstruction of major architectural decisions, hardware milestones, unresolved disputes, and PR states.
        </p>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-6">
        {events.map((event, idx) => {
          const isConflict = event.event_type === "conflict";
          const isMilestone = event.event_type === "milestone";
          const isBlocker = event.event_type === "blocker";

          return (
            <div key={event.id || idx} className="relative group">
              {/* Dot Icon on line */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  isConflict
                    ? "bg-rose-500 ring-4 ring-rose-100"
                    : isMilestone
                    ? "bg-purple-500 ring-4 ring-purple-100"
                    : isBlocker
                    ? "bg-amber-500 ring-4 ring-amber-100"
                    : "bg-brand-blue ring-4 ring-blue-100"
                }`}
              />

              {/* Event Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {event.category}
                    </span>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{event.date}</span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                  {event.title}
                </h3>

                {event.exact_quote && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs font-mono text-slate-700 italic my-2">
                    "{event.exact_quote}"
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{event.evidence_location}</span>
                  </div>
                  <Link
                    href={`/dashboard/evidence?claim_id=${event.id}`}
                    className="text-brand-blue font-semibold hover:underline flex items-center gap-1"
                  >
                    Inspect Evidence <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


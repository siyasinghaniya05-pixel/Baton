import React from "react";
import { ClaimStatus } from "@/lib/types";
import { ShieldCheck, FileCheck, HelpCircle, AlertTriangle, HelpCircle as MissingIcon, AlertCircle } from "lucide-react";

export function StatusBadge({ status }: { status: ClaimStatus }) {
  switch (status) {
    case "Verified":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Verified
        </span>
      );
    case "Evidence-backed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="w-3.5 h-3.5 text-blue-600" />
          Evidence-backed
        </span>
      );
    case "Inferred":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          Inferred
        </span>
      );
    case "Conflict":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Conflict
        </span>
      );
    case "Missing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <MissingIcon className="w-3.5 h-3.5 text-purple-600" />
          Missing Gap
        </span>
      );
    case "Unverified":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          Unverified
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

import React from "react";
import { SensitivityLevel } from "@/lib/types";
import { Globe, Lock, ShieldAlert, KeyRound } from "lucide-react";

export function SensitivityBadge({ level, sensitivity }: { level?: SensitivityLevel; sensitivity?: SensitivityLevel }) {
  const effectiveLevel = level || sensitivity;
  switch (effectiveLevel) {
    case "public":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Globe className="w-3 h-3 text-slate-500" />
          Public
        </span>
      );
    case "internal":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <Lock className="w-3 h-3 text-blue-500" />
          Internal
        </span>
      );
    case "confidential":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <KeyRound className="w-3 h-3 text-amber-500" />
          Confidential
        </span>
      );
    case "restricted":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800 border border-red-200">
          <ShieldAlert className="w-3 h-3 text-red-600" />
          Restricted / Canary
        </span>
      );
    default:
      return null;
  }
}

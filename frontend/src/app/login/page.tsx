"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { UserRole } from "@/lib/types";
import { ShieldCheck, Lock, Mail, ArrowRight, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@baton.local");
  const [password, setPassword] = useState("AdminPass123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await api.switchRole(role);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Quick login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">BATON</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Sign in to your platform</h2>
        <p className="text-xs text-slate-500 mt-1">
          Pass the project, not just the files. Evidence-linked handover.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {loading ? "Authenticating..." : "Sign In with Credentials"}
            </button>
          </form>

          {/* Quick Demo Role Picker for Judges */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Quick One-Click Demo Logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-purple-900">Admin</div>
                <div className="text-[10px] text-purple-700">Sarah Chen</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("leaver")}
                className="p-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-amber-900">Leaver</div>
                <div className="text-[10px] text-amber-700">Alex Mercer</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("reviewer")}
                className="p-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-blue-900">Reviewer</div>
                <div className="text-[10px] text-blue-700">Elena Rostova</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("successor")}
                className="p-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-emerald-900">Successor</div>
                <div className="text-[10px] text-emerald-700">Sam Taylor</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleQuickLogin("restricted_viewer")}
              className="w-full p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-center text-xs text-slate-700 font-medium transition-colors"
            >
              Restricted Viewer (Jordan Lee - Public Clearance Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


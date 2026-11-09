"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { UserRole } from "@/lib/types";
import { ShieldCheck, Lock, Mail, User, ArrowRight, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

type AuthTab = "signin" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");

  // Sign In fields
  const [email, setEmail] = useState("admin@baton.local");
  const [password, setPassword] = useState("AdminPass123!");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("successor");

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.register(regName, regEmail, regPassword, regRole);
      setSuccessMsg("Account created successfully! You can now sign in.");
      setTab("signin");
      setEmail(regEmail);
      setPassword(regPassword);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotSuccess(res.message || "If the email exists, a password reset link has been dispatched.");
    } catch (err: any) {
      setError(err.message || "Request failed");
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-6 h-6 text-brand-blue" />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">BATON</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Project Continuity Intelligence
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Pass the project, not just the files. Evidence-linked handover platform.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 shadow-sm rounded-xl sm:px-8 border border-slate-200">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              onClick={() => { setTab("signin"); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                tab === "signin"
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                tab === "register"
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => { setTab("forgot"); setError(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                tab === "forgot"
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Reset Key
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Sign In */}
          {tab === "signin" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setTab("forgot")}
                    className="text-[11px] text-brand-blue hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : "Sign In with Credentials"}
              </button>
            </form>
          )}

          {/* Form: Register */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password (8+ chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white"
                >
                  <option value="successor">Successor (Receives Handover)</option>
                  <option value="leaver">Leaver (Project Owner Exiting)</option>
                  <option value="reviewer">Reviewer (Audits & Verifies Claims)</option>
                  <option value="restricted_viewer">Restricted Viewer (Public Only)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Admin roles are strictly provisioned by existing Organization Administrators.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {loading ? "Registering Account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Form: Forgot Password */}
          {tab === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter your verified email address to receive a cryptographically signed, single-use password reset token.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              {forgotSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  {forgotSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {loading ? "Dispatched..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* Quick Demo Switcher for Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Quick One-Click Demo Personas
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2 border border-purple-200 bg-purple-50/50 hover:bg-purple-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-purple-900">Admin</div>
                <div className="text-[10px] text-purple-700">Sarah Chen</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("leaver")}
                className="p-2 border border-amber-200 bg-amber-50/50 hover:bg-amber-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-amber-900">Leaver</div>
                <div className="text-[10px] text-amber-700">Alex Mercer</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("reviewer")}
                className="p-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-blue-900">Reviewer</div>
                <div className="text-[10px] text-blue-700">Elena Rostova</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("successor")}
                className="p-2 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-bold text-emerald-900">Successor</div>
                <div className="text-[10px] text-emerald-700">Sam Taylor</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleQuickLogin("restricted_viewer")}
              className="w-full p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-center text-xs text-slate-600 font-medium transition-colors"
            >
              Restricted Viewer (Jordan Lee - Public Clearance Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

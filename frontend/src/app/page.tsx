"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Lock, 
  SearchCode, 
  Award, 
  FileStack, 
  Bot, 
  HelpCircle,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Sparkles
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-blue selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-accent flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">BATON</span>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                PROD v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <span>Launch Demo Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Evidence-Linked Knowledge Handover Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Pass the project, <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            not just the files.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          When key engineers, student leaders, or researchers exit an organization, critical context evaporates.
          BATON reconstructs project decisions, task ownership, dependencies, and blockers—where every single claim
          is grounded in verifiable citations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <span>Explore Project Aether Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/evidence"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-sm font-bold transition-colors"
          >
            Inspect Evidence Grounding
          </Link>
        </div>

        {/* Guaranteed Principles Pill Bar */}
        <div className="pt-10 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Deterministic Citation Verification
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Hallucinations Rule
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Permission-Aware Role Partitioning
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Canary Secret Shielding
          </span>
        </div>
      </section>

      {/* The Knowledge Loss Problem vs BATON */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider">The Knowledge-Loss Dilemma</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white">Why Conventional Handover Fails</h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            Outgoing team members create vague Google Docs or dump raw repositories. The successor spends months rediscovering tribal knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Traditional Handover */}
          <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" /> Traditional Document Summarizer / Folder Dump
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Hallucinates facts with no verifiable connection to source passages.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Silently averages over conflicting decisions (e.g. ROS1 vs ROS2 migration).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Fails to protect confidential credentials; generates a single document that leaks sensitive tokens.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span>Requires leaver to face a blank page without guided inquiries into missing links.</span>
              </li>
            </ul>
          </div>

          {/* The BATON Way */}
          <div className="bg-blue-950/20 border border-blue-900/40 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-brand-blue" /> The BATON Evidence-Linked Architecture
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Verbatim Citation Grounding:</strong> Every claim links to an exact byte offset and line number in source files.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Preserves Conflicts & Gaps:</strong> Conflicting decisions remain visibly flagged until humans resolve them.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Role-Partitioned Synthesis:</strong> Successor, Lead, and Restricted views are compiled strictly from authorized evidence.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>AI Gap Interview Agent:</strong> Identifies missing owners, unassigned hardware calibration, and credential holes automatically.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Grid */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider">Engineered for Rigorous Trust</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white">How BATON Works End-to-End</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-brand-blue flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="font-bold text-sm text-white">Provenance Ingestion</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Repos, meeting notes, CSV boards, and 300+ chat messages are chunked with stable cryptographic IDs and scanned for PII/secrets.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="font-bold text-sm text-white">AI Claim Ledger</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Structured decisions, ownership, blockers, and risks are extracted. The deterministic verifier checks verbatim presence in chunks.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="font-bold text-sm text-white">Gap Interview & Review</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Targeted questions ask the leaver about missing credentials. Human reviewers accept, edit, or reject claims with append-only audit logs.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              4
            </div>
            <h4 className="font-bold text-sm text-white">Continuation & Quiz</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Actionable Day 1, Week 1, and Day 30 plans are generated. The successor passes a comprehension check and signs a digital receipt.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-blue" />
            <span className="font-bold text-slate-300">BATON</span>
            <span>— Pass the project, not just the files.</span>
          </div>
          <div>Project Aether Synthetic Robotics Demonstration Dataset Preloaded</div>
        </div>
      </footer>
    </div>
  );
}

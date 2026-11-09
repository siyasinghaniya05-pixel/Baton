"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { 
  FolderGit2, 
  FileStack, 
  Network, 
  Clock, 
  Users, 
  Upload, 
  ShieldCheck, 
  Search, 
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Info
} from "lucide-react";
import { SensitivityBadge } from "@/components/SensitivityBadge";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  repository_url?: string;
  total_sources: number;
  total_claims: number;
  total_handovers: number;
}

interface Source {
  id: string;
  filename: string;
  file_type: string;
  sensitivity: string;
  consent_confirmed: boolean;
  created_at: string;
}

const TABS = [
  { id: "overview", name: "Project & Team", icon: FolderGit2 },
  { id: "sources", name: "Sources & Ingestion", icon: FileStack },
  { id: "graph", name: "Contextual Knowledge Graph", icon: Network },
  { id: "timeline", name: "Timeline & Milestones", icon: Clock },
];

export default function ProjectsModulePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Graph state
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [graphStats, setGraphStats] = useState<Record<string, number>>({});
  const [graphSearch, setGraphSearch] = useState("");
  const [graphFilter, setGraphFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    api.getProjects().then((projs) => {
      const p = projs[0];
      if (p) {
        setProject(p);
        Promise.all([
          api.getSources(p.id).catch(() => []),
          api.getTimeline(p.id).catch(() => []),
          api.getKnowledgeGraph(p.id).catch(() => ({ nodes: [], edges: [], stats: {} }))
        ]).then(([srcs, tl, gData]) => {
          setSources(srcs);
          setTimeline(tl);
          
          // Layout graph nodes
          const total = gData.nodes.length;
          const positioned = gData.nodes.map((node: any, i: number) => {
            let radius = 240;
            if (node.type === "system") radius = 100;
            else if (node.type === "person") radius = 170;
            else if (node.type === "decision") radius = 260;
            else if (node.type === "risk") radius = 340;
            else if (node.type === "task") radius = 420;
            else radius = 490;

            const angle = (i / total) * 2 * Math.PI;
            const x = 550 + Math.cos(angle) * (radius + (i % 3) * 30);
            const y = 400 + Math.sin(angle) * (radius + (i % 2) * 25);
            return { ...node, x, y };
          });
          setGraphNodes(positioned);
          setGraphEdges(gData.edges);
          setGraphStats(gData.stats || {});
          if (positioned.length > 0) setSelectedNode(positioned[0]);

          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const filteredNodes = useMemo(() => {
    return graphNodes.filter((n) => {
      const matchSearch = n.label.toLowerCase().includes(graphSearch.toLowerCase()) ||
                          (n.details && n.details.toLowerCase().includes(graphSearch.toLowerCase()));
      const matchFilter = graphFilter === "all" || n.type === graphFilter;
      return matchSearch && matchFilter;
    });
  }, [graphNodes, graphSearch, graphFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
  const visibleEdges = useMemo(() => {
    return graphEdges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [graphEdges, filteredNodeIds]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    graphNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graphNodes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Management & Architecture</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage repository exports, multi-format sources, members, milestones, and architectural topology.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading project data...
        </div>
      ) : (
        <>
          {/* TAB 1: Overview & Team Members */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{project?.name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{project?.description}</p>
                  </div>
                  {project?.repository_url && (
                    <a
                      href={project.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>{project.repository_url}</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Sources Ingested</span>
                    <span className="text-base font-bold text-slate-900">{sources.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Reconstructed Claims</span>
                    <span className="text-base font-bold text-slate-900">{project?.total_claims || 38}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Handovers</span>
                    <span className="text-base font-bold text-slate-900">{project?.total_handovers || 1}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Architecture</span>
                    <span className="text-base font-bold text-blue-700">ROS2 Humble</span>
                  </div>
                </div>
              </div>

              {/* Team Members List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Project Team & Role-Based Clearance</h3>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    { name: "Sarah Chen", email: "admin@baton.local", role: "Admin", clearance: "Restricted (All Levels)", status: "Active" },
                    { name: "Alex Mercer", email: "alex.leaver@baton.local", role: "Outgoing Leaver", clearance: "Restricted", status: "Transitioning" },
                    { name: "Elena Rostova", email: "elena.reviewer@baton.local", role: "Tech Reviewer", clearance: "Restricted", status: "Active" },
                    { name: "Sam Taylor", email: "sam.successor@baton.local", role: "Successor", clearance: "Confidential (Pre-Auth)", status: "Onboarding" },
                    { name: "Jordan Lee", email: "guest.viewer@baton.local", role: "Restricted Viewer", clearance: "Internal/Public Only", status: "Auditing" },
                  ].map((m, idx) => (
                    <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded">
                          {m.role}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium">Clearance: {m.clearance}</span>
                        <span className="text-[11px] text-emerald-600 font-semibold">{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sources & Ingestion */}
          {activeTab === "sources" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2 bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800">Upload Authoritative Project Sources</h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Supported: GitHub exports (.json, .zip), Markdown (.md), Meeting Notes (.pdf), Task Boards (.csv, .json), Chat exports (.json).
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" defaultChecked disabled className="rounded text-blue-600" />
                    <span>Consent confirmed: Source data authorized for project continuity extraction.</span>
                  </div>
                </div>

                {/* Sources List */}
                <div className="divide-y divide-slate-100 text-xs">
                  {sources.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.filename}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Type: {s.file_type.toUpperCase()} • ID: {s.id.substring(0, 8)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <SensitivityBadge level={s.sensitivity as any} />
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Scanned & Redacted
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Contextual Knowledge Graph */}
          {activeTab === "graph" && (
            <div className="space-y-4">
              {/* Graph Toolbar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search nodes..."
                      value={graphSearch}
                      onChange={(e) => setGraphSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {["all", "person", "decision", "task", "system", "risk"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setGraphFilter(t)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded capitalize ${
                          graphFilter === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Graph Visual Area */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div
                  className="lg:col-span-3 h-[580px] bg-slate-950 rounded-xl border border-slate-800 shadow-xs relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging) return;
                    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 1100 800"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: "center center",
                      transition: isDragging ? "none" : "transform 0.1s ease-out"
                    }}
                  >
                    {/* Edges */}
                    {visibleEdges.map((e, idx) => {
                      const src = nodeMap.get(e.source);
                      const tgt = nodeMap.get(e.target);
                      if (!src || !tgt) return null;
                      const isSel = selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id);
                      return (
                        <line
                          key={idx}
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={isSel ? "#3b82f6" : "#334155"}
                          strokeWidth={isSel ? 2 : 1}
                          opacity={isSel ? 1 : 0.4}
                        />
                      );
                    })}

                    {/* Nodes */}
                    {filteredNodes.map((n) => {
                      const isSel = selectedNode?.id === n.id;
                      return (
                        <g
                          key={n.id}
                          transform={`translate(${n.x}, ${n.y})`}
                          onClick={() => setSelectedNode(n)}
                          className="cursor-pointer"
                        >
                          <circle
                            r={n.type === "system" ? 18 : 14}
                            fill={isSel ? "#1e293b" : "#0f172a"}
                            stroke={isSel ? "#60a5fa" : n.type === "risk" ? "#f43f5e" : "#3b82f6"}
                            strokeWidth={isSel ? 3 : 1.5}
                          />
                          <text
                            y="24"
                            fill={isSel ? "#ffffff" : "#cbd5e1"}
                            fontSize="9"
                            fontWeight={isSel ? "700" : "500"}
                            textAnchor="middle"
                            className="pointer-events-none select-none"
                          >
                            {n.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-[10px] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800">
                    Click node to view evidence • Pan & Zoom active
                  </div>
                </div>

                {/* Node Inspector Drawer */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                    Node Evidence Inspector
                  </div>
                  {selectedNode ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {selectedNode.type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{selectedNode.label}</h4>
                        {selectedNode.details && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedNode.details}</p>
                        )}
                      </div>

                      {selectedNode.evidence_quote && (
                        <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                            Grounded Quote:
                          </span>
                          <blockquote className="text-xs text-slate-800 italic">
                            "{selectedNode.evidence_quote}"
                          </blockquote>
                          {selectedNode.evidence_location && (
                            <span className="text-[10px] text-slate-500 font-mono block pt-1">
                              Location: {selectedNode.evidence_location}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-10">Select a node to inspect evidence.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Timeline */}
          {activeTab === "timeline" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Chronological Milestone Timeline
              </h3>
              <div className="space-y-4">
                {(timeline.length > 0 ? timeline : [
                  { event: "Adopt micro-ROS on STM32", date: "2026-09-12", role: "Architecture" },
                  { event: "Select Livox Mid-360 LiDAR", date: "2026-09-18", role: "Sensors" },
                  { event: "Cartographer 3D SLAM Migration", date: "2026-10-02", role: "Navigation" },
                  { event: "Kafka Ingestion Discovered", date: "2026-10-15", role: "Telemetry" },
                  { event: "ROS1 Noetic Fallback Frozen", date: "2026-10-20", role: "Release" },
                ]).map((t, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900">{t.event}</span>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {t.date} • {t.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Network, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ShieldAlert, 
  ExternalLink, 
  User, 
  Compass, 
  CheckSquare, 
  FileText, 
  Server, 
  AlertTriangle,
  Info,
  Maximize2
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  details?: string;
  status?: string;
  critical?: boolean;
  evidence_quote?: string;
  evidence_location?: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  label: string;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  person: { bg: "bg-emerald-950/60", border: "border-emerald-500", text: "text-emerald-300", fill: "#10b981" },
  decision: { bg: "bg-blue-950/60", border: "border-blue-500", text: "text-blue-300", fill: "#3b82f6" },
  task: { bg: "bg-slate-900/60", border: "border-slate-500", text: "text-slate-300", fill: "#94a3b8" },
  risk: { bg: "bg-rose-950/60", border: "border-rose-500", text: "text-rose-300", fill: "#f43f5e" },
  system: { bg: "bg-amber-950/60", border: "border-amber-500", text: "text-amber-300", fill: "#f59e0b" },
  file: { bg: "bg-purple-950/60", border: "border-purple-500", text: "text-purple-300", fill: "#a855f7" },
  repo: { bg: "bg-indigo-950/60", border: "border-indigo-500", text: "text-indigo-300", fill: "#6366f1" },
  dependency: { bg: "bg-cyan-950/60", border: "border-cyan-500", text: "text-cyan-300", fill: "#06b6d4" },
};

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    api.getProjects().then((projs) => {
      const pid = projs[0]?.id;
      if (pid) {
        api.getKnowledgeGraph(pid).then((data) => {
          // Compute static 2D layout coordinates for nodes
          const total = data.nodes.length;
          const positionedNodes = data.nodes.map((node: GraphNode, i: number) => {
            // Group by type into concentric rings or radial clusters
            let radius = 260;
            if (node.type === "system") radius = 100;
            else if (node.type === "person") radius = 180;
            else if (node.type === "decision") radius = 280;
            else if (node.type === "risk") radius = 370;
            else if (node.type === "task") radius = 460;
            else radius = 540;

            const angle = (i / total) * 2 * Math.PI;
            const x = 600 + Math.cos(angle) * (radius + (i % 3) * 35);
            const y = 450 + Math.sin(angle) * (radius + (i % 2) * 30);
            return { ...node, x, y };
          });

          setNodes(positionedNodes);
          setEdges(data.edges);
          setStats(data.stats || {});
          if (positionedNodes.length > 0) {
            setSelectedNode(positionedNodes.find((n: GraphNode) => n.type === "system") || positionedNodes[0]);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch = n.label.toLowerCase().includes(search.toLowerCase()) || 
                            (n.details && n.details.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filterType === "all" || n.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [nodes, search, filterType]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Connected edges for selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [selectedNode, edges]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Knowledge Graph</h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Live Topology
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic relational topology connecting team ownership, decisions, systems, files, and architectural dependencies.
          </p>
        </div>

        {/* Stats Pill Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <span className="font-bold text-indigo-600">{stats.total_nodes || nodes.length}</span> Nodes
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <span className="font-bold text-blue-600">{stats.total_edges || edges.length}</span> Relations
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <span className="font-bold text-emerald-600">{stats.persons || 0}</span> Members
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <span className="font-bold text-rose-600">{stats.risks || 0}</span> Risks
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Category Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search graph nodes, people, systems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "person", "decision", "task", "system", "risk", "file"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filterType === t
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            title="Zoom In"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            title="Zoom Out"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="Reset Pan & Zoom"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage & Side Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Graph Canvas */}
        <div 
          className="lg:col-span-3 h-[680px] bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative select-none cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
              Reconstructing Project Knowledge Graph...
            </div>
          ) : (
            <svg
              className="w-full h-full"
              viewBox="0 0 1200 900"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" opacity="0.6" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Edge Lines */}
              {visibleEdges.map((edge, idx) => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt || src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) return null;

                const isConnectedToSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isConnectedToSelected ? "#3b82f6" : "#334155"}
                      strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                      strokeDasharray={edge.relationship === "BLOCKED_BY" ? "4 4" : undefined}
                      markerEnd={isConnectedToSelected ? "url(#arrow-selected)" : "url(#arrow)"}
                      opacity={isConnectedToSelected ? 1.0 : 0.45}
                    />
                    {isConnectedToSelected && (
                      <text
                        x={(src.x + tgt.x) / 2}
                        y={(src.y + tgt.y) / 2 - 4}
                        fill="#93c5fd"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none font-mono"
                      >
                        {edge.relationship}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Node Circles & Badges */}
              {filteredNodes.map((node) => {
                if (node.x === undefined || node.y === undefined) return null;
                const isSelected = selectedNode?.id === node.id;
                const style = TYPE_COLORS[node.type] || TYPE_COLORS.task;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {/* Pulsing ring for critical nodes */}
                    {node.critical && (
                      <circle
                        r="24"
                        fill="none"
                        stroke={node.type === "risk" ? "#f43f5e" : "#f59e0b"}
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className="animate-spin"
                        style={{ animationDuration: "12s" }}
                      />
                    )}

                    {/* Node Core Circle */}
                    <circle
                      r={node.type === "system" ? 20 : node.type === "person" ? 18 : 16}
                      fill={isSelected ? "#1e293b" : "#0f172a"}
                      stroke={isSelected ? "#60a5fa" : style.fill}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />

                    {/* Inner Type Indicator */}
                    <circle
                      r="6"
                      fill={style.fill}
                      opacity={0.85}
                    />

                    {/* Node Label */}
                    <text
                      y={node.type === "system" ? 32 : 28}
                      fill={isSelected ? "#ffffff" : "#cbd5e1"}
                      fontSize={isSelected ? "11" : "10"}
                      fontWeight={isSelected ? "700" : "500"}
                      textAnchor="middle"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-xl shadow-lg flex flex-wrap gap-2.5 text-[11px] text-slate-300">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 capitalize">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
                <span>{type}</span>
              </div>
            ))}
          </div>

          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400">
            Click node to inspect evidence • Drag to pan • Scroll/buttons to zoom
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Node Inspector</span>
            </div>
            {selectedNode?.critical && (
              <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Critical
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  TYPE_COLORS[selectedNode.type]?.bg || "bg-slate-100"
                } ${TYPE_COLORS[selectedNode.type]?.border || "border-slate-300"} ${
                  TYPE_COLORS[selectedNode.type]?.text || "text-slate-700"
                }`}>
                  {selectedNode.type}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                  {selectedNode.label}
                </h3>
                {selectedNode.details && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {selectedNode.details}
                  </p>
                )}
              </div>

              {/* Status & Health */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Topology Status</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedNode.status || "active"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Graph Node ID</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]">{selectedNode.id}</span>
                </div>
              </div>

              {/* Connected Relationships */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Connected Edges ({connectedEdges.length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No direct connections.</p>
                  ) : (
                    connectedEdges.map((e, idx) => {
                      const isOut = e.source === selectedNode.id;
                      const otherId = isOut ? e.target : e.source;
                      const other = nodeMap.get(otherId);
                      return (
                        <div
                          key={idx}
                          onClick={() => other && setSelectedNode(other)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 text-xs flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-blue-600">{e.relationship}</span>
                            <span className="text-slate-400 mx-1">{isOut ? "→" : "←"}</span>
                            <span className="text-slate-700 font-medium">{other?.label || otherId}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{other?.type}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Linked Grounded Evidence */}
              {selectedNode.evidence_quote && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>Verbatim Grounded Evidence</span>
                  </div>
                  <blockquote className="text-xs text-slate-800 italic border-l-2 border-amber-400 pl-2">
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
            <div className="text-center py-12 text-slate-400 text-xs">
              Select any node on the graph canvas to inspect its parameters, relationships, and supporting evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

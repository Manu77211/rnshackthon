"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { type MapResponse } from "@/lib/api";

cytoscape.use(dagre);

type NodeKind = "folder" | "file" | "class" | "function";

type GraphNode = {
  id: string;
  label: string;
  type: NodeKind;
  filePath: string;
  importance: number;
  parentId: string | null;
};

type GraphLink = {
  source: string;
  target: string;
  relation: "contains" | "defines" | "imports";
};

type DependencyGraphProps = {
  data: MapResponse;
  onSelectNode: (filePath: string) => void;
};

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphLink[];
  rootFolderIds: string[];
  childrenById: Map<string, string[]>;
};

const DAGRE_LAYOUT = {
  name: "dagre",
  rankDir: "TB",
  rankdir: "TB",
  nodeSep: 60,
  rankSep: 100,
  padding: 80,
  animate: true,
  animationDuration: 400,
} as const;

function buildGraph(data: MapResponse): GraphPayload {
  const nodes: GraphNode[] = [];
  const edges: GraphLink[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();
  const fileIds = new Set<string>();

  function addNode(node: GraphNode): void {
    if (seenNodes.has(node.id)) {
      return;
    }
    seenNodes.add(node.id);
    nodes.push(node);
  }

  function addEdge(edge: GraphLink): void {
    const key = `${edge.source}|${edge.target}|${edge.relation}`;
    if (seenEdges.has(key)) {
      return;
    }
    seenEdges.add(key);
    edges.push(edge);
  }

  for (const item of data.nodes) {
    const parts = item.file_path.split("/").filter(Boolean);
    let parentFolderId: string | null = null;
    let folderPath = "";

    if (parts.length <= 1) {
      const rootId = "folder:workspace";
      addNode({
        id: rootId,
        label: "workspace",
        type: "folder",
        filePath: "",
        importance: 1,
        parentId: null,
      });
      parentFolderId = rootId;
    }

    for (const segment of parts.slice(0, -1)) {
      folderPath = folderPath ? `${folderPath}/${segment}` : segment;
      const folderId = `folder:${folderPath}`;
      addNode({
        id: folderId,
        label: segment,
        type: "folder",
        filePath: folderPath,
        importance: Math.max(1, folderPath.split("/").length),
        parentId: parentFolderId,
      });
      if (parentFolderId) {
        addEdge({ source: parentFolderId, target: folderId, relation: "contains" });
      }
      parentFolderId = folderId;
    }

    const fileId = `file:${item.file_path}`;
    fileIds.add(fileId);
    addNode({
      id: fileId,
      label: parts[parts.length - 1] ?? item.file_path,
      type: "file",
      filePath: item.file_path,
      importance: Math.max(1, item.function_count + item.class_count),
      parentId: parentFolderId,
    });
    if (parentFolderId) {
      addEdge({ source: parentFolderId, target: fileId, relation: "contains" });
    }

    for (const name of item.class_names.slice(0, 12)) {
      const classId = `class:${item.file_path}::${name}`;
      addNode({
        id: classId,
        label: name,
        type: "class",
        filePath: item.file_path,
        importance: Math.max(1, Math.min(6, Math.ceil(name.length / 8))),
        parentId: fileId,
      });
      addEdge({ source: fileId, target: classId, relation: "defines" });
    }

    for (const name of item.function_names.slice(0, 12)) {
      const fnId = `function:${item.file_path}::${name}`;
      addNode({
        id: fnId,
        label: name,
        type: "function",
        filePath: item.file_path,
        importance: Math.max(1, Math.min(6, Math.ceil(name.length / 8))),
        parentId: fileId,
      });
      addEdge({ source: fileId, target: fnId, relation: "defines" });
    }
  }

  for (const item of data.edges) {
    const source = `file:${item.source}`;
    const target = `file:${item.target}`;
    if (fileIds.has(source) && fileIds.has(target)) {
      addEdge({ source, target, relation: "imports" });
    }
  }

  const childrenById = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.relation === "imports") {
      continue;
    }
    const list = childrenById.get(edge.source) ?? [];
    if (!list.includes(edge.target)) {
      list.push(edge.target);
      childrenById.set(edge.source, list);
    }
  }

  const rootFolderIds = nodes
    .filter((node) => node.type === "folder" && node.parentId === null)
    .map((node) => node.id);

  return { nodes, edges, rootFolderIds, childrenById };
}

function gatherDescendants(rootId: string, childrenById: Map<string, string[]>): Set<string> {
  const queue = [...(childrenById.get(rootId) ?? [])];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const next = childrenById.get(current) ?? [];
    queue.push(...next);
  }
  return visited;
}

export function DependencyGraph({ data, onSelectNode }: DependencyGraphProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const pendingSpawnPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const onSelectNodeRef = useRef(onSelectNode);
  const expandedIdsRef = useRef<string[]>([]);
  const selectedNodeIdRef = useRef("");
  const [size, setSize] = useState({ width: 1200 });
  const [graphHeight, setGraphHeight] = useState(760);
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [show, setShow] = useState<Record<NodeKind, boolean>>({
    folder: true,
    file: true,
    class: true,
    function: true,
  });

  const graph = useMemo(() => buildGraph(data), [data]);

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }
    const element = wrapperRef.current;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect;
      if (!next) {
        return;
      }
      setSize({
        width: Math.max(360, Math.floor(next.width)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  }, [expandedIds]);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const visibleSet = useMemo(() => {
    const set = new Set<string>(graph.rootFolderIds);
    for (const expandedId of expandedIds) {
      const children = graph.childrenById.get(expandedId) ?? [];
      for (const childId of children) {
        set.add(childId);
      }
    }
    return set;
  }, [expandedIds, graph.childrenById, graph.rootFolderIds]);

  const filteredGraph = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allowed = new Set(
      graph.nodes
        .filter((node) => visibleSet.has(node.id))
        .filter((node) => show[node.type])
        .filter((node) => node.label.toLowerCase().includes(query))
        .map((node) => node.id),
    );

    return {
      nodes: graph.nodes.filter((node) => allowed.has(node.id)),
      links: graph.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target)),
    };
  }, [graph.edges, graph.nodes, search, show, visibleSet]);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements = filteredGraph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        filePath: node.filePath || "",
        importance: node.importance,
      },
    }));

    const edgeElements = filteredGraph.links.map((edge, index) => ({
      data: {
        id: `edge_${index}_${edge.source}_${edge.target}`,
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [filteredGraph.links, filteredGraph.nodes]);

  const selectedNode = useMemo(() => {
    return filteredGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [filteredGraph.nodes, selectedNodeId]);

  function toggle(key: NodeKind): void {
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function fitGraph(): void {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.fit(null, 50);
  }

  useEffect(() => {
    if (!cyContainerRef.current || cyRef.current) {
      return;
    }

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            color: "#ffffff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "22px",
            "min-zoomed-font-size": 8,
            "text-wrap": "ellipsis",
            "text-max-width": "110px",
            "font-family": "Inter, system-ui, sans-serif",
            "font-weight": "800",
            "underlay-color": "#020617",
            "underlay-opacity": 0.28,
            "underlay-padding": 8,
            "underlay-shape": "round-rectangle",
          },
        },
        {
          selector: 'node[type = "folder"]',
          style: {
            "background-color": "#475569",
            shape: "round-rectangle",
            width: 140,
            height: 60,
            "border-width": 2,
            "border-color": "#cbd5e1",
          },
        },
        {
          selector: 'node[type = "file"]',
          style: {
            "background-color": "#2563eb",
            shape: "round-rectangle",
            width: 150,
            height: 60,
            "border-width": 2,
            "border-color": "#93c5fd",
          },
        },
        {
          selector: 'node[type = "class"]',
          style: {
            "background-color": "#10b981",
            shape: "round-rectangle",
            width: "mapData(importance, 1, 6, 120, 130)",
            height: 50,
            "border-width": 2,
            "border-color": "#6ee7b7",
          },
        },
        {
          selector: 'node[type = "function"]',
          style: {
            "background-color": "#a855f7",
            shape: "round-rectangle",
            width: "mapData(importance, 1, 6, 120, 130)",
            height: 50,
            "border-width": 2,
            "border-color": "#d8b4fe",
          },
        },
        {
          selector: "edge",
          style: {
            width: 6,
            "line-color": "#10b981",
            "line-style": "dashed",
            "line-dash-pattern": [10, 20],
            "line-dash-offset": 0,
            "target-arrow-color": "#10b981",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.85,
          },
        },
        {
          selector: ".dim",
          style: {
            opacity: 0.35,
          },
        },
        {
          selector: ".focus-node",
          style: {
            "border-width": 4,
            "border-color": "#ffffff",
            "underlay-opacity": 0.45,
            "underlay-color": "#34d399",
            "underlay-padding": 14,
          },
        },
        {
          selector: ".focus-edge",
          style: {
            width: 8,
            "line-color": "#22c55e",
            "target-arrow-color": "#22c55e",
            opacity: 1,
          },
        },
      ],
      layout: DAGRE_LAYOUT,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cy.on("tap", "node", (event) => {
      const node = event.target;
      const nodeId = String(node.id());
      const nodeType = String(node.data("type"));
      const filePath = String(node.data("filePath") || "");

      setSelectedNodeId(nodeId);
      if (filePath && nodeType === "file") {
        onSelectNodeRef.current(filePath);
      }

      cy.elements().removeClass("focus-node").removeClass("focus-edge").removeClass("dim");
      node.addClass("focus-node");
      node.connectedEdges().addClass("focus-edge");
      cy.elements().not(node).not(node.connectedEdges()).addClass("dim");

      if (nodeType === "folder" || nodeType === "file") {
        const children = graph.childrenById.get(nodeId) ?? [];
        if (children.length > 0) {
          if (expandedIdsRef.current.includes(nodeId)) {
            const descendants = gatherDescendants(nodeId, graph.childrenById);
            setExpandedIds((prev) => prev.filter((id) => id !== nodeId && !descendants.has(id)));
            if (descendants.has(selectedNodeIdRef.current)) {
              setSelectedNodeId(nodeId);
            }
          } else {
            for (const childId of children) {
              const incomingEdge = graph.edges.find(
                (edge) => edge.source === nodeId && edge.target === childId,
              );
              const sourceNode = cy.getElementById(incomingEdge?.source ?? nodeId);
              if (!sourceNode.nonempty()) {
                continue;
              }
              const startingPosition = sourceNode.position();
                pendingSpawnPositionsRef.current.set(childId, {
                  x: startingPosition.x,
                  y: startingPosition.y,
                });
            }
            setExpandedIds((prev) => [...new Set([...prev, nodeId])]);
          }
        }
      }
    });

    cy.on("tap", (event) => {
      if (event.target !== cy) {
        return;
      }
      cy.elements().removeClass("focus-node").removeClass("focus-edge").removeClass("dim");
      setSelectedNodeId("");
    });

    cyRef.current = cy;
    return () => {
      cy.removeAllListeners();
      cy.stop();
      cy.destroy();
      if (cyRef.current === cy) {
        cyRef.current = null;
      }
    };
  }, [graph.childrenById, graph.edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    let offset = 0;
    const ticker = window.setInterval(() => {
      offset -= 4.0;
      cy.edges().style("line-dash-offset", offset);
    }, 25);
    return () => {
      window.clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.batch(() => {
      cy.elements().remove();
      if (elements.length > 0) {
        cy.add(elements);
      }

      for (const [nodeId, startingPosition] of pendingSpawnPositionsRef.current.entries()) {
        const node = cy.getElementById(nodeId);
        if (node.nonempty()) {
          node.position(startingPosition);
        }
      }
      pendingSpawnPositionsRef.current.clear();
    });

    const layoutRunner = cy.layout(DAGRE_LAYOUT);
    layoutRunner.run();

    return () => {
      layoutRunner.stop();
    };
  }, [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.resize();
  }, [graphHeight, size.width]);

  function handleGraphHeightChange(nextValue: number): void {
    if (!Number.isFinite(nextValue)) {
      return;
    }
    const clamped = Math.max(420, Math.min(1280, Math.round(nextValue / 20) * 20));
    setGraphHeight(clamped);
  }

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.elements().removeClass("focus-node");
    if (selectedNodeId) {
      cy.$id(selectedNodeId).addClass("focus-node");
    }
  }, [selectedNodeId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <div className="graph-header">
        <h2 className="text-2xl font-semibold tracking-tight">Repository Architecture Map</h2>
        <p className="mt-1 text-sm text-slate-600">
          Clean progressive disclosure: start at top-level folders, click to expand and collapse structure.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search visible nodes..."
        />
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.folder ? "border-slate-300 bg-slate-100 text-slate-900" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("folder")}
        >
          Folders
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.file ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("file")}
        >
          Files
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.class ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("class")}
        >
          Classes
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.function ? "border-purple-300 bg-purple-50 text-purple-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("function")}
        >
          Functions
        </button>
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
          type="button"
          onClick={fitGraph}
        >
          Fit View
        </button>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
          <span className="font-medium">Map Height</span>
          <input
            aria-label="Map height"
            className="h-2 w-28 accent-slate-700"
            max={1280}
            min={420}
            onChange={(event) => handleGraphHeightChange(Number(event.target.value))}
            step={20}
            type="range"
            value={graphHeight}
          />
          <input
            aria-label="Map height in pixels"
            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-right text-xs text-slate-800"
            max={1280}
            min={420}
            onChange={(event) => handleGraphHeightChange(Number(event.target.value))}
            step={20}
            type="number"
            value={graphHeight}
          />
          <span className="text-slate-500">px</span>
        </div>
      </div>

      <div ref={wrapperRef} className="relative mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white">
        <div className="absolute right-3 top-3 z-10">
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
            onClick={fitGraph}
            type="button"
          >
            Fit Map to View
          </button>
        </div>
        <div ref={cyContainerRef} style={{ width: size.width, height: graphHeight }} />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="uppercase tracking-[0.2em] text-slate-500">Selection</p>
        <p className="mt-1 font-medium text-slate-900">
          {selectedNode ? selectedNode.label : "Click a node to inspect details"}
        </p>
        <p className="mt-1 text-slate-600">
          Visible nodes: {filteredGraph.nodes.length} | links: {filteredGraph.links.length}
        </p>
        <p className="mt-1 text-slate-500">Click a folder or file to explode children outward from the selected node center.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-slate-700">Folder</span>
        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-blue-700">File</span>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700">Class</span>
        <span className="rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-purple-700">Function</span>
      </div>
    </section>
  );
}

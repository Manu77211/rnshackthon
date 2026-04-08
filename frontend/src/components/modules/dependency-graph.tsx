"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { type MapResponse } from "@/lib/api";

type GraphNodeType = "file" | "function" | "issue";

type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  filePath?: string;
  importance: number;
};

type GraphLink = {
  source: string;
  target: string;
  relation: string;
};

type GraphLayout = "cose" | "breadthfirst";

type DependencyGraphProps = {
  data: MapResponse;
  onSelectNode: (filePath: string) => void;
};

export function DependencyGraph({ data, onSelectNode }: DependencyGraphProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const [size, setSize] = useState({ width: 980, height: 560 });
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [layout, setLayout] = useState<GraphLayout>("cose");
  const [show, setShow] = useState<Record<GraphNodeType, boolean>>({
    file: true,
    function: true,
    issue: true,
  });

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

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
        width: Math.max(320, Math.floor(next.width)),
        height: 560,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const baseGraph = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const degreeByFile = new Map<string, number>();

    function bumpDegree(nodeId: string): void {
      const current = degreeByFile.get(nodeId) ?? 0;
      degreeByFile.set(nodeId, current + 1);
    }

    for (const item of data.nodes) {
      const fileNode: GraphNode = {
        id: item.id,
        label: item.file_path,
        type: "file",
        filePath: item.file_path,
        importance: Math.max(1, item.function_count + item.class_count + 1),
      };
      nodes.push(fileNode);

      const symbols = [...item.function_names, ...item.class_names].slice(0, 8);
      for (const name of symbols) {
        const symbolId = `${item.file_path}::${name}`;
        nodes.push({
          id: symbolId,
          label: name,
          type: "function",
          filePath: item.file_path,
          importance: 1,
        });
        links.push({ source: symbolId, target: item.id, relation: "defines" });
        bumpDegree(item.id);
      }
    }

    for (const edge of data.edges) {
      links.push({ source: edge.source, target: edge.target, relation: "imports" });
      bumpDegree(edge.source);
      bumpDegree(edge.target);
    }

    const topHotspots = [...degreeByFile.entries()]
      .filter(([, degree]) => degree >= 3)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);

    for (const [fileNodeId, degree] of topHotspots) {
      const fileNode = nodes.find((node) => node.id === fileNodeId);
      if (!fileNode) {
        continue;
      }
      const issueNodeId = `issue::${fileNodeId}`;
      nodes.push({
        id: issueNodeId,
        label: `Hotspot (${degree})`,
        type: "issue",
        filePath: fileNode.filePath,
        importance: degree,
      });
      links.push({ source: issueNodeId, target: fileNodeId, relation: "risk" });
    }

    return { nodes, links };
  }, [data.edges, data.nodes]);

  const filteredGraph = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allowed = new Set(
      baseGraph.nodes
        .filter((node) => show[node.type] !== false)
        .filter((node) => node.label.toLowerCase().includes(query))
        .map((node) => node.id),
    );

    return {
      nodes: baseGraph.nodes.filter((node) => allowed.has(node.id)),
      links: baseGraph.links
        .filter((link) => allowed.has(link.source) && allowed.has(link.target)),
    };
  }, [baseGraph.links, baseGraph.nodes, search, show]);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeElements = filteredGraph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        filePath: node.filePath,
        importance: node.importance,
      },
    }));

    const edgeElements = filteredGraph.links.map((link, index) => ({
      data: {
        id: `edge_${index}_${link.source}_${link.target}`,
        source: link.source,
        target: link.target,
        relation: link.relation,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [filteredGraph.links, filteredGraph.nodes]);

  const selectedNode = useMemo(() => {
    return filteredGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [filteredGraph.nodes, selectedNodeId]);

  function toggle(key: GraphNodeType): void {
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));
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
            "background-color": "#334155",
            label: "data(label)",
            color: "#0f172a",
            "text-outline-color": "#ffffff",
            "text-outline-width": 2,
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-valign": "top",
            "text-margin-y": -10,
            width: "mapData(importance, 1, 12, 16, 34)",
            height: "mapData(importance, 1, 12, 16, 34)",
          },
        },
        {
          selector: 'node[type = "file"]',
          style: {
            "background-color": "#2a7fff",
            shape: "round-rectangle",
          },
        },
        {
          selector: 'node[type = "function"]',
          style: {
            "background-color": "#22a06b",
            shape: "ellipse",
          },
        },
        {
          selector: 'node[type = "issue"]',
          style: {
            "background-color": "#e11d48",
            shape: "diamond",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#1e3a8a",
            "target-arrow-color": "#1e3a8a",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(relation)",
            "font-size": 8,
            color: "#334155",
          },
        },
        {
          selector: ".faded",
          style: {
            opacity: 0.14,
          },
        },
        {
          selector: ".selected",
          style: {
            "border-width": 3,
            "border-color": "#0f172a",
            opacity: 1,
          },
        },
      ],
      layout: {
        name: layout,
        animate: false,
        fit: true,
        padding: 20,
      },
      minZoom: 0.2,
      maxZoom: 3,
    });

    cy.on("tap", "node", (event) => {
      const node = event.target;
      const filePath = node.data("filePath");
      const nodeId = String(node.id());
      setSelectedNodeId(nodeId);
      if (typeof filePath === "string" && filePath) {
        onSelectNodeRef.current(filePath);
      }
    });

    cy.on("mouseover", "node", (event) => {
      const node = event.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("faded");
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
    });

    const layoutRunner = cy.layout({
      name: layout,
      animate: false,
      fit: true,
      padding: 20,
    });
    layoutRunner.run();

    return () => {
      layoutRunner.stop();
    };
  }, [elements, layout]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.resize();
  }, [size.height, size.width]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.elements().removeClass("selected");
    if (selectedNodeId) {
      cy.$id(selectedNodeId).addClass("selected");
    }
  }, [selectedNodeId]);

  function rerunLayout(nextLayout: GraphLayout): void {
    setLayout(nextLayout);
  }

  function fitGraph(): void {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.fit(undefined, 30);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-slate-100 p-4 text-slate-900 shadow-sm">
      <div className="graph-header">
        <h2 className="text-2xl font-semibold tracking-tight">Impact Graph</h2>
        <p className="mt-1 text-sm text-slate-600">
          Live repository scan parsed {data.stats.totalFiles} files and produced {baseGraph.nodes.length} nodes with 0 findings.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search nodes..."
        />
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.file ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("file")}
        >
          Files
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.function ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("function")}
        >
          Functions
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${show.issue ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => toggle("issue")}
        >
          Issues
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${layout === "cose" ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => rerunLayout("cose")}
        >
          Organic Layout
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${layout === "breadthfirst" ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-300 text-slate-500"}`}
          type="button"
          onClick={() => rerunLayout("breadthfirst")}
        >
          Hierarchy Layout
        </button>
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
          type="button"
          onClick={fitGraph}
        >
          Fit View
        </button>
      </div>

      <div ref={wrapperRef} className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white">
        <div ref={cyContainerRef} style={{ width: size.width, height: size.height }} />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="uppercase tracking-[0.2em] text-slate-500">Selection</p>
        <p className="mt-1 font-medium text-slate-900">
          {selectedNode ? selectedNode.label : "Click a node to inspect details"}
        </p>
        <p className="mt-1 text-slate-600">
          Visible nodes: {filteredGraph.nodes.length} | links: {filteredGraph.links.length}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-blue-700">File</span>
        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700">Function</span>
        <span className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-700">Issue</span>
      </div>
    </section>
  );
}

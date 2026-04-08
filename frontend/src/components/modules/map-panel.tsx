"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { fetchProjectMap, findSimilarCode, type MapResponse, type SimilarityItem } from "@/lib/api";
import { DependencyGraph } from "@/components/modules/dependency-graph";

type MapPanelProps = {
  projectId: string | null;
};

export function MapPanel({ projectId }: MapPanelProps) {
  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityError, setSimilarityError] = useState("");
  const [similarity, setSimilarity] = useState<SimilarityItem[]>([]);
  const selectedNode = data?.nodes.find((node) => node.file_path === selectedFile) ?? null;
  const activeSnippet = selectedNode?.symbol_snippets?.find((item) => item.name === selectedSnippet);

  useEffect(() => {
    if (!selectedNode) {
      setSelectedSnippet("");
      return;
    }
    const first = selectedNode.symbol_snippets?.[0]?.name ?? "";
    setSelectedSnippet(first);
  }, [selectedNode]);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setError("");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");

    fetchProjectMap(projectId)
      .then((result) => {
        if (mounted) {
          setData(result);
          setSelectedFile(result.nodes[0]?.file_path ?? "");
          setSelectedSnippet(result.nodes[0]?.symbol_snippets?.[0]?.name ?? "");
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load map data");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function runSimilarity(): Promise<void> {
    if (!projectId || !activeSnippet?.code_text) {
      setSimilarityError("Select a symbol snippet first.");
      return;
    }
    setSimilarityLoading(true);
    setSimilarityError("");
    try {
      const response = await findSimilarCode({
        projectId,
        codeText: activeSnippet.code_text,
        limit: 5,
      });
      setSimilarity(response.results.filter((item) => item.file_path !== selectedFile || item.chunk_name !== selectedSnippet));
    } catch (err) {
      setSimilarityError(err instanceof Error ? err.message : "Failed to compute similarity.");
    } finally {
      setSimilarityLoading(false);
    }
  }

  if (!projectId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Ingest a project first to view dependency map.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Loading map...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dependency Map</p>
      <p className="mt-2 text-sm text-slate-700">
        Files: {data?.stats.totalFiles ?? 0} | Functions: {data?.stats.totalFunctions ?? 0} |
        Classes: {data?.stats.totalClasses ?? 0}
      </p>
      <div className="mt-4 grid gap-3 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2">
          {data ? <DependencyGraph data={data} onSelectNode={setSelectedFile} /> : null}
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">File Details</p>
            <p className="mt-2 break-all font-medium text-slate-900">{selectedFile || "Select a node"}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Functions</p>
                <ul className="mt-1 max-h-24 overflow-auto text-xs">
                  {(selectedNode?.function_names ?? []).map((name) => (
                    <li key={`fn-${name}`}>{name}</li>
                  ))}
                  {(selectedNode?.function_names ?? []).length === 0 ? <li>None</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-500">Classes</p>
                <ul className="mt-1 max-h-24 overflow-auto text-xs">
                  {(selectedNode?.class_names ?? []).map((name) => (
                    <li key={`cls-${name}`}>{name}</li>
                  ))}
                  {(selectedNode?.class_names ?? []).length === 0 ? <li>None</li> : null}
                </ul>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Incoming Edges</p>
                <ul className="mt-1 max-h-24 overflow-auto text-xs">
                  {data?.edges
                    .filter((edge) => edge.target === selectedFile)
                    .map((edge, index) => <li key={`in-${index}`}>{edge.source}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-500">Outgoing Edges</p>
                <ul className="mt-1 max-h-24 overflow-auto text-xs">
                  {data?.edges
                    .filter((edge) => edge.source === selectedFile)
                    .map((edge, index) => <li key={`out-${index}`}>{edge.target}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Code Viewer</p>
            <select
              value={selectedSnippet}
              onChange={(event) => setSelectedSnippet(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
            >
              {(selectedNode?.symbol_snippets ?? []).map((snippet) => (
                <option key={`${snippet.type}-${snippet.name}`} value={snippet.name}>
                  {snippet.type}: {snippet.name} ({snippet.line_start}-{snippet.line_end})
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={runSimilarity}
                disabled={similarityLoading}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs text-indigo-900"
              >
                {similarityLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : "Find Similar Functions"}
              </button>
              <p className="text-xs text-rose-700">{similarityError}</p>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
{activeSnippet?.code_text ?? "Select a file node and symbol to preview code."}
            </pre>

            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Similar Functions (Phase 7)</p>
              {similarity.map((item) => (
                <article key={`${item.file_path}-${item.chunk_name}`} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                  <div className="flex items-center justify-between gap-2 text-slate-600">
                    <p className="truncate">{item.file_path}</p>
                    <p>score {item.similarity_score.toFixed(2)}</p>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{item.chunk_name}</p>
                </article>
              ))}
              {similarity.length === 0 ? <p className="text-xs text-slate-500">Run similarity to see related functions.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

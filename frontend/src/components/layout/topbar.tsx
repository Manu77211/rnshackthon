"use client";

import { useEffect, useState } from "react";

type TopbarProps = {
  activeModule: string;
};

export function Topbar({ activeModule }: TopbarProps) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      "http://localhost:8000/api";
    fetch(`${base}/health`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((response) => {
        setApiOnline(response.ok);
      })
      .catch(() => {
        setApiOnline(false);
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-black bg-white/95 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-black/55">Enterprise Repository Intelligence</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-black">CodeLens Architecture Workspace</h1>
          <p className="mt-1 text-xs text-black/65">Active module: {activeModule}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              apiOnline === null
                ? "border-black/20 bg-white text-black/70"
                : apiOnline
                  ? "border-black bg-black text-white"
                  : "border-black bg-white text-black"
            }`}
          >
            API {apiOnline === null ? "Checking" : apiOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}

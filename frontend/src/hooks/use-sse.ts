"use client";

import { useEffect, useState } from "react";
import { getStatusStreamUrl, type ProjectStatus } from "@/lib/api";

export function useSSE(projectId: string | null): ProjectStatus | null {
  const [status, setStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const stream = new EventSource(getStatusStreamUrl(projectId));
    stream.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ProjectStatus;
        setStatus(parsed);
      } catch {
        setStatus({ project_id: projectId, status: "queued", progress: 0 });
      }
    };
    stream.onerror = () => {
      stream.close();
    };

    return () => stream.close();
  }, [projectId]);

  if (!projectId) {
    return null;
  }
  if (status?.project_id !== projectId) {
    return null;
  }
  return status;
}

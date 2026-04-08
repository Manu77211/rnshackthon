import { CheckCircle2, LoaderCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { type ProjectStatus } from "@/lib/api";

type ProgressTimelineProps = {
  status: ProjectStatus | null;
};

const steps = ["queued", "parsing", "embedding", "storing", "complete"];

function isDone(step: string, progress: number): boolean {
  if (step === "complete") {
    return progress >= 100;
  }
  return progress >= (steps.indexOf(step) + 1) * 20;
}

export function ProgressTimeline({ status }: ProgressTimelineProps) {
  const progress = status?.progress ?? 0;
  const current = status?.status ?? "queued";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Progress</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full bg-sky-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-700">Status: {current} ({progress}%)</p>
      <ul className="mt-4 grid gap-2">
        {steps.map((step) => {
          const done = isDone(step, progress);
          const active = !done && current === step;
          return (
            <li key={step} className="flex items-center gap-2 text-sm text-slate-700">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : active ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-sky-500" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              <span className="capitalize">{step}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

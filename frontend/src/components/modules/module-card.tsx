import { motion } from "framer-motion";
import { type ModuleMeta } from "@/components/modules/module-data";

type ModuleCardProps = {
  module: ModuleMeta;
};

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <motion.article
      key={module.key}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient}`} />
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-700">
          {module.phase}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{module.title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-700">{module.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {module.highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

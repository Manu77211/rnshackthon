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
      className="relative overflow-hidden rounded-2xl border border-black/20 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.85)]"
    >
      <div className={`absolute inset-0 bg-linear-to-br ${module.gradient}`} />
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.24em] text-black/55">Module</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-black">{module.title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-black/75">{module.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {module.highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-black/25 bg-white/85 px-3 py-1 text-xs text-black/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

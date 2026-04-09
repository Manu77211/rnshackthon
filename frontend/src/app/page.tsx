import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(0,0,0,0.08),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(0,0,0,0.08),transparent_28%),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[auto,auto,26px_26px,26px_26px]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-14 pt-8 md:px-10 md:pt-12">
        <header className="rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-black/60">Luminus</p>
              <p className="text-xl font-semibold tracking-tight">Repository Intelligence Platform</p>
            </div>
            <Link
              className="rounded-full border border-black bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              href="/dashboard"
            >
              Try Application
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.7)] md:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-black/60">AI + Architecture + Workflow</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Understand any codebase in minutes with a focused architectural command center.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70 md:text-lg">
            Luminus ingests repositories, builds dependency intelligence, runs sandbox diagnostics, and enables grounded codebase chat.
            Teams move from raw source to confident engineering decisions without context switching.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-black bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
            >
              Try Application
            </Link>
            <a
              href="#capabilities"
              className="rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:border-black"
            >
              Explore Capabilities
            </a>
          </div>
        </section>

        <section id="capabilities" className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Codebase Ingestion",
              text: "Bring in ZIP or Git repositories, normalize structure, and create reliable context artifacts.",
            },
            {
              title: "Architecture Mapping",
              text: "Navigate files, classes, functions, and relations with a progressive graph designed for large systems.",
            },
            {
              title: "Runtime Sandbox + Chat",
              text: "Reproduce issues, generate actionable fix drafts, and ask natural-language questions grounded in source code.",
            },
          ].map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-black/30"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-black/55">Capability</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/70">{card.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-black bg-black p-7 text-white md:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Built for Demos and Delivery</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <h3 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                Launch the full workspace and inspect your repository like an enterprise platform.
              </h3>
              <p className="mt-3 text-sm text-white/75 md:text-base">
                Clean visual architecture, practical diagnostics, and traceable AI outputs in one streamlined interface.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-white bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Open Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, BookOpenCheck, CircleGauge, Network, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { Link } from "wouter";

const lifecycleClass = {
  planned: "bg-stone-100 text-stone-600",
  incubating: "bg-amber-50 text-amber-700",
  operational: "bg-emerald-50 text-emerald-700",
  strategic: "bg-sky-50 text-sky-700",
};

export default function ExecutiveArchitecture() {
  const { data, isLoading } = trpc.platform.executiveDashboard.useQuery();
  if (isLoading || !data) return <div className="grid min-h-[50vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#164e45] border-t-transparent" /></div>;

  const metrics = [
    { label: "Release-ready contexts", value: data.maturity.releaseReady, detail: "L3 evidence threshold", icon: CircleGauge, tone: "emerald" },
    { label: "Evidence gaps", value: data.maturity.evidenceNeeded, detail: "Need maturity hardening", icon: Wrench, tone: "amber" },
    { label: "Architecture decisions", value: data.architecture.adrCount, detail: `${data.architecture.highImpactDecisions} high impact`, icon: BookOpenCheck, tone: "sky" },
    { label: "Contract dependencies", value: data.architecture.dependencyEdges, detail: "Declared catalog edges", icon: Network, tone: "violet" },
  ];

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-[2rem] bg-[#112f29] px-7 py-8 text-white shadow-[0_20px_55px_rgba(19,62,53,.17)] md:px-9 md:py-10">
      <div className="grid gap-7 xl:grid-cols-[1.35fr_.65fr] xl:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200/70">Executive architecture dashboard</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] md:text-5xl">Make platform risk visible before it becomes operational drag.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-emerald-50/75">This control plane distinguishes measured governance evidence from future telemetry. It shows where ownership, contracts, readiness, and architectural decisions need deliberate investment.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-100"><Activity className="h-4 w-4 text-[#d9b56c]" /> Platform maturity index</div>
          <div className="mt-4 flex items-end justify-between"><span className="font-display text-5xl">{data.maturity.averageScore}</span><span className="mb-1 text-xs text-emerald-100/60">out of 100 catalog evidence score</span></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#d9b56c]" style={{ width: `${data.maturity.averageScore}%` }} /></div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => { const Icon = metric.icon; return <article key={metric.label} className="rounded-2xl border border-[#dfe3dc] bg-white p-5 shadow-[0_10px_24px_rgba(32,55,48,.04)]"><div className="flex items-start justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078]">{metric.label}</span><span className={`grid h-8 w-8 place-items-center rounded-xl ${metric.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : metric.tone === "amber" ? "bg-amber-50 text-amber-700" : metric.tone === "sky" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}><Icon className="h-4 w-4" /></span></div><p className="mt-5 font-display text-4xl text-[#17241f]">{metric.value}</p><p className="mt-1 text-xs text-[#718078]">{metric.detail}</p></article>; })}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <article className="rounded-2xl border border-[#dfe3dc] bg-white p-6 shadow-[0_10px_24px_rgba(32,55,48,.04)]">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718078]">Maturity & extraction readiness</p><h2 className="mt-2 font-display text-2xl">Service scorecards across the platform</h2></div><Link href="/modules" className="inline-flex items-center gap-1 text-xs font-bold text-[#19705d] hover:underline">Open catalog <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        <div className="mt-5 divide-y divide-[#edf0eb]">
          {data.modules.map(module => <div key={module.id} className="grid gap-3 py-4 md:grid-cols-[1.1fr_.9fr_.8fr_auto] md:items-center"><div><p className="font-semibold text-[#26352f]">{module.name}</p><p className="mt-1 text-xs text-[#78857d]">{module.businessCapability}</p></div><div><div className="flex items-center justify-between text-xs font-semibold text-[#506057]"><span>{module.maturity.level} · {module.maturity.score}/100</span><span>{module.maturity.missing.length} gaps</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0eb]"><div className="h-full rounded-full bg-[#277866]" style={{ width: `${module.maturity.score}%` }} /></div></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${lifecycleClass[module.lifecycle]}`}>{module.lifecycle}</span><span className="w-fit rounded-full bg-[#f4f6f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#617067]">{module.extractionReadiness.replace(/-/g, " ")}</span></div>)}
        </div>
      </article>

      <div className="space-y-6">
        <article className="rounded-2xl border border-[#dfe3dc] bg-white p-6 shadow-[0_10px_24px_rgba(32,55,48,.04)]"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#c47c2a]" /><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718078]">Technical debt register</p></div><h2 className="mt-2 font-display text-2xl">Known evidence gaps</h2><div className="mt-5 space-y-3">{data.technicalDebt.slice(0, 5).map((debt, index) => <div key={`${debt.moduleId}-${debt.gap}-${index}`} className="rounded-xl bg-[#fbfbf8] p-3"><p className="text-xs font-bold text-[#35453d]">{debt.moduleName}</p><p className="mt-1 text-xs text-[#6c7a72]">{debt.gap}</p></div>)}</div></article>
        <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-6"><div className="flex items-center gap-2 text-sky-700"><Sparkles className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[0.18em]">Platform KPIs</p></div><p className="mt-3 text-sm leading-6 text-[#506057]">Live DORA, SLO, trace, and error-budget metrics remain explicitly unconnected until observability and delivery sources are configured.</p><div className="mt-4 flex flex-wrap gap-2">{data.kpiDefinitions.map(kpi => <span key={kpi.id} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${kpi.status === "governed" ? "bg-emerald-100 text-emerald-700" : "bg-white text-sky-700"}`}>{kpi.name}</span>)}</div></article>
      </div>
    </section>

    <section className="rounded-2xl border border-[#dfe3dc] bg-white p-6 shadow-[0_10px_24px_rgba(32,55,48,.04)]">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718078]">Venture maturity comparison</p><h2 className="mt-2 font-display text-2xl">Governance evidence by operating boundary</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6c7a72]">This is a venture-scoped governance projection based on recorded decision cases. It is not a substitute for live delivery or business-performance telemetry.</p></div><span className="rounded-full bg-[#eef6f1] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#28705e]">Membership-filtered</span></div>
      {data.ventureMaturity.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[#d8ded7] bg-[#fbfbf8] p-5 text-sm text-[#6c7a72]">Create a venture to establish an isolated governance baseline. Decision records will then appear only in the ventures you are permitted to access.</div> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.ventureMaturity.map(venture => <div key={venture.ventureId} className="rounded-xl border border-[#edf0eb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#304138]">{venture.ventureName}</p><p className="mt-1 text-xs text-[#78857d]">{venture.role.replace(/_/g, " ")}</p></div><span className="rounded-full bg-[#f2f5f2] px-2 py-1 text-[10px] font-bold uppercase text-[#617067]">{venture.posture.replace(/-/g, " ")}</span></div><div className="mt-5 flex items-end justify-between"><div><p className="font-display text-3xl text-[#173f36]">{venture.governanceEvidenceScore}</p><p className="text-[10px] font-bold uppercase tracking-wide text-[#78857d]">Governance evidence</p></div><p className="text-xs text-[#65736a]">{venture.approvedDecisions} approved · {venture.activeDecisions} active</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf0eb]"><div className="h-full rounded-full bg-[#277866]" style={{ width: `${venture.governanceEvidenceScore}%` }} /></div></div>)}</div>}
    </section>
  </div>;
}

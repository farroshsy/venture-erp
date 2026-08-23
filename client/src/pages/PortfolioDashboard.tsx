import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useVenture } from "@/contexts/VentureContext";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, Boxes, CircleAlert, Layers3, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Boxes }) {
  return <div className="rounded-2xl border border-[#e0e4dd] bg-white p-5 shadow-[0_8px_26px_rgba(26,49,41,.04)]"><div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b867e]">{label}</span><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#edf4ef] text-[#246255]"><Icon className="h-4 w-4" /></span></div><p className="mt-5 font-display text-3xl font-semibold tracking-tight text-[#17241f]">{value}</p><p className="mt-2 text-xs leading-5 text-[#6d786f]">{detail}</p></div>;
}

export default function PortfolioDashboard() {
  const { activeVenture, ventures } = useVenture();
  const [showCreate, setShowCreate] = useState(ventures.length === 0);
  const [ventureName, setVentureName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const utils = trpc.useUtils();
  const createVenture = trpc.platform.createVenture.useMutation({
    onSuccess: venture => {
      void utils.platform.myVentures.invalidate();
      setVentureName("");
      setShowCreate(false);
      toast.success(`${venture.name} is now a venture-scoped workspace.`);
    },
    onError: error => toast.error("Venture could not be created", { description: error.message }),
  });
  const { data, isLoading } = trpc.platform.catalog.useQuery();
  const { data: governance } = trpc.platform.portfolioOverview.useQuery();
  const modules = data?.modules ?? [];
  const healthy = modules.filter(module => module.health === "healthy").length;
  const attention = modules.filter(module => module.health === "attention").length;
  const releaseReady = modules.filter(module => module.maturity.releaseEligible).length;

  return <div className="space-y-8">
    <section className="overflow-hidden rounded-[1.6rem] border border-[#d8dfd5] bg-[#12332c] px-6 py-7 text-white shadow-[0_16px_36px_rgba(18,51,44,.14)] md:px-8 md:py-9">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b7d8c5]">Portfolio command center</p><h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight md:text-4xl">{activeVenture ? `${activeVenture.name} operates inside an accountable system.` : "Design the operating system before adding operational complexity."}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#d4e5dc]">The foundation maintains a trusted venture boundary, a contract-aware module catalog, and a governed path from operating signal to architectural decision.</p></div><div className="flex shrink-0 items-center gap-3"><Button onClick={() => setShowCreate(value => !value)} variant="outline" className="h-10 rounded-xl border-white/15 bg-white/[0.07] px-3 text-xs font-bold text-white hover:bg-white/15 hover:text-white"><Plus className="mr-1 h-3.5 w-3.5" />New venture</Button><div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 sm:flex"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9b56c] text-[#16342d]"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-xs font-bold">Policy posture</p><p className="mt-0.5 text-[11px] text-[#b7d8c5]">Venture-scoped · contract-gated</p></div></div></div></div>
    </section>

    {showCreate && <section className="rounded-2xl border border-[#d8e4dc] bg-[#eaf2ec] p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#54806e]">Create venture boundary</p><h2 className="mt-1 font-display text-xl font-semibold text-[#1f4036]">Start with tenant isolation—not a shared workspace.</h2></div><div className="grid flex-1 gap-3 sm:grid-cols-[1fr_110px_auto]"><input value={ventureName} onChange={event => setVentureName(event.target.value)} placeholder="Venture name" className="rounded-xl border border-[#cbdcd0] bg-white px-3 py-2.5 text-sm font-medium text-[#294035] outline-none focus:border-[#1f6a59]" /><input value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} maxLength={3} placeholder="USD" className="rounded-xl border border-[#cbdcd0] bg-white px-3 py-2.5 text-sm font-medium text-[#294035] outline-none focus:border-[#1f6a59]" /><Button disabled={ventureName.trim().length < 3 || createVenture.isPending} onClick={() => createVenture.mutate({ name: ventureName, baseCurrency: currency })} className="h-10 rounded-xl bg-[#1a6756] px-4 text-xs font-bold hover:bg-[#115142]">{createVenture.isPending ? "Creating…" : "Create venture"}</Button></div></div></section>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Venture boundaries" value={ventures.length} detail="Active venture contexts available to this identity" icon={Layers3} />
      <Metric label="Bounded contexts" value={isLoading ? "—" : modules.length} detail="Domains with explicit ownership and data authority" icon={Boxes} />
      <Metric label="Healthy modules" value={isLoading ? "—" : healthy} detail="Foundation modules reporting a healthy planned posture" icon={Activity} />
      <Metric label="Active decisions" value={governance?.activeDecisionCount ?? 0} detail="Open decision cases across every venture you can access" icon={ShieldCheck} />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
      <div className="rounded-2xl border border-[#e0e4dd] bg-white p-5 shadow-[0_8px_26px_rgba(26,49,41,.04)] md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#77837a]">Operating surface</p><h2 className="mt-1.5 font-display text-2xl font-semibold">Module health and release posture</h2></div><Link href="/modules" className="inline-flex items-center gap-1 text-xs font-bold text-[#1b6959] hover:text-[#0f4d41]">Open catalog <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="mt-6 divide-y divide-[#edf0eb]">{modules.slice(0, 5).map(module => <div key={module.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f0f4ef] text-xs font-bold text-[#255a50]">{module.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#26352e]">{module.name}</p><p className="mt-1 truncate text-xs text-[#788379]">{module.contract} · {module.release}</p></div><div className="flex items-center gap-2"><StatusPill value={module.health} /><StatusPill value={module.maturity.level} /></div></div>)}</div></div>
      <aside className="rounded-2xl border border-[#e0e4dd] bg-[#fcfdfa] p-5 shadow-[0_8px_26px_rgba(26,49,41,.04)] md:p-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#77837a]">Governance signal</p><div className="mt-5 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><CircleAlert className="h-5 w-5" /></div><h2 className="mt-5 font-display text-xl font-semibold">Build-versus-buy is a decision workflow, not a slide.</h2><p className="mt-3 text-sm leading-6 text-[#68746c]">Score SAP, alternative ERP, and custom delivery against declared weights. Then generate a bounded AI draft that exposes gaps and still requires human approval.</p><Link href="/decisions" className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-[#1b6959] hover:text-[#0f4d41]">Open decision workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link><div className="mt-7 border-t border-[#e8ece5] pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849087]">At-risk posture</p><p className="mt-1 text-sm font-semibold">{attention} context{attention === 1 ? "" : "s"} require additional control evidence.</p></div></aside>
    </section>
    <section className="rounded-2xl border border-[#e0e4dd] bg-white p-5 shadow-[0_8px_26px_rgba(26,49,41,.04)] md:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#77837a]">Cross-venture governance</p><h2 className="mt-1.5 font-display text-2xl font-semibold">Decision visibility stays at the portfolio layer.</h2></div><p className="text-xs text-[#6c786f]">{governance?.approvedDecisionCount ?? 0} approved · {governance?.activeDecisionCount ?? 0} active</p></div>{(governance?.ventures.length ?? 0) > 0 ? <div className="mt-5 divide-y divide-[#edf0eb]">{governance?.ventures.map(venture => <div key={venture.ventureId} className="grid gap-3 py-4 sm:grid-cols-[1fr_130px_130px_1.4fr]"><div><p className="text-sm font-bold text-[#2b3b32]">{venture.ventureName}</p><p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#7a867d]">{venture.role.replace(/_/g, " ")}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#89928b]">Active</p><p className="mt-1 text-sm font-bold">{venture.activeDecisions}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#89928b]">Approved</p><p className="mt-1 text-sm font-bold">{venture.approvedDecisions}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#89928b]">Latest decision</p><p className="mt-1 truncate text-sm font-medium text-[#536158]">{venture.latestDecision ? venture.latestDecision.title : "No governed decision recorded"}</p></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#d7dfd6] bg-[#fafcf9] p-5 text-sm leading-6 text-[#68756d]">Create a venture to establish its isolated operating scope. New decision cases will then appear here as cross-venture governance records, without exposing the underlying domain data.</div>}</section>
  </div>;
}

import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useVenture } from "@/contexts/VentureContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Boxes, ChevronDown, GitBranch, Grid2X2, Landmark, LogOut, Network, PanelLeftClose, PanelLeftOpen, Scale, ShieldCheck, Workflow } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { path: "/", label: "Portfolio", icon: Grid2X2 },
  { path: "/modules", label: "Module catalog", icon: Boxes },
  { path: "/operations", label: "Operations", icon: Workflow },
  { path: "/decisions", label: "Decision governance", icon: Scale },
  { path: "/architecture", label: "Architecture", icon: Network },
];

export function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { ventures, activeVenture, activeVentureId, setActiveVentureId, isLoading } = useVenture();
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f6f3]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#164e45] border-t-transparent" /></div>;

  if (!user) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#112925] px-5 text-white">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_18%,rgba(62,180,151,.22),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(213,170,88,.15),transparent_28%)]" />
        <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-10 shadow-2xl backdrop-blur-xl md:p-14">
          <div className="mb-10 flex items-center gap-3 text-sm font-bold tracking-[0.2em] text-emerald-200"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300 text-[#12332d]"><Landmark className="h-5 w-5" /></span> VENTURE ERP</div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/70">Portfolio operating system</p>
          <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">Govern ventures with boundaries that survive growth.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-200">A control plane for tenant-aware operations, independently evolvable ERP modules, and evidence-led technology decisions.</p>
          <Button onClick={() => startLogin()} size="lg" className="mt-10 h-12 rounded-xl bg-[#d9b56c] px-6 text-sm font-bold text-[#15241f] hover:bg-[#edce88]">Enter secure workspace</Button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f3] text-[#182421]">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-white/10 bg-[#122b27] text-white transition-[width] duration-200 lg:flex lg:flex-col", isExpanded ? "w-[250px]" : "w-[76px]")}>
        <div className="flex h-[76px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d9b56c] text-[#14322c]"><Landmark className="h-5 w-5" /></span>
            {isExpanded && <span className="whitespace-nowrap text-sm font-extrabold tracking-[0.14em]">VENTURE ERP</span>}
          </Link>
          <button onClick={() => setIsExpanded(value => !value)} className="rounded-lg p-1.5 text-emerald-100/70 transition hover:bg-white/10 hover:text-white" aria-label="Toggle workspace navigation">
            {isExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
        <div className="px-3 pt-6">
          {isExpanded && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/45">Control plane</p>}
          <nav className="space-y-1">
            {navigation.map(item => {
              const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
              const Icon = item.icon;
              return <Link key={item.path} href={item.path} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white/12 text-white shadow-sm" : "text-emerald-100/65 hover:bg-white/[0.07] hover:text-white")}>
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-[#d9b56c]")} />
                {isExpanded && <span className="whitespace-nowrap font-medium">{item.label}</span>}
              </Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-white/10 p-3">
          <div className={cn("rounded-xl bg-white/[0.06] p-3", !isExpanded && "px-2")}>{isExpanded ? <><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-[#d9b56c]" /> Architecture guardrails</div><p className="text-[11px] leading-4 text-emerald-100/55">Contract-gated changes only</p></> : <ShieldCheck className="mx-auto h-4 w-4 text-[#d9b56c]" />}</div>
        </div>
      </aside>

      <main className={cn("min-h-screen transition-[margin] duration-200", isExpanded ? "lg:ml-[250px]" : "lg:ml-[76px]")}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dfe3dc] bg-[#f5f6f3]/90 px-5 backdrop-blur-lg md:px-9">
          <div className="flex items-center gap-3 lg:hidden"><Landmark className="h-5 w-5 text-[#164e45]" /><span className="text-sm font-extrabold tracking-[0.12em]">VENTURE ERP</span></div>
          <div className="hidden items-center gap-3 lg:flex"><GitBranch className="h-4 w-4 text-[#6c786f]" /><span className="text-xs font-semibold text-[#66726a]">Service-aligned foundation</span></div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select aria-label="Active venture" value={activeVentureId ?? ""} disabled={isLoading || ventures.length === 0} onChange={event => setActiveVentureId(Number(event.target.value))} className="appearance-none rounded-xl border border-[#d6dbd2] bg-white py-2 pl-3 pr-9 text-xs font-semibold text-[#293630] outline-none transition focus:border-[#1a6858] focus:ring-2 focus:ring-[#1a6858]/15">
                {ventures.length === 0 && <option value="">No venture selected</option>}
                {ventures.map(venture => <option key={venture.id} value={venture.id}>{venture.name} · {venture.role.replace(/_/g, " ")}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#617067]" />
            </div>
            <button onClick={logout} className="hidden items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#59675e] transition hover:bg-white hover:text-[#26342d] sm:flex"><LogOut className="h-3.5 w-3.5" />{user.name?.split(" ")[0] ?? "Account"}</button>
          </div>
        </header>
        <div className="mx-auto max-w-[1540px] px-5 py-7 md:px-9 md:py-9">{children}</div>
      </main>
    </div>
  );
}

import { cn } from "@/lib/utils";

export function StatusPill({ value, className }: { value: string; className?: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("healthy") || normalized.includes("l3") || normalized.includes("independent")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
    : normalized.includes("attention") || normalized.includes("review") || normalized.includes("l2")
      ? "bg-amber-50 text-amber-700 ring-amber-600/15"
      : normalized.includes("planned") || normalized.includes("draft") || normalized.includes("l0") || normalized.includes("l1")
        ? "bg-slate-100 text-slate-600 ring-slate-500/15"
        : "bg-sky-50 text-sky-700 ring-sky-600/15";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset", tone, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {value.replace(/-/g, " ")}
    </span>
  );
}

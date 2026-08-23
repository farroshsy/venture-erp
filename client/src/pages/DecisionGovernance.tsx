import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useVenture } from "@/contexts/VentureContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileSearch, LockKeyhole, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CriterionKey = "differentiation" | "compliance" | "integration" | "totalCost" | "lockIn" | "deliveryCapacity";
type Criterion = { key: CriterionKey; label: string; weight: number; sap: number; alternative: number; custom: number; note: string };

const initialCriteria: Criterion[] = [
  { key: "differentiation", label: "Process differentiation", weight: 5, sap: 2, alternative: 3, custom: 5, note: "Does this capability create a real operating advantage?" },
  { key: "compliance", label: "Compliance fit", weight: 4, sap: 5, alternative: 4, custom: 2, note: "Can controls and regulatory obligations be met credibly?" },
  { key: "integration", label: "Integration complexity", weight: 3, sap: 4, alternative: 3, custom: 3, note: "How feasible is fit with existing records and workflows?" },
  { key: "totalCost", label: "Total cost of ownership", weight: 4, sap: 2, alternative: 4, custom: 3, note: "Include implementation, change, maintenance, and exit cost." },
  { key: "lockIn", label: "Vendor lock-in exposure", weight: 4, sap: 1, alternative: 3, custom: 5, note: "Higher score means greater strategic portability and control." },
  { key: "deliveryCapacity", label: "Delivery capacity", weight: 5, sap: 2, alternative: 4, custom: 3, note: "Can the team deliver and safely operate this option?" },
];

const pathLabels = { sap: "SAP / suite", alternative: "Alternative ERP", custom: "Custom capability" };

export default function DecisionGovernance() {
  const { activeVenture } = useVenture();
  const [criteria, setCriteria] = useState(initialCriteria);
  const [title, setTitle] = useState("ERP capability decision");
  const [capability, setCapability] = useState("Portfolio finance and operational control");
  const [evidence, setEvidence] = useState("Existing process maps, delivery capacity assessment, integration inventory, compliance obligations, and operating cost assumptions.");
  const [assumptions, setAssumptions] = useState("The venture requires differentiated workflows in a small subset of its operational model.");
  const evaluateQuery = trpc.governance.evaluate.useQuery({ criteria }, { staleTime: Infinity });
  const draftMutation = trpc.governance.draftEvidenceReview.useMutation({
    onSuccess: result => toast.success("Evidence review drafted for human approval", { description: `Recommended path: ${pathLabels[result.evaluation.recommendation]}.` }),
    onError: error => toast.error("The evidence review could not be drafted", { description: error.message }),
  });

  const evaluation = evaluateQuery.data;
  const orderedScores = useMemo(() => evaluation ? Object.entries(evaluation.scores).sort(([, left], [, right]) => right - left) : [], [evaluation]);
  const updateCriterion = (index: number, field: keyof Pick<Criterion, "weight" | "sap" | "alternative" | "custom">, value: number) => setCriteria(current => current.map((criterion, itemIndex) => itemIndex === index ? { ...criterion, [field]: value } : criterion));

  const draftReview = () => {
    if (!activeVenture) {
      toast.error("Create or select a venture before drafting a governed decision.");
      return;
    }
    draftMutation.mutate({
      ventureId: activeVenture.id,
      title,
      capability,
      criteria,
      evidence: evidence.split("\n").map(item => item.trim()).filter(Boolean),
      assumptions: assumptions.split("\n").map(item => item.trim()).filter(Boolean),
    });
  };

  return <div className="space-y-7"><section className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#738078]">Decision governance</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Where SAP ends, where alternatives fit, and where custom code earns its cost.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#67736b]">This framework does not make a procurement decision. It documents declared weights, compares fit, distinguishes evidence from assumptions, and creates an AI-assisted draft only for named humans to approve.</p></div><div className="flex gap-2"><StatusPill value="human approval required" /><StatusPill value={activeVenture ? activeVenture.name : "no venture"} /></div></section>
    <section className="grid gap-6 xl:grid-cols-[1.55fr_.8fr]"><div className="rounded-2xl border border-[#e0e4dd] bg-white p-5 shadow-[0_8px_26px_rgba(26,49,41,.04)] md:p-6"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3ed] text-[#236353]"><FileSearch className="h-4 w-4" /></span><div><h2 className="font-display text-xl font-semibold">Weighted decision frame</h2><p className="mt-1 text-xs leading-5 text-[#738078]">Adjust each criterion only after agreeing what a high score means for your venture. Scores are transparent inputs, not a hidden recommendation engine.</p></div></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[#e6ebe5] text-[10px] font-bold uppercase tracking-[0.13em] text-[#7c877f]"><th className="pb-3 pr-4">Criterion</th><th className="pb-3 px-2 text-center">Weight</th><th className="pb-3 px-2 text-center">SAP</th><th className="pb-3 px-2 text-center">Alternative</th><th className="pb-3 px-2 text-center">Custom</th></tr></thead><tbody>{criteria.map((criterion, index) => <tr key={criterion.key} className="border-b border-[#f0f2ee]"><td className="py-4 pr-4"><p className="text-sm font-bold text-[#2a3931]">{criterion.label}</p><p className="mt-1 max-w-sm text-[11px] leading-4 text-[#778179]">{criterion.note}</p></td>{(["weight", "sap", "alternative", "custom"] as const).map(field => <td key={field} className="px-2 py-4 text-center"><select aria-label={`${criterion.label} ${field}`} value={criterion[field]} onChange={event => updateCriterion(index, field, Number(event.target.value))} className="rounded-lg border border-[#dce2db] bg-[#fbfcfa] px-2 py-1.5 text-xs font-bold text-[#2e3f35] outline-none focus:border-[#1c6a59]">{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></td>)}</tr>)}</tbody></table></div></div>
      <aside className="rounded-2xl border border-[#d7e2d9] bg-[#12332c] p-5 text-white shadow-[0_12px_30px_rgba(18,51,44,.14)] md:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b5d9c2]">Current comparison</p><h2 className="mt-2 font-display text-2xl font-semibold">{evaluation ? pathLabels[evaluation.recommendation] : "Calculating…"}</h2><p className="mt-3 text-xs leading-5 text-[#cee1d7]">{evaluation?.interpretation}</p><div className="mt-6 space-y-4">{orderedScores.map(([path, score]) => <div key={path}><div className="mb-1.5 flex items-center justify-between text-xs"><span>{pathLabels[path as keyof typeof pathLabels]}</span><span className="font-bold">{score}/{evaluation?.weightedMaximum}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#d9b56c]" style={{ width: `${evaluation ? (score / evaluation.weightedMaximum) * 100 : 0}%` }} /></div></div>)}</div><div className="mt-7 border-t border-white/10 pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b5d9c2]">Decision confidence</p><p className="mt-1 text-sm font-bold capitalize">{evaluation?.confidence ?? "—"}</p></div></aside></section>
    <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-[#e0e4dd] bg-white p-5 md:p-6"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#b4822d]" /><h2 className="font-display text-xl font-semibold">AI-assisted evidence review</h2></div><p className="mt-2 text-xs leading-5 text-[#718077]">The model may summarize supplied evidence and identify assumptions or gaps. It cannot approve a case, choose a vendor, or silently use an unverified external claim.</p><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-xs font-bold text-[#536158]">Decision title<input value={title} onChange={event => setTitle(event.target.value)} className="rounded-xl border border-[#dce2db] bg-[#fcfdfa] px-3 py-2.5 text-sm font-medium text-[#29382f] outline-none focus:border-[#1d6959]" /></label><label className="grid gap-1.5 text-xs font-bold text-[#536158]">Capability under review<input value={capability} onChange={event => setCapability(event.target.value)} className="rounded-xl border border-[#dce2db] bg-[#fcfdfa] px-3 py-2.5 text-sm font-medium text-[#29382f] outline-none focus:border-[#1d6959]" /></label><label className="grid gap-1.5 text-xs font-bold text-[#536158]">Evidence — one item per line<textarea value={evidence} onChange={event => setEvidence(event.target.value)} rows={4} className="resize-none rounded-xl border border-[#dce2db] bg-[#fcfdfa] px-3 py-2.5 text-sm font-medium text-[#29382f] outline-none focus:border-[#1d6959]" /></label><label className="grid gap-1.5 text-xs font-bold text-[#536158]">Assumptions — one item per line<textarea value={assumptions} onChange={event => setAssumptions(event.target.value)} rows={3} className="resize-none rounded-xl border border-[#dce2db] bg-[#fcfdfa] px-3 py-2.5 text-sm font-medium text-[#29382f] outline-none focus:border-[#1d6959]" /></label></div><Button disabled={draftMutation.isPending || !activeVenture} onClick={draftReview} className="mt-5 h-11 rounded-xl bg-[#196450] px-5 text-xs font-bold hover:bg-[#114e3f]">{draftMutation.isPending ? "Drafting evidence review…" : "Draft review for human approval"}</Button></div>
      <aside className="rounded-2xl border border-[#e0e4dd] bg-[#fbfcfa] p-5 md:p-6"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#276453]" /><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#738078]">Approval control</p></div><h2 className="mt-3 font-display text-xl font-semibold">The approval gate remains human.</h2><div className="mt-5 space-y-4">{["A draft review is stored with `humanApprovalRequired = true`.", "Only portfolio administrators and venture leads can approve a review.", "The approved record retains the criteria, declared evidence, assumptions, draft risks, and approver identity."].map(item => <div key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8068]" /><p className="text-sm leading-6 text-[#5e6d64]">{item}</p></div>)}</div></aside></section></div>;
}

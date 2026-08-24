import { useVenture } from "@/contexts/VentureContext";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowUp, BookOpen, Bot, CheckCircle2, Lightbulb, LockKeyhole, Send, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: { references: string[]; assumptions: string[]; gaps: string[]; recommendedActions: string[] };
  sourceCatalog?: Array<{ id: string; label: string; type: string; detail: string }>;
};

function createConversationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 24) : `conversation${Date.now().toString(36)}`;
}

const prompts = [
  "Which platform contexts need the most maturity investment before service extraction?",
  "Explain the architecture decisions that affect the Finance capability.",
  "What evidence should we collect before choosing custom delivery over an ERP suite?",
];

export default function ArchitectureAssistant() {
  const { activeVenture } = useVenture();
  const [conversationId, setConversationId] = useState(createConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const ask = trpc.assistant.ask.useMutation();

  useEffect(() => { setConversationId(createConversationId()); setMessages([]); }, [activeVenture?.id]);
  const disabled = !activeVenture || ask.isPending;
  const statusLine = useMemo(() => activeVenture ? `Scoped to ${activeVenture.name} · ${activeVenture.role.replace(/_/g, " ")}` : "Select a venture to create a tenant-scoped conversation.", [activeVenture]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !activeVenture || ask.isPending) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setMessages(current => [...current, userMessage]);
    setQuestion("");
    try {
      const answer = await ask.mutateAsync({ ventureId: activeVenture.id, conversationId, question: trimmed });
      setMessages(current => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: answer.answer, evidence: answer.evidence, sourceCatalog: answer.sourceCatalog }]);
    } catch (error) {
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: "assistant", content: error instanceof Error ? error.message : "The architecture assistant could not complete this request." }]);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
    <aside className="space-y-5"><section className="rounded-[2rem] bg-[#173f36] p-7 text-white shadow-[0_20px_55px_rgba(19,62,53,.17)]"><div className="flex items-center gap-2 text-emerald-100"><Sparkles className="h-4 w-4 text-[#d9b56c]" /><p className="text-[10px] font-bold uppercase tracking-[0.2em]">Architecture assistant</p></div><h1 className="mt-4 font-display text-4xl leading-tight">Ask the platform—not a generic chatbot.</h1><p className="mt-5 text-sm leading-6 text-emerald-50/75">Responses are synthesized only from the active venture’s authorized governance records plus platform catalog and ADR evidence.</p><div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#d9b56c]"><LockKeyhole className="h-3.5 w-3.5" /> Read-only evidence boundary</div><p className="mt-2 text-xs leading-5 text-emerald-50/65">The assistant cannot grant access, approve a decision, run a workflow, browse externally, or expose another venture’s data.</p></div></section>
      <section className="rounded-2xl border border-[#dfe3dc] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718078]">Suggested questions</p><div className="mt-4 space-y-2">{prompts.map(prompt => <button key={prompt} disabled={!activeVenture} onClick={() => setQuestion(prompt)} className="w-full rounded-xl border border-[#edf0eb] p-3 text-left text-xs leading-5 text-[#506057] transition hover:border-[#b9d2c5] hover:bg-[#f4faf6] disabled:cursor-not-allowed disabled:opacity-50">{prompt}</button>)}</div></section>
      <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5"><div className="flex items-center gap-2 text-sky-700"><BookOpen className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[0.18em]">Evidence types</p></div><p className="mt-3 text-xs leading-5 text-[#53665d]">Service maturity scorecards, ADR registry entries, declared dependencies, ownership metadata, and governance cases accessible in the active venture.</p></section></aside>
    <main className="flex min-h-[720px] flex-col overflow-hidden rounded-[2rem] border border-[#dfe3dc] bg-white shadow-[0_10px_24px_rgba(32,55,48,.04)]"><div className="flex items-start justify-between gap-4 border-b border-[#edf0eb] px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718078]">Venture knowledge session</p><p className="mt-1 text-sm font-semibold text-[#304138]">{statusLine}</p></div><span className="rounded-full bg-[#eef6f1] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#28705e]">Scoped retrieval</span></div>
      <div className="flex-1 space-y-5 overflow-y-auto bg-[#fbfcfa] p-5 md:p-7">{messages.length === 0 ? <div className="grid h-full min-h-[430px] place-items-center text-center"><div className="max-w-md"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf4ee] text-[#176a59]"><Bot className="h-7 w-7" /></span><h2 className="mt-5 font-display text-3xl text-[#20332b]">Start with a governed question.</h2><p className="mt-3 text-sm leading-6 text-[#718078]">Choose a venture, then ask about its architecture, catalog, decision records, service boundaries, risks, or build-versus-buy rationale.</p></div></div> : messages.map(message => <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-[#173f36] p-4 text-sm leading-6 text-white" : "max-w-[92%] rounded-2xl rounded-bl-md border border-[#e3e8e2] bg-white p-5 text-sm leading-6 text-[#42534a] shadow-sm"}>{message.role === "assistant" && <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#1f715e]"><Bot className="h-4 w-4" /> Architecture assistant</div>}<p className="whitespace-pre-wrap">{message.content}</p>{message.evidence && <div className="mt-5 grid gap-3 border-t border-[#edf0eb] pt-4 md:grid-cols-3"><EvidenceBlock icon={CheckCircle2} label="Evidence" items={message.evidence.references} tone="emerald" /><EvidenceBlock icon={Lightbulb} label="Assumptions" items={message.evidence.assumptions} tone="amber" /><EvidenceBlock icon={AlertTriangle} label="Gaps & actions" items={[...message.evidence.gaps, ...message.evidence.recommendedActions]} tone="sky" /></div>}{message.sourceCatalog && message.sourceCatalog.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{message.sourceCatalog.map(source => <span key={source.id} title={source.detail} className="rounded-lg bg-[#f2f6f2] px-2 py-1 font-mono text-[10px] text-[#4c6d60]">{source.id}</span>)}</div>}</article>)}</div>
      <form onSubmit={submit} className="border-t border-[#edf0eb] bg-white p-4 md:p-5"><div className="flex gap-3 rounded-2xl border border-[#dce3dc] bg-[#fbfcfa] p-2 focus-within:border-[#79ae9b] focus-within:ring-4 focus-within:ring-[#1a6858]/10"><textarea value={question} onChange={event => setQuestion(event.target.value)} disabled={disabled} rows={2} placeholder={activeVenture ? "Ask about architecture, governance, service dependencies, platform risks, or build-versus-buy…" : "Select a venture to begin a tenant-scoped conversation."} className="min-h-[52px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#2d3c35] outline-none placeholder:text-[#9aa59e] disabled:cursor-not-allowed" /><button type="submit" disabled={disabled || !question.trim()} className="grid h-10 w-10 place-items-center self-end rounded-xl bg-[#1c705d] text-white transition hover:bg-[#155a4a] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question">{ask.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" /> : <Send className="h-4 w-4" />}</button></div></form>
    </main>
  </div>;
}

function EvidenceBlock({ icon: Icon, label, items, tone }: { icon: typeof CheckCircle2; label: string; items: string[]; tone: "emerald" | "amber" | "sky" }) {
  const color = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-sky-700";
  return <div><p className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${color}`}><Icon className="h-3 w-3" /> {label}</p><div className="mt-1.5 space-y-1">{items.length ? items.slice(0, 3).map((item, index) => <p key={`${item}-${index}`} className="text-[11px] leading-4 text-[#627169]">{item}</p>) : <p className="text-[11px] text-[#8c9891]">None recorded</p>}</div></div>;
}

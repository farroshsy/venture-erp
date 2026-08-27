import { trpc } from "@/lib/trpc";
import { AlertTriangle, CircleCheck, Link2, Loader2, ShieldCheck } from "lucide-react";

type Props = { ventureId: number; enabled: boolean };

const statusClass = (status: "reconciled" | "exception" | "insufficient_evidence") => ({
  reconciled: "border-[#b9dfcc] bg-[#f2faf5] text-[#176447]",
  exception: "border-[#f2d3a7] bg-[#fff8ed] text-[#98520d]",
  insufficient_evidence: "border-[#d9dfe0] bg-[#f6f8f8] text-[#5e6a69]",
})[status];

const statusLabel = (status: "reconciled" | "exception" | "insufficient_evidence") => ({
  reconciled: "Reconciled retained evidence",
  exception: "Observed exception",
  insufficient_evidence: "Insufficient evidence",
})[status];

const obligationLabel = (type: "accounts_payable" | "accounts_receivable" | "purchase_commitment" | "sales_commitment") => ({
  accounts_payable: "Accounts payable",
  accounts_receivable: "Accounts receivable",
  purchase_commitment: "Purchase commitment",
  sales_commitment: "Sales commitment",
})[type];

export function CanonicalObligationEvidenceBridgePanel({ ventureId, enabled }: Props) {
  const bridge = trpc.erp.canonicalObligationEvidence.bridge.useQuery({ ventureId }, { enabled });

  if (bridge.isLoading) return <section className="rounded-2xl border border-[#dfe3dc] bg-white p-6 shadow-sm"><div className="flex items-center gap-3 text-sm text-[#647168]"><Loader2 className="h-4 w-4 animate-spin" />Loading retained obligation evidence…</div></section>;
  if (bridge.error) return <section className="rounded-2xl border border-[#f0c9c2] bg-[#fff8f6] p-6 text-sm text-[#8c3f32]"><AlertTriangle className="mb-3 h-5 w-5" />The obligation evidence bridge could not be read. No invoice, payment, or financial state was changed.</section>;
  if (!bridge.data) return null;

  const { obligations, summary } = bridge.data;
  return <section className="rounded-2xl border border-[#cadbd4] bg-gradient-to-br from-[#f5fbf8] via-white to-[#f7faf8] p-5 shadow-sm md:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#26725d]"><Link2 className="h-3.5 w-3.5" />Canonical obligation evidence bridge</div><h2 className="mt-2 font-display text-2xl text-[#243b32] md:text-3xl">Review what the venture owes, is owed, or has committed—without moving money.</h2><p className="mt-3 text-sm leading-6 text-[#647168]">COEB is a tenant-scoped, read-only reconciliation projection across retained invoice, order, receipt or fulfillment, match, internal settlement, dimension, and immutable evidence references. It never creates a payable/receivable ledger, corrects an invoice, executes a payment, posts a journal, or triggers an external system.</p></div>
      <div className="rounded-xl border border-[#cfe2d8] bg-white px-4 py-3 text-xs font-semibold text-[#285b4b]"><ShieldCheck className="mr-2 inline h-4 w-4 text-[#1e715d]" />Evidence review only · no payment rail</div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Projected obligations" value={summary.obligationCount} />
      <Metric label="Reconciled" value={summary.reconciledCount} tone="good" />
      <Metric label="Exceptions" value={summary.exceptionCount} tone="warn" />
      <Metric label="Evidence gaps" value={summary.insufficientEvidenceCount} tone="muted" />
      <Metric label="Payable / receivable" value={`${summary.accountsPayableCount} / ${summary.accountsReceivableCount}`} />
    </div>

    <div className="mt-5 space-y-4">
      {obligations.length ? obligations.map(obligation => <article key={obligation.canonicalObligationId} className="rounded-xl border border-[#dbe5df] bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#edf6f1] px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#23705a]">{obligationLabel(obligation.obligationType)}</span><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${statusClass(obligation.reconciliation.status)}`}>{statusLabel(obligation.reconciliation.status)}</span><span className="text-xs font-medium text-[#68756d]">Traceability {obligation.traceabilityScore}%</span></div><h3 className="mt-3 text-base font-bold text-[#243b32]">{obligation.canonicalObligationId}</h3><p className="mt-1 text-sm text-[#647168]">{obligation.counterparty ? `${obligation.counterparty.code} · ${obligation.counterparty.name}` : "Counterparty evidence is missing"} · {obligation.currency} · {obligation.dueDate ? `due ${obligation.dueDate}` : "no retained due date"}</p></div>
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#f5f8f6] p-3 text-right"><Amount label="Original" value={obligation.originalAmount} currency={obligation.currency} /><Amount label="Settled" value={obligation.settledAmount} currency={obligation.currency} /><Amount label="Open" value={obligation.openAmount} currency={obligation.currency} /></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-lg border border-[#e2eae5] p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#78847c]">Evidence path and explainability</p><p className="mt-2 text-sm leading-6 text-[#44554c]">{obligation.reconciliation.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{obligation.supportingSourceDocuments.map(document => <span key={document.id} className="rounded-md border border-[#dbe5df] bg-[#fbfdfb] px-2 py-1 text-xs text-[#52635b]">{document.recordNumber} · {document.recordType.replace(/_/g, " ")} · {document.status}</span>)}</div>{obligation.obligationType === "accounts_payable" && <p className="mt-3 text-xs text-[#647168]">Match: <span className="font-semibold text-[#374b41]">{obligation.matchingState.status.replace(/_/g, " ")}</span>{obligation.matchingState.reasonCodes.length ? ` · ${obligation.matchingState.reasonCodes.join(", ")}` : ""}</p>}</div>
          <div className="rounded-lg border border-[#e2eae5] p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#78847c]">Evidence coverage</p><p className="mt-2 text-sm text-[#44554c]">{obligation.evidenceCompleteness.replace(/_/g, " ")} · {obligation.sourceEvidenceReferences.immutableAccountingEvents.length} immutable event(s) · {obligation.sourceEvidenceReferences.immutableAccountingCalculationEvidence.length} calculation record(s)</p><p className="mt-2 text-xs leading-5 text-[#647168]">{obligation.traceabilityScoreMethod}</p></div>
        </div>
        {(obligation.outstandingEvidenceGaps.length > 0 || obligation.reconciliation.exceptions.length > 0) && <div className="mt-4 grid gap-3 lg:grid-cols-2"><EvidenceList heading="Evidence gaps" values={obligation.outstandingEvidenceGaps} tone="gap" /><EvidenceList heading="Observed exceptions" values={obligation.reconciliation.exceptions} tone="exception" /></div>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#68756d]"><span className="rounded-md bg-[#f1f5f3] px-2 py-1">Approval: {obligation.approvalState}</span><span className="rounded-md bg-[#f1f5f3] px-2 py-1">Internal payment evidence: {obligation.internalPaymentEvidence.length}</span><span className="rounded-md bg-[#f1f5f3] px-2 py-1">Exact finance dimensions: {obligation.sourceEvidenceReferences.exactFinanceDimensionMatches.length}</span><span className="rounded-md bg-[#f1f5f3] px-2 py-1">Future treasury/accounting: blocked</span></div>
      </article>) : <div className="rounded-xl border border-dashed border-[#ccd9d2] bg-white p-8 text-center text-sm text-[#78847c]">No retained invoices, purchase commitments, or sales commitments are available in this venture to project as obligations.</div>}
    </div>
    <p className="mt-5 text-xs leading-5 text-[#68756d]">Projection timestamp: {new Date(obligations[0]?.lastReconciliationTimestamp ?? Date.now()).toLocaleString()}. Reconciliation state is observational only. A mismatch or gap remains visible for review and never creates an automatic correction.</p>
  </section>;
}

function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "muted" }) { const toneClass = { default: "text-[#243b32]", good: "text-[#1e715d]", warn: "text-[#aa5b0a]", muted: "text-[#5e6a69]" }[tone]; return <div className="rounded-xl border border-[#dce6e0] bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#78847c]">{label}</p><p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p></div>; }
function Amount({ label, value, currency }: { label: string; value: number | null; currency: string }) { return <div><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#77847d]">{label}</p><p className="mt-1 text-sm font-bold text-[#243b32]">{value === null ? "Not calculated" : `${value.toLocaleString()} ${currency}`}</p></div>; }
function EvidenceList({ heading, values, tone }: { heading: string; values: string[]; tone: "gap" | "exception" }) { if (!values.length) return null; return <div className={`rounded-lg border p-3 ${tone === "exception" ? "border-[#f1d2aa] bg-[#fffaf1]" : "border-[#dce3df] bg-[#f7faf8]"}`}><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#627068]">{heading}</p><ul className="mt-2 space-y-1.5">{values.map(value => <li key={value} className="flex gap-2 text-xs leading-5 text-[#52635b]"><CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#748179]" />{value}</li>)}</ul></div>; }

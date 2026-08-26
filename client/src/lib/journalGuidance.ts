export type JournalGuidanceInput = {
  openPeriodCount: number;
  accountCount: number;
  eventCount: number;
  approvedRuleCount: number;
  pendingProposalCount: number;
  evidenceChainValid?: boolean;
};

export type JournalGuidance = {
  tone: "ready" | "attention" | "learn";
  eyebrow: string;
  title: string;
  detail: string;
  target: "journal-draft" | "journal-rules" | "journal-events" | "journal-proposals" | "journal-evidence";
  actionLabel: string;
};

export function deriveJournalGuidance(input: JournalGuidanceInput): JournalGuidance {
  if (input.openPeriodCount === 0) return { tone: "attention", eyebrow: "Readiness check", title: "An open period is required", detail: "A balanced draft cannot be created until the active venture retains an open accounting period. This guide will not create or reopen one.", target: "journal-draft", actionLabel: "Review draft prerequisites" };
  if (input.accountCount < 2) return { tone: "attention", eyebrow: "Readiness check", title: "Two controlled accounts are required", detail: "A balanced draft needs distinct debit and credit account masters in the active venture. No account is inferred.", target: "journal-draft", actionLabel: "Review draft prerequisites" };
  if (input.eventCount === 0) return { tone: "learn", eyebrow: "Evidence-first path", title: "Start from retained source evidence", detail: "Final internal procurement receipts appear as immutable accounting events. The guided pipeline does not create an event for you.", target: "journal-events", actionLabel: "Review source evidence" };
  if (input.approvedRuleCount === 0) return { tone: "learn", eyebrow: "Finance-owned policy", title: "Approve an effective-dated rule before evaluation", detail: "A finance-owned posting-rule revision must be approved before source evidence can be evaluated into a proposal. The rule still cannot create or post a journal.", target: "journal-rules", actionLabel: "Review rule revisions" };
  if (input.evidenceChainValid === false) return { tone: "attention", eyebrow: "Evidence integrity", title: "Resolve calculation-evidence attention first", detail: "The retained calculation-evidence chain needs review before it should support downstream human decisions. No repair or rewrite happens here.", target: "journal-evidence", actionLabel: "Inspect evidence chain" };
  if (input.pendingProposalCount > 0) return { tone: "ready", eyebrow: "Human decision required", title: `${input.pendingProposalCount} proposal${input.pendingProposalCount === 1 ? "" : "s"} await finance review`, detail: "The system has retained balanced proposal evidence. A human may approve or reject the proposal, but approval does not create or post a journal.", target: "journal-proposals", actionLabel: "Open proposal queue" };
  return { tone: "ready", eyebrow: "Control posture", title: "Evidence pipeline is ready for an explainable review", detail: "Use the source event, approved rule, simulation, immutable evidence, and proposal queue to understand the decision path. Journal drafting and posting remain separate human-controlled actions.", target: "journal-events", actionLabel: "Explore the evidence path" };
}

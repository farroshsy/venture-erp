export type EvidenceReviewDraft = {
  executiveSummary: string;
  rationale: string;
  assumptions: string[];
  evidenceGaps: string[];
  risks: string[];
  humanApprovalRequired: boolean;
};

/**
 * AI can prepare an evidence review but never change the governance state. The
 * server, rather than the model, is authoritative for the approval requirement.
 */
export function enforceHumanApproval(draft: EvidenceReviewDraft): EvidenceReviewDraft {
  return { ...draft, humanApprovalRequired: true };
}

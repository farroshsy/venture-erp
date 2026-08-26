import { describe, expect, it } from "vitest";
import { deriveJournalGuidance } from "../client/src/lib/journalGuidance";

describe("deriveJournalGuidance", () => {
  const readyBase = { openPeriodCount: 1, accountCount: 2, eventCount: 1, approvedRuleCount: 1, pendingProposalCount: 0, evidenceChainValid: true };

  it("prioritizes an open accounting period before any guided journal action", () => {
    expect(deriveJournalGuidance({ ...readyBase, openPeriodCount: 0 })).toMatchObject({ tone: "attention", target: "journal-draft", title: "An open period is required" });
  });

  it("directs finance users to the pending human review queue without implying journal creation", () => {
    expect(deriveJournalGuidance({ ...readyBase, pendingProposalCount: 2 })).toMatchObject({ tone: "ready", target: "journal-proposals", title: "2 proposals await finance review" });
  });

  it("surfaces an invalid evidence chain as a review concern rather than a repair action", () => {
    expect(deriveJournalGuidance({ ...readyBase, evidenceChainValid: false })).toMatchObject({ tone: "attention", target: "journal-evidence", actionLabel: "Inspect evidence chain" });
  });
});

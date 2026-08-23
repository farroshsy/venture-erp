import { describe, expect, it } from "vitest";
import { enforceHumanApproval } from "./review-policy";

describe("AI evidence-review policy", () => {
  it("cannot be bypassed by a model response that claims approval is unnecessary", () => {
    const governed = enforceHumanApproval({
      executiveSummary: "Draft",
      rationale: "Draft rationale",
      assumptions: [],
      evidenceGaps: [],
      risks: [],
      humanApprovalRequired: false,
    });
    expect(governed.humanApprovalRequired).toBe(true);
  });
});

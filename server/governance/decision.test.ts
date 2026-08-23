import { describe, expect, it } from "vitest";
import { evaluateBuildBuy, validateDecisionCriteria } from "./decision";

const criteria = [
  { key: "differentiation" as const, weight: 5, sap: 2, alternative: 3, custom: 5 },
  { key: "compliance" as const, weight: 4, sap: 5, alternative: 4, custom: 2 },
  { key: "integration" as const, weight: 3, sap: 4, alternative: 3, custom: 3 },
  { key: "totalCost" as const, weight: 4, sap: 2, alternative: 4, custom: 3 },
  { key: "lockIn" as const, weight: 4, sap: 1, alternative: 3, custom: 5 },
  { key: "deliveryCapacity" as const, weight: 5, sap: 2, alternative: 4, custom: 3 },
];

describe("build-versus-buy evaluation", () => {
  it("selects the highest weighted path while retaining the comparative scorecard", () => {
    const result = evaluateBuildBuy(criteria);
    expect(result.recommendation).toBe("custom");
    expect(result.scores.custom).toBeGreaterThan(result.scores.sap);
    expect(result.weightedMaximum).toBe(125);
  });

  it("requires every declared decision criterion exactly once", () => {
    expect(validateDecisionCriteria(criteria)).toBe(true);
    expect(validateDecisionCriteria(criteria.slice(0, 5))).toBe(false);
  });
});

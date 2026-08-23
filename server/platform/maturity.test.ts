import { describe, expect, it } from "vitest";
import { calculateServiceMaturity } from "./maturity";

describe("service maturity", () => {
  it("withholds independent-release eligibility until operational controls are evidenced", () => {
    const result = calculateServiceMaturity({
      documentation: true, unitTests: true, contractTests: true, integrationTests: false,
      structuredLogs: true, metrics: true, traces: false, threatModel: true,
      dependencyReview: true, rollbackPlan: true, onCall: false, resilienceTest: false,
    });
    expect(result.level).toBe("L2");
    expect(result.releaseEligible).toBe(false);
    expect(result.missing).toContain("integration-test evidence");
  });

  it("recognizes an operable service only when score and gates agree", () => {
    const result = calculateServiceMaturity({
      documentation: true, unitTests: true, contractTests: true, integrationTests: true,
      structuredLogs: true, metrics: true, traces: true, threatModel: true,
      dependencyReview: true, rollbackPlan: true, onCall: false, resilienceTest: false,
    });
    expect(result.level).toBe("L3");
    expect(result.releaseEligible).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { architectureDecisions, getArchitectureGovernance, getEnterpriseCatalog, getExecutiveArchitectureProjection } from "./enterprise";

describe("enterprise control-plane projections", () => {
  it("keeps every ADR linked only to declared catalog contexts", () => {
    const catalogIds = new Set(getEnterpriseCatalog().map(module => module.id));
    const governance = getArchitectureGovernance();
    expect(governance.decisions).toHaveLength(architectureDecisions.length);
    expect(governance.contextImpact).toHaveLength(catalogIds.size);
    for (const decision of governance.decisions) {
      for (const context of decision.contexts) expect(catalogIds.has(context)).toBe(true);
    }
  });

  it("derives technical debt from catalog maturity gaps and does not invent delivery telemetry", () => {
    const projection = getExecutiveArchitectureProjection();
    expect(projection.technicalDebt.length).toBeGreaterThan(0);
    expect(projection.technicalDebt.every(item => item.gap.length > 0 && item.moduleId.length > 0)).toBe(true);
    expect(projection.kpiDefinitions.filter(kpi => kpi.status === "integration-needed").map(kpi => kpi.id)).toEqual(expect.arrayContaining(["deployment-frequency", "change-failure-rate", "mttr"]));
  });
});

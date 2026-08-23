export type AccessibleVenture = {
  id: number;
  name: string;
  role: string;
};

export type GovernanceCaseSummary = {
  id: number;
  title: string;
  status: "draft" | "review" | "approved" | "rejected";
  recommendation: "sap" | "alternative" | "custom";
  updatedAt: Date;
};

export function compileScopedPortfolioGovernance(
  accessibleVentures: AccessibleVenture[],
  casesByAccessibleVenture: GovernanceCaseSummary[][],
) {
  const ventures = accessibleVentures.map((venture, index) => {
    const cases = casesByAccessibleVenture[index] ?? [];
    return {
      ventureId: venture.id,
      ventureName: venture.name,
      role: venture.role,
      activeDecisions: cases.filter(governanceCase => governanceCase.status === "draft" || governanceCase.status === "review").length,
      approvedDecisions: cases.filter(governanceCase => governanceCase.status === "approved").length,
      latestDecision: cases[0] ?? null,
    };
  });

  return {
    activeDecisionCount: ventures.reduce((total, venture) => total + venture.activeDecisions, 0),
    approvedDecisionCount: ventures.reduce((total, venture) => total + venture.approvedDecisions, 0),
    ventures,
  };
}

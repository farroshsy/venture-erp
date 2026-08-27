import { describe, expect, it, vi } from "vitest";
import { createPortfolioGovernanceQuery } from "../db";
import type { TrpcContext } from "../_core/context";
import { createPlatformRouter } from "./platform";

function callerFor(router: ReturnType<typeof createPlatformRouter>, userId: number) {
  return router.createCaller({
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: "portfolio@example.com",
      name: "Portfolio user",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("platform portfolioOverview tenant scoping", () => {
  it("returns governance records only from the ventures that membership resolution exposes to the caller", async () => {
    const listAccessibleVentures = vi.fn().mockResolvedValue([{ id: 41, name: "Member venture", role: "portfolio_admin" }]);
    const listCasesForVenture = vi.fn().mockResolvedValue([{ id: 1, title: "Member decision", status: "review", recommendation: "custom", updatedAt: new Date() }]);
    const portfolioOverview = createPortfolioGovernanceQuery({ listAccessibleVentures, listCasesForVenture });
    const router = createPlatformRouter({
      listVenturesForUser: listAccessibleVentures,
      getPortfolioGovernanceForUser: portfolioOverview,
      createVentureWithOwner: vi.fn(),
    });
    const overview = await callerFor(router, 6).portfolioOverview();
    expect(overview.ventures).toHaveLength(1);
    expect(overview.ventures[0].ventureId).toBe(41);
    expect(overview.ventures[0].latestDecision?.title).toBe("Member decision");
    expect(listCasesForVenture).toHaveBeenCalledWith(41);
    expect(listCasesForVenture).not.toHaveBeenCalledWith(42);
  });

  it("requires active membership before returning the Gate 1 reliability posture and exposes no tenant business record mutation path", async () => {
    const requireVentureMembership = vi.fn().mockResolvedValue({ ventureId: 41, userId: 6, role: "portfolio_admin", status: "active" });
    const getProductionHardeningOverview = vi.fn().mockResolvedValue({
      posture: { program: "Gate 1 — Production Hardening", status: "in_progress" },
      readiness: { ready: true },
      runtime: { boundaries: { noBusinessStateMutation: true, noFinancialOrPayrollEffect: true } },
    });
    const router = createPlatformRouter({
      listVenturesForUser: vi.fn(),
      getPortfolioGovernanceForUser: vi.fn(),
      createVentureWithOwner: vi.fn(),
      requireVentureMembership,
      getProductionHardeningOverview,
    });

    const overview = await callerFor(router, 6).reliabilityOverview({ ventureId: 41 });
    expect(requireVentureMembership).toHaveBeenCalledWith(6, 41);
    expect(getProductionHardeningOverview).toHaveBeenCalledOnce();
    expect(overview.runtime.boundaries).toMatchObject({ noBusinessStateMutation: true, noFinancialOrPayrollEffect: true });
  });
});

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
});

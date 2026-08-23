import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual, getVentureMembership: vi.fn() };
});

import { createPortfolioGovernanceQuery, getVentureMembership } from "../db";
import { compileScopedPortfolioGovernance } from "./portfolio";
import { requireVentureMembership } from "./tenant";

describe("venture isolation integration", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects a user who has no active membership in the requested venture", async () => {
    vi.mocked(getVentureMembership).mockResolvedValue(undefined);
    await expect(requireVentureMembership(11, 902)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getVentureMembership).toHaveBeenCalledWith(11, 902);
  });

  it("accepts an active membership in the requested venture", async () => {
    vi.mocked(getVentureMembership).mockResolvedValue({ id: 1, userId: 11, ventureId: 901, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(requireVentureMembership(11, 901)).resolves.toMatchObject({ ventureId: 901, role: "operator" });
  });

  it("does not include governance records for a venture outside the caller's accessible venture list", () => {
    const result = compileScopedPortfolioGovernance(
      [{ id: 10, name: "Accessible venture", role: "portfolio_admin" }],
      [[{ id: 1, title: "Allowed decision", status: "draft", recommendation: "custom", updatedAt: new Date() }]],
    );
    expect(result.ventures).toHaveLength(1);
    expect(result.ventures[0].ventureId).toBe(10);
    expect(result.ventures[0].latestDecision?.title).toBe("Allowed decision");
    expect(result.activeDecisionCount).toBe(1);
  });

  it("queries governance cases only for ventures returned by the membership-scoped venture query", async () => {
    const listAccessibleVentures = vi.fn().mockResolvedValue([{ id: 10, name: "Accessible venture", role: "portfolio_admin" }]);
    const listCasesForVenture = vi.fn().mockResolvedValue([{ id: 2, title: "Scoped decision", status: "approved", recommendation: "alternative", updatedAt: new Date() }]);
    const query = createPortfolioGovernanceQuery({ listAccessibleVentures, listCasesForVenture });
    const result = await query(77);
    expect(listAccessibleVentures).toHaveBeenCalledWith(77);
    expect(listCasesForVenture).toHaveBeenCalledTimes(1);
    expect(listCasesForVenture).toHaveBeenCalledWith(10);
    expect(listCasesForVenture).not.toHaveBeenCalledWith(20);
    expect(result.ventures.map(venture => venture.ventureId)).toEqual([10]);
  });
});

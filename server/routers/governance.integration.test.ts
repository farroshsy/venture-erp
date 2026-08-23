import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  approveDecisionEvidenceReview: vi.fn(),
  createDecisionEvidenceReview: vi.fn(),
  createGovernanceCase: vi.fn(),
  getGovernanceCase: vi.fn(),
  getVentureMembership: vi.fn(),
  listGovernanceCasesForVenture: vi.fn(),
}));

import { getVentureMembership, listGovernanceCasesForVenture } from "../db";
import type { TrpcContext } from "../_core/context";
import { governanceRouter } from "./governance";

function callerFor(userId: number) {
  return governanceRouter.createCaller({
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: "operator@example.com",
      name: "Operator",
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

describe("governance router tenant scoping", () => {
  it("returns records for an active venture member", async () => {
    vi.mocked(getVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 12, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(listGovernanceCasesForVenture).mockResolvedValue([]);
    await expect(callerFor(7).list({ ventureId: 12 })).resolves.toEqual([]);
    expect(listGovernanceCasesForVenture).toHaveBeenCalledWith(12);
  });

  it("denies router access to a venture with no membership and never queries its records", async () => {
    vi.mocked(getVentureMembership).mockResolvedValue(undefined);
    await expect(callerFor(7).list({ ventureId: 13 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listGovernanceCasesForVenture).not.toHaveBeenCalledWith(13);
  });
});

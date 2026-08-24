import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../iam/service", () => ({
  applyAccessRequest: vi.fn(),
  createAccessRequest: vi.fn(),
  getEffectivePermissions: vi.fn(),
  getIamCatalog: vi.fn(),
  getVentureAccessDirectory: vi.fn(),
}));
vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));

import { createAccessRequest, getEffectivePermissions } from "../iam/service";
import { requireVentureMembership } from "../platform/tenant";
import { iamRouter } from "./iam";

const ctx = { user: { id: 27, openId: "operator", name: "Operator", email: "operator@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("IAM router authorization", () => {
  it("forbids an operator without iam.manage from requesting an access change", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 14, userId: 27, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getEffectivePermissions).mockResolvedValue([]);
    await expect(iamRouter.createCaller(ctx).requestChange({ ventureId: 14, subjectUserId: 29, action: "grant", requestedRoleKey: "observer", scope: "venture", rationale: "Portfolio operating visibility is required." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an active scoped iam.manage permission to create a reviewable access request", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 14, userId: 27, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getEffectivePermissions).mockResolvedValue(["iam.manage"]);
    vi.mocked(createAccessRequest).mockResolvedValue({ id: 3, status: "pending", ventureId: 14, subjectUserId: 29, requestedByUserId: 27, action: "grant", requestedRoleKey: "observer", scope: "venture", rationale: "Portfolio operating visibility is required." });
    const result = await iamRouter.createCaller(ctx).requestChange({ ventureId: 14, subjectUserId: 29, action: "grant", requestedRoleKey: "observer", scope: "venture", rationale: "Portfolio operating visibility is required." });
    expect(result.status).toBe("pending");
    expect(createAccessRequest).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 14, requestedByUserId: 27 }));
  });

  it("preserves suspend and revoke as distinct reviewable lifecycle requests", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 14, userId: 27, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getEffectivePermissions).mockResolvedValue(["iam.manage"]);
    vi.mocked(createAccessRequest).mockImplementation(async input => ({ id: input.action === "suspend" ? 4 : 5, status: "pending", ...input }));
    const caller = iamRouter.createCaller(ctx);
    const common = { ventureId: 14, subjectUserId: 29, requestedRoleKey: "observer", scope: "module" as const, moduleId: "finance", rationale: "The module scope must be removed after the assignment review." };
    await expect(caller.requestChange({ ...common, action: "suspend" })).resolves.toMatchObject({ action: "suspend", status: "pending" });
    await expect(caller.requestChange({ ...common, action: "revoke" })).resolves.toMatchObject({ action: "revoke", status: "pending" });
    expect(createAccessRequest).toHaveBeenLastCalledWith(expect.objectContaining({ action: "revoke", scope: "module", moduleId: "finance" }));
  });
});

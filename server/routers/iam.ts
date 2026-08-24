import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { applyAccessRequest, createAccessRequest, getEffectivePermissions, getIamCatalog, getVentureAccessDirectory } from "../iam/service";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const scopeSchema = z.enum(["portfolio", "venture", "module"]);
const manageInput = z.object({ ventureId: z.number().int().positive() });

async function assertAccessAdministrator(userId: number, ventureId: number) {
  const membership = await requireVentureMembership(userId, ventureId);
  const permissions = await getEffectivePermissions({ userId, ventureId });
  if (!["portfolio_admin", "venture_lead"].includes(membership.role) && !permissions.includes("iam.manage")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "An administrator role or iam.manage permission is required." });
  }
  return membership;
}

export const iamRouter = router({
  catalog: protectedProcedure.query(() => getIamCatalog()),
  myEffectivePermissions: protectedProcedure.input(manageInput.extend({ moduleId: z.string().trim().min(2).max(96).optional() })).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return getEffectivePermissions({ userId: ctx.user.id, ventureId: input.ventureId, moduleId: input.moduleId });
  }),
  ventureDirectory: protectedProcedure.input(manageInput).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return getVentureAccessDirectory(input.ventureId);
  }),
  requestChange: protectedProcedure.input(manageInput.extend({ subjectUserId: z.number().int().positive(), action: z.enum(["grant", "revoke", "suspend"]), requestedRoleKey: z.string().trim().min(3).max(96), scope: scopeSchema, moduleId: z.string().trim().min(2).max(96).optional(), rationale: z.string().trim().min(8).max(1200) })).mutation(async ({ ctx, input }) => {
    await assertAccessAdministrator(ctx.user.id, input.ventureId);
    if (input.scope === "module" && !input.moduleId) throw new TRPCError({ code: "BAD_REQUEST", message: "A module scope requires a module ID." });
    return createAccessRequest({ ...input, requestedByUserId: ctx.user.id });
  }),
  applyChange: protectedProcedure.input(manageInput.extend({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const membership = await assertAccessAdministrator(ctx.user.id, input.ventureId);
    requireVentureRole(membership.role, ["portfolio_admin", "venture_lead"]);
    return applyAccessRequest({ requestId: input.requestId, reviewerUserId: ctx.user.id, expectedVentureId: input.ventureId });
  }),
});

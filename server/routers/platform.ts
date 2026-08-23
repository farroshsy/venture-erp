import { z } from "zod";
import { createVentureWithOwner, getPortfolioGovernanceForUser, listVenturesForUser } from "../db";
import { getModuleCatalog } from "../platform/catalog";
import { requireVentureMembership } from "../platform/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const createVentureInput = z.object({
  name: z.string().trim().min(3).max(120),
  legalName: z.string().trim().max(180).optional(),
  baseCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD"),
  timezone: z.string().trim().min(3).max(64).default("UTC"),
});

type PlatformRouterDependencies = {
  listVenturesForUser: typeof listVenturesForUser;
  getPortfolioGovernanceForUser: typeof getPortfolioGovernanceForUser;
  createVentureWithOwner: typeof createVentureWithOwner;
};

export function createPlatformRouter(dependencies: PlatformRouterDependencies) {
  return router({
    myVentures: protectedProcedure.query(({ ctx }) => dependencies.listVenturesForUser(ctx.user.id)),
    portfolioOverview: protectedProcedure.query(({ ctx }) => dependencies.getPortfolioGovernanceForUser(ctx.user.id)),
    createVenture: protectedProcedure.input(createVentureInput).mutation(async ({ ctx, input }) => {
      return dependencies.createVentureWithOwner({ ...input, ownerUserId: ctx.user.id });
    }),
    catalog: protectedProcedure.query(() => ({
      gateway: {
        contract: "erp-platform.v1",
        version: "1.0.0",
        routingPolicy: "contract-gated",
        tenantPropagation: "gateway-resolved venture membership",
      },
      modules: getModuleCatalog(),
    })),
    validateVentureContext: protectedProcedure
      .input(z.object({ ventureId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => requireVentureMembership(ctx.user.id, input.ventureId)),
  });
}

export const platformRouter = createPlatformRouter({
  listVenturesForUser,
  getPortfolioGovernanceForUser,
  createVentureWithOwner,
});

import { z } from "zod";
import { createVentureWithOwner, getPortfolioGovernanceForUser, getVentureGovernanceComparisonForUser, listVenturesForUser } from "../db";
import { getArchitectureGovernance, getEnterpriseCatalog, getExecutiveArchitectureProjection } from "../platform/enterprise";
import { getProductionHardeningOverview } from "../platform/reliability";
import { requireVentureMembership as requireVentureMembershipForUser } from "../platform/tenant";
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
  getVentureGovernanceComparisonForUser: typeof getVentureGovernanceComparisonForUser;
  createVentureWithOwner: typeof createVentureWithOwner;
  requireVentureMembership?: typeof requireVentureMembershipForUser;
  getProductionHardeningOverview?: typeof getProductionHardeningOverview;
};

export function createPlatformRouter(dependencies: PlatformRouterDependencies) {
  const requireVentureMembership = dependencies.requireVentureMembership ?? requireVentureMembershipForUser;
  const reliabilityOverview = dependencies.getProductionHardeningOverview ?? getProductionHardeningOverview;
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
      modules: getEnterpriseCatalog(),
    })),
    executiveDashboard: protectedProcedure.query(async ({ ctx }) => ({
      ...getExecutiveArchitectureProjection(),
      ventureMaturity: await dependencies.getVentureGovernanceComparisonForUser(ctx.user.id),
    })),
    architectureGovernance: protectedProcedure.query(() => getArchitectureGovernance()),
    reliabilityOverview: protectedProcedure
      .input(z.object({ ventureId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await requireVentureMembership(ctx.user.id, input.ventureId);
        return reliabilityOverview();
      }),
    validateVentureContext: protectedProcedure
      .input(z.object({ ventureId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => requireVentureMembership(ctx.user.id, input.ventureId)),
  });
}

export const platformRouter = createPlatformRouter({
  listVenturesForUser,
  getPortfolioGovernanceForUser,
  getVentureGovernanceComparisonForUser,
  createVentureWithOwner,
});

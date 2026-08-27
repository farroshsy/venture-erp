import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireVentureMembership } from "../platform/tenant";
import { getDecisionIntelligenceOverview } from "../intelligence/service";
import { getEnterpriseKnowledgeGraph } from "../intelligence/knowledgeGraph";
import { operatingSystemRouter } from "./operatingSystem";
import { validationProgramRouter } from "./validationProgram";

export const intelligenceRouter = router({
  overview: protectedProcedure.input(z.object({ ventureId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return getDecisionIntelligenceOverview(input.ventureId);
  }),
  knowledgeGraph: protectedProcedure.input(z.object({ ventureId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return getEnterpriseKnowledgeGraph(input.ventureId);
  }),
  operatingSystem: operatingSystemRouter,
  validationProgram: validationProgramRouter,
});

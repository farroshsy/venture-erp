import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireVentureMembership } from "../platform/tenant";
import { getDecisionIntelligenceOverview } from "../intelligence/service";

export const intelligenceRouter = router({
  overview: protectedProcedure.input(z.object({ ventureId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return getDecisionIntelligenceOverview(input.ventureId);
  }),
});

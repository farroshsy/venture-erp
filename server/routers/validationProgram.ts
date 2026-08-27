import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createValidationBenchmark, createValidationObservation, getOperatingSystemValidationOverview, reviewValidationBenchmark, verifyValidationObservation } from "../intelligence/validationProgram";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";

const leaders = ["portfolio_admin", "venture_lead"];
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const leaderGuard = async (userId: number, ventureId: number) => { const membership = await requireVentureMembership(userId, ventureId); requireVentureRole(membership.role, leaders); return membership; };

export const validationProgramRouter = router({
  overview: protectedProcedure.input(z.object({ ventureId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireVentureMembership(ctx.user.id, input.ventureId); return getOperatingSystemValidationOverview(input.ventureId); }),
  createBenchmark: protectedProcedure.input(z.object({ ventureId: z.number().int().positive(), benchmarkKey: text(3, 96), releaseLabel: text(3, 120), limitations: text(20, 4000) })).mutation(async ({ ctx, input }) => { await leaderGuard(ctx.user.id, input.ventureId); return createValidationBenchmark({ ...input, createdByUserId: ctx.user.id }); }),
  approveBenchmark: protectedProcedure.input(z.object({ ventureId: z.number().int().positive(), benchmarkId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await leaderGuard(ctx.user.id, input.ventureId); return reviewValidationBenchmark(input.ventureId, input.benchmarkId, ctx.user.id); }),
  createObservation: protectedProcedure.input(z.object({ ventureId: z.number().int().positive(), observationKey: text(3, 96), observationType: z.enum(["executive_question", "dashboard_review", "metric_investigation", "knowledge_graph_search", "decision_replay", "report_replacement", "human_feedback", "engineering_quality", "source_quality", "other"]), title: text(5, 180), outcome: z.enum(["success", "partial", "unsuccessful", "unknown"]), measurementValue: z.string().regex(/^-?\d+(\.\d{1,4})?$/).optional(), measurementUnit: z.string().trim().max(48).optional(), durationSeconds: z.number().int().nonnegative().optional(), subjectType: z.enum(["metric", "graph_node", "decision_memory", "objective", "key_result", "workspace", "source_contract", "other"]), subjectReference: text(1, 180), evidenceReference: z.string().trim().max(180).optional(), evidenceSnapshot: z.record(z.string(), z.unknown()), limitations: text(20, 4000), occurredAt: z.coerce.date() })).mutation(async ({ ctx, input }) => { await leaderGuard(ctx.user.id, input.ventureId); return createValidationObservation({ ...input, createdByUserId: ctx.user.id }); }),
  verifyObservation: protectedProcedure.input(z.object({ ventureId: z.number().int().positive(), observationId: z.number().int().positive(), status: z.enum(["verified", "rejected"]) })).mutation(async ({ ctx, input }) => { await leaderGuard(ctx.user.id, input.ventureId); return verifyValidationObservation(input.ventureId, input.observationId, ctx.user.id, input.status); }),
});

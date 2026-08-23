import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { approveDecisionEvidenceReview, createDecisionEvidenceReview, createGovernanceCase, getGovernanceCase, listGovernanceCasesForVenture } from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { evaluateBuildBuy, validateDecisionCriteria } from "../governance/decision";
import { enforceHumanApproval } from "../governance/review-policy";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";

const criterionKeys = ["differentiation", "compliance", "integration", "totalCost", "lockIn", "deliveryCapacity"] as const;
const criterionSchema = z.object({
  key: z.enum(criterionKeys),
  weight: z.number().int().min(1).max(5),
  sap: z.number().int().min(1).max(5),
  alternative: z.number().int().min(1).max(5),
  custom: z.number().int().min(1).max(5),
  note: z.string().trim().max(600).optional(),
});

const decisionInput = z.object({
  ventureId: z.number().int().positive(),
  title: z.string().trim().min(5).max(180),
  capability: z.string().trim().min(3).max(180),
  criteria: z.array(criterionSchema).length(6),
  evidence: z.array(z.string().trim().min(3).max(1200)).min(1).max(12),
  assumptions: z.array(z.string().trim().min(3).max(600)).min(1).max(12),
});

const evidenceReviewSchema = {
  name: "erp_evidence_review",
  strict: true,
  schema: {
    type: "object",
    properties: {
      executiveSummary: { type: "string" },
      rationale: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      evidenceGaps: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      humanApprovalRequired: { type: "boolean" },
    },
    required: ["executiveSummary", "rationale", "assumptions", "evidenceGaps", "risks", "humanApprovalRequired"],
    additionalProperties: false,
  },
};

function getTextContent(content: string | unknown[]) {
  return typeof content === "string" ? content : "";
}

export const governanceRouter = router({
  evaluate: protectedProcedure.input(z.object({ criteria: z.array(criterionSchema).length(6) })).query(({ input }) => {
    if (!validateDecisionCriteria(input.criteria)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "All six decision criteria must be supplied exactly once." });
    }
    return evaluateBuildBuy(input.criteria);
  }),
  list: protectedProcedure.input(z.object({ ventureId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return listGovernanceCasesForVenture(input.ventureId);
  }),
  draftEvidenceReview: protectedProcedure.input(decisionInput).mutation(async ({ ctx, input }) => {
    const membership = await requireVentureMembership(ctx.user.id, input.ventureId);
    requireVentureRole(membership.role, ["portfolio_admin", "venture_lead", "finance_lead"]);
    if (!validateDecisionCriteria(input.criteria)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "All six decision criteria must be supplied exactly once." });
    }

    const evaluation = evaluateBuildBuy(input.criteria);
    const governanceCase = await createGovernanceCase({
      ...input,
      recommendation: evaluation.recommendation,
      rationale: evaluation.interpretation,
      createdByUserId: ctx.user.id,
    });

    const prompt = [
      `Venture ID: ${input.ventureId}`,
      `Capability under review: ${input.capability}`,
      `Candidate path from weighted framework: ${evaluation.recommendation}`,
      `Score card: ${JSON.stringify(evaluation.scores)}`,
      `Declared evidence: ${input.evidence.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
      `Declared assumptions: ${input.assumptions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
    ].join("\n\n");

    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are an enterprise architecture evidence reviewer. Produce a neutral draft, distinguish evidence from assumptions, do not claim external facts that are not supplied, do not make a final procurement decision, and always set humanApprovalRequired to true.",
        },
        { role: "user", content: prompt },
      ],
      outputSchema: evidenceReviewSchema,
      maxTokens: 1600,
    });

    const content = getTextContent(response.choices[0]?.message.content);
    const modelDraft = JSON.parse(content) as {
      executiveSummary: string;
      rationale: string;
      assumptions: string[];
      evidenceGaps: string[];
      risks: string[];
      humanApprovalRequired: boolean;
    };
    const draft = enforceHumanApproval(modelDraft);

    const review = await createDecisionEvidenceReview({
      governanceCaseId: governanceCase.id,
      model: response.model,
      summary: `${draft.executiveSummary}\n\n${draft.rationale}`,
      assumptions: [...input.assumptions, ...draft.assumptions, ...draft.evidenceGaps],
      risks: draft.risks,
      createdByUserId: ctx.user.id,
    });

    return { governanceCase, review, evaluation, draft };
  }),
  approveEvidenceReview: protectedProcedure.input(z.object({ reviewId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const review = await getGovernanceCase(input.reviewId);
    if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence review not found." });
    const membership = await requireVentureMembership(ctx.user.id, review.ventureId);
    requireVentureRole(membership.role, ["portfolio_admin", "venture_lead"]);
    return approveDecisionEvidenceReview(input.reviewId, ctx.user.id);
  }),
});

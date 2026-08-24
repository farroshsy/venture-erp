import { z } from "zod";
import { listAssistantMessages, listVenturesForUser } from "../db";
import { createArchitectureAssistantAnswer, persistArchitectureConversation } from "../assistant/architectureAssistant";
import { requireVentureMembership } from "../platform/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const scopedConversationInput = z.object({
  ventureId: z.number().int().positive(),
  conversationId: z.string().trim().min(6).max(64),
});

export const assistantRouter = router({
  history: protectedProcedure.input(scopedConversationInput).query(async ({ ctx, input }) => {
    await requireVentureMembership(ctx.user.id, input.ventureId);
    return listAssistantMessages({ userId: ctx.user.id, ventureId: input.ventureId, conversationId: input.conversationId });
  }),
  ask: protectedProcedure.input(scopedConversationInput.extend({ question: z.string().trim().min(4).max(2400) })).mutation(async ({ ctx, input }) => {
    const membership = await requireVentureMembership(ctx.user.id, input.ventureId);
    const ventures = await listVenturesForUser(ctx.user.id);
    const venture = ventures.find(item => item.id === input.ventureId);
    if (!venture) throw new Error("Active venture could not be resolved.");
    const answer = await createArchitectureAssistantAnswer({
      userId: ctx.user.id,
      venture: { id: venture.id, name: venture.name, role: membership.role },
      question: input.question,
      conversationId: input.conversationId,
    });
    await persistArchitectureConversation({
      conversationId: answer.conversationId,
      userId: ctx.user.id,
      ventureId: input.ventureId,
      question: input.question,
      answer: answer.answer,
      evidence: answer.evidence,
      model: answer.model,
    });
    return answer;
  }),
});

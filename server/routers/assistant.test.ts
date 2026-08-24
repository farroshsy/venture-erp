import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  listAssistantMessages: vi.fn(),
  listVenturesForUser: vi.fn(),
}));
vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn() }));
vi.mock("../assistant/architectureAssistant", () => ({
  createArchitectureAssistantAnswer: vi.fn(),
  persistArchitectureConversation: vi.fn(),
}));

import { createArchitectureAssistantAnswer, persistArchitectureConversation } from "../assistant/architectureAssistant";
import { listVenturesForUser } from "../db";
import { requireVentureMembership } from "../platform/tenant";
import { assistantRouter } from "./assistant";

const ctx = { user: { id: 22, openId: "test-user", name: "Test user", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("assistant router tenant scope", () => {
  it("denies conversation history when venture membership cannot be resolved", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new TRPCError({ code: "FORBIDDEN" }));
    await expect(assistantRouter.createCaller(ctx).history({ ventureId: 91, conversationId: "conversation91" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("answers only after active membership and persists the scoped conversation", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 91, userId: 22, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(listVenturesForUser).mockResolvedValue([{ id: 91, name: "Scoped venture", role: "viewer" }] as never);
    vi.mocked(createArchitectureAssistantAnswer).mockResolvedValue({ conversationId: "conversation91", model: "gpt-5-mini", answer: "Scoped answer", evidence: { references: ["ADR-002"], assumptions: [], gaps: [], recommendedActions: [] }, sourceCatalog: [] });
    const result = await assistantRouter.createCaller(ctx).ask({ ventureId: 91, conversationId: "conversation91", question: "What governs this venture?" });
    expect(result.answer).toBe("Scoped answer");
    expect(createArchitectureAssistantAnswer).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, venture: expect.objectContaining({ id: 91, name: "Scoped venture" }) }));
    expect(persistArchitectureConversation).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, ventureId: 91 }));
  });
});

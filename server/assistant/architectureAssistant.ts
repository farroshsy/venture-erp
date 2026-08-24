import { nanoid } from "nanoid";
import { getEnterpriseCatalog, getArchitectureGovernance, getPlatformDocumentationIndex } from "../platform/enterprise";
import { createAssistantMessage, listGovernanceCasesForVenture } from "../db";
import { invokeLLM } from "../_core/llm";

type AssistantEvidence = {
  id: string;
  type: "venture" | "adr" | "catalog" | "governance-case";
  label: string;
  detail: string;
};

const answerSchema = {
  name: "venture_architecture_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      citedEvidenceIds: { type: "array", items: { type: "string" } },
      assumptions: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      recommendedActions: { type: "array", items: { type: "string" } },
    },
    required: ["answer", "citedEvidenceIds", "assumptions", "gaps", "recommendedActions"],
    additionalProperties: false,
  },
};

function textContent(content: string | unknown[]) {
  return typeof content === "string" ? content : "";
}

export async function createArchitectureAssistantAnswer(input: {
  userId: number;
  venture: { id: number; name: string; role: string };
  question: string;
  conversationId?: string;
}) {
  const catalog = getEnterpriseCatalog();
  const architecture = getArchitectureGovernance();
  const governanceCases = await listGovernanceCasesForVenture(input.venture.id);
  const evidence: AssistantEvidence[] = [
    { id: `venture:${input.venture.id}`, type: "venture", label: input.venture.name, detail: `Active scope. User role: ${input.venture.role}.` },
    ...architecture.decisions.map(decision => ({ id: decision.id, type: "adr" as const, label: decision.title, detail: `${decision.status}; ${decision.summary}` })),
    ...getPlatformDocumentationIndex().map(document => ({ id: document.id, type: "catalog" as const, label: document.title, detail: `${document.summary} Source: ${document.path}.` })),
    ...catalog.map(module => ({ id: `catalog:${module.id}`, type: "catalog" as const, label: module.name, detail: `Capability: ${module.businessCapability}. Contract: ${module.contract}. Maturity: ${module.maturity.level}/${module.maturity.score}. Missing evidence: ${module.maturity.missing.join(", ") || "none"}.` })),
    ...governanceCases.slice(0, 8).map(governanceCase => ({ id: `decision:${governanceCase.id}`, type: "governance-case" as const, label: governanceCase.title, detail: `Status: ${governanceCase.status}. Capability: ${governanceCase.capability}. Recommendation: ${governanceCase.recommendation}.` })),
  ];
  const conversationId = input.conversationId ?? nanoid(14);
  const prompt = [
    `Active venture: ${input.venture.name} (ID ${input.venture.id}).`,
    `Question: ${input.question}`,
    "Authorized platform evidence follows. Answer only from this evidence. Do not claim external facts, do not invent production metrics, do not cite an evidence ID not present, and do not reveal data outside the active venture scope.",
    evidence.map(item => `[${item.id}] ${item.label}: ${item.detail}`).join("\n"),
  ].join("\n\n");
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You are Venture ERP's architecture assistant. You are read-only. Distinguish evidence, assumptions, and information gaps. You cannot approve decisions, grant permissions, or execute changes. Recommend a human workflow when action is needed." },
      { role: "user", content: prompt },
    ],
    outputSchema: answerSchema,
    maxTokens: 1300,
  });
  const parsed = JSON.parse(textContent(response.choices[0]?.message.content)) as {
    answer: string; citedEvidenceIds: string[]; assumptions: string[]; gaps: string[]; recommendedActions: string[];
  };
  const allowedEvidenceIds = new Set(evidence.map(item => item.id));
  const citedEvidenceIds = parsed.citedEvidenceIds.filter(id => allowedEvidenceIds.has(id));
  const responseEvidence = { references: citedEvidenceIds, assumptions: parsed.assumptions, gaps: parsed.gaps, recommendedActions: parsed.recommendedActions };
  return {
    conversationId,
    model: response.model,
    answer: parsed.answer,
    evidence: responseEvidence,
    sourceCatalog: evidence.filter(item => citedEvidenceIds.includes(item.id)),
  };
}

export async function persistArchitectureConversation(input: {
  conversationId: string; userId: number; ventureId: number; question: string; answer: string; evidence: unknown; model: string;
}) {
  await createAssistantMessage({ conversationId: input.conversationId, userId: input.userId, ventureId: input.ventureId, role: "user", content: input.question, evidence: { references: [] } });
  await createAssistantMessage({ conversationId: input.conversationId, userId: input.userId, ventureId: input.ventureId, role: "assistant", content: input.answer, evidence: input.evidence, model: input.model });
}

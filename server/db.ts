import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, assistantMessages, decisionEvidenceReviews, governanceCases, users, ventureMemberships, ventures } from "../drizzle/schema";
import { ENV } from './_core/env';
import { compileScopedPortfolioGovernance } from "./platform/portfolio";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function slugifyVentureName(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return base || "venture";
}

export async function listVenturesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: ventures.id,
      slug: ventures.slug,
      name: ventures.name,
      legalName: ventures.legalName,
      status: ventures.status,
      baseCurrency: ventures.baseCurrency,
      timezone: ventures.timezone,
      role: ventureMemberships.role,
    })
    .from(ventureMemberships)
    .innerJoin(ventures, eq(ventureMemberships.ventureId, ventures.id))
    .where(and(eq(ventureMemberships.userId, userId), eq(ventureMemberships.status, "active")));
}

export async function getVentureMembership(userId: number, ventureId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(ventureMemberships)
    .where(and(eq(ventureMemberships.userId, userId), eq(ventureMemberships.ventureId, ventureId)))
    .limit(1);
  return rows[0];
}

export async function createVentureWithOwner(input: {
  name: string;
  legalName?: string;
  baseCurrency: string;
  timezone: string;
  ownerUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");

  const baseSlug = slugifyVentureName(input.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const result = await db.insert(ventures).values({
    slug,
    name: input.name,
    legalName: input.legalName,
    baseCurrency: input.baseCurrency,
    timezone: input.timezone,
  });
  const ventureId = Number(result[0].insertId);
  await db.insert(ventureMemberships).values({
    ventureId,
    userId: input.ownerUserId,
    role: "portfolio_admin",
    status: "active",
  });
  return { id: ventureId, slug, name: input.name, role: "portfolio_admin" as const };
}

export async function listGovernanceCasesForVenture(ventureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(governanceCases).where(eq(governanceCases.ventureId, ventureId)).orderBy(desc(governanceCases.updatedAt));
}

type PortfolioGovernanceDependencies = {
  listAccessibleVentures: (userId: number) => ReturnType<typeof listVenturesForUser>;
  listCasesForVenture: (ventureId: number) => ReturnType<typeof listGovernanceCasesForVenture>;
};

export function createPortfolioGovernanceQuery(dependencies: PortfolioGovernanceDependencies) {
  return async function getPortfolioGovernanceForUser(userId: number) {
    const accessibleVentures = await dependencies.listAccessibleVentures(userId);
    const casesByAccessibleVenture = await Promise.all(accessibleVentures.map(venture => dependencies.listCasesForVenture(venture.id)));
    return compileScopedPortfolioGovernance(accessibleVentures, casesByAccessibleVenture);
  };
}

export const getPortfolioGovernanceForUser = createPortfolioGovernanceQuery({
  listAccessibleVentures: listVenturesForUser,
  listCasesForVenture: listGovernanceCasesForVenture,
});

export async function getVentureGovernanceComparisonForUser(userId: number) {
  const ventures = await listVenturesForUser(userId);
  const casesByVenture = await Promise.all(ventures.map(venture => listGovernanceCasesForVenture(venture.id)));
  return ventures.map((venture, index) => {
    const cases = casesByVenture[index] ?? [];
    const approved = cases.filter(governanceCase => governanceCase.status === "approved").length;
    const inReview = cases.filter(governanceCase => governanceCase.status === "review" || governanceCase.status === "draft").length;
    const score = Math.min(100, approved * 35 + inReview * 15);
    return {
      ventureId: venture.id,
      ventureName: venture.name,
      role: venture.role,
      approvedDecisions: approved,
      activeDecisions: inReview,
      governanceEvidenceScore: score,
      posture: approved > 0 ? "governed" : inReview > 0 ? "reviewing" : "not-instrumented",
    };
  });
}

export async function createGovernanceCase(input: {
  ventureId: number;
  title: string;
  capability: string;
  recommendation: "sap" | "alternative" | "custom";
  criteria: unknown;
  evidence: unknown;
  assumptions: unknown;
  rationale: string;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const result = await db.insert(governanceCases).values(input);
  return { id: Number(result[0].insertId), ...input, status: "draft" as const };
}

export async function createDecisionEvidenceReview(input: {
  governanceCaseId: number;
  model: string;
  summary: string;
  assumptions: unknown;
  risks: unknown;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const result = await db.insert(decisionEvidenceReviews).values({ ...input, humanApprovalRequired: 1 });
  return { id: Number(result[0].insertId), ...input, status: "draft" as const, humanApprovalRequired: true };
}

export async function getGovernanceCase(reviewId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ ventureId: governanceCases.ventureId, governanceCaseId: decisionEvidenceReviews.governanceCaseId })
    .from(decisionEvidenceReviews)
    .innerJoin(governanceCases, eq(decisionEvidenceReviews.governanceCaseId, governanceCases.id))
    .where(eq(decisionEvidenceReviews.id, reviewId))
    .limit(1);
  return rows[0];
}

export async function approveDecisionEvidenceReview(reviewId: number, approverUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.update(decisionEvidenceReviews).set({ status: "approved", approvedByUserId: approverUserId, approvedAt: new Date() }).where(eq(decisionEvidenceReviews.id, reviewId));
  return { success: true, reviewId, status: "approved" as const };
}

export async function listAssistantMessages(input: { userId: number; ventureId: number; conversationId: string }) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: assistantMessages.id,
    role: assistantMessages.role,
    content: assistantMessages.content,
    evidence: assistantMessages.evidence,
    model: assistantMessages.model,
    createdAt: assistantMessages.createdAt,
  }).from(assistantMessages).where(and(
    eq(assistantMessages.userId, input.userId),
    eq(assistantMessages.ventureId, input.ventureId),
    eq(assistantMessages.conversationId, input.conversationId),
  )).orderBy(assistantMessages.createdAt);
}

export async function createAssistantMessage(input: {
  conversationId: string;
  userId: number;
  ventureId: number;
  role: "user" | "assistant";
  content: string;
  evidence: unknown;
  model?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const result = await db.insert(assistantMessages).values(input);
  return { id: Number(result[0].insertId), ...input, createdAt: new Date() };
}

export { decisionEvidenceReviews, governanceCases };

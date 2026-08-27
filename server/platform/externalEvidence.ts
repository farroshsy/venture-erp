import { and, desc, eq } from "drizzle-orm";
import { eosExternalAcquisitionRuns, eosExternalEvidenceRecords, eosExternalEvidenceReviews, eosExternalSourceConnections } from "../../drizzle/schema";
import { fetchGitHubEvidencePage, GITHUB_API_VERSION, GITHUB_EVIDENCE_NORMALIZER_VERSION, githubResourceTypes, normalizeGitHubPayload, sha256, type GitHubResourceType } from "../integrations/githubEvidence";
import { getDb } from "../db";

export const EXTERNAL_EVIDENCE_MODEL_VERSION = "0.1-github-evidence-first";
export const githubConnectionScopes = githubResourceTypes;
const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,94}[A-Za-z0-9])?$/;
const repositoryPattern = /^[A-Za-z0-9._-]{1,100}$/;

const ensureDb = async () => { const db = await getDb(); if (!db) throw new Error("Database is not available."); return db; };
const asResourceTypes = (value: unknown): GitHubResourceType[] => Array.isArray(value) ? value.filter((item): item is GitHubResourceType => typeof item === "string" && (githubResourceTypes as readonly string[]).includes(item)) : [];
const safeDate = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : null;
const sourceUrl = (owner: string, repository: string) => `https://github.com/${owner}/${repository}`;

export function validateRepositoryReference(owner: string, repository: string) {
  if (!ownerPattern.test(owner) || !repositoryPattern.test(repository)) throw new Error("Use a supported GitHub owner and repository name.");
}

export async function getExternalEvidenceOverview(ventureId: number) {
  const db = await ensureDb();
  const [connections, runs, evidenceRecords, reviews] = await Promise.all([
    db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.ventureId, ventureId)).orderBy(desc(eosExternalSourceConnections.updatedAt)),
    db.select().from(eosExternalAcquisitionRuns).where(eq(eosExternalAcquisitionRuns.ventureId, ventureId)).orderBy(desc(eosExternalAcquisitionRuns.requestedAt)),
    db.select().from(eosExternalEvidenceRecords).where(eq(eosExternalEvidenceRecords.ventureId, ventureId)).orderBy(desc(eosExternalEvidenceRecords.receivedAt)),
    db.select().from(eosExternalEvidenceReviews).where(eq(eosExternalEvidenceReviews.ventureId, ventureId)).orderBy(desc(eosExternalEvidenceReviews.reviewedAt)),
  ]);
  const reviewedByEvidenceId = new Map(reviews.map(review => [review.evidenceRecordId, review]));
  const activeConnections = connections.filter(connection => connection.status === "active");
  const completedRuns = runs.filter(run => run.status === "completed" || run.status === "partial");
  const lastRun = runs[0] ?? null;
  return {
    model: { name: "Gate 3 GitHub External Evidence", version: EXTERNAL_EVIDENCE_MODEL_VERSION, ventureId, evaluatedAt: new Date().toISOString() },
    connections: connections.map(connection => ({ ...connection, resourceScopes: asResourceTypes(connection.resourceScopes) })),
    runs,
    evidenceRecords: evidenceRecords.map(record => ({ ...record, review: reviewedByEvidenceId.get(record.id) ?? null })),
    summary: { connectionCount: connections.length, activeConnectionCount: activeConnections.length, acquisitionRunCount: runs.length, completedOrPartialRunCount: completedRuns.length, retainedEvidenceCount: evidenceRecords.length, reviewedEvidenceCount: evidenceRecords.filter(record => record.validationPosture === "reviewed").length, latestRunStatus: lastRun?.status ?? "not_run", latestReceivedAt: evidenceRecords[0]?.receivedAt?.toISOString() ?? null },
    collectionInterpretation: "Source status, counts, freshness, and coverage describe only retained runs/evidence in this selected venture. They do not prove provider completeness, source accuracy, ERP truth, engineering performance, decision quality, financial state, or business outcome.",
    boundary: { manualHumanTriggeredOnly: true as const, provider: "github" as const, serverOnlyCredential: true as const, rawEvidenceBeforeProjection: true as const, noAutomaticErpTruth: true as const, noWebhook: true as const, noScheduler: true as const, noRepositoryMutation: true as const, noFinancialEffect: true as const, noPayrollEffect: true as const, noExternalEffectBeyondReadOnlyAcquisition: true as const },
  };
}

export async function createGitHubSourceConnection(input: { ventureId: number; connectionKey: string; repositoryOwner: string; repositoryName: string; resourceScopes: GitHubResourceType[]; dataClassification: "public" | "internal" | "confidential" | "restricted"; authorizationReference: string; retentionPolicy: string; deletionProcedure: string; revocationProcedure: string; limitations: string; createdByUserId: number }) {
  validateRepositoryReference(input.repositoryOwner, input.repositoryName);
  if (input.resourceScopes.length === 0 || input.resourceScopes.length > githubResourceTypes.length || input.resourceScopes.some(scope => !(githubResourceTypes as readonly string[]).includes(scope))) throw new Error("Select one or more supported GitHub evidence resource types.");
  const db = await ensureDb();
  const [created] = await db.insert(eosExternalSourceConnections).values({ ...input, provider: "github", status: "draft", sourceUrl: sourceUrl(input.repositoryOwner, input.repositoryName), credentialReference: "GITHUB_EVIDENCE_TOKEN" });
  const [connection] = await db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, Number(created.insertId))); return connection;
}

export async function validateGitHubSourceConnection(ventureId: number, connectionId: number, validatedByUserId: number) {
  const db = await ensureDb();
  const [connection] = await db.select().from(eosExternalSourceConnections).where(and(eq(eosExternalSourceConnections.ventureId, ventureId), eq(eosExternalSourceConnections.id, connectionId)));
  if (!connection) throw new Error("External source connection not found in the selected venture.");
  if (connection.status !== "draft" && connection.status !== "validated") throw new Error("Only a draft or validated source connection may be validated.");
  const page = await fetchGitHubEvidencePage({ token: process.env.GITHUB_EVIDENCE_TOKEN, owner: connection.repositoryOwner, repository: connection.repositoryName, resourceType: "repository", perPage: 1 });
  const rawPayload = page.objects[0]?.payload;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) throw new Error("GitHub repository validation did not return a supported evidence payload.");
  const normalized = normalizeGitHubPayload("repository", rawPayload as Record<string, unknown>);
  await db.update(eosExternalSourceConnections).set({ status: "validated", validationSnapshot: { sourceIdentity: normalized, providerApiVersion: GITHUB_API_VERSION, rateLimit: page.rateLimit, validatedAt: new Date().toISOString(), credentialReference: connection.credentialReference }, validatedByUserId, validatedAt: new Date() }).where(eq(eosExternalSourceConnections.id, connection.id));
  const [updated] = await db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, connection.id)); return updated;
}

export async function authorizeGitHubSourceConnection(ventureId: number, connectionId: number, authorizedByUserId: number) {
  const db = await ensureDb(); const [connection] = await db.select().from(eosExternalSourceConnections).where(and(eq(eosExternalSourceConnections.ventureId, ventureId), eq(eosExternalSourceConnections.id, connectionId)));
  if (!connection) throw new Error("External source connection not found in the selected venture.");
  if (connection.createdByUserId === authorizedByUserId) throw new Error("An external source connection requires a different human authorizer.");
  if (connection.status !== "validated") throw new Error("A source connection must have current validation evidence before authorization.");
  await db.update(eosExternalSourceConnections).set({ status: "authorized", authorizedByUserId, authorizedAt: new Date() }).where(eq(eosExternalSourceConnections.id, connection.id));
  const [updated] = await db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, connection.id)); return updated;
}

export async function activateGitHubSourceConnection(ventureId: number, connectionId: number, activatedByUserId: number) {
  const db = await ensureDb(); const [connection] = await db.select().from(eosExternalSourceConnections).where(and(eq(eosExternalSourceConnections.ventureId, ventureId), eq(eosExternalSourceConnections.id, connectionId)));
  if (!connection) throw new Error("External source connection not found in the selected venture.");
  if (connection.status !== "authorized") throw new Error("Only a separately authorized source connection may be activated.");
  await db.update(eosExternalSourceConnections).set({ status: "active", activatedByUserId, activatedAt: new Date() }).where(eq(eosExternalSourceConnections.id, connection.id));
  const [updated] = await db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, connection.id)); return updated;
}

export async function revokeGitHubSourceConnection(ventureId: number, connectionId: number, revokedByUserId: number) {
  const db = await ensureDb(); const [connection] = await db.select().from(eosExternalSourceConnections).where(and(eq(eosExternalSourceConnections.ventureId, ventureId), eq(eosExternalSourceConnections.id, connectionId)));
  if (!connection) throw new Error("External source connection not found in the selected venture.");
  if (connection.status === "revoked") throw new Error("This source connection is already revoked.");
  await db.update(eosExternalSourceConnections).set({ status: "revoked", revokedByUserId, revokedAt: new Date() }).where(eq(eosExternalSourceConnections.id, connection.id));
  const [updated] = await db.select().from(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, connection.id)); return updated;
}

export async function acquireGitHubEvidence(input: { ventureId: number; connectionId: number; runKey: string; resources: GitHubResourceType[]; perResourceLimit: number; requestedByUserId: number }) {
  const db = await ensureDb(); const now = new Date();
  const [connection] = await db.select().from(eosExternalSourceConnections).where(and(eq(eosExternalSourceConnections.ventureId, input.ventureId), eq(eosExternalSourceConnections.id, input.connectionId)));
  if (!connection) throw new Error("External source connection not found in the selected venture.");
  const allowedScopes = asResourceTypes(connection.resourceScopes);
  if (connection.status !== "active") throw new Error("Only an active, separately authorized external source connection may acquire evidence.");
  if (input.resources.length === 0 || input.resources.length > allowedScopes.length || input.resources.some(resource => !allowedScopes.includes(resource))) throw new Error("Requested resources are outside the connection's authorized scope.");
  if (!Number.isInteger(input.perResourceLimit) || input.perResourceLimit < 1 || input.perResourceLimit > 25) throw new Error("Per-resource acquisition limit must be between 1 and 25.");
  const [created] = await db.insert(eosExternalAcquisitionRuns).values({ ventureId: input.ventureId, connectionId: input.connectionId, runKey: input.runKey, status: "requested", requestedResources: input.resources, requestBoundary: { manual: true, perResourceLimit: input.perResourceLimit, maxPagesPerResource: 1, noWebhook: true, noScheduler: true }, providerApiVersion: GITHUB_API_VERSION, rateLimitSnapshot: {}, cursorSnapshot: {}, resultSnapshot: {}, requestedByUserId: input.requestedByUserId, requestedAt: now });
  const runId = Number(created.insertId);
  const rateLimitSnapshot: Record<string, unknown> = {}; const cursorSnapshot: Record<string, unknown> = {}; const counts: Record<string, number> = { retained: 0, duplicate: 0, refused: 0 };
  try {
    for (const resourceType of input.resources) {
      const page = await fetchGitHubEvidencePage({ token: process.env.GITHUB_EVIDENCE_TOKEN, owner: connection.repositoryOwner, repository: connection.repositoryName, resourceType, perPage: input.perResourceLimit });
      rateLimitSnapshot[resourceType] = page.rateLimit; cursorSnapshot[resourceType] = { next: page.nextCursor, fetchedObjects: page.objects.length };
      for (const rawWrapper of page.objects) {
        const rawPayload = rawWrapper.payload as Record<string, unknown>;
        const normalized = normalizeGitHubPayload(resourceType, rawPayload);
        if (!normalized.providerObjectId || !normalized.sourceUrl) { counts.refused += 1; continue; }
        const sourceVersionHash = sha256(rawWrapper); const evidenceKey = `github:${connection.id}:${resourceType}:${normalized.providerObjectId}:${sourceVersionHash.slice(0, 24)}`;
        const [existing] = await db.select({ id: eosExternalEvidenceRecords.id }).from(eosExternalEvidenceRecords).where(and(eq(eosExternalEvidenceRecords.ventureId, input.ventureId), eq(eosExternalEvidenceRecords.connectionId, connection.id), eq(eosExternalEvidenceRecords.resourceType, resourceType), eq(eosExternalEvidenceRecords.providerObjectId, normalized.providerObjectId), eq(eosExternalEvidenceRecords.sourceVersionHash, sourceVersionHash)));
        if (existing) { counts.duplicate += 1; continue; }
        await db.insert(eosExternalEvidenceRecords).values({ ventureId: input.ventureId, connectionId: connection.id, acquisitionRunId: runId, evidenceKey, resourceType, providerObjectId: normalized.providerObjectId, providerUrl: normalized.sourceUrl, sourceUpdatedAt: safeDate(normalized.sourceUpdatedAt), receivedAt: new Date(), providerApiVersion: GITHUB_API_VERSION, rawPayload: rawWrapper, rawPayloadHash: sha256(rawWrapper), sourceVersionHash, normalizedSnapshot: normalized, normalizerVersion: GITHUB_EVIDENCE_NORMALIZER_VERSION, validationPosture: "requires_review" }); counts.retained += 1;
      }
    }
    const hasNextCursor = Object.values(cursorSnapshot).some(value => Boolean((value as { next?: string | null }).next));
    await db.update(eosExternalAcquisitionRuns).set({ status: hasNextCursor ? "partial" : "completed", rateLimitSnapshot, cursorSnapshot, resultSnapshot: { counts, noAutomaticErpTruth: true, rawEvidenceBeforeProjection: true }, finishedAt: new Date() }).where(eq(eosExternalAcquisitionRuns.id, runId));
  } catch (error) {
    const typed = error as { code?: string; message?: string; rateLimit?: unknown; retryNotBefore?: Date | null };
    await db.update(eosExternalAcquisitionRuns).set({ status: "failed", rateLimitSnapshot: typed.rateLimit ?? rateLimitSnapshot, cursorSnapshot, resultSnapshot: { counts, noAutomaticErpTruth: true }, failureCode: typed.code ?? "provider_request_failed", failureDetail: (typed.message ?? "GitHub evidence acquisition failed.").slice(0, 255), retryNotBefore: typed.retryNotBefore ?? null, finishedAt: new Date() }).where(eq(eosExternalAcquisitionRuns.id, runId));
  }
  const [run] = await db.select().from(eosExternalAcquisitionRuns).where(eq(eosExternalAcquisitionRuns.id, runId)); return run;
}

export async function reviewExternalEvidence(ventureId: number, evidenceRecordId: number, decision: "reviewed" | "rejected", rationale: string, reviewedByUserId: number) {
  const db = await ensureDb(); const [record] = await db.select().from(eosExternalEvidenceRecords).where(and(eq(eosExternalEvidenceRecords.ventureId, ventureId), eq(eosExternalEvidenceRecords.id, evidenceRecordId)));
  if (!record) throw new Error("External evidence record not found in the selected venture.");
  const [run] = await db.select().from(eosExternalAcquisitionRuns).where(and(eq(eosExternalAcquisitionRuns.ventureId, ventureId), eq(eosExternalAcquisitionRuns.id, record.acquisitionRunId)));
  if (!run) throw new Error("External evidence acquisition run not found in the selected venture.");
  if (run.requestedByUserId === reviewedByUserId) throw new Error("External evidence requires a different human reviewer.");
  const [priorReview] = await db.select({ id: eosExternalEvidenceReviews.id }).from(eosExternalEvidenceReviews).where(eq(eosExternalEvidenceReviews.evidenceRecordId, record.id));
  if (priorReview) throw new Error("External evidence already has a retained review decision.");
  const reviewedAt = new Date(); await db.insert(eosExternalEvidenceReviews).values({ ventureId, evidenceRecordId: record.id, decision, rationale, reviewedByUserId, reviewedAt });
  await db.update(eosExternalEvidenceRecords).set({ validationPosture: decision }).where(eq(eosExternalEvidenceRecords.id, record.id));
  const [review] = await db.select().from(eosExternalEvidenceReviews).where(and(eq(eosExternalEvidenceReviews.evidenceRecordId, record.id), eq(eosExternalEvidenceReviews.decision, decision))); return review;
}

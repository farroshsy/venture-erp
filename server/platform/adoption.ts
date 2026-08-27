import { and, desc, eq } from "drizzle-orm";
import { eosAdoptionObservations, eosAdoptionStudies } from "../../drizzle/schema";
import { getDb } from "../db";

export const ADOPTION_PROTOCOL_VERSION = "0.1-human-recorded";

export const adoptionJourneys = [
  { key: "procurement_evidence", title: "Procurement → receipt → evidence", roleLenses: ["operator", "finance_lead"], route: "/procurement", task: "Follow an approved procurement request or purchase order to retained receipt and accounting-proposal evidence without creating, posting, or transmitting anything.", boundary: "No supplier communication, payment, valuation, journal posting, tax, or external action." },
  { key: "sales_fulfillment_evidence", title: "Sales → reservation → fulfillment evidence", roleLenses: ["operator"], route: "/sales", task: "Locate an approved sales order and explain its retained reservation, fulfillment, and audit evidence.", boundary: "No shipping, billing, revenue, COGS, payment, or external action." },
  { key: "payable_match", title: "Payables → three-way match", roleLenses: ["finance_lead", "approver"], route: "/cash", task: "Inspect a payable invoice, its three-way-match posture, any mismatch reason, and the internal approval boundary.", boundary: "No payment execution, supplier messaging, tax, filing, or external action." },
  { key: "work_lifecycle", title: "Work lifecycle", roleLenses: ["operator"], route: "/work", task: "Find an authorized project, task, service, or asset record and explain its current controlled lifecycle state.", boundary: "Use only existing role- and state-guarded actions; no external execution." },
  { key: "decision_lineage", title: "Decision Intelligence → evidence → decision", roleLenses: ["executive", "auditor"], route: "/intelligence", task: "Trace a metric or priority signal through its retained lineage, graph context, and decision evidence without claiming causality.", boundary: "No forecast, recommendation, decision execution, financial action, or external effect." },
  { key: "audit_traceability", title: "Audit traceability", roleLenses: ["auditor"], route: "/knowledge-graph", task: "Trace one retained operational outcome back to explicit source and audit evidence, leaving any missing relationship visible.", boundary: "No source rewrite, inferred link, causal conclusion, or external effect." },
  { key: "payroll_blocker_comprehension", title: "Payroll blocker comprehension", roleLenses: ["operator", "finance_lead", "approver", "auditor", "executive", "administrator"], route: "/people", task: "Identify why Indonesian payroll is unavailable and the qualified written evidence required before the block may change.", boundary: "Explanation only: no payroll calculation, rehearsal, activation, production use, tax action, filing, payment, or external effect." },
] as const;

export const roleLenses = [
  { key: "operator", title: "Operator", startRoute: "/operations", focus: "Authorized internal records, lifecycle evidence, and controlled refusal reasons." },
  { key: "finance_lead", title: "Finance lead", startRoute: "/cash", focus: "Finance-owned evidence, match/rule review, and internal approval boundaries." },
  { key: "approver", title: "Approver", startRoute: "/automation", focus: "Human review tasks, decisions, refusals, and separated approvals." },
  { key: "auditor", title: "Auditor", startRoute: "/knowledge-graph", focus: "Retained source-to-outcome traceability, verification, and explicit gaps." },
  { key: "executive", title: "Executive", startRoute: "/intelligence", focus: "Evidence posture, strategy linkage, decision replay, and unmodeled questions." },
  { key: "administrator", title: "Administrator", startRoute: "/access", focus: "Scoped access, operational posture, and safe escalation without user monitoring." },
] as const;

export const recoveryGuides = [
  { key: "evidence_missing", trigger: "Evidence is missing", explain: "A source, relationship, or policy prerequisite is absent. Missing evidence is not treated as a successful result.", next: "Open the named source/register, retain only authorized evidence, or record the gap for owner review.", boundary: "Do not invent, infer, or backfill evidence from an assumption." },
  { key: "permission_refused", trigger: "Permission is refused", explain: "The active venture role or scoped assignment does not authorize the requested action.", next: "Confirm the active venture and role. Use the existing Access Administration review path if a legitimate access change is required.", boundary: "Do not share sessions, impersonate another user, or bypass the role guard." },
  { key: "workflow_rejected", trigger: "Workflow is rejected", explain: "A human reviewer or current state rejected the task; the retained audit trail preserves that state.", next: "Read the rejection rationale and return to the earliest stated prerequisite only when a human authorizes the next action.", boundary: "Do not auto-retry or treat rejection as a system fault." },
  { key: "record_stale", trigger: "Record is stale or ineligible", explain: "The lifecycle, accounting period, approval state, or retained evidence no longer permits the action.", next: "Inspect the visible status and evidence history; use the approved amendment/review route where it exists.", boundary: "Do not override period, approval, or lifecycle guards." },
  { key: "currency_mismatch", trigger: "Currencies do not match", explain: "Amounts cannot be aggregated or converted without the retained approved currency/rate evidence required by the control.", next: "Inspect the retained transaction, functional, and reporting currency evidence or record the gap for finance review.", boundary: "Do not estimate a rate or use an unapproved conversion." },
  { key: "payroll_blocked", trigger: "Payroll prerequisite is unavailable", explain: "The Indonesian payroll pack is draft-only, inactive, unreviewed, unselected, and blocked because qualified written reviewer authorization has not been retained.", next: "Read the payroll evidence-pack status and obtain an effective-dated qualified Indonesian payroll/tax review covering sources, worker scope, cadence, limitations, and intended use.", boundary: "No calculation, rehearsal, activation, production use, tax action, payment, filing, or external transmission is available." },
] as const;

const ensureDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
};

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : null;
}

export async function getAdoptionOverview(ventureId: number) {
  const db = await ensureDb();
  const [studies, observations] = await Promise.all([
    db.select().from(eosAdoptionStudies).where(eq(eosAdoptionStudies.ventureId, ventureId)).orderBy(desc(eosAdoptionStudies.createdAt)),
    db.select().from(eosAdoptionObservations).where(eq(eosAdoptionObservations.ventureId, ventureId)).orderBy(desc(eosAdoptionObservations.occurredAt)),
  ]);
  const verified = observations.filter(observation => observation.status === "verified");
  const verifiedIndependent = verified.filter(observation => observation.participantIndependence === "declared_independent");
  const unassisted = verifiedIndependent.filter(observation => observation.outcome === "completed_unassisted");
  const completed = verifiedIndependent.filter(observation => observation.outcome === "completed_unassisted" || observation.outcome === "completed_with_assistance");
  const uniqueJourneyCount = new Set(verifiedIndependent.map(observation => observation.journeyKey)).size;
  const studySummaries = studies.map(study => ({
    ...study,
    observations: observations.filter(observation => observation.studyId === study.id),
    verifiedObservationCount: observations.filter(observation => observation.studyId === study.id && observation.status === "verified").length,
  }));
  return {
    model: { name: "Gate 2 Adoption and Operator Validation", version: ADOPTION_PROTOCOL_VERSION, ventureId, evaluatedAt: new Date().toISOString() },
    roleLenses,
    journeys: adoptionJourneys,
    recoveryGuides,
    studies: studySummaries,
    observations,
    summary: {
      studyCount: studies.length,
      approvedStudyCount: studies.filter(study => study.status === "approved").length,
      observationCount: observations.length,
      verifiedObservationCount: verified.length,
      verifiedIndependentObservationCount: verifiedIndependent.length,
      verifiedIndependentParticipantCount: new Set(verifiedIndependent.map(observation => observation.participantReference)).size,
      verifiedJourneyCoverageCount: uniqueJourneyCount,
      verifiedUnassistedCompletionCount: unassisted.length,
      verifiedCompletionCount: completed.length,
      verifiedUnassistedCompletionRate: percent(unassisted.length, verifiedIndependent.length),
      verifiedCompletionRate: percent(completed.length, verifiedIndependent.length),
      observedAssistanceCount: verifiedIndependent.reduce((sum, observation) => sum + observation.assistanceCount, 0),
      observedErrorCount: verifiedIndependent.reduce((sum, observation) => sum + observation.errorCount, 0),
      observedRetryCount: verifiedIndependent.reduce((sum, observation) => sum + observation.retryCount, 0),
      observedHelpUsageCount: verifiedIndependent.filter(observation => observation.helpUsed === 1).length,
      observedEvidenceGapCount: verifiedIndependent.filter(observation => observation.evidenceGapEncountered === 1).length,
    },
    measurementInterpretation: "Counts and rates appear only for retained, verified observations with declared independent-participant posture. They describe the stated sample and task protocol, not general adoption, satisfaction, business value, quality, compliance, productivity, causality, or production readiness.",
    boundary: { humanRecordedOnly: true as const, automaticBehaviorTracking: false as const, externalTelemetry: false as const, identityProfiling: false as const, noFinancialEffect: true as const, noPayrollEffect: true as const, noExternalEffect: true as const },
  };
}

export async function createAdoptionStudy(input: { ventureId: number; studyKey: string; title: string; purpose: string; journeyKeys: Array<(typeof adoptionJourneys)[number]["key"]>; consentNotice: string; independencePolicy: string; limitations: string; createdByUserId: number }) {
  const db = await ensureDb();
  const [created] = await db.insert(eosAdoptionStudies).values({ ...input, protocolVersion: ADOPTION_PROTOCOL_VERSION, status: "draft" });
  const [study] = await db.select().from(eosAdoptionStudies).where(eq(eosAdoptionStudies.id, Number(created.insertId)));
  return study;
}

export async function reviewAdoptionStudy(ventureId: number, studyId: number, reviewedByUserId: number, status: "approved" | "cancelled") {
  const db = await ensureDb();
  const [study] = await db.select().from(eosAdoptionStudies).where(and(eq(eosAdoptionStudies.ventureId, ventureId), eq(eosAdoptionStudies.id, studyId)));
  if (!study) throw new Error("Adoption study not found in the selected venture.");
  if (study.createdByUserId === reviewedByUserId) throw new Error("An adoption study requires a different human reviewer.");
  if (study.status !== "draft" && study.status !== "review") throw new Error("Only a draft or review adoption study may be approved or cancelled.");
  await db.update(eosAdoptionStudies).set({ status, reviewedByUserId, reviewedAt: new Date() }).where(eq(eosAdoptionStudies.id, studyId));
  const [updated] = await db.select().from(eosAdoptionStudies).where(eq(eosAdoptionStudies.id, studyId));
  return updated;
}

export async function createAdoptionObservation(input: { ventureId: number; studyId: number; observationKey: string; participantReference: string; participantIndependence: "declared_independent" | "not_independent" | "not_recorded"; roleLens: (typeof roleLenses)[number]["key"] | "other"; journeyKey: (typeof adoptionJourneys)[number]["key"]; outcome: "completed_unassisted" | "completed_with_assistance" | "partial" | "not_completed" | "not_started"; taskStartedAt?: Date; taskEndedAt?: Date; assistanceCount: number; errorCount: number; retryCount: number; helpUsed: boolean; evidenceGapEncountered: boolean; refusalOrRecovery?: string; participantFeedback?: string; facilitatorNotes?: string; evidenceReference?: string; limitations: string; consentConfirmed: boolean; occurredAt: Date; createdByUserId: number }) {
  const db = await ensureDb();
  const [study] = await db.select().from(eosAdoptionStudies).where(and(eq(eosAdoptionStudies.ventureId, input.ventureId), eq(eosAdoptionStudies.id, input.studyId)));
  if (!study) throw new Error("Adoption study not found in the selected venture.");
  if (study.status !== "approved") throw new Error("A human-recorded adoption observation requires a separately approved study protocol.");
  if (!input.consentConfirmed) throw new Error("Consent confirmation is required before recording an adoption observation.");
  if ((input.taskStartedAt && !input.taskEndedAt) || (!input.taskStartedAt && input.taskEndedAt)) throw new Error("Record both task timestamps or leave both empty.");
  if (input.taskStartedAt && input.taskEndedAt && input.taskEndedAt.getTime() < input.taskStartedAt.getTime()) throw new Error("The task end time cannot precede the task start time.");
  const durationSeconds = input.taskStartedAt && input.taskEndedAt ? Math.round((input.taskEndedAt.getTime() - input.taskStartedAt.getTime()) / 1000) : null;
  const [created] = await db.insert(eosAdoptionObservations).values({ ...input, durationSeconds, helpUsed: input.helpUsed ? 1 : 0, evidenceGapEncountered: input.evidenceGapEncountered ? 1 : 0, consentConfirmed: 1 });
  const [observation] = await db.select().from(eosAdoptionObservations).where(eq(eosAdoptionObservations.id, Number(created.insertId)));
  return observation;
}

export async function verifyAdoptionObservation(ventureId: number, observationId: number, verifiedByUserId: number, status: "verified" | "rejected") {
  const db = await ensureDb();
  const [observation] = await db.select().from(eosAdoptionObservations).where(and(eq(eosAdoptionObservations.ventureId, ventureId), eq(eosAdoptionObservations.id, observationId)));
  if (!observation) throw new Error("Adoption observation not found in the selected venture.");
  if (observation.createdByUserId === verifiedByUserId) throw new Error("An adoption observation requires a different human verifier.");
  if (observation.status !== "recorded") throw new Error("Only a recorded adoption observation may be verified or rejected.");
  await db.update(eosAdoptionObservations).set({ status, verifiedByUserId, verifiedAt: new Date() }).where(eq(eosAdoptionObservations.id, observationId));
  const [updated] = await db.select().from(eosAdoptionObservations).where(eq(eosAdoptionObservations.id, observationId));
  return updated;
}

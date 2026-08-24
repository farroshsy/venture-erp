import { and, desc, eq, sql } from "drizzle-orm";
import {
  erpAuditEvents,
  erpBudgetNodes,
  erpCurrencyProfiles,
  erpExchangeRates,
  erpIntegrationConnections,
  erpIntegrationJobs,
  erpJurisdictionPacks,
  erpOperationalRecords,
  erpPayrollCalendars,
  erpPayrollRuns,
  erpVentureJurisdictionSelections,
  erpWorkflowDefinitions,
  erpWorkflowInstances,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { calculatePayrollProposal, normalizeMoney, type PayrollComponentInput } from "./policy";
import { startWorkflow } from "./service";

export const ASIA_CURRENCY_REFERENCE = [
  { code: "IDR", name: "Indonesian rupiah", symbol: "Rp", decimalPlaces: 2 },
  { code: "SGD", name: "Singapore dollar", symbol: "S$", decimalPlaces: 2 },
  { code: "MYR", name: "Malaysian ringgit", symbol: "RM", decimalPlaces: 2 },
  { code: "JPY", name: "Japanese yen", symbol: "¥", decimalPlaces: 0 },
  { code: "KRW", name: "South Korean won", symbol: "₩", decimalPlaces: 0 },
  { code: "CNY", name: "Chinese yuan", symbol: "¥", decimalPlaces: 2 },
  { code: "TWD", name: "New Taiwan dollar", symbol: "NT$", decimalPlaces: 0 },
  { code: "HKD", name: "Hong Kong dollar", symbol: "HK$", decimalPlaces: 2 },
] as const;

async function ensureAsiaCurrencyProfiles() {
  const db = await requireDb();
  await db.insert(erpCurrencyProfiles).values(ASIA_CURRENCY_REFERENCE.map(currency => ({ ...currency, status: "active" as const }))).onDuplicateKeyUpdate({
    set: { code: sql`${erpCurrencyProfiles.code}` },
  });
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
}

async function audit(input: { ventureId: number; domain: string; eventType: string; actorUserId: number; payload: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(erpAuditEvents).values(input);
}

export async function listCurrencyProfiles() {
  await ensureAsiaCurrencyProfiles();
  const db = await requireDb();
  return db.select().from(erpCurrencyProfiles).orderBy(erpCurrencyProfiles.code);
}

export async function createCurrencyProfile(input: { code: string; name: string; symbol?: string; decimalPlaces: number }) {
  const db = await requireDb();
  const result = await db.insert(erpCurrencyProfiles).values({ ...input, code: input.code.toUpperCase(), status: "active" });
  return { id: Number(result[0].insertId), ...input, code: input.code.toUpperCase(), status: "active" as const };
}

export async function createJurisdictionPack(input: { countryCode: string; version: string; name: string; effectiveFrom: string; effectiveTo?: string; sourceLinks: string[]; configuration: Record<string, unknown>; testEvidence: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(erpJurisdictionPacks).values({ ...input, countryCode: input.countryCode.toUpperCase(), status: "draft" });
  return { id: Number(result[0].insertId), ...input, countryCode: input.countryCode.toUpperCase(), status: "draft" as const };
}

export async function reviewJurisdictionPack(input: { packId: number; reviewerUserId: number; approve: boolean }) {
  const db = await requireDb();
  const packs = await db.select().from(erpJurisdictionPacks).where(eq(erpJurisdictionPacks.id, input.packId)).limit(1);
  const pack = packs[0];
  if (!pack) throw new Error("Jurisdiction pack not found.");
  if (!Array.isArray(pack.sourceLinks) || pack.sourceLinks.length === 0) throw new Error("A jurisdiction pack needs source links before review.");
  const status = input.approve ? "approved" : "reviewed" as const;
  await db.update(erpJurisdictionPacks).set({ status, reviewedByUserId: input.reviewerUserId, reviewedAt: new Date() }).where(eq(erpJurisdictionPacks.id, input.packId));
  return { packId: input.packId, status };
}

export async function listJurisdictionPacks() {
  const db = await requireDb();
  return db.select().from(erpJurisdictionPacks).orderBy(desc(erpJurisdictionPacks.updatedAt));
}

export async function selectJurisdictionPack(input: { ventureId: number; jurisdictionPackId: number; purpose: "tax" | "payroll" | "public_budget" | "statutory_reporting"; selectedByUserId: number }) {
  const db = await requireDb();
  const packs = await db.select().from(erpJurisdictionPacks).where(and(eq(erpJurisdictionPacks.id, input.jurisdictionPackId), eq(erpJurisdictionPacks.status, "approved"))).limit(1);
  if (!packs[0]) throw new Error("Only an approved jurisdiction pack may be selected by a venture.");
  const result = await db.insert(erpVentureJurisdictionSelections).values({ ...input, status: "active" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "compliance", eventType: "jurisdiction_pack.selected", actorUserId: input.selectedByUserId, payload: { id, jurisdictionPackId: input.jurisdictionPackId, purpose: input.purpose } });
  return { id, ...input, status: "active" as const };
}

async function requireActiveVenturePackSelection(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, jurisdictionPackId: number, purpose: "payroll" | "public_budget") {
  const packs = await db.select().from(erpJurisdictionPacks).where(and(eq(erpJurisdictionPacks.id, jurisdictionPackId), eq(erpJurisdictionPacks.status, "approved"))).limit(1);
  if (!packs[0]) throw new Error("Only an approved jurisdiction pack may be used for this workflow.");
  const selections = await db.select().from(erpVentureJurisdictionSelections).where(and(eq(erpVentureJurisdictionSelections.ventureId, ventureId), eq(erpVentureJurisdictionSelections.jurisdictionPackId, jurisdictionPackId), eq(erpVentureJurisdictionSelections.purpose, purpose), eq(erpVentureJurisdictionSelections.status, "active"))).limit(1);
  if (!selections[0] || selections[0].ventureId !== ventureId) throw new Error(`An active ${purpose.replace("_", " ")} jurisdiction-pack selection is required in the active venture.`);
  return packs[0];
}

export async function listVentureJurisdictionSelections(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpVentureJurisdictionSelections).where(eq(erpVentureJurisdictionSelections.ventureId, ventureId)).orderBy(desc(erpVentureJurisdictionSelections.selectedAt));
}

export async function createExchangeRate(input: { ventureId: number; sourceCurrency: string; targetCurrency: string; rate: number; rateDate: string; sourceReference: string; createdByUserId: number }) {
  if (input.sourceCurrency.toUpperCase() === input.targetCurrency.toUpperCase()) throw new Error("Exchange-rate currencies must differ.");
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error("Exchange rate must be greater than zero.");
  const db = await requireDb();
  const result = await db.insert(erpExchangeRates).values({ ...input, sourceCurrency: input.sourceCurrency.toUpperCase(), targetCurrency: input.targetCurrency.toUpperCase(), rate: String(input.rate), status: "draft" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "finance", eventType: "exchange_rate.created", actorUserId: input.createdByUserId, payload: { id, sourceCurrency: input.sourceCurrency.toUpperCase(), targetCurrency: input.targetCurrency.toUpperCase(), rateDate: input.rateDate } });
  return { id, ...input, status: "draft" as const };
}

export async function approveExchangeRate(input: { ventureId: number; exchangeRateId: number; approvedByUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpExchangeRates).where(and(eq(erpExchangeRates.id, input.exchangeRateId), eq(erpExchangeRates.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Exchange rate not found in the active venture.");
  await db.update(erpExchangeRates).set({ status: "approved", approvedByUserId: input.approvedByUserId, approvedAt: new Date() }).where(eq(erpExchangeRates.id, input.exchangeRateId));
  await audit({ ventureId: input.ventureId, domain: "finance", eventType: "exchange_rate.approved", actorUserId: input.approvedByUserId, payload: { exchangeRateId: input.exchangeRateId } });
  return { exchangeRateId: input.exchangeRateId, status: "approved" as const };
}

export async function listExchangeRates(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpExchangeRates).where(eq(erpExchangeRates.ventureId, ventureId)).orderBy(desc(erpExchangeRates.rateDate));
}

export async function createBudgetNode(input: { ventureId: number; parentBudgetNodeId?: number; jurisdictionPackId?: number; level: "national" | "state_provincial" | "municipal_local" | "agency" | "fund" | "program" | "project" | "cost_center"; code: string; name: string; currency: string; appropriatedAmount: number; attributes: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  if (input.jurisdictionPackId) await requireActiveVenturePackSelection(db, input.ventureId, input.jurisdictionPackId, "public_budget");
  if (input.parentBudgetNodeId) {
    const parents = await db.select().from(erpBudgetNodes).where(and(eq(erpBudgetNodes.id, input.parentBudgetNodeId), eq(erpBudgetNodes.ventureId, input.ventureId))).limit(1);
    if (!parents[0]) throw new Error("Parent budget node does not belong to the active venture.");
  }
  const result = await db.insert(erpBudgetNodes).values({ ...input, currency: input.currency.toUpperCase(), appropriatedAmount: String(normalizeMoney(input.appropriatedAmount)), status: "draft" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "public_budget", eventType: "budget_node.created", actorUserId: input.createdByUserId, payload: { id, code: input.code, level: input.level } });
  return { id, ...input, status: "draft" as const };
}

export async function activateBudgetNode(input: { ventureId: number; budgetNodeId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpBudgetNodes).where(and(eq(erpBudgetNodes.id, input.budgetNodeId), eq(erpBudgetNodes.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Budget node not found in the active venture.");
  await db.update(erpBudgetNodes).set({ status: "active" }).where(eq(erpBudgetNodes.id, input.budgetNodeId));
  await audit({ ventureId: input.ventureId, domain: "public_budget", eventType: "budget_node.activated", actorUserId: input.actorUserId, payload: { budgetNodeId: input.budgetNodeId } });
  return { budgetNodeId: input.budgetNodeId, status: "active" as const };
}

export async function listBudgetNodes(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpBudgetNodes).where(eq(erpBudgetNodes.ventureId, ventureId)).orderBy(erpBudgetNodes.code);
}

export async function createPayrollCalendar(input: { ventureId: number; jurisdictionPackId?: number; code: string; name: string; cadence: "weekly" | "biweekly" | "semimonthly" | "monthly" | "ad_hoc" | "off_cycle"; workerCategory: "employee" | "director" | "contractor" | "temporary" | "apprentice" | "expatriate" | "public_servant"; currency: string; createdByUserId: number }) {
  const db = await requireDb();
  if (input.jurisdictionPackId) await requireActiveVenturePackSelection(db, input.ventureId, input.jurisdictionPackId, "payroll");
  const result = await db.insert(erpPayrollCalendars).values({ ...input, currency: input.currency.toUpperCase(), status: "draft" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "payroll", eventType: "payroll_calendar.created", actorUserId: input.createdByUserId, payload: { id, code: input.code, cadence: input.cadence, workerCategory: input.workerCategory } });
  return { id, ...input, status: "draft" as const };
}

export async function activatePayrollCalendar(input: { ventureId: number; payrollCalendarId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpPayrollCalendars).where(and(eq(erpPayrollCalendars.id, input.payrollCalendarId), eq(erpPayrollCalendars.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Payroll calendar not found in the active venture.");
  await db.update(erpPayrollCalendars).set({ status: "active" }).where(eq(erpPayrollCalendars.id, input.payrollCalendarId));
  await audit({ ventureId: input.ventureId, domain: "payroll", eventType: "payroll_calendar.activated", actorUserId: input.actorUserId, payload: { payrollCalendarId: input.payrollCalendarId } });
  return { payrollCalendarId: input.payrollCalendarId, status: "active" as const };
}

export async function listPayrollCalendars(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpPayrollCalendars).where(eq(erpPayrollCalendars.ventureId, ventureId)).orderBy(desc(erpPayrollCalendars.updatedAt));
}

export async function createPayrollRun(input: { ventureId: number; payrollCalendarId: number; periodStart: string; periodEnd: string; components: PayrollComponentInput[]; withholdingRateBasisPoints?: number; createdByUserId: number }) {
  const db = await requireDb();
  const calendars = await db.select().from(erpPayrollCalendars).where(and(eq(erpPayrollCalendars.id, input.payrollCalendarId), eq(erpPayrollCalendars.ventureId, input.ventureId), eq(erpPayrollCalendars.status, "active"))).limit(1);
  const calendar = calendars[0];
  if (!calendar) throw new Error("An active payroll calendar is required.");
  if (calendar.jurisdictionPackId) await requireActiveVenturePackSelection(db, input.ventureId, calendar.jurisdictionPackId, "payroll");
  if (input.periodStart > input.periodEnd) throw new Error("Payroll period start date must be on or before end date.");
  const proposal = calculatePayrollProposal({ components: input.components, withholdingRateBasisPoints: input.withholdingRateBasisPoints });
  const result = await db.insert(erpPayrollRuns).values({ ventureId: input.ventureId, payrollCalendarId: calendar.id, jurisdictionPackId: calendar.jurisdictionPackId, periodStart: input.periodStart, periodEnd: input.periodEnd, currency: calendar.currency, status: "calculated", componentInput: input.components, calculationEvidence: { ...proposal, withholdingRateBasisPoints: input.withholdingRateBasisPoints ?? 0, packId: calendar.jurisdictionPackId ?? null, proposalOnly: true }, createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "payroll", eventType: "payroll_run.calculated", actorUserId: input.createdByUserId, payload: { id, payrollCalendarId: calendar.id, periodStart: input.periodStart, periodEnd: input.periodEnd, netPay: proposal.netPay, proposalOnly: true } });
  return { id, status: "calculated" as const, currency: calendar.currency, proposal };
}

export async function submitPayrollRunForApproval(input: { ventureId: number; payrollRunId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpPayrollRuns).where(and(eq(erpPayrollRuns.id, input.payrollRunId), eq(erpPayrollRuns.ventureId, input.ventureId))).limit(1);
  const run = rows[0];
  if (!run) throw new Error("Payroll run not found in the active venture.");
  if (run.status !== "calculated") throw new Error("Only a calculated payroll run can be submitted for approval.");
  await db.update(erpPayrollRuns).set({ status: "pending_approval" }).where(eq(erpPayrollRuns.id, run.id));
  await audit({ ventureId: input.ventureId, domain: "payroll", eventType: "payroll_run.submitted_for_approval", actorUserId: input.actorUserId, payload: { payrollRunId: run.id, proposalOnly: true } });
  return { payrollRunId: run.id, status: "pending_approval" as const };
}

export async function approvePayrollRun(input: { ventureId: number; payrollRunId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpPayrollRuns).where(and(eq(erpPayrollRuns.id, input.payrollRunId), eq(erpPayrollRuns.ventureId, input.ventureId))).limit(1);
  const run = rows[0];
  if (!run) throw new Error("Payroll run not found in the active venture.");
  if (run.status !== "pending_approval") throw new Error("Only a payroll run awaiting approval can be approved.");
  if (run.createdByUserId === input.actorUserId) throw new Error("Payroll run approval requires a different authorized reviewer.");
  await db.update(erpPayrollRuns).set({ status: "approved", approvedByUserId: input.actorUserId, approvedAt: new Date() }).where(eq(erpPayrollRuns.id, run.id));
  await audit({ ventureId: input.ventureId, domain: "payroll", eventType: "payroll_run.approved", actorUserId: input.actorUserId, payload: { payrollRunId: run.id, proposalOnly: true, paymentExecuted: false } });
  return { payrollRunId: run.id, status: "approved" as const, paymentExecuted: false };
}

export async function listPayrollRuns(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpPayrollRuns).where(eq(erpPayrollRuns.ventureId, ventureId)).orderBy(desc(erpPayrollRuns.createdAt));
}

export async function createSandboxIntegration(input: { ventureId: number; adapterFamily: "banking" | "attendance" | "e_invoicing" | "pos" | "tax_filing" | "statutory_reporting" | "hris" | "procurement"; provider: string; endpointReference?: string; contractVersion: string; configuration: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(erpIntegrationConnections).values({ ...input, mode: "sandbox", status: "configured", healthStatus: "unknown" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, domain: "integration", eventType: "integration.sandbox_configured", actorUserId: input.createdByUserId, payload: { id, adapterFamily: input.adapterFamily, provider: input.provider } });
  return { id, ...input, mode: "sandbox" as const, status: "configured" as const, healthStatus: "unknown" as const };
}

export async function testSandboxIntegration(input: { ventureId: number; integrationConnectionId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpIntegrationConnections).where(and(eq(erpIntegrationConnections.id, input.integrationConnectionId), eq(erpIntegrationConnections.ventureId, input.ventureId), eq(erpIntegrationConnections.mode, "sandbox"))).limit(1);
  const connection = rows[0];
  if (!connection) throw new Error("Sandbox integration not found in the active venture.");
  await db.update(erpIntegrationConnections).set({ status: "sandbox_connected", healthStatus: "healthy", lastTestedAt: new Date() }).where(eq(erpIntegrationConnections.id, connection.id));
  await audit({ ventureId: input.ventureId, domain: "integration", eventType: "integration.sandbox_tested", actorUserId: input.actorUserId, payload: { integrationConnectionId: connection.id, adapterFamily: connection.adapterFamily, provider: connection.provider, simulated: true } });
  return { integrationConnectionId: connection.id, status: "sandbox_connected" as const, healthStatus: "healthy" as const, simulated: true };
}

export async function listIntegrationConnections(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpIntegrationConnections).where(eq(erpIntegrationConnections.ventureId, ventureId)).orderBy(desc(erpIntegrationConnections.updatedAt));
}

export async function queueSandboxIntegrationJob(input: { ventureId: number; integrationConnectionId: number; workflowDefinitionId?: number; operationalRecordId?: number; requestPayload: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const connections = await db.select().from(erpIntegrationConnections).where(and(eq(erpIntegrationConnections.id, input.integrationConnectionId), eq(erpIntegrationConnections.ventureId, input.ventureId), eq(erpIntegrationConnections.mode, "sandbox"))).limit(1);
  const connection = connections[0];
  if (!connection) throw new Error("Sandbox integration not found in the active venture.");
  if (connection.status !== "sandbox_connected" || connection.healthStatus !== "healthy") throw new Error("Sandbox integration must pass its health test before a job can be queued.");
  if (input.operationalRecordId) {
    const records = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.operationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
    if (!records[0]) throw new Error("Operational record not found in the active venture.");
  }
  if (input.workflowDefinitionId) {
    const definitions = await db.select().from(erpWorkflowDefinitions).where(and(eq(erpWorkflowDefinitions.id, input.workflowDefinitionId), eq(erpWorkflowDefinitions.ventureId, input.ventureId), eq(erpWorkflowDefinitions.status, "active"))).limit(1);
    if (!definitions[0]) throw new Error("An active workflow definition is required for the selected approval flow.");
  }
  const queuedStatus = input.workflowDefinitionId ? "awaiting_approval" as const : "queued" as const;
  const result = await db.insert(erpIntegrationJobs).values({ ventureId: input.ventureId, integrationConnectionId: connection.id, workflowDefinitionId: input.workflowDefinitionId, operationalRecordId: input.operationalRecordId, status: queuedStatus, requestPayload: input.requestPayload, responseEvidence: { mode: "sandbox", provider: connection.provider, contractVersion: connection.contractVersion, simulationOnly: true }, createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  let workflowInstanceId: number | undefined;
  if (input.workflowDefinitionId) {
    const instance = await startWorkflow({ ventureId: input.ventureId, workflowDefinitionId: input.workflowDefinitionId, operationalRecordId: input.operationalRecordId, startedByUserId: input.createdByUserId, context: { integrationJobId: id, integrationConnectionId: connection.id, adapterFamily: connection.adapterFamily, mode: "sandbox", requestPayload: input.requestPayload } });
    workflowInstanceId = instance.id;
    await db.update(erpIntegrationJobs).set({ workflowInstanceId }).where(eq(erpIntegrationJobs.id, id));
  }
  await audit({ ventureId: input.ventureId, domain: "integration", eventType: "integration.job_queued", actorUserId: input.createdByUserId, payload: { integrationJobId: id, integrationConnectionId: connection.id, workflowInstanceId: workflowInstanceId ?? null, simulated: true } });
  return { id, status: queuedStatus, workflowInstanceId, simulated: true };
}

export async function simulateSandboxIntegrationJob(input: { ventureId: number; integrationJobId: number; actorUserId: number }) {
  const db = await requireDb();
  const jobs = await db.select().from(erpIntegrationJobs).where(and(eq(erpIntegrationJobs.id, input.integrationJobId), eq(erpIntegrationJobs.ventureId, input.ventureId))).limit(1);
  const job = jobs[0];
  if (!job) throw new Error("Sandbox integration job not found in the active venture.");
  if (job.status === "simulated" || job.status === "completed") throw new Error("Sandbox integration job has already been simulated.");
  if (job.status === "awaiting_approval") {
    if (!job.workflowInstanceId) throw new Error("Approval workflow was not created for the sandbox integration job.");
    const instances = await db.select().from(erpWorkflowInstances).where(and(eq(erpWorkflowInstances.id, job.workflowInstanceId), eq(erpWorkflowInstances.ventureId, input.ventureId))).limit(1);
    if (!instances[0] || instances[0].status !== "completed") throw new Error("Complete the linked approval workflow before simulating this integration job.");
  }
  const responseEvidence = { ...(job.responseEvidence as Record<string, unknown>), simulatedAt: new Date().toISOString(), simulationOutcome: "accepted", externalTransmission: false, actorUserId: input.actorUserId };
  await db.update(erpIntegrationJobs).set({ status: "simulated", responseEvidence, completedAt: new Date() }).where(eq(erpIntegrationJobs.id, job.id));
  await audit({ ventureId: input.ventureId, domain: "integration", eventType: "integration.job_simulated", actorUserId: input.actorUserId, payload: { integrationJobId: job.id, integrationConnectionId: job.integrationConnectionId, externalTransmission: false } });
  return { integrationJobId: job.id, status: "simulated" as const, responseEvidence };
}

export async function listIntegrationJobs(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpIntegrationJobs).where(eq(erpIntegrationJobs.ventureId, ventureId)).orderBy(desc(erpIntegrationJobs.createdAt));
}

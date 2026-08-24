import { and, desc, eq } from "drizzle-orm";
import { erpAuditEvents, erpCompensationComponents, erpEmployeeProfiles, erpMasterRecords } from "../../drizzle/schema";
import { getDb } from "../db";

export type EmploymentType = "employee" | "director" | "contractor" | "temporary" | "apprentice" | "expatriate" | "public_servant";
export type EmployeeProfileStatus = "draft" | "active" | "on_leave" | "terminated";
export type CompensationKind = "earning" | "deduction";
export type CompensationCalculationMethod = "flat_amount" | "percentage" | "manual";
export type CompensationStatus = "draft" | "active" | "retired";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
}

async function audit(input: { ventureId: number; eventType: string; actorUserId: number; payload: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(erpAuditEvents).values({ ventureId: input.ventureId, domain: "people", eventType: input.eventType, actorUserId: input.actorUserId, payload: { ...input.payload, noExternalExecution: true } });
}

export async function listEmployeeProfiles(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpEmployeeProfiles).where(eq(erpEmployeeProfiles.ventureId, ventureId)).orderBy(desc(erpEmployeeProfiles.updatedAt));
}

export async function createEmployeeProfile(input: { ventureId: number; employeeMasterId: number; employeeNumber: string; department?: string; positionTitle: string; employmentType: EmploymentType; startDate: string; endDate?: string; calculationInputs: Record<string, unknown>; createdByUserId: number }) {
  if (input.endDate && input.startDate > input.endDate) throw new Error("Employee start date must be on or before the end date.");
  const db = await requireDb();
  const [master] = await db.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.id, input.employeeMasterId), eq(erpMasterRecords.ventureId, input.ventureId))).limit(1);
  if (!master || master.domain !== "employee" || master.status !== "active") throw new Error("Employee profile requires an active employee master in the active venture.");
  const result = await db.insert(erpEmployeeProfiles).values({ ...input, status: "draft" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, eventType: "people.employee_profile_created", actorUserId: input.createdByUserId, payload: { employeeProfileId: id, employeeMasterId: input.employeeMasterId, employeeNumber: input.employeeNumber, employmentType: input.employmentType, jurisdictionNeutral: true } });
  return { id, ...input, status: "draft" as const };
}

export async function transitionEmployeeProfile(input: { ventureId: number; employeeProfileId: number; targetStatus: EmployeeProfileStatus; actorUserId: number }) {
  const db = await requireDb();
  const [profile] = await db.select().from(erpEmployeeProfiles).where(and(eq(erpEmployeeProfiles.id, input.employeeProfileId), eq(erpEmployeeProfiles.ventureId, input.ventureId))).limit(1);
  if (!profile) throw new Error("Employee profile not found in the active venture.");
  const allowed: Record<EmployeeProfileStatus, EmployeeProfileStatus[]> = { draft: ["active"], active: ["on_leave", "terminated"], on_leave: ["active", "terminated"], terminated: [] };
  if (!allowed[profile.status].includes(input.targetStatus)) throw new Error(`Cannot transition employee profile ${profile.status} to ${input.targetStatus}.`);
  const updates: Partial<typeof erpEmployeeProfiles.$inferInsert> = { status: input.targetStatus };
  if (input.targetStatus === "active") { updates.activatedByUserId = input.actorUserId; updates.activatedAt = new Date(); }
  await db.update(erpEmployeeProfiles).set(updates).where(eq(erpEmployeeProfiles.id, profile.id));
  await audit({ ventureId: input.ventureId, eventType: "people.employee_profile_transitioned", actorUserId: input.actorUserId, payload: { employeeProfileId: profile.id, from: profile.status, to: input.targetStatus, jurisdictionNeutral: true } });
  return { id: profile.id, from: profile.status, to: input.targetStatus };
}

export async function listCompensationComponents(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpCompensationComponents).where(eq(erpCompensationComponents.ventureId, ventureId)).orderBy(desc(erpCompensationComponents.updatedAt));
}

export async function createCompensationComponent(input: { ventureId: number; code: string; name: string; kind: CompensationKind; calculationMethod: CompensationCalculationMethod; defaultAmount: number; currency: string; effectiveFrom: string; effectiveTo?: string; calculationInputs: Record<string, unknown>; createdByUserId: number }) {
  if (input.defaultAmount < 0) throw new Error("Compensation default amount cannot be negative.");
  if (!/^[A-Za-z]{3}$/.test(input.currency)) throw new Error("Compensation currency must be a three-letter code.");
  if (input.effectiveTo && input.effectiveFrom > input.effectiveTo) throw new Error("Compensation effective-from date must be on or before effective-to date.");
  if (input.calculationMethod === "percentage" && input.defaultAmount > 100) throw new Error("Jurisdiction-neutral percentage components must not exceed 100 percent.");
  const db = await requireDb();
  const result = await db.insert(erpCompensationComponents).values({ ...input, currency: input.currency.toUpperCase(), defaultAmount: String(input.defaultAmount), status: "draft" });
  const id = Number(result[0].insertId);
  await audit({ ventureId: input.ventureId, eventType: "people.compensation_component_created", actorUserId: input.createdByUserId, payload: { compensationComponentId: id, code: input.code, kind: input.kind, calculationMethod: input.calculationMethod, jurisdictionNeutral: true, noStatutoryDetermination: true } });
  return { id, ...input, currency: input.currency.toUpperCase(), status: "draft" as const };
}

export async function transitionCompensationComponent(input: { ventureId: number; compensationComponentId: number; targetStatus: CompensationStatus; actorUserId: number }) {
  const db = await requireDb();
  const [component] = await db.select().from(erpCompensationComponents).where(and(eq(erpCompensationComponents.id, input.compensationComponentId), eq(erpCompensationComponents.ventureId, input.ventureId))).limit(1);
  if (!component) throw new Error("Compensation component not found in the active venture.");
  const allowed: Record<CompensationStatus, CompensationStatus[]> = { draft: ["active", "retired"], active: ["retired"], retired: [] };
  if (!allowed[component.status].includes(input.targetStatus)) throw new Error(`Cannot transition compensation component ${component.status} to ${input.targetStatus}.`);
  const updates: Partial<typeof erpCompensationComponents.$inferInsert> = { status: input.targetStatus };
  if (input.targetStatus === "active") { updates.activatedByUserId = input.actorUserId; updates.activatedAt = new Date(); }
  await db.update(erpCompensationComponents).set(updates).where(eq(erpCompensationComponents.id, component.id));
  await audit({ ventureId: input.ventureId, eventType: "people.compensation_component_transitioned", actorUserId: input.actorUserId, payload: { compensationComponentId: component.id, from: component.status, to: input.targetStatus, jurisdictionNeutral: true, noStatutoryDetermination: true } });
  return { id: component.id, from: component.status, to: input.targetStatus };
}

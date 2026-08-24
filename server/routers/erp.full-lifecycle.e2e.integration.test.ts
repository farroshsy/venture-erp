import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { erpRouter } from "./erp";

const ventureId = 1;
const operatorOpenId = "validation_e2e_operator_20260824";
const customerCode = "VALIDATION-E2E-CUSTOMER-20260824";
const itemCode = "VALIDATION-E2E-ITEM-20260824";
const orderNumber = "VALIDATION-E2E-SALES-ORDER-20260824";
let operatorUserId = 0;

function callerFor(userId: number, openId: string) {
  return erpRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb(); if (!db) throw new Error("Database is not available.");
  let [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1);
  if (!user) { await db.insert(users).values({ openId: operatorOpenId, name: "VALIDATION E2E Operator", email: "validation-e2e-operator@example.invalid", loginMethod: "validation", role: "user" }); [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1); }
  operatorUserId = user!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, operatorUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: operatorUserId, role: "operator", status: "active" });
});

describe("typed-route sales lifecycle with real authorization", () => {
  it("lets an operator execute an internal sales lifecycle but forbids finance policy changes, while a portfolio admin completes the human task and all state is audited", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    await expect(operator.currencyPolicy.setReportingCurrency({ ventureId, reportingCurrency: "USD" })).rejects.toThrow();
    const masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === customerCode);
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: customerCode, name: "VALIDATION-ONLY E2E customer", attributes: { validationOnly: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY E2E item", attributes: { validationOnly: true } });
    let records = await operator.records.list({ ventureId });
    let order = records.find(record => record.recordNumber === orderNumber);
    if (!order) {
      const balances = await operator.inventory.balances({ ventureId });
      const balance = balances.find(row => row.itemMasterId === item!.id);
      if (!balance || Number(balance.onHandQuantity) < 2) await operator.inventory.recordMovement({ ventureId, itemMasterId: item!.id, movementType: "adjust_in", quantity: 2, narrative: "VALIDATION-ONLY E2E opening stock" });
      order = await operator.records.create({ ventureId, domain: "sales", recordType: "sales_order", recordNumber: orderNumber, title: "VALIDATION-ONLY E2E controlled sales order", counterpartyMasterId: customer!.id, amount: 1, effectiveDate: "2026-08-24", data: { validationOnly: true, noShipping: true, noBilling: true, noPayment: true } });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY E2E approval request" });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "approved", note: "VALIDATION-ONLY E2E approval" });
      await operator.sales.reserveInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E reservation" });
      await operator.sales.fulfillInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E internal fulfillment", finalFulfillment: true });
    }
    const instances = await admin.workflow.instances({ ventureId });
    const instance = instances.find(candidate => candidate.operationalRecordId === order!.id);
    const tasks = await admin.workflow.tasks({ ventureId });
    const pendingTask = tasks.find(task => task.workflowInstanceId === instance?.id && task.status === "pending");
    if (pendingTask) await admin.workflow.completeTask({ ventureId, workflowTaskId: pendingTask.id, outcome: "approved" });
    records = await admin.records.list({ ventureId }); const audits = await admin.audit({ ventureId }); const completedTasks = await admin.workflow.tasks({ ventureId });
    expect(records.find(record => record.id === order!.id)?.status).toBe("fulfilled");
    expect(completedTasks.some(task => task.workflowInstanceId === instance?.id && task.status === "approved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "record.transitioned")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_reserved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_fulfilled")).toBe(true);
    expect(audits.some(event => event.eventType === "workflow.task_completed")).toBe(true);
  });
});
